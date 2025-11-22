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

    // Analyze education level and relevance
    let hasFormalEducation = false;
    let educationLevel = '';
    let educationDetails = '';
    
    // Add CV context (structured first, then text fallback)
    if (profile.wizard_data?.cv_structured) {
      const cv = profile.wizard_data.cv_structured;
      userContext += `\nCV Data (Structured):\n`;
      if (cv.current_role) userContext += `- Current Role: ${cv.current_role}\n`;
      if (cv.years_of_experience) userContext += `- Years of Experience: ${cv.years_of_experience}\n`;
      if (cv.key_skills?.length) userContext += `- Key Skills: ${cv.key_skills.join(', ')}\n`;
      if (cv.past_companies?.length) userContext += `- Companies: ${cv.past_companies.slice(0, 5).join(', ')}\n`;
      
      // Analyze education
      if (cv.education?.length) {
        educationDetails = cv.education.map((e: any) => `${e.degree} from ${e.institution}`).join('; ');
        userContext += `- Education: ${educationDetails}\n`;
        
        const educationLower = educationDetails.toLowerCase();
        if (educationLower.includes('degree') || educationLower.includes('bachelor') || 
            educationLower.includes('master') || educationLower.includes('mba') || 
            educationLower.includes('phd') || educationLower.includes('diploma')) {
          hasFormalEducation = true;
          
          // Check if education is relevant to the career path
          const pathCategory = activePath.category.toLowerCase();
          const pathTitle = activePath.title.toLowerCase();
          if (educationLower.includes(pathCategory) || educationLower.includes(pathTitle) ||
              pathCategory.split(' ').some((word: string) => word.length > 3 && educationLower.includes(word))) {
            educationLevel = 'HAS FORMAL DEGREE DIRECTLY IN THIS FIELD';
          } else {
            educationLevel = 'HAS FORMAL DEGREE BUT IN DIFFERENT FIELD';
          }
        }
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
          { 
            action: `MORNING: Review ${activePath.title} best practices focusing on ${cvSkills || 'key skills'}`, 
            timeNeeded: '45 minutes', 
            rationale: `Foundational knowledge for ${activePath.title}`,
            timeframe: 'morning',
            suggestions: ['Resource 1', 'Resource 2', 'Resource 3']
          },
          { 
            action: `AFTERNOON: Build a practical project applying ${skills || 'core skills'}`, 
            timeNeeded: '60 minutes', 
            rationale: 'Hands-on experience with real-world application',
            timeframe: 'afternoon',
            suggestions: ['Project idea 1', 'Project idea 2', 'Project idea 3']
          },
          { 
            action: `EVENING: Connect with 1 professional at ${companies || 'target companies'} on LinkedIn`, 
            timeNeeded: '30 minutes', 
            rationale: 'Build network aligned with your career path',
            timeframe: 'evening',
            suggestions: ['Networking tip 1', 'Networking tip 2', 'Networking tip 3']
          },
          { 
            action: `BONUS: Prepare talking points for your next 1-on-1 with your manager about career growth in ${activePath.title}`, 
            timeNeeded: '20 minutes', 
            rationale: 'Position yourself for advancement and visibility',
            timeframe: 'bonus',
            suggestions: ['Talking point 1', 'Talking point 2', 'Talking point 3']
          }
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

🔑 KEY REQUIREMENT - DAILY ACTION STRUCTURE:
Generate EXACTLY 4 daily actions structured as:
1. MORNING action (6am-12pm): Focus on learning, research, or skill development
2. AFTERNOON action (12pm-6pm): Focus on practical work, projects, or hands-on tasks
3. EVENING action (6pm-10pm): Focus on networking, community engagement, or reflection
4. BONUS action (flexible): Focus on career advancement, people management, or professional growth

Each action MUST include a "timeframe" field: "morning", "afternoon", "evening", or "bonus".

CURRENT SKILLS (from CV):
${profile.wizard_data?.cv_structured?.key_skills?.join(', ') || 'Not analyzed'}

📚 EDUCATION ANALYSIS:
${educationLevel || 'NO FORMAL DEGREE IDENTIFIED'}
${educationDetails ? `Details: ${educationDetails}` : ''}

⚠️ EDUCATION-BASED CONTENT RULES (CRITICAL):
${educationLevel === 'HAS FORMAL DEGREE DIRECTLY IN THIS FIELD'
  ? `- User already has formal education in ${activePath.category}
- SKIP ALL FOUNDATIONAL/BASIC/INTRODUCTORY content
- NO "101" courses, NO "Basics of X", NO "Introduction to Y"
- ONLY provide ADVANCED, SPECIALIZED, NICHE, or CUTTING-EDGE resources
- Assume user knows core fundamentals and principles
- Focus on skill gaps, advanced techniques, and expert-level knowledge`
  : educationLevel === 'HAS FORMAL DEGREE BUT IN DIFFERENT FIELD'
    ? `- User has formal education but not in ${activePath.category}
- Can include SOME foundational content but prefer INTERMEDIATE+ resources
- Skip the most basic concepts, assume general learning capability
- Focus on practical application and bridging from their background`
    : `- No formal degree identified
- Can include foundational content BUT make it SOPHISTICATED
- Use expert-curated sources, not generic tutorials
- Emphasize premium, insider knowledge even for basics`}

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
Create PREMIUM, SOPHISTICATED daily actions with content users couldn't easily find through ChatGPT. Every action must directly address skill gaps AND include people/team management aspects.

🤝 MANDATORY PEOPLE & TEAM MANAGEMENT INTEGRATION:
EVERY set of daily actions MUST include guidance on:
- How to communicate with seniors, managers, or leadership
- Career advancement strategies (promotions, visibility, positioning)
- Team collaboration and influence skills
- Professional relationship building
- Navigating workplace politics and dynamics
- Learning from others and seeking mentorship
- Building your professional reputation

AT LEAST ONE action (preferably the BONUS) must DIRECTLY focus on people/team management or career advancement.

Generate HIGHLY SPECIFIC, ACTIONABLE guidance grounded in the user's CV (structured fields when available, otherwise text), active path, level, and skill gaps. Include PRACTICAL/TECHNICAL depth with REAL-WORLD application. NO GENERIC ADVICE.

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

**CRITICAL - REAL, RECENT, SPECIFIC REFERENCES REQUIRED:**

1. PEOPLE - Use actual industry leaders with their real titles/companies:
   - ✅ "Sarah Drasner, VP of Developer Experience at Google" (if real and current in 2024)
   - ✅ "Search LinkedIn for 'Head of Product at Stripe' and draft personalized outreach"
   - ❌ "John Smith, CTO at TechCorp" (invented name)

2. BRANDS & COMPANIES - Reference real organizations doing real work:
   - ✅ "Patagonia's 2024 regenerative agriculture partnership with suppliers"
   - ✅ "Nike's 2024 sustainability report on circular design"
   - ❌ "Leading companies in the space" (too vague)

3. ARTICLES & PUBLICATIONS - Cite real, recent sources (2024 strongly preferred, 2023 acceptable):
   - ✅ "Harvard Business Review, March 2024: [actual article topic]"
   - ✅ "Forbes published Q1 2024 data showing [actual trend]"
   - ✅ "Bloomberg reported in February 2024 that [actual finding]"
   - ❌ "Recent studies show..." (no source, no date)
   - ❌ Articles from 2022 or earlier unless historically significant

4. COURSES & CERTIFICATIONS - Only mention programs that genuinely exist:
   - ✅ "Google UX Design Professional Certificate on Coursera"
   - ✅ "IAAP CPACC (Certified Professional in Accessibility Core Competencies)"
   - ❌ "Advanced Event Management Certification" (unless you can name the issuing organization)

5. BOOKS & RESOURCES - Real publications with real authors:
   - ✅ "'Don't Make Me Think' by Steve Krug"
   - ✅ "'Atomic Habits' by James Clear"
   - ❌ "'The Complete Guide to [Topic]'" (invented title)

6. CONFERENCES & EVENTS - Real events with dates:
   - ✅ "CSUN Assistive Technology Conference 2025 (March 17-21, Anaheim)"
   - ✅ "ReactConf 2024 keynote by [actual speaker]"
   - ❌ "Attend industry conferences" (no specifics)

**VERIFICATION REQUIREMENT:**
- If you don't have current 2024 information about something, use general but authentic guidance
- Better to say "Search TechCrunch for recent articles on [topic]" than invent article titles
- Better to say "Find accessibility leaders on LinkedIn" than invent names
- ALWAYS prefer specificity when you have it, generality when you don't - NEVER invent

STRUCTURE (valid JSON ONLY - EXACTLY 4 ACTIONS):
{
  "dailyActions": [
    { 
      "action": "MORNING: Specific learning/research action with resource/skill names", 
      "timeNeeded": "30-60 minutes", 
      "rationale": "Why this matters for your path and level",
      "timeframe": "morning",
      "suggestions": ["Specific person/resource 1", "Specific person/resource 2", "Specific person/resource 3"]
    },
    { 
      "action": "AFTERNOON: Practical/technical hands-on action with concrete details", 
      "timeNeeded": "45-90 minutes", 
      "rationale": "Impact on career path and skill development",
      "timeframe": "afternoon",
      "suggestions": ["Specific person/resource 1", "Specific person/resource 2", "Specific person/resource 3"]
    },
    { 
      "action": "EVENING: Networking/community engagement action with exact names", 
      "timeNeeded": "20-45 minutes", 
      "rationale": "How it builds your network and reputation",
      "timeframe": "evening",
      "suggestions": ["Specific person/resource 1", "Specific person/resource 2", "Specific person/resource 3"]
    },
    { 
      "action": "BONUS: Career advancement/people management action focusing on communication with seniors, team dynamics, or professional growth", 
      "timeNeeded": "15-30 minutes", 
      "rationale": "How this advances your career and strengthens professional relationships",
      "timeframe": "bonus",
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

3. SUGGESTIONS MUST BE PREMIUM CONTENT WITH REAL REFERENCES (2024 DATA):
   Each action's "suggestions" array (3 items) must contain:
   
   For RESEARCH actions - Provide ACTUAL FINDINGS with SOURCES and DATES:
   - ✅ "Forbes (January 2024) reported a 45% increase in [specific metric]. McKinsey's Q4 2023 study identified 3 key drivers: [list them]. Based on this data, your next steps: 1) Analyze how [target company] implements [specific approach], 2) Document 5 specific examples from [industry leader's] 2024 work, 3) Create comparison framework based on [specific model]."
   - ✅ "Sarah Chen, Director of Product at Figma (featured in Product Hunt podcast, Feb 2024) shared insights on [specific topic]. Key takeaway: [actual quote or finding]. Apply this by: [3 concrete actions with real references]."
   - ❌ "Search for trends in X" or "Look for articles about Y" or "Recent studies show..."
   
   For LEARNING actions - REAL COURSES with SPECIFICS:
   - ✅ "'Advanced React Patterns' by Kent C. Dodds (Epic React, $400, 8 weeks) - Module 4 'Compound Components' directly addresses your component architecture skill gap. Includes 12 exercises building production-ready patterns used by Stripe and Discord."
   - ✅ "Enroll in 'UX Research Methods' by Sarah Doody (Career Strategy Lab, starts April 15, 2024, $299) - Week 3 covers Jobs-to-be-Done framework with case study from Airbnb's 2023 redesign."
   - ❌ "Take a course on React" or "Learn about design patterns" or invented course names
   
   For NETWORKING actions - COMPLETE DRAFT MESSAGES:
   - ✅ "Draft message: 'Hi Jessica, I saw your LinkedIn post about Microsoft's 2024 accessibility initiative. I'm transitioning into accessible design and working on implementing WCAG 2.2 AA for a fintech app. Your experience with enterprise-scale accessibility at [company] would be invaluable. Would you have 15 minutes next Thursday (March 21) to chat about [specific question]? Best, [Name]'"
   - ✅ "Contact: Search LinkedIn for 'Accessibility Lead at Spotify' + 'Accessibility Lead at Apple' - Draft: 'Hi [Name], Your team's work on [specific feature] sets the industry standard. I'm developing [specific project]. Could I get your perspective on [concrete technical question]? Happy to share my findings. Thanks, [Your name]'"
   - ❌ "Reach out to industry leaders" or "Message people on LinkedIn" or invented names
   
   For CONTENT CREATION actions - ACTUAL DRAFTS/OUTLINES:
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
                        timeframe: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'bonus'] },
                        suggestions: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['action', 'timeNeeded', 'rationale', 'timeframe', 'suggestions'],
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
