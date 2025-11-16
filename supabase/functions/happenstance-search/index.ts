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

    // Check global user limit (max 100 users can use this feature)
    const { count: totalUsersCount, error: totalUsersError } = await supabaseClient
      .from("happenstance_searches")
      .select("user_id", { count: "exact", head: false })
      .limit(1000);

    if (totalUsersError) {
      console.error("Error checking total users:", totalUsersError);
    }

    // Get unique user count
    const { data: uniqueUsers, error: uniqueError } = await supabaseClient
      .from("happenstance_searches")
      .select("user_id")
      .limit(1000);

    const uniqueUserIds = new Set(uniqueUsers?.map(s => s.user_id) || []);
    const hasSearchedBefore = uniqueUserIds.has(user.id);

    if (!hasSearchedBefore && uniqueUserIds.size >= 100) {
      return new Response(
        JSON.stringify({ 
          error: "Feature capacity reached. This beta feature is limited to 100 users.",
          limit_reached: true,
          capacity_full: true
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check monthly search limit (3 searches per month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: recentSearches, error: searchCountError } = await supabaseClient
      .from("happenstance_searches")
      .select("id")
      .eq("user_id", user.id)
      .gte("search_date", startOfMonth.toISOString());

    if (searchCountError) {
      console.error("Error checking search count:", searchCountError);
      throw new Error("Failed to check search limit");
    }

    if (recentSearches && recentSearches.length >= 3) {
      return new Response(
        JSON.stringify({ 
          error: "Monthly search limit reached. You can make 3 searches per month.",
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
    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    const SERPAPI_API_KEY = Deno.env.get("SERPAPI_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    if (!SERPER_API_KEY && !SERPAPI_API_KEY) {
      throw new Error("No search provider configured: set SERPER_API_KEY or SERPAPI_API_KEY");
    }

    // Step 1: Use AI to generate simple, natural search queries
    const searchQueryPrompt = `You are Naru's Happenstance Engine, finding REAL people for career guidance.

User Context:
${searchContext}

Generate ${max_results} SIMPLE, natural search queries to find real professionals.

CRITICAL Requirements:
1. Use NATURAL language - like typing in Google or LinkedIn search
2. Include specific job titles + industry OR location
3. NO Boolean operators (AND, OR, NOT, quotes) - just natural phrases
4. Each query should be SHORT (3-6 words) and different
5. Use keywords the user mentioned in their search intent

Example GOOD queries:
- "community director beverage industry"
- "tea entrepreneur social impact"
- "brand manager sustainable food"

Example BAD queries (too complex):
- "Director OR Manager AND Community"
- "LinkedIn search: 'Tea' AND 'Founder'"

Return ${max_results} simple, keyword-based search queries as JSON array.`;

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

    // Step 2: Search Google for LinkedIn profiles using Serper.dev
    const allResults: any[] = [];
    
    for (const query of searchQueries.slice(0, max_results)) {
      try {
        const searchQuery = `${query.search_query} site:linkedin.com/in`;
        console.log(`Searching Google: ${searchQuery}`);
        
        let organic: any[] = [];
        let providerUsed = '';

        // Try Serper.dev first if configured
        if (SERPER_API_KEY) {
          const resp = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": SERPER_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: searchQuery, num: 3 }),
          });
          if (resp.ok) {
            const data = await resp.json();
            organic = Array.isArray(data.organic) ? data.organic : [];
            providerUsed = 'serper';
            console.log(`Serper returned ${organic.length} results`);
          } else {
            const t = await resp.text();
            console.error('Serper API error:', t);
          }
        }

        // Fallback to SerpApi if available and no results yet
        if ((!organic || organic.length === 0) && SERPAPI_API_KEY) {
          const url = new URL('https://serpapi.com/search.json');
          url.searchParams.set('engine', 'google');
          url.searchParams.set('q', searchQuery);
          url.searchParams.set('num', '3');
          url.searchParams.set('hl', 'en');
          url.searchParams.set('gl', 'us');
          url.searchParams.set('api_key', SERPAPI_API_KEY);

          const resp2 = await fetch(url.toString());
          if (resp2.ok) {
            const data2 = await resp2.json();
            organic = Array.isArray(data2.organic_results) ? data2.organic_results : [];
            providerUsed = 'serpapi';
            console.log(`SerpApi returned ${organic.length} results`);
          } else {
            const t2 = await resp2.text();
            console.error('SerpApi error:', t2);
          }
        }

        // Extract LinkedIn profile info from normalized results
        if (organic && Array.isArray(organic)) {
          for (const result of organic.slice(0, 2)) {
            const url = result.link;
            const title = result.title || '';
            const snippet = result.snippet || '';

            const nameMatch = title.match(/^([^-|]+)/);
            const fullName = nameMatch ? nameMatch[1].trim() : '';
            const names = fullName.split(' ');

            const titleMatch = snippet.match(/^([^·•]+)/);
            const companyMatch = snippet.match(/(?:at|@)\s+([^·•\n]+)/);

            if (fullName && names.length >= 2) {
              allResults.push({
                source: providerUsed || 'google_search',
                firstName: names[0],
                lastName: names.slice(1).join(' '),
                headline: titleMatch ? titleMatch[1].trim() : snippet.substring(0, 100),
                companyName: companyMatch ? companyMatch[1].trim() : '',
                location: '',
                publicProfileUrl: url,
                profilePicture: '',
                search_reasoning: query.reasoning,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error searching for "${query.search_query}":`, error);
      }
    }

    console.log(`Found ${allResults.length} LinkedIn profiles via Google`);

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

    // Merge results with AI analysis and clean up formatting
    const enrichedResults = allResults.map((person, index) => {
      const analysis = analyses.find((a: any) => a.person_index === index);
      const fullName = `${person.firstName} ${person.lastName}`.trim();
      
      // Clean up markdown formatting (remove **, *, etc.)
      const cleanText = (text: string) => text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      
      return {
        name: cleanText(fullName),
        title: cleanText(person.headline || ""),
        company: cleanText(person.companyName || ""),
        location: person.location || "",
        profile_url: person.publicProfileUrl || "",
        profile_image_url: person.profilePicture || "",
        source: person.source || "linkedin",
        matched_signals: [person.search_reasoning],
        relevance_score: 0.95 - (index * 0.1),
        explanation: cleanText(analysis?.explanation || "Great potential match for your career goals"),
        conversation_starters: (analysis?.conversation_starters || []).map(cleanText),
        key_synergies: (analysis?.key_synergies || []).map(cleanText),
      };
    });

    // Log the search with results
    await supabaseClient
      .from("happenstance_searches")
      .insert({
        user_id: user.id,
        search_intent,
        results_count: enrichedResults.length,
        results: enrichedResults,
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
