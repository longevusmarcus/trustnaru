import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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

    // Fetch user profile with CV data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('cv_url, wizard_data, display_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const userName = profile?.display_name || user.email?.split('@')[0] || 'you';
    let cvAnalysis = '';
    
    // Analyze CV with Gemini vision if available
    if (profile?.cv_url) {
      console.log('Analyzing CV with Gemini vision for skill gap...');
      try {
        let filePath = profile.cv_url;
        if (filePath.includes('supabase.co')) {
          const urlParts = filePath.split('/cvs/');
          filePath = urlParts[urlParts.length - 1];
        }

        const { data: signedCvUrl, error: cvSignError } = await supabase
          .storage
          .from('cvs')
          .createSignedUrl(filePath, 3600);

        if (!cvSignError && signedCvUrl) {
          const cvResponse = await fetch(signedCvUrl.signedUrl);
          const cvBlob = await cvResponse.blob();
          const cvBuffer = await cvBlob.arrayBuffer();
          const cvBase64 = encodeBase64(new Uint8Array(cvBuffer));

          const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
          if (GEMINI_API_KEY) {
            const analysisPrompt = `Analyze this CV and extract current skills, experience, and knowledge.

Provide analysis in JSON format:
{
  "current_role": "exact job title",
  "years_of_experience": "total years",
  "experience_level": "entry|mid|senior|executive",
  "key_skills": ["skill1", "skill2", "skill3"],
  "technical_skills": ["tech1", "tech2"],
  "soft_skills": ["soft1", "soft2"],
  "certifications": ["cert1", "cert2"],
  "education": [{"degree": "Bachelor's", "field": "Computer Science"}],
  "industries": ["industry1", "industry2"]
}`;

            const analysisResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      { text: analysisPrompt },
                      { inline_data: { mime_type: 'application/pdf', data: cvBase64 } }
                    ]
                  }],
                  generationConfig: { response_mime_type: "application/json" }
                }),
              }
            );

            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              const analysisText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
              const cv = JSON.parse(analysisText);
              
              cvAnalysis = `
USER'S CURRENT PROFILE (FROM CV):
- Current Role: ${cv.current_role || 'Not specified'}
- Experience Level: ${cv.experience_level || 'Not specified'} (${cv.years_of_experience || 'unknown'} years)
- Current Skills: ${cv.key_skills?.join(', ') || 'Not specified'}
- Technical Skills: ${cv.technical_skills?.join(', ') || 'Not specified'}
- Soft Skills: ${cv.soft_skills?.join(', ') || 'Not specified'}
- Education: ${cv.education?.map((e: any) => `${e.degree} in ${e.field}`).join(', ') || 'Not specified'}
- Industries: ${cv.industries?.join(', ') || 'Not specified'}

IMPORTANT: Base your skill gap analysis on THIS actual experience. Identify gaps between their CURRENT skills and what's needed for "${pathTitle}" at Level ${level}.

CRITICAL LANGUAGE RULE: Always address the person as "${userName}" or use "you/your". NEVER say "The user" or "They/Their". 
Examples: 
- "${userName} has strong experience in..." or "You have strong experience in..."
- "Your background shows..." NOT "The user's background shows..."
- "${userName} should focus on..." or "You should focus on..." NOT "They should focus on..."
`;
              console.log('CV analyzed successfully for skill gap');
            }
          }
        }
      } catch (error) {
        console.error('Error analyzing CV with Gemini:', error);
      }
    }

    const prompt = `Analyze the skill gap for this career path: "${pathTitle}" at Level ${level}.

Key skills needed for this path: ${skills}
Roadmap: ${roadmapSteps}

${cvAnalysis}

Generate a clear, actionable skill gap analysis with 3-5 skill areas. For each skill area:
1. Name the specific skill
2. Current gap description (what's missing compared to their current experience)
3. How to fill it (practical steps tailored to their background)
4. Why it matters for this level

${cvAnalysis ? `CRITICAL: Your analysis MUST be personalized based on their actual CV. Reference their current skills, experience level, and background. Identify SPECIFIC gaps between what they have and what they need.

LANGUAGE REQUIREMENTS:
- Always use "${userName}" or "you/your" when referring to the person
- NEVER use "The user", "They/Their", or "The individual"
- Examples: "${userName} has experience in..." or "You have experience in..." or "Your background includes..."` : `Keep it simple, practical, and motivating. Focus on actionable steps. Always use "you/your" language, never "the user".`}`;

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
          { 
            role: 'system', 
            content: `You are a career development expert who helps people identify and close skill gaps. 
            
${cvAnalysis ? `CRITICAL: You have access to this person's actual CV and professional background. Your skill gap analysis MUST be personalized and specific to their current experience level, existing skills, and background. Compare what they HAVE vs what they NEED for the target role.

LANGUAGE: Always refer to them as "${userName}" or use "you/your". NEVER say "The user" or "They/Their".` : `Provide clear, actionable skill gap analysis based on the career path requirements. Always use "you/your" language to address the person directly.`}` 
          },
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
