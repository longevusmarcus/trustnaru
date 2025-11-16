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

    // 4. Use AI to find relevant mentors based on search context
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // 5. Get all mentors from database
    const { data: allMentors, error: mentorsError } = await supabaseClient
      .from("mentors")
      .select("*")
      .limit(100);

    if (mentorsError) {
      console.error("Error fetching mentors:", mentorsError);
      throw new Error("Failed to fetch mentors");
    }

    console.log(`Found ${allMentors?.length || 0} total mentors`);

    // 6. Use AI to select and rank the most relevant mentors
    const selectionPrompt = `You are Naru's Happenstance Engine.

User's context:
${searchContext}

Here are available mentors:
${JSON.stringify(allMentors?.map(m => ({
  id: m.id,
  name: m.name,
  title: m.title,
  company: m.company,
  headline: m.headline,
  location: m.location,
  industry: m.industry,
  category: m.category,
  key_skills: m.key_skills,
})) || [], null, 2)}

Select the ${max_results} MOST relevant mentors for this user's FUTURE path and search intent.
Consider:
1. Skills alignment with their target role
2. Industry relevance
3. Impact area matches
4. Non-obvious synergies (values, experiences, growth paths)
5. People who've made similar transitions

Return the mentor IDs in order of relevance with brief reasoning.`;

    const selectionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a career matchmaking expert. Return structured data about mentor matches.",
          },
          { role: "user", content: selectionPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "select_mentors",
              description: "Select the most relevant mentors",
              parameters: {
                type: "object",
                properties: {
                  selections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        mentor_id: { type: "string" },
                        relevance_score: { type: "number" },
                        matched_signals: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["mentor_id", "relevance_score", "matched_signals"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["selections"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "select_mentors" } },
      }),
    });

    if (!selectionResponse.ok) {
      const errorText = await selectionResponse.text();
      console.error("Selection error:", selectionResponse.status, errorText);
      throw new Error("Failed to select mentors");
    }

    const selectionData = await selectionResponse.json();
    const selectionCall = selectionData.choices?.[0]?.message?.tool_calls?.[0];
    
    let selections: any[] = [];
    if (selectionCall?.function?.arguments) {
      try {
        const parsedArgs = JSON.parse(selectionCall.function.arguments);
        selections = parsedArgs.selections || [];
      } catch (e) {
        console.error("Failed to parse selection:", e);
      }
    }

    console.log(`AI selected ${selections.length} mentors`);

    // Match selections with full mentor data
    const matches = selections
      .map((sel: any) => {
        const mentor = allMentors?.find(m => m.id === sel.mentor_id);
        if (!mentor) return null;
        return {
          mentor_id: mentor.id,
          name: mentor.name,
          title: mentor.title,
          company: mentor.company,
          headline: mentor.headline,
          location: mentor.location,
          industry: mentor.industry,
          key_skills: mentor.key_skills || [],
          profile_url: mentor.profile_url,
          profile_image_url: mentor.profile_image_url,
          matched_signals: sel.matched_signals || [],
          relevance_score: sel.relevance_score || 0,
        };
      })
      .filter(Boolean)
      .slice(0, max_results);

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
