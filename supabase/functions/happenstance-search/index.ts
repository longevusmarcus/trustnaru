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

    const { search_intent, max_results = 7 } = await req.json();

    if (!search_intent) {
      return new Response(JSON.stringify({ error: "search_intent is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Happenstance search for user ${user.id} with intent: ${search_intent}`);

    // 1. Load user profile
    const { data: profile } = await supabaseClient
      .from("user_profiles")
      .select("cv_url, voice_transcription, wizard_data, display_name")
      .eq("user_id", user.id)
      .single();

    // 2. Load user's active career path
    const { data: activePath } = await supabaseClient
      .from("career_paths")
      .select("title, description, key_skills, impact_areas, category")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Build search context
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

Current Search Request:
${search_intent}
    `.trim();

    console.log("Search context:", searchContext);

    // 4. Generate embedding using Gemini
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use Gemini's embedding endpoint
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-004",
        input: searchContext,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding error:", embeddingResponse.status, errorText);
      throw new Error("Failed to generate embedding");
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    console.log("Generated embedding, vector length:", queryEmbedding.length);

    // 5. Search for matching mentors using the RPC function
    const { data: matches, error: matchError } = await supabaseClient.rpc(
      "happenstance_search_mentors",
      {
        p_user_id: user.id,
        p_query_embedding: queryEmbedding,
        p_limit: max_results,
      },
    );

    if (matchError) {
      console.error("Search error:", matchError);
      return new Response(JSON.stringify({ error: "Search failed", details: matchError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${matches?.length || 0} mentor matches`);

    // 6. Use Gemini to explain WHY each person is a good match
    const analysisPrompt = `You are Naru's Happenstance Engine.

The user is searching for: "${search_intent}"

User's context:
${searchContext}

Here are the top mentor matches from the search:
${JSON.stringify(matches, null, 2)}

For each mentor, provide:
1. A clear explanation of WHY they're a good match for the user's FUTURE path (not just current status)
2. 1-2 specific conversation starters the user could use
3. Highlight non-obvious overlaps (values, experiences, future goals)

Return your response as a JSON array where each item has:
{
  "mentor_id": "uuid",
  "explanation": "why this person is a great match",
  "conversation_starters": ["starter 1", "starter 2"],
  "key_synergies": ["synergy 1", "synergy 2"]
}`;

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
            content: "You are a career matchmaking expert who finds non-obvious connections between people.",
          },
          { role: "user", content: analysisPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_mentor_matches",
              description: "Analyze why each mentor is a good match",
              parameters: {
                type: "object",
                properties: {
                  analyses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        mentor_id: { type: "string" },
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
                      required: ["mentor_id", "explanation", "conversation_starters", "key_synergies"],
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
        tool_choice: { type: "function", function: { name: "analyze_mentor_matches" } },
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error("Analysis error:", analysisResponse.status, errorText);
      // Return matches without AI analysis if analysis fails
      return new Response(
        JSON.stringify({
          results: matches,
          analysis_available: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const analysisData = await analysisResponse.json();
    const toolCall = analysisData.choices?.[0]?.message?.tool_calls?.[0];
    
    let analyses = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsedArgs = JSON.parse(toolCall.function.arguments);
        analyses = parsedArgs.analyses || [];
      } catch (e) {
        console.error("Failed to parse AI analysis:", e);
      }
    }

    console.log(`Generated ${analyses.length} AI analyses`);

    // Merge matches with AI analysis
    const enrichedResults = matches?.map((match: any) => {
      const analysis = analyses.find((a: any) => a.mentor_id === match.mentor_id);
      return {
        ...match,
        ...analysis,
      };
    }) || [];

    return new Response(
      JSON.stringify({
        results: enrichedResults,
        analysis_available: analyses.length > 0,
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
