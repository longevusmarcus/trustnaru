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

    const { pathId } = await req.json();

    if (!pathId) {
      return new Response(JSON.stringify({ error: "Path ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get path details
    const { data: path } = await supabaseClient
      .from("career_paths")
      .select("*")
      .eq("id", pathId)
      .single();

    if (!path) {
      return new Response(JSON.stringify({ error: "Path not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Generating affirmations for path: ${path.title}`);

    const prompt = `Generate 5 powerful, personalized daily affirmations for someone pursuing the career path: "${path.title}".

Career Context:
- Role: ${path.title}
- Description: ${path.description}
- Key Skills: ${path.key_skills?.join(", ") || "Not specified"}
- Category: ${path.category || "General"}

Requirements:
1. Each affirmation should be empowering and focused on growth
2. Use "I" statements (first person)
3. Focus on capability, progress, and potential
4. Be specific to the career path while remaining motivational
5. Keep each affirmation to 1-2 sentences
6. Vary the themes: confidence, skills, impact, growth mindset, opportunity

OUTPUT FORMAT (valid JSON only):
{
  "affirmations": [
    "First affirmation statement",
    "Second affirmation statement",
    "Third affirmation statement",
    "Fourth affirmation statement",
    "Fifth affirmation statement"
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are a motivational career coach specializing in creating personalized affirmations.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_affirmations",
              description: "Generate daily affirmations for career growth",
              parameters: {
                type: "object",
                properties: {
                  affirmations: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 5,
                    maxItems: 5,
                  },
                },
                required: ["affirmations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_affirmations" } },
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output generated");
    }

    const result = JSON.parse(toolCall.function.arguments);

    if (!result?.affirmations || result.affirmations.length !== 5) {
      throw new Error("Invalid affirmations generated");
    }

    // Update the path with new affirmations
    await supabaseClient
      .from("career_paths")
      .update({ affirmations: result.affirmations })
      .eq("id", pathId);

    console.log(`Successfully generated ${result.affirmations.length} affirmations`);

    return new Response(
      JSON.stringify({ affirmations: result.affirmations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating affirmations:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
