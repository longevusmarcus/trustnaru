import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { level, pathTitle, keySkills, roadmap } = await req.json();

    const roadmapSteps = Array.isArray(roadmap) ? roadmap.map((r: any) => r.step).join('; ') : '';
    const skills = Array.isArray(keySkills) ? keySkills.join(', ') : '';

    const prompt = `Analyze the skill gap for this career path: "${pathTitle}" at Level ${level}.

Key skills needed: ${skills}
Roadmap: ${roadmapSteps}

Generate a clear, actionable skill gap analysis with 3-5 skill areas. For each skill area:
1. Name the specific skill
2. Current gap description (what's missing)
3. How to fill it (practical steps)
4. Why it matters for this level

Keep it simple, practical, and motivating. Focus on actionable steps.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a career development expert who helps people identify and close skill gaps.' },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_skill_gaps',
              description: 'Return skill gap analysis',
              parameters: {
                type: 'object',
                properties: {
                  skillGaps: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        skill: { type: 'string', description: 'Name of the skill' },
                        gap: { type: 'string', description: 'What is missing' },
                        howToFill: { type: 'string', description: 'Practical steps to fill the gap' },
                        whyItMatters: { type: 'string', description: 'Why this skill matters at this level' }
                      },
                      required: ['skill', 'gap', 'howToFill', 'whyItMatters'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['skillGaps'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_skill_gaps' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No skill gap analysis generated');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-skill-gap:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
