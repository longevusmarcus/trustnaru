import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  level: z.number().int().min(1).max(10),
});

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

    const body = await req.json();
    const validationResult = inputSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { level } = validationResult.data;

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

    // Level-specific guidance descriptions with progressive 10% difficulty increase
    const levelDescriptions: Record<number, string> = {
      1: "Foundation (Base) - Essential skills and core knowledge to get started. Entry-level content, beginner-friendly resources.",
      2: "Development (+10%) - Intermediate skills and practical experience building. 10% more complex concepts, hands-on projects.",
      3: "Specialization (+20%) - Advanced expertise in key areas. 20% more depth, specialized technical knowledge, professional certifications.",
      4: "Leadership (+30%) - Team management and strategic thinking. 30% more complexity, cross-functional projects, mentoring responsibilities.",
      5: "Innovation (+40%) - Creative problem-solving and innovation. 40% more advanced, original contributions, research-driven work.",
      6: "Influence (+50%) - Industry impact and thought leadership. 50% more sophisticated, speaking opportunities, community building.",
      7: "Mastery (+60%) - Expert-level proficiency and recognition. 60% more demanding, advanced publications, industry-wide influence.",
      8: "Mentorship (+70%) - Guide others and build community. 70% more responsibility, program development, systematic knowledge transfer.",
      9: "Transformation (+80%) - Drive industry transformation. 80% more impact, paradigm shifts, organizational change leadership.",
      10: "Legacy (+90%) - Create lasting impact and legacy. 90% more profound, field-defining contributions, generational influence."
    };

    const levelDesc = levelDescriptions[level] || `Level ${level}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `You are an expert career development strategist specializing in personalized learning paths with PROGRESSIVE DIFFICULTY SCALING.

USER CONTEXT:
${userContext}

TASK: Generate exactly 3-5 HIGHLY SPECIFIC, CONCRETE resources for Level ${level}: ${levelDesc}

CRITICAL - PROGRESSIVE DIFFICULTY SCALING:
Level ${level} should be ${(level - 1) * 10}% MORE DIFFICULT than Level 1 baseline:
${level === 1 ? '- Level 1 (Baseline): Beginner-friendly, foundational, accessible content. Free or low-cost. Basic concepts.' : ''}
${level === 2 ? '- Level 2 (+10% difficulty): Slightly more complex. Introduces practical application. Some paid resources acceptable.' : ''}
${level === 3 ? '- Level 3 (+20% difficulty): Notably more advanced. Specialized knowledge. Professional certifications. Deeper technical depth.' : ''}
${level === 4 ? '- Level 4 (+30% difficulty): Significantly more complex. Leadership skills. Cross-functional knowledge. Strategic thinking required.' : ''}
${level === 5 ? '- Level 5 (+40% difficulty): Advanced complexity. Innovation focus. Original contributions. Research-oriented work.' : ''}
${level === 6 ? '- Level 6 (+50% difficulty): High sophistication. Industry influence. Speaking/teaching opportunities. Community leadership.' : ''}
${level === 7 ? '- Level 7 (+60% difficulty): Expert-level demand. Publications. Advanced certifications. Industry-wide recognition.' : ''}
${level === 8 ? '- Level 8 (+70% difficulty): Master-level responsibility. Systematic mentoring. Program development. Organizational impact.' : ''}
${level === 9 ? '- Level 9 (+80% difficulty): Transformational impact. Paradigm shifts. Industry change leadership. Field advancement.' : ''}
${level === 10 ? '- Level 10 (+90% difficulty): Legacy-level contribution. Field-defining work. Generational influence. Revolutionary impact.' : ''}

Each level should demand:
- ${10 * (level - 1)}% more time investment
- ${10 * (level - 1)}% deeper technical/conceptual understanding  
- ${10 * (level - 1)}% more practical complexity in application
- ${10 * (level - 1)}% higher standards for outcomes/deliverables

RESOURCE REQUIREMENTS:
1. Each resource must be REAL and SPECIFIC (never invent fake courses or names):
   - Name actual courses (e.g., "Google UX Design Professional Certificate on Coursera")
   - Name actual books (e.g., "Don't Make Me Think" by Steve Krug)
   - Name actual certifications (e.g., "IAAP CPACC Certification")
   - Name actual tools/platforms (e.g., "Figma Advanced Prototyping Course by Figma")
   - Name actual conferences/events (e.g., "CSUN Assistive Technology Conference 2025")
   - If you don't know real specific names, provide general but authentic guidance

2. Focus on SKILL GAPS identified in the CV vs required skills for the career path

3. Include realistic time commitments scaled to level:
   - Level 1-2: 2-5 hours/week
   - Level 3-4: 5-10 hours/week
   - Level 5-6: 10-15 hours/week
   - Level 7-8: 15-20 hours/week
   - Level 9-10: 20+ hours/week

4. Explain tangible impact appropriate to level:
   - Lower levels: Building foundational skills, getting certified, portfolio creation
   - Mid levels: Advanced certifications, speaking at meetups, contributing to communities
   - Upper levels: Publishing research, speaking at conferences, driving industry change

5. Consider the user's current experience level and make recommendations that build logically on their existing skills

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "resources": [
    {
      "resource": "Exact name of REAL course/book/certification/tool",
      "commitment": "Specific time commitment appropriate to level ${level}",
      "impact": "Concrete outcome scaled to ${(level - 1) * 10}% more advanced than baseline, explaining how it fills skill gaps"
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
        model: 'google/gemini-2.5-pro',
        messages: [
          { 
            role: 'system', 
            content: `You are a precise career development strategist specializing in PROGRESSIVE DIFFICULTY SCALING. Each level must be exactly ${(level - 1) * 10}% more challenging than the baseline. Output valid JSON only with real, specific resources. Never include markdown, commentary, or generic suggestions. CRITICAL: Only reference real courses, books, certifications that actually exist.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2500
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
