import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { level } = await req.json();
    
    if (!level || level < 1 || level > 10) {
      return new Response(
        JSON.stringify({ error: 'Valid level (1-10) required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating Level ${level} resources for user:`, user.id);

    // Get comprehensive user data
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('active_path_id, display_name, cv_url, voice_transcription, wizard_data')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.active_path_id) {
      return new Response(
        JSON.stringify({ 
          error: 'No active path',
          resources: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active path details
    const { data: activePath } = await supabaseClient
      .from('career_paths')
      .select('*')
      .eq('id', profile.active_path_id)
      .single();

    if (!activePath) {
      throw new Error('Active path not found');
    }

    console.log(`Generating resources for path: ${activePath.title}, Level: ${level}`);

    // Build context
    const userName = profile.display_name || user.email?.split('@')[0] || 'there';
    let userContext = `User: ${userName}\n`;
    userContext += `Career Path: ${activePath.title}\n`;
    userContext += `Category: ${activePath.category}\n`;
    userContext += `Description: ${activePath.description}\n`;
    
    if (activePath.key_skills?.length) {
      userContext += `Required Skills: ${activePath.key_skills.join(', ')}\n`;
    }
    
    if (activePath.target_companies?.length) {
      userContext += `Target Companies: ${activePath.target_companies.join(', ')}\n`;
    }

    // Add CV analysis to identify skill gaps
    if (profile.wizard_data?.cv_structured) {
      const cv = profile.wizard_data.cv_structured;
      userContext += `\nCurrent Profile:\n`;
      if (cv.current_role) userContext += `- Current Role: ${cv.current_role}\n`;
      if (cv.years_of_experience) userContext += `- Experience: ${cv.years_of_experience} years\n`;
      if (cv.key_skills?.length) {
        userContext += `- Current Skills: ${cv.key_skills.join(', ')}\n`;
        // Identify skill gaps
        const targetSkills = activePath.key_skills || [];
        const currentSkills = cv.key_skills || [];
        const skillGaps = targetSkills.filter(
          (skill: string) => !currentSkills.some((cs: string) => 
            cs.toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(cs.toLowerCase())
          )
        );
        if (skillGaps.length > 0) {
          userContext += `- Skills to Develop: ${skillGaps.join(', ')}\n`;
        }
      }
      if (cv.certifications?.length) {
        userContext += `- Current Certifications: ${cv.certifications.join(', ')}\n`;
      }
    } else if (profile.wizard_data?.cv_text) {
      const snippet = String(profile.wizard_data.cv_text).slice(0, 1500);
      userContext += `\nCV Summary:\n${snippet}\n`;
    }

    if (profile.voice_transcription) {
      userContext += `\nCareer Aspirations: "${profile.voice_transcription}"\n`;
    }

    // Level-specific guidance descriptions
    const levelDescriptions: Record<number, string> = {
      1: "Foundation - Essential skills and core knowledge to get started",
      2: "Development - Intermediate skills and practical experience building",
      3: "Specialization - Advanced expertise in key areas",
      4: "Leadership - Team management and strategic thinking",
      5: "Innovation - Creative problem-solving and innovation",
      6: "Influence - Industry impact and thought leadership",
      7: "Mastery - Expert-level proficiency and recognition",
      8: "Mentorship - Guide others and build community",
      9: "Transformation - Drive industry transformation",
      10: "Legacy - Create lasting impact and legacy"
    };

    const levelDesc = levelDescriptions[level] || `Level ${level}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are an expert career development strategist specializing in personalized learning paths.

USER CONTEXT:
${userContext}

TASK: Generate exactly 3-5 HIGHLY SPECIFIC, CONCRETE resources for Level ${level}: ${levelDesc}

CRITICAL REQUIREMENTS:
1. Each resource must be REAL and SPECIFIC:
   - Name actual courses (e.g., "Google UX Design Professional Certificate on Coursera")
   - Name actual books (e.g., "Don't Make Me Think" by Steve Krug)
   - Name actual certifications (e.g., "IAAP CPACC Certification")
   - Name actual tools/platforms (e.g., "Figma Advanced Prototyping Course by Figma")
   - Name actual conferences/events (e.g., "CSUN Assistive Technology Conference 2025")

2. Focus on SKILL GAPS identified in the CV vs required skills for the career path

3. Include realistic time commitments:
   - Be specific: "8 weeks, 5 hours/week" NOT "a few weeks"
   - Include total hours: "40 hours total" or "12 weeks, 3-4 hours/week"

4. Explain tangible impact:
   - What credential/artifact they'll earn
   - How it fills specific skill gaps
   - Why it matters for their target role at their target companies

5. Level-appropriate difficulty:
   - Level 1-2: Beginner/foundational resources, free or low-cost options prioritized
   - Level 3-5: Intermediate to advanced, may include paid courses/certifications
   - Level 6-8: Advanced specialization, industry recognition, professional certifications
   - Level 9-10: Expert-level, speaking opportunities, publication, thought leadership

6. Consider the user's current experience level and make recommendations that build logically on their existing skills

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "resources": [
    {
      "resource": "Exact name of course/book/certification/tool",
      "commitment": "Specific time commitment",
      "impact": "Concrete outcome and how it fills skill gaps"
    }
  ]
}`;

    console.log('Calling Lovable AI Gateway for level resources...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
            content: 'You are a precise career development strategist. Output valid JSON only with real, specific resources. Never include markdown, commentary, or generic suggestions.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      console.error('No content generated from AI Gateway');
      throw new Error('No content generated');
    }

    console.log('AI response length:', generatedText.length, 'chars');

    // Parse JSON response
    let jsonText = String(generatedText).trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    let result: any = null;
    try {
      result = JSON.parse(jsonText);
    } catch (_) {
      try {
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) result = JSON.parse(match[0]);
      } catch (_) {
        console.error('Failed to parse AI response as JSON');
      }
    }

    if (!result || !Array.isArray(result.resources) || result.resources.length === 0) {
      console.warn('AI returned invalid/empty resources, using fallback');
      
      // Fallback based on path
      const companies = (activePath.target_companies || []).slice(0, 2).join(', ') || 'industry leaders';
      const skills = (activePath.key_skills || []).slice(0, 3).join(', ') || 'key skills';
      
      result = {
        resources: [
          {
            resource: `Industry-recognized certification in ${activePath.category} (e.g., relevant professional credential)`,
            commitment: '10-12 weeks, 4-5 hours/week',
            impact: `Earn credential that validates ${skills} expertise for roles at ${companies}`
          },
          {
            resource: `Comprehensive course on ${skills} with hands-on projects`,
            commitment: '6-8 weeks, 3-4 hours/week',
            impact: 'Build portfolio of 3-5 projects demonstrating practical application'
          },
          {
            resource: `Technical book/guide on ${activePath.category} best practices with real-world case studies`,
            commitment: '3-4 weeks to read and implement key concepts',
            impact: 'Understand industry standards and patterns used at leading companies'
          }
        ]
      };
    }

    console.log(`Successfully generated ${result.resources.length} Level ${level} resources`);

    return new Response(
      JSON.stringify({ 
        level,
        resources: result.resources 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-level-resources function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        resources: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
