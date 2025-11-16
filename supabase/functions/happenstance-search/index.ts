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
    const LINKEDIN_API_KEY = Deno.env.get("linkedin_API_key");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
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

    // Step 2: Search LinkedIn for each query
    const linkedinResults: any[] = [];
    
    for (const query of searchQueries.slice(0, max_results)) {
      try {
        console.log(`Searching LinkedIn: ${query.search_query}`);
        
        // Use LinkedIn API to search for people
        const linkedinResponse = await fetch(
          `https://api.linkedin.com/v2/search/people?keywords=${encodeURIComponent(query.search_query)}&count=3`,
          {
            headers: {
              Authorization: `Bearer ${LINKEDIN_API_KEY}`,
              "X-Restli-Protocol-Version": "2.0.0",
            },
          }
        );

        if (!linkedinResponse.ok) {
          console.error(`LinkedIn API error for query "${query.search_query}":`, await linkedinResponse.text());
          continue;
        }

        const linkedinData = await linkedinResponse.json();
        
        // Process LinkedIn results
        if (linkedinData.elements && linkedinData.elements.length > 0) {
          for (const person of linkedinData.elements.slice(0, 1)) {
            linkedinResults.push({
              ...person,
              search_reasoning: query.reasoning,
            });
          }
        }
      } catch (error) {
        console.error(`Error searching LinkedIn for "${query.search_query}":`, error);
      }
    }

    console.log(`Found ${linkedinResults.length} LinkedIn profiles`);

    if (linkedinResults.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No profiles found. Try refining your search.",
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

Here are the LinkedIn profiles found:
${JSON.stringify(linkedinResults, null, 2)}

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

    // Merge LinkedIn results with AI analysis
    const enrichedResults = linkedinResults.map((person, index) => {
      const analysis = analyses.find((a: any) => a.person_index === index);
      return {
        name: person.firstName + " " + person.lastName,
        title: person.headline || "Professional",
        company: person.companyName || "Unknown",
        location: person.location || "Unknown",
        profile_url: person.publicProfileUrl || "",
        profile_image_url: person.profilePicture || "",
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
