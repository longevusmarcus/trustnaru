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

    console.log('Generating personalized guidance for user:', user.id);

    // Get comprehensive user profile
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('active_path_id, display_name, cv_url, voice_transcription, wizard_data')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('Profile loaded:', { hasProfile: !!profile, hasActivePath: !!profile?.active_path_id });

    // Get user stats
    const { data: stats } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.active_path_id) {
      console.log('No active path found for user');
      return new Response(
        JSON.stringify({ 
          error: 'No active path',
          dailyActions: [],
          smartTips: [],
          levelResources: []
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
      console.log('Active path not found in database');
      throw new Error('Active path not found');
    }

    console.log('Generating guidance for path:', activePath.title);

    const userName = profile.display_name || user.email?.split('@')[0] || 'there';
    
    // Build rich context for AI
    let userContext = `User Name: ${userName}\n\n`;
    userContext += `Active Career Path: ${activePath.title}\n`;
    userContext += `Category: ${activePath.category}\n`;
    userContext += `Description: ${activePath.description}\n`;
    
    if (activePath.key_skills?.length) {
      userContext += `Key Skills to Develop: ${activePath.key_skills.join(', ')}\n`;
    }
    
    if (activePath.target_companies?.length) {
      userContext += `Target Companies: ${activePath.target_companies.join(', ')}\n`;
    }

    if (activePath.impact_areas?.length) {
      userContext += `Impact Areas: ${activePath.impact_areas.join(', ')}\n`;
    }

    if (activePath.journey_duration) {
      userContext += `Journey Timeline: ${activePath.journey_duration}\n`;
    }

    if (activePath.salary_range) {
      userContext += `Target Salary Range: ${activePath.salary_range}\n`;
    }

    // Add CV context
    if (profile.wizard_data?.cv_text) {
      const cvText = String(profile.wizard_data.cv_text).trim();
      const snippet = cvText.length > 2000 ? cvText.slice(0, 2000) + '...' : cvText;
      userContext += `\nCV Summary:\n${snippet}\n`;
    } else if (profile.wizard_data) {
      const wizardData = profile.wizard_data as any;
      if (wizardData.currentRole) {
        userContext += `\nCurrent Role: ${wizardData.currentRole}\n`;
      }
      if (wizardData.experience) {
        userContext += `Experience Level: ${wizardData.experience}\n`;
      }
    }

    // Add voice aspirations
    if (profile.voice_transcription) {
      userContext += `\nCareer Aspirations (User's Own Words):\n"${profile.voice_transcription}"\n`;
    }

    // Add progress stats
    if (stats) {
      userContext += `\nCurrent Progress:\n`;
      userContext += `- Day Streak: ${stats.current_streak}\n`;
      userContext += `- Paths Explored: ${stats.paths_explored}\n`;
      userContext += `- Missions Completed: ${stats.missions_completed}\n`;
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Create sophisticated prompt for Gemini
    const prompt = `You are an elite career strategist with deep industry connections and real-world expertise.

USER CONTEXT:
${userContext}

CRITICAL INSTRUCTIONS:
Generate HIGHLY SPECIFIC, ACTIONABLE guidance. NO GENERIC ADVICE ALLOWED.

❌ FORBIDDEN (Generic/Vague):
- "Connect with professionals on LinkedIn"
- "Research companies in your field"
- "Take an online course"
- "Read industry blogs"
- "Network with people"

✅ REQUIRED (Specific/Actionable):
- "DM Sarah Chen (@sarahchen_ux) on LinkedIn - she's Head of Accessibility at Airbnb and mentors designers transitioning to inclusive design"
- "Apply to Fable's Accessibility Fellowship (closes March 15) - they specifically seek designers with UX backgrounds"
- "Complete Nielsen Norman Group's 'Accessibility Specialist' certification (4 weeks, $1,200) - it's the gold standard for UX accessibility roles"
- "Attend the CSUN Assistive Technology Conference (March 18-22, Anaheim) - 80% of accessibility hiring managers attend"

Generate 3 sections in JSON format:

1. DAILY ACTIONS (3 items):
   - Each action must be completable TODAY
   - Include SPECIFIC people to contact (with LinkedIn handles if networking)
   - Include SPECIFIC resources/tools/events with dates
   - State the exact time needed (e.g., "30 minutes", "1 hour")
   - Explain WHY this specific action matters for their path

2. SMART TIPS (3 items):
   - Each tip must include SPECIFIC names, resources, or contacts
   - Reference REAL industry leaders, companies, or resources
   - Include actionable next steps with specifics
   - Explain the strategic value for their career path

3. LEVEL RESOURCES (3 items):
   - Each resource must be REAL and verifiable (courses, certifications, books, communities)
   - Include pricing/time commitment where relevant
   - Match their current experience level (${stats?.missions_completed || 0} missions completed)
   - Explain why THIS resource is crucial for their specific path

QUALITY STANDARDS:
- Every suggestion must pass this test: "Can the user take this action without Googling for more info?"
- If you mention a person: Include their title, company, and where to find them
- If you mention an event: Include dates, location, and why it matters
- If you mention a course: Include provider, duration, cost, and ROI
- If you mention a company: Explain why THEY SPECIFICALLY are hiring for this path

Return ONLY valid JSON in this exact format:
{
  "dailyActions": [
    {
      "action": "Specific action with all details",
      "timeNeeded": "30 minutes",
      "rationale": "Why this matters for their path"
    }
  ],
  "smartTips": [
    {
      "tip": "Specific tip with names/resources",
      "nextSteps": "Exact steps to implement",
      "strategicValue": "Why this advances their career"
    }
  ],
  "levelResources": [
    {
      "resource": "Specific resource name and details",
      "commitment": "Time/cost investment",
      "impact": "How this accelerates their path"
    }
  ]
}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI Gateway (Gemini Flash) for personalized guidance...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a precise career strategist. Output valid JSON only. Never include markdown or commentary.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 700
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

    // Extract JSON from response (handle code blocks defensively)
    let jsonText = String(generatedText).trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const guidance = JSON.parse(jsonText);

    console.log('Successfully generated personalized guidance');

    return new Response(
      JSON.stringify(guidance),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-personalized-guidance function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        dailyActions: [],
        smartTips: [],
        levelResources: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
