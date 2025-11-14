import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { actionTitle, actionDescription, suggestions, timeframe, priority } = await req.json();

    if (!actionTitle || !suggestions) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context for the AI
    const suggestionsText = suggestions
      .map((s: any, idx: number) => {
        const text = typeof s === 'string' 
          ? s 
          : s.person 
            ? `${s.person} - ${s.title} at ${s.organization}${s.message ? `: "${s.message}"` : ''}`
            : JSON.stringify(s);
        return `${idx + 1}. ${text}`;
      })
      .join('\n');

    const prompt = `You are an expert assistant helping a user complete this action:

**Action:** ${actionTitle}
${actionDescription ? `**Description:** ${actionDescription}` : ''}
${timeframe ? `**Timeframe:** ${timeframe}` : ''}
${priority ? `**Priority:** ${priority}` : ''}

**Suggestions provided:**
${suggestionsText}

Your task is to COMPLETE THE HOMEWORK for the user. DO NOT give instructions. Instead:

1. If suggestions ask to READ an article/report:
   - Provide a detailed summary of the key points (as if you read it)
   - Include specific takeaways, data points, and actionable insights
   - Reference real names, brands, companies, dates mentioned

2. If suggestions ask to RESEARCH/EXPLORE:
   - Provide the actual findings with specific examples
   - Include real brand names, people, companies, recent trends (2024 preferred)
   - Give concrete data and context

3. If suggestions ask to IDENTIFY/FIND:
   - Provide the actual list with names, descriptions, and why they're relevant
   - Include specific details (dates, locations, costs if applicable)

4. If suggestions ask to REVIEW case studies/examples:
   - Provide actual case study summaries with outcomes
   - Reference specific campaigns, brands, and results

Format your response as:
- Use clear markdown formatting with headers (##) and bullet points
- Be specific and detailed
- Include actual names, brands, companies, dates
- Make it immediately actionable - the user shouldn't need to do any additional research

Generate premium, sophisticated content that feels insider-level.`;

    // Call Gemini directly
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate shortcuts.";

    return new Response(JSON.stringify({ content: generatedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-shortcuts:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
