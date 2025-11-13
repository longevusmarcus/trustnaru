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

    // Add CV context (structured first, then text fallback)
    if (profile.wizard_data?.cv_structured) {
      const cv = profile.wizard_data.cv_structured;
      userContext += `\nCV Data (Structured):\n`;
      if (cv.current_role) userContext += `- Current Role: ${cv.current_role}\n`;
      if (cv.years_of_experience) userContext += `- Years of Experience: ${cv.years_of_experience}\n`;
      if (cv.key_skills?.length) userContext += `- Key Skills: ${cv.key_skills.join(', ')}\n`;
      if (cv.past_companies?.length) userContext += `- Companies: ${cv.past_companies.slice(0, 5).join(', ')}\n`;
      if (cv.education?.length) {
        userContext += `- Education: ${cv.education.map((e: any) => `${e.degree} from ${e.institution}`).join('; ')}\n`;
      }
      if (cv.certifications?.length) userContext += `- Certifications: ${cv.certifications.join(', ')}\n`;
      if (cv.notable_achievements?.length) {
        userContext += `- Achievements: ${cv.notable_achievements.slice(0, 3).join('; ')}\n`;
      }
    } else if (profile.wizard_data?.cv_text) {
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

    // Include future (explored) paths besides active
    const { data: futurePaths } = await supabaseClient
      .from('career_paths')
      .select('title, category')
      .eq('user_id', user.id)
      .neq('id', profile.active_path_id)
      .limit(6);
    if (futurePaths && futurePaths.length) {
      userContext += `\nFuture Paths (consider when tailoring tips):\n`;
      for (const p of futurePaths) userContext += `- ${p.title} (${p.category})\n`;
    }

    // Simple deterministic fallback in case AI fails
    const buildFallbackGuidance = () => {
      const futureTitles = (futurePaths || []).map(p => p.title).slice(0, 2).join(', ');
      const companies = (activePath.target_companies || []).slice(0, 3).join(', ');
      const skills = (activePath.key_skills || []).slice(0, 3).join(', ');
      
      // Use structured CV data if available
      const cv = profile.wizard_data?.cv_structured;
      const cvRole = cv?.current_role || 'your current role';
      const cvSkills = cv?.key_skills?.slice(0, 3).join(', ') || skills;
      const cvYears = cv?.years_of_experience ? `${cv.years_of_experience} years` : '';

      return {
        dailyActions: [
          { action: `Review WCAG checklist focusing on ${cvSkills || 'key skills'}`, timeNeeded: '30 minutes', rationale: `Foundational work for ${activePath.title}` },
          { action: `Identify 1 contact at ${companies || 'target companies'} on LinkedIn and craft a message`, timeNeeded: '45 minutes', rationale: 'Network aligned with your target path' },
          { action: `Read 1 case study from ${(companies || 'leading orgs').split(',')[0]}`, timeNeeded: '20 minutes', rationale: 'Build market awareness with concrete examples' }
        ],
        smartTips: [
          { tip: `Follow ${(companies || 'leading companies').split(',')[0]} accessibility updates`, nextSteps: 'Subscribe to engineering/design blogs and a11y channels', strategicValue: 'Keeps your portfolio aligned with current practices' },
          { tip: 'Join accessibility communities (A11y Project, W3C WAI)', nextSteps: 'Introduce yourself and share 1 learning goal', strategicValue: 'Peer accountability and mentorship opportunities' },
          { tip: `Transferable plan across ${futureTitles || 'relevant future paths'}`, nextSteps: `Overlapping skills: ${cvSkills || 'WCAG, User research, Prototyping'}. Artifact to build: "Accessible Signup Flow" (Figma + HTML/CSS) including keyboard navigation, visible focus states, ARIA labels, and color-contrast tokens. Provide a 200-word rationale referencing WCAG 2.1 AA and how it supports ${activePath.title}.`, strategicValue: 'A single artifact that advances multiple directions and showcases concrete a11y practice' }
        ],
        levelResources: [
          { resource: `IAAP CPACC (Certified Professional in Accessibility Core Competencies) prep course focusing on ${activePath.category} applications`, commitment: '12 weeks, 3-4 hours/week', impact: 'Industry-recognized certification that validates foundational accessibility knowledge for UX/UI roles' },
          { resource: `"Inclusive Design Patterns" by Heydon Pickering - Complete practical guide with code examples for ${cvRole || 'designers'}`, commitment: '2 weeks to read + implement 3 patterns', impact: 'Build portfolio of 3 production-ready accessible components you can showcase' },
          { resource: `WebAIM's WCAG 2.1 Checklist + weekly practice auditing 2 sites from your target companies (${companies || 'industry leaders'})`, commitment: '1 hour/week for 8 weeks', impact: `Develop systematic audit skills and understand real-world accessibility patterns at ${companies || 'top companies'}` }
        ]
      };
    };

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Create sophisticated prompt for Gemini
    const prompt = `You are an elite career strategist with real market awareness.

USER CONTEXT:
${userContext}

CRITICAL INSTRUCTIONS:
Generate HIGHLY SPECIFIC, ACTIONABLE guidance grounded in the user's CV (structured fields when available, otherwise text), active path, and future (explored) paths. NO GENERIC ADVICE.

**IMPORTANT - BE ULTRA SPECIFIC:**
- For research/learning actions: Provide SPECIFIC article titles or resource names (e.g., "Read 'The Rise of AI in Healthcare 2025' on TechCrunch" NOT "Read an article")
- For skill practice actions: Pick ONE SPECIFIC skill from the user's key skills list (${activePath.key_skills?.join(', ') || 'their skills'}) and suggest a CONCRETE practice activity (e.g., "Practice React hooks - build a custom useLocalStorage hook" NOT "Practice coding")
- For networking actions: Include actual company names, teams, and ready-to-send message templates

If CV structured data is present (current role, years of experience, key skills, companies, education), leverage those exact fields.
When referencing companies, include actual teams/roles and a real point of contact where possible.
If you are unsure, prefer credible organizations, certifications, and named communities over vague suggestions.

STRUCTURE (valid JSON ONLY):
{
  "dailyActions": [
    { 
      "action": "Specific action with resource/skill names", 
      "timeNeeded": "30 minutes", 
      "rationale": "Why this matters",
      "suggestions": ["Specific person/resource 1", "Specific person/resource 2", "Specific person/resource 3"]
    },
    { 
      "action": "Another specific action with concrete details", 
      "timeNeeded": "1 hour", 
      "rationale": "Impact on career path",
      "suggestions": ["Specific person/resource 1", "Specific person/resource 2", "Specific person/resource 3"]
    },
    { 
      "action": "Third specific action with exact names", 
      "timeNeeded": "15 minutes", 
      "rationale": "How it helps",
      "suggestions": ["Specific person/resource 1", "Specific person/resource 2", "Specific person/resource 3"]
    }
  ],
  "smartTips": [
    { "tip": "...", "nextSteps": "...", "strategicValue": "..." },
    { "tip": "...", "nextSteps": "...", "strategicValue": "..." },
    { "tip": "...", "nextSteps": "...", "strategicValue": "..." }
  ],
  "levelResources": [
    { "resource": "...", "commitment": "...", "impact": "..." },
    { "resource": "...", "commitment": "...", "impact": "..." },
    { "resource": "...", "commitment": "...", "impact": "..." }
  ]
}

QUALITY RULES:
- Do the work for the user. Never say "list", "map", "consider", or "choose". Provide the computed outputs directly with SPECIFIC NAMES.
- Every dailyAction must include concrete resource names (articles, books, courses), specific skill names from their key_skills, or actual company/person names.
- Every dailyAction MUST include a "suggestions" array with 3 specific, actionable suggestions:
  * If the action involves people (speakers, mentors, leaders): provide 3 real names of people in the field with their titles/organizations
  * If the action involves content (articles, books): provide 3 specific article titles or book names with sources
  * If the action involves learning resources: provide 3 specific course names, platforms, or tools
  * If the action involves companies/networking: provide 3 specific company names or communities with context
  * These suggestions should make the action immediately actionable with zero research needed from the user
- Every item must include concrete names (people/teams/orgs), dates (if events), costs/duration (if courses), and why it matters for the active path.
- Prefer accessibility leaders, A11y conferences, and inclusive design communities for accessibility roles.
- Consider FUTURE PATHS when recommending transferable steps that help across multiple directions.
- Transferable steps must include the 3 overlapping skills by name and 1 concrete artifact name with a one-sentence spec.
- Outreach/networking items must include a ready-to-send message (no placeholders).
- Output ONLY JSON. No markdown.

LEVEL RESOURCES REQUIREMENTS (CRITICAL):
- For Level 1 (Foundation): Provide REAL, SPECIFIC resources that are concrete and actionable
- Use actual course names, certification programs, tools, books, or platforms (e.g., "Deque University Web Accessibility Course", "IAAP CPACC Certification", "Inclusive Design Patterns by Heydon Pickering")
- Include realistic time commitments (e.g., "8 hours over 2 weeks", "30 min daily practice", "12 weeks, 3-4 hours/week")
- Explain tangible impact with outcomes (e.g., "Get certified credential for resume", "Build portfolio of 5 accessible components", "Industry-recognized certification")
- Avoid vague suggestions like "take an online course" - name the exact course, book, certification, or tool
- Resources should be directly relevant to the user's career path and leverage their current experience level
- Output ONLY JSON. No markdown.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI Gateway (Gemini Flash) for personalized guidance...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

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

    // Extract/parse JSON from response defensively
    let jsonText = String(generatedText).trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    let guidance: any = null;
    try {
      guidance = JSON.parse(jsonText);
    } catch (_) {
      try {
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) guidance = JSON.parse(match[0]);
      } catch (_) { /* ignore */ }
    }

    if (!guidance || !Array.isArray(guidance.smartTips)) {
      console.warn('AI JSON parse failed or empty guidance, using fallback');
      guidance = buildFallbackGuidance();
    }

    console.log('Successfully generated personalized guidance (parsed or fallback)');

    return new Response(
      JSON.stringify(guidance),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-personalized-guidance function:', error);
    // Final fallback to avoid blocking UI
    return new Response(
      JSON.stringify({ dailyActions: [], smartTips: [], levelResources: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
