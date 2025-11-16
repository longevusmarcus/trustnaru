import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { search_intent, max_results = 3 } = await req.json();

    if (!search_intent) {
      return new Response(JSON.stringify({ error: "search_intent is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Happenstance search for user ${user.id} with intent: ${search_intent}`);

    // Check weekly search limit (3 searches per week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: recentSearches, error: searchCountError } = await supabaseClient
      .from("happenstance_searches")
      .select("id")
      .eq("user_id", user.id)
      .gte("search_date", oneWeekAgo.toISOString());

    if (searchCountError) {
      console.error("Error checking search count:", searchCountError);
      throw new Error("Failed to check search limit");
    }

    if (recentSearches && recentSearches.length >= 3) {
      return new Response(
        JSON.stringify({ 
          error: "Weekly search limit reached. You can make 3 searches per week.",
          limit_reached: true,
          searches_used: recentSearches.length,
          searches_remaining: 0
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Load user profile and career path for context
    const { data: profile } = await supabaseClient
      .from("user_profiles")
      .select("cv_url, voice_transcription, wizard_data, display_name")
      .eq("user_id", user.id)
      .single();

    const { data: activePath } = await supabaseClient
      .from("career_paths")
      .select("title, description, key_skills, impact_areas, category")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const searchContext = `
User Profile:
- Name: ${profile?.display_name || "Unknown"}
- Voice transcription: ${profile?.voice_transcription || "No voice input"}
- Wizard data: ${JSON.stringify(profile?.wizard_data || {})}

Future Path:
${activePath ? `
- Target Role: ${activePath.title}
- Description: ${activePath.description}
- Key Skills: ${activePath.key_skills?.join(", ") || "None"}
- Impact Areas: ${activePath.impact_areas?.join(", ") || "None"}
- Category: ${activePath.category || "General"}
` : "No active career path set"}

Current Search Request: ${search_intent}
    `.trim();

    console.log("Search context:", searchContext);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RAPIDAPI_KEY = Deno.env.get("linkedin_API_key");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    if (!RAPIDAPI_KEY) {
      throw new Error("RapidAPI key not configured");
    }

    // Step 1: Use AI to generate targeted LinkedIn search queries
    const searchQueryPrompt = `You are Naru's Happenstance Engine, finding REAL people for career guidance.

User Context:
${searchContext}

Generate ${max_results} diverse LinkedIn search queries to find real professionals who could help this person.

Requirements:
1. Each query should target different angles (industry leaders, recent career changers, location-based, etc.)
2. Use specific job titles, companies, and keywords
3. Focus on people who have made similar transitions or work in target roles
4. Include location keywords when relevant

Return as JSON array of search queries.`;

    const queryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a career search expert who generates precise LinkedIn search queries.",
          },
          { role: "user", content: searchQueryPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_search_queries",
              description: "Generate LinkedIn search queries",
              parameters: {
                type: "object",
                properties: {
                  queries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        search_query: { type: "string" },
                        reasoning: { type: "string" },
                      },
                      required: ["search_query", "reasoning"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["queries"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_search_queries" } },
      }),
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error("Query generation error:", queryResponse.status, errorText);
      throw new Error("Failed to generate search queries");
    }

    const queryData = await queryResponse.json();
    const queryCall = queryData.choices?.[0]?.message?.tool_calls?.[0];
    
    let searchQueries: any[] = [];
    if (queryCall?.function?.arguments) {
      try {
        const parsedArgs = JSON.parse(queryCall.function.arguments);
        searchQueries = parsedArgs.queries || [];
      } catch (e) {
        console.error("Failed to parse queries:", e);
        searchQueries = [{ search_query: search_intent, reasoning: "Default query" }];
      }
    }

    console.log(`Generated ${searchQueries.length} search queries`);

    // Step 2: Search for real people using RapidAPI LinkedIn + Web Search
    const allResults: any[] = [];
    
    for (const query of searchQueries.slice(0, max_results)) {
      try {
        console.log(`Searching for: ${query.search_query}`);
        
        // Try RapidAPI LinkedIn Data API first
        try {
          const linkedinResponse = await fetch(
            `https://linkedin-data-api.p.rapidapi.com/search-people?keywords=${encodeURIComponent(query.search_query)}&start=0`,
            {
              headers: {
                "x-rapidapi-key": RAPIDAPI_KEY,
                "x-rapidapi-host": "linkedin-data-api.p.rapidapi.com",
              },
            }
          );

          if (linkedinResponse.ok) {
            const linkedinData = await linkedinResponse.json();
            console.log(`LinkedIn API response:`, JSON.stringify(linkedinData).slice(0, 200));
            
            // Process RapidAPI results
            if (linkedinData.data && Array.isArray(linkedinData.data) && linkedinData.data.length > 0) {
              const person = linkedinData.data[0];
              allResults.push({
                source: "linkedin",
                firstName: person.firstName || "",
                lastName: person.lastName || "",
                headline: person.headline || "",
                companyName: person.company || "",
                location: person.location || "",
                publicProfileUrl: person.url || "",
                profilePicture: person.photoUrl || "",
                search_reasoning: query.reasoning,
              });
              continue;
            }
          } else {
            console.error(`LinkedIn API error: ${linkedinResponse.status}`, await linkedinResponse.text());
          }
        } catch (linkedinError) {
          console.error(`LinkedIn search error:`, linkedinError);
        }

        // Fallback to web search to find real people
        const webSearchPrompt = `Find a real person on LinkedIn who matches: ${query.search_query}. Include their LinkedIn profile URL if possible.`;
        
        const webSearchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a web search expert. When asked to find a person, provide their name, title, company, and LinkedIn URL if available.",
              },
              { role: "user", content: webSearchPrompt },
            ],
          }),
        });

        if (webSearchResponse.ok) {
          const webData = await webSearchResponse.json();
          const content = webData.choices?.[0]?.message?.content || "";
          console.log(`Web search result:`, content.slice(0, 200));
          
          // Extract info from web search result
          if (content.includes("linkedin.com")) {
            const urlMatch = content.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+/);
            const nameMatch = content.match(/(?:Name|Person):\s*([^\n]+)/i);
            const titleMatch = content.match(/(?:Title|Role|Position):\s*([^\n]+)/i);
            const companyMatch = content.match(/(?:Company|Organization):\s*([^\n]+)/i);
            
            if (urlMatch || nameMatch) {
              allResults.push({
                source: "web_search",
                firstName: nameMatch?.[1]?.split(" ")[0] || "Professional",
                lastName: nameMatch?.[1]?.split(" ").slice(1).join(" ") || "",
                headline: titleMatch?.[1] || "Found via web search",
                companyName: companyMatch?.[1] || "",
                location: "",
                publicProfileUrl: urlMatch?.[0] || "",
                profilePicture: "",
                search_reasoning: query.reasoning,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error searching for "${query.search_query}":`, error);
      }
    }

    console.log(`Found ${allResults.length} total results`);

    if (allResults.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No profiles found. Try different keywords or be more specific.",
          results: [],
          searches_remaining: 3 - (recentSearches?.length || 0) - 1
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 3: Enrich results with AI analysis
    const analysisPrompt = `You are Naru's Happenstance Engine.

The user is searching for: "${search_intent}"

User's context:
${searchContext}

Here are the people found (from LinkedIn and web search):
${JSON.stringify(allResults, null, 2)}

For each person, provide:
1. Why they're a perfect match for the user's FUTURE path (not current status)
2. 2-3 specific conversation starters
3. Non-obvious synergies and connections

Return analysis for each person.`;

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a career matchmaking expert who finds deep connections between people.",
          },
          { role: "user", content: analysisPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_matches",
              description: "Analyze why each person is a good match",
              parameters: {
                type: "object",
                properties: {
                  analyses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        person_index: { type: "number" },
                        explanation: { type: "string" },
                        conversation_starters: {
                          type: "array",
                          items: { type: "string" },
                        },
                        key_synergies: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["person_index", "explanation", "conversation_starters", "key_synergies"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["analyses"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_matches" } },
      }),
    });

    let analyses = [];
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      const toolCall = analysisData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        try {
          const parsedArgs = JSON.parse(toolCall.function.arguments);
          analyses = parsedArgs.analyses || [];
        } catch (e) {
          console.error("Failed to parse AI analysis:", e);
        }
      }
    }

    console.log(`Generated ${analyses.length} AI analyses`);

    // Merge results with AI analysis
    const enrichedResults = allResults.map((person, index) => {
      const analysis = analyses.find((a: any) => a.person_index === index);
      const fullName = `${person.firstName} ${person.lastName}`.trim() || "Professional";
      
      return {
        name: fullName,
        title: person.headline || "Professional",
        company: person.companyName || "Unknown",
        location: person.location || "Unknown",
        profile_url: person.publicProfileUrl || "",
        profile_image_url: person.profilePicture || "",
        source: person.source || "unknown",
        matched_signals: [person.search_reasoning],
        relevance_score: 0.95 - (index * 0.1),
        explanation: analysis?.explanation || "Great potential match for your career goals",
        conversation_starters: analysis?.conversation_starters || ["I'd love to learn about your career journey"],
        key_synergies: analysis?.key_synergies || ["Shared career interests"],
      };
    });

    // Log the search
    await supabaseClient
      .from("happenstance_searches")
      .insert({
        user_id: user.id,
        search_intent,
        results_count: enrichedResults.length,
      });

    return new Response(
      JSON.stringify({
        results: enrichedResults,
        analysis_available: analyses.length > 0,
        searches_remaining: 3 - (recentSearches?.length || 0) - 1,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Happenstance search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
