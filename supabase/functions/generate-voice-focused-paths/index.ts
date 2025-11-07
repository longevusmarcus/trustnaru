import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get user profile with voice and CV
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('voice_transcription, cv_url')
      .eq('user_id', user.id)
      .single();

    if (!profile?.voice_transcription) {
      throw new Error('Voice transcription required for voice-focused paths');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Fetch liked career paths to learn from user preferences
    let likedPathsContext = '';
    const { data: likedPaths } = await supabaseClient
      .from('career_paths')
      .select('title, description, category, key_skills, salary_range, journey_duration')
      .eq('user_id', user.id)
      .eq('user_feedback', 'up')
      .order('created_at', { ascending: false })
      .limit(10);

    if (likedPaths && likedPaths.length > 0) {
      likedPathsContext = `
🎯 USER'S LIKED CAREER PATHS (Learn from these preferences):
${likedPaths.map((path, idx) => `
${idx + 1}. ${path.title}
   - Category: ${path.category}
   - Description: ${path.description}
   - Key Skills: ${path.key_skills?.join(', ')}
   - Salary: ${path.salary_range}
   - Timeline: ${path.journey_duration}
`).join('')}

⚠️ CRITICAL: Use these liked paths to understand what resonates with the user:
- Notice patterns in their preferred career types, industries, and work styles
- Generate NEW paths with similar energy, passion focus, and career attributes
- Match the experience level, salary expectations, and lifestyle they prefer
- If they liked specific passion areas, double down on those themes
- Maintain the same level of specificity and realism they responded to
`;
      console.log(`Found ${likedPaths.length} liked paths to learn from`);
    }

    // Step 1: Quick CV analysis for baseline skills
    let cvSkills = 'General professional experience';
    let experienceLevel = 'mid';
    
    if (profile.cv_url) {
      console.log('Quick CV skills extraction...');
      const { data: signedCvUrl } = await supabaseClient
        .storage
        .from('cvs')
        .createSignedUrl(profile.cv_url, 3600);

      if (signedCvUrl) {
        try {
          const cvResponse = await fetch(signedCvUrl.signedUrl);
          const cvBlob = await cvResponse.blob();
          const cvBuffer = await cvBlob.arrayBuffer();
          
          const bytes = new Uint8Array(cvBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const cvBase64 = btoa(binary);
          
          const quickAnalysisPrompt = `Extract ONLY:
1. Core professional skills (list 5-7)
2. Years of experience (estimate)
3. Experience level: entry|mid|senior|executive

Return JSON: {"skills": [], "years": X, "level": "mid"}`;

          const analysisResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: quickAnalysisPrompt },
                    { inline_data: { mime_type: 'application/pdf', data: cvBase64 } }
                  ]
                }],
                generationConfig: { response_mime_type: "application/json" }
              }),
            }
          );

          if (analysisResponse.ok) {
            const data = await analysisResponse.json();
            const analysis = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
            cvSkills = analysis.skills?.join(', ') || cvSkills;
            experienceLevel = analysis.level || experienceLevel;
          }
        } catch (e) {
          console.error('CV analysis error:', e);
        }
      }
    }

    // Step 2: Generate voice-focused career paths
    console.log('Generating voice-focused career paths...');
    
    const prompt = `You are a career transformation expert specializing in turning personal passions into viable career paths.

USER'S VOICE TRANSCRIPT (PRIMARY SOURCE - 75% weight):
${profile.voice_transcription}

PROFESSIONAL BASELINE (For realistic calibration - 25% weight):
- Experience Level: ${experienceLevel}
- Core Skills: ${cvSkills}

${likedPathsContext}

YOUR MISSION:
Generate 7 REALISTIC career paths where paths 1-2 are standard, BUT paths 3-7 are ULTRA-CUSTOMIZED to the user's exact passions, interests, and energy from their voice transcript.

CRITICAL INSTRUCTIONS:

1. VOICE PASSION EXTRACTION (Most Important):
   - Read the voice transcript MULTIPLE TIMES
   - Extract EVERY mention of:
     * Hobbies ("I love tea", "passionate about yoga")
     * Interests ("fascinated by mindfulness", "into sustainable living")
     * Dreams ("always wanted to", "would love to")
     * Values ("care deeply about", "believe in")
   - Note EXACT WORDS they use

2. CREATE HYPER-SPECIFIC PASSION CAREERS (Paths 3-7):
   
   Examples of transformation:
   - Voice: "tea ceremony + mindfulness" → Paths: "Tea Ceremony Educator", "Mindful Tea Retreat Owner", "Tea & Meditation Studio Director"
   - Voice: "love wine + hosting" → Paths: "Wine Experience Curator", "Wine Tasting Room Manager", "Private Wine Collection Consultant"
   - Voice: "yoga + entrepreneurship" → Paths: "Yoga Retreat Designer", "Yoga Studio Founder", "Wellness Space Developer"
   - Voice: "sustainability + fashion" → Paths: "Sustainable Fashion Consultant", "Eco-Brand Strategist", "Circular Fashion Advisor"
   
   RULES FOR PASSION PATHS:
   - Use EXACT passion words from voice ("tea" not "beverages", "mindfulness" not "wellness")
   - Combine 2 passions when mentioned together
   - Make them REAL jobs that exist (check: can you find this on LinkedIn?)
   - Bridge their professional skills with their passion

3. STANDARD PATHS (Paths 1-2):
   - Path 1: Natural next step using CV skills
   - Path 2: Adjacent career using transferable skills
   - Keep realistic to their experience level

4. REALISM BY EXPERIENCE LEVEL:
   
   entry (0-3 years):
   - Titles: Coordinator, Associate, Specialist
   - Salary: $45k-$75k
   - Paths can include "trainee" or "assistant" roles
   
   mid (3-7 years):
   - Titles: Manager, Senior, Lead
   - Salary: $75k-$130k
   - Can suggest "head of" for small teams
   
   senior (7-12 years):
   - Titles: Director, Principal, Senior Manager
   - Salary: $130k-$200k
   - Entrepreneurship paths realistic
   
   executive (12+ years):
   - Titles: VP, C-level, Founder
   - Salary: $200k-$350k+
   - Full entrepreneurship appropriate

5. DESCRIPTION FORMULA (2-3 sentences):
   - "Combines [professional experience] with deep passion for [exact voice interest]."
   - "Day-to-day involves [3 specific activities related to passion]."
   - "Allows you to [impact statement related to their values]."

6. TARGET COMPANIES (Must be REAL):
   - For tea paths: DAVIDsTEA, Teavana, Harney & Sons, local tea houses
   - For mindfulness: Headspace, Calm, meditation centers, wellness resorts
   - For wine: Local wineries, wine clubs, hospitality groups, restaurants
   - For yoga: Yoga studios, wellness retreats, fitness chains
   - For sustainability: B Corps, eco-brands, sustainable fashion brands
   - BE SPECIFIC AND REAL

7. KEEP IT TIGHT:
   - 3-4 key skills max (not 8!)
   - 3 target companies (real ones)
   - 2 impact areas
   - 3 lifestyle benefits

OUTPUT STRUCTURE:
{
  "archetypes": [
    {
      "title": "Exact Job Title",
      "description": "2-3 sentence description connecting skills + passion",
      "journey_duration": "12-18 months" or "2-3 years",
      "salary_range": "$XX,XXX - $XX,XXX",
      "lifestyle_benefits": ["benefit 1", "benefit 2", "benefit 3"],
      "impact_areas": ["area 1", "area 2"],
      "key_skills": ["skill 1", "skill 2", "skill 3"],
      "target_companies": ["Real Company 1", "Real Company 2", "Real Company 3"],
      "category": "natural-progression|career-change|passion-driven",
      "difficulty_level": "${experienceLevel}",
      "roadmap": [
        {"step": "Action 1", "duration": "X months"},
        {"step": "Action 2", "duration": "X months"},
        {"step": "Action 3", "duration": "X months"},
        {"step": "Action 4", "duration": "X months"}
      ],
      "affirmations": [
        "I channel my passion for [exact interest] into meaningful work",
        "My [passion] expertise creates real value",
        "I build a career around what truly energizes me"
      ],
      "typical_day_routine": [
        "Morning: [passion-related activity]",
        "Midday: [professional task]",
        "Afternoon: [passion + professional blend]"
      ]
    }
  ]
}

Remember: Paths 3-7 should feel DEEPLY PERSONAL to this specific person's voice transcript. Use their exact words for passions.

Generate exactly 7 paths.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const aiResponse = JSON.parse(aiText);

    // Save career paths to database
    const careerPaths = [];
    for (const archetype of aiResponse.archetypes) {
      const { data: savedPath, error } = await supabaseClient
        .from('career_paths')
        .insert({
          user_id: user.id,
          title: archetype.title,
          description: archetype.description,
          journey_duration: archetype.journey_duration,
          salary_range: archetype.salary_range,
          lifestyle_benefits: archetype.lifestyle_benefits,
          impact_areas: archetype.impact_areas,
          key_skills: archetype.key_skills,
          target_companies: archetype.target_companies,
          category: archetype.category,
          difficulty_level: archetype.difficulty_level,
          roadmap: archetype.roadmap || [],
          affirmations: archetype.affirmations || [],
          typical_day_routine: archetype.typical_day_routine || [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving career path:', error);
        throw error;
      }

      careerPaths.push(savedPath);
    }

    return new Response(
      JSON.stringify({ success: true, careerPaths }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating voice-focused paths:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
