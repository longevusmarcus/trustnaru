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

    // Add progress stats including current level
    if (stats) {
      userContext += `\nCurrent Progress:\n`;
      userContext += `- Current Level: ${stats.current_level}/10\n`;
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
    const userLevel = stats?.current_level || 1;
    const difficultyMultiplier = (userLevel - 1) * 10;
    
    const prompt = `You are an elite career strategist with real market awareness and access to current information.

🎯 CONTEXT:
You are an industry insider with deep expertise in ${activePath?.title || 'their chosen field'}.

USER INFORMATION:
- Name: ${userName}
- Active Career Path: ${activePath?.title || 'Not set'}
- Target Role: ${activePath?.target_role || 'Not specified'}
- Career Experience: ${profile.wizard_data?.cv_structured?.current_role || 'Not specified'}
- Current Journey Level: ${userLevel}/10 (${difficultyMultiplier}% more challenging than baseline)

CURRENT SKILLS (from CV):
${profile.wizard_data?.cv_structured?.key_skills?.join(', ') || 'Not analyzed'}

🚨 CRITICAL SKILL GAPS TO ADDRESS (PRIMARY FOCUS):
${(() => {
  const targetSkills = activePath?.key_skills || [];
  const currentSkills = profile.wizard_data?.cv_structured?.key_skills || [];
  const gaps = targetSkills.filter(
    (skill: string) => !currentSkills.some((cs: string) => 
      cs.toLowerCase().includes(skill.toLowerCase()) || 
      skill.toLowerCase().includes(cs.toLowerCase())
    )
  );
  return gaps.length > 0 ? gaps.join(' | ') : 'No specific gaps - focus on advanced aspects of ' + (activePath?.target_role || 'the target role');
})()}

YOUR MISSION:
Create PREMIUM, SOPHISTICATED daily actions with content users couldn't easily find through ChatGPT. Every action must directly address skill gaps.
Generate HIGHLY SPECIFIC, ACTIONABLE guidance grounded in the user's CV (structured fields when available, otherwise text), active path, and future (explored) paths. NO GENERIC ADVICE.

**PROGRESSIVE DIFFICULTY SCALING - CRITICAL:**
The user is at Level ${userLevel}/10. ALL actions, tips, and resources must be scaled to be ${difficultyMultiplier}% MORE CHALLENGING than baseline (Level 1).

Level ${userLevel} characteristics:
- Actions should require ${difficultyMultiplier}% more time/effort than basic Level 1 tasks
- ${difficultyMultiplier}% deeper technical/conceptual understanding required
- ${difficultyMultiplier}% more sophisticated practical application
- ${difficultyMultiplier}% higher standards for quality and outcomes

Time Investment Scaling:
- Level 1: 15-30 min per action
- Level 2-3: 30-45 min per action  
- Level 4-5: 45-60 min per action
- Level 6-7: 60-90 min per action
- Level 8-10: 90+ min per action

Complexity Scaling:
- Level 1-2: Foundational skills, basic concepts, following tutorials
- Level 3-4: Intermediate application, combining concepts, building projects
- Level 5-6: Advanced techniques, optimization, performance, best practices
- Level 7-8: Expert-level work, mentoring others, contributing to field
- Level 9-10: Industry leadership, innovation, publishing, transformational impact

**CRITICAL - ONLY USE REAL, VERIFIABLE INFORMATION:**
- NEVER invent or hallucinate names of people, companies, resources, or organizations
- ONLY suggest real people who actually exist in the industry/field
- ONLY reference real companies, real courses, real books, real certifications that actually exist
- If you don't know real specific names, provide general but authentic guidance (e.g., "LinkedIn connections in [field]" rather than inventing fake names)
- For networking actions: Suggest searching for real professionals in specific roles/companies, not made-up names
- For learning resources: Only mention courses, books, certifications that genuinely exist (e.g., real Coursera courses, real books with ISBN, real certifications)

**IMPORTANT - BE ULTRA SPECIFIC WITH REAL INFORMATION:**
- For research/learning actions: Provide SPECIFIC real article titles or resource names that exist (e.g., "Read articles on TechCrunch about AI in Healthcare" NOT "Read 'The Rise of AI in Healthcare 2025'" unless you're certain it exists)
- For skill practice actions: Pick ONE SPECIFIC skill from the user's key skills list (${activePath.key_skills?.join(', ') || 'their skills'}) and suggest a CONCRETE practice activity appropriate to Level ${userLevel} difficulty
- For networking actions: Include actual company names and suggest searching for real roles, NOT inventing contact names

If CV structured data is present (current role, years of experience, key skills, companies, education), leverage those exact fields.
When referencing companies, include actual teams/roles but suggest ways to find real contacts rather than providing fake names.
Only reference real, verifiable organizations, certifications, and named communities that actually exist.

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

PREMIUM QUALITY STANDARDS:

1. SKILL GAP FOCUS (MANDATORY):
   - EVERY dailyAction must directly address at least one identified skill gap from the user's profile
   - Be explicit about which skill gap you're addressing
   - If no skill gaps listed, focus on advanced/sophisticated aspects of their target role

2. DO THE WORK - NO INSTRUCTIONS:
   - Never say "Search for", "Look up", "Research", "Find", "Identify", "List", "Map", "Consider"
   - You are a premium research assistant who has ALREADY done the work
   - Provide actual findings, specific names, ready-to-use content

3. SUGGESTIONS MUST BE PREMIUM CONTENT:
   Each action's "suggestions" array (3 items) must contain:
   
   For RESEARCH actions:
   - ✅ "Recent industry analysis reveals: [Actual finding 1], [Actual finding 2], [Actual finding 3]. Based on this, your next steps: [Specific action 1], [Specific action 2], [Specific action 3]"
   - ❌ "Search for trends in X" or "Look for articles about Y"
   
   For LEARNING actions:
   - ✅ "'Advanced React Patterns' by Kent C. Dodds (Epic React, $400, 8 weeks) - Covers compound components, render props, hooks optimization. Directly addresses your skill gap in component architecture."
   - ❌ "Take a course on React" or "Learn about design patterns"
   
   For NETWORKING actions:
   - ✅ Complete, copy-paste-ready message: "Hi Sarah, I saw your talk at ReactConf 2024 on component composition. I'm transitioning into [role] and working on [specific project]. Your approach to [specific technique] would be invaluable. Would you have 15 minutes next Thursday to chat? [Your name]"
   - ❌ "Reach out to industry leaders" or "Message people on LinkedIn"
   
   For CONTENT CREATION actions:
   - ✅ "Key frameworks to cover: 1) [Framework name + 2 sentence explanation], 2) [Framework name + 2 sentence explanation], 3) [Framework name + 2 sentence explanation]. Draft structure: Intro hook, Problem statement, Solution comparison table, Implementation guide, Conclusion with call-to-action."
   - ❌ "Write about best practices" or "Create content about your field"

4. SPECIFICITY REQUIREMENTS:
   - Course names, book titles, article headlines, community names (real and verifiable)
   - Platform/author/publisher (e.g., "Coursera", "O'Reilly", "CSS-Tricks", "Smashing Magazine")
   - Time commitments (e.g., "2 hours/week for 6 weeks", not just "30 hours")
   - Costs (exact $ or "Free" or "Freemium with $X premium tier")
   - Why it matters for THIS user's unique situation (reference their skill gaps, background, goals)

5. PREMIUM SOURCING:
   - Insider blogs (specific Substacks, Medium publications)
   - Niche communities (named Discord servers, Slack groups, subreddits)
   - Expert-curated platforms (Egghead.io, Frontend Masters, Pluralsight paths)
   - Industry publications (A List Apart, Smashing Magazine, specific newsletters)
   - Conference talks (React Conf, An Event Apart, specific speaker names)
   - Professional certifications (AWS, Google Cloud, PMI, specific credential names)

6. CUSTOMIZATION:
   - Reference their existing skills and build on them
   - Connect to their specific skill gaps
   - Tie to their target role and career path
   - Explain why this is better than generic alternatives

7. NO PLACEHOLDERS:
   - NO [Your Name], [Project Name], [Company], [Details]
   - Every message, template, or draft must be complete
   - Users should be able to copy-paste directly

8. OUTPUT FORMAT:
   - Pure JSON only, no markdown, no code fences
   - Follow the schema exactly

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

    console.log('Calling Lovable AI Gateway (Gemini Pro) for personalized guidance with real information...');

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
            content: `You are an elite career strategist. Generate specific guidance with real resources. Scale to Level ${userLevel} (${difficultyMultiplier}% more challenging than baseline).`
          },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_guidance',
              description: 'Generate personalized career guidance',
              parameters: {
                type: 'object',
                properties: {
                  dailyActions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        action: { type: 'string' },
                        timeNeeded: { type: 'string' },
                        rationale: { type: 'string' },
                        suggestions: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['action', 'timeNeeded', 'rationale', 'suggestions'],
                      additionalProperties: false
                    }
                  },
                  smartTips: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        tip: { type: 'string' },
                        context: { type: 'string' }
                      },
                      required: ['tip', 'context'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['dailyActions', 'smartTips'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_guidance' } },
        temperature: 0.3,
        max_tokens: 3000
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call in AI response');
      return new Response(
        JSON.stringify(buildFallbackGuidance()),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const guidance = JSON.parse(toolCall.function.arguments);

    if (!guidance?.dailyActions || !Array.isArray(guidance.dailyActions) || guidance.dailyActions.length === 0) {
      console.warn('AI returned empty guidance');
      return new Response(
        JSON.stringify(buildFallbackGuidance()),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated personalized guidance');

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
