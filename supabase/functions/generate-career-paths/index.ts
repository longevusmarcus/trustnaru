import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  wizardData: z.any().optional(),
  cvUrl: z.string().max(1000).optional(),
  voiceTranscription: z.string().max(5000, "Voice transcription too long").optional()
});

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

    const body = await req.json();
    const validated = inputSchema.parse(body);
    const { wizardData, cvUrl, voiceTranscription } = validated;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      throw new Error('SERVICE_UNAVAILABLE');
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
- Notice patterns in career types, industries, work styles
- Generate NEW paths that share similar attributes but are distinct
- Match the experience level, salary range, and career style they prefer
- If they liked passion-driven paths, prioritize more passion-driven careers
- If they liked progression paths, focus on natural career growth
`;
      console.log(`Found ${likedPaths.length} liked paths to learn from`);
    }

    // Step 1: Analyze CV if provided
    let cvAnalysis = '';
    if (cvUrl) {
      console.log('Analyzing CV with Gemini...');
      const { data: signedCvUrl, error: cvSignError } = await supabaseClient
        .storage
        .from('cvs')
        .createSignedUrl(cvUrl, 3600);

      if (!cvSignError && signedCvUrl) {
        try {
          // Fetch CV file as blob
          const cvResponse = await fetch(signedCvUrl.signedUrl);
          const cvBlob = await cvResponse.blob();
          const cvBuffer = await cvBlob.arrayBuffer();
          
          // Convert to base64 in chunks to avoid stack overflow
          const bytes = new Uint8Array(cvBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const cvBase64 = btoa(binary);
          
          const analysisPrompt = `Deeply analyze this CV/resume and extract detailed career information.

Provide comprehensive analysis in JSON format:
{
  "current_role": "exact job title from CV",
  "years_experience": "total years in workforce",
  "experience_level": "entry|mid|senior|executive",
  "career_progression": ["role1 (years)", "role2 (years)", "role3 (years)"],
  "industries_worked": ["specific industry 1", "specific industry 2"],
  "core_skills": ["proven skill 1", "proven skill 2", "proven skill 3"],
  "technical_skills": ["technical skill 1", "technical skill 2"],
  "soft_skills": ["soft skill 1", "soft skill 2"],
  "achievements": ["achievement 1", "achievement 2"],
  "education": "highest degree and field",
  "strengths": ["demonstrated strength 1", "demonstrated strength 2"],
  "work_style": "description of how they work based on experience"
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
                    {
                      inline_data: {
                        mime_type: 'application/pdf',
                        data: cvBase64
                      }
                    }
                  ]
                }],
                generationConfig: { response_mime_type: "application/json" }
              }),
            }
          );

          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            const analysisText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const analysis = JSON.parse(analysisText);
            cvAnalysis = `
DETAILED CV ANALYSIS:
- Current Role: ${analysis.current_role}
- Total Experience: ${analysis.years_experience}
- Experience Level: ${analysis.experience_level}
- Career Progression: ${analysis.career_progression?.join(' → ')}
- Industries Worked: ${analysis.industries_worked?.join(', ')}
- Core Skills (Proven): ${analysis.core_skills?.join(', ')}
- Technical Skills: ${analysis.technical_skills?.join(', ')}
- Soft Skills: ${analysis.soft_skills?.join(', ')}
- Key Achievements: ${analysis.achievements?.join('; ')}
- Education: ${analysis.education}
- Strengths: ${analysis.strengths?.join(', ')}
- Work Style: ${analysis.work_style}`;
            console.log('CV analysis complete');
          } else {
            const errorText = await analysisResponse.text();
            console.error('CV analysis API error:', analysisResponse.status, errorText);
          }
        } catch (e) {
          console.error('CV analysis error:', e);
        }
      }
    }

    // Step 2: Extract key interests and passions from voice
    let voiceInterests = '';
    if (voiceTranscription) {
      const interestsPrompt = `Extract the key interests, passions, and what energizes this person from their voice transcription:
"${voiceTranscription}"

Return JSON format: {"interests": ["interest1", "interest2"], "values": ["value1", "value2"], "energizers": ["energizer1", "energizer2"]}`;

      try {
        const interestsResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: interestsPrompt }] }],
              generationConfig: { response_mime_type: "application/json" }
            }),
          }
        );

        if (interestsResponse.ok) {
          const interestsData = await interestsResponse.json();
          const interestsText = interestsData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const interests = JSON.parse(interestsText);
          voiceInterests = `
Voice Interests Analysis:
- Interests: ${interests.interests?.join(', ')}
- Values: ${interests.values?.join(', ')}
- What Energizes Them: ${interests.energizers?.join(', ')}`;
          console.log('Voice interests extracted');
        }
      } catch (e) {
        console.error('Voice interests extraction error:', e);
      }
    }

    // Step 3: Construct deeply personalized prompt using real experience + passions
    const prompt = `You are an expert career strategist. Create 7 DEEPLY PERSONALIZED, REALISTIC, and PRACTICAL career paths.

${cvAnalysis}

${voiceInterests}

${likedPathsContext}

Voice Transcription: ${voiceTranscription ? `"${voiceTranscription}"` : 'Not provided'}

🔴 CRITICAL: ULTRA-REALISTIC & VOICE-DRIVEN CAREERS 🔴

MANDATORY REQUIREMENTS:

1. REALISTIC JOB TITLES & DESCRIPTIONS:
   - Use REAL job titles that exist in the market (check LinkedIn, Indeed, Glassdoor)
   - NO fantasy or made-up positions
   - Each description must be 2-3 concise sentences, NOT paragraphs
   - Focus on actual day-to-day work, not aspirational fluff

2. MINIMAL TAGS (CRITICAL):
   - key_skills: EXACTLY 3-4 skills maximum (not 8-10)
   - target_companies: EXACTLY 3 real companies (not 5-7)
   - lifestyle_benefits: EXACTLY 3 benefits (not more)
   - impact_areas: EXACTLY 2 areas (not 4-5)
   - Keep it CLEAN and FOCUSED

3. ULTRA-CUSTOMIZED VOICE-DRIVEN PATHS (3 OF 7 PATHS):
   
   STEP 1: Extract SPECIFIC passions from voice transcription:
   Example extractions:
   - "I love tea" → CREATE: Tea Sommelier, Tea Shop Owner, Tea Brand Consultant
   - "passionate about mindfulness" → CREATE: Mindfulness Retreat Director, Meditation Coach
   - "tea + mindfulness together" → CREATE: Mindful Tea Retreat Founder, Tea Meditation Studio Owner
   - "wine enthusiast" → CREATE: Wine Sommelier, Wine Tour Guide, Wine Education Director
   - "yoga practitioner" → CREATE: Yoga Retreat Designer, Yoga Studio Manager
   - "sustainability advocate" → CREATE: Sustainability Consultant, Green Brand Advisor
   
   STEP 2: Create HYPER-SPECIFIC career titles:
   - If voice says "tea ceremony" → Use "Tea Ceremony Educator" not generic "Tea Professional"
   - If voice says "mindful living" → Use "Mindfulness Retreat Director" not "Wellness Coach"
   - Combine passions: "tea + entrepreneurship" → "Specialty Tea Shop Owner"
   - Be ULTRA SPECIFIC to their exact words
   
   CRITICAL: Paths 5, 6, 7 MUST be these ultra-customized passion careers

4. EXPERIENCE-CALIBRATED REALISM:
   
   Entry Level (0-3 years):
   - Titles: Coordinator, Associate, Junior roles
   - Salary: $45k-$75k
   - NO: Manager, Director, Founder (unless with 2+ year runway)
   
   Mid Level (3-7 years):
   - Titles: Manager, Senior, Lead roles
   - Salary: $75k-$130k
   - NO: VP, C-level (unless with 3-year plan)
   
   Senior (7-12 years):
   - Titles: Director, Senior Manager, Principal
   - Salary: $130k-$200k
   - YES: Can suggest VP track with clear roadmap
   
   Executive (12+ years):
   - Titles: VP, C-level, Founder appropriate
   - Salary: $200k-$350k+
   - YES: Entrepreneurship paths realistic

5. PATH DISTRIBUTION:
   
   Paths 1-2: NATURAL PROGRESSION
   - Next logical step in current career
   - Based 100% on CV experience
   - Realistic promotion or lateral move
   
   Paths 3-4: SKILLS TRANSFER
   - New industry, same skills
   - 70% transferable + 30% learnable
   - Must be hireable with current experience
   
   Paths 5-7: PASSION-DRIVEN (MOST IMPORTANT)
   - DIRECTLY extract from voice transcript
   - Use EXACT passion words mentioned
   - Combine experience + specific passion
   - Must be REAL careers that exist
   - Examples:
     * Voice: "tea enthusiast" → "Tea Sommelier", "Tea Shop Owner", "Tea Brand Manager"
     * Voice: "mindfulness + retreat" → "Mindfulness Retreat Director", "Meditation Center Owner"
     * Voice: "wine + travel" → "Wine Tourism Curator", "Vineyard Experience Designer"

6. DESCRIPTION FORMULA (2-3 sentences max):
   - Sentence 1: "[Experience level] role in [specific industry]."
   - Sentence 2: "Channels passion for [exact voice interest] into [specific work]."
   - Sentence 3: "Involves [3 concrete daily activities]."

7. COMPANY EXAMPLES:
   - List 3 REAL companies that hire this role
   - Tea paths: Teavana, David's Tea, Harney & Sons
   - Mindfulness: Headspace, Calm, meditation centers
   - Wine: Local wineries, wine clubs, restaurants
   - Be SPECIFIC and REAL

EXAMPLE OUTPUT STRUCTURE:
{"archetypes": [
  {
    "title": "Exact Job Title (Real)",
    "description": "Concise 2-3 sentence description.",
    "journey_duration": "Realistic timeframe",
    "salary_range": "$XX,XXX - $XX,XXX",
    "lifestyle_benefits": ["benefit 1", "benefit 2", "benefit 3"],
    "impact_areas": ["area 1", "area 2"],
    "key_skills": ["skill 1", "skill 2", "skill 3"],
    "target_companies": ["Real Company 1", "Real Company 2", "Real Company 3"],
    "category": "natural-progression|career-change|passion-driven",
    "difficulty_level": "entry|mid|senior|executive",
    "roadmap": [
      {"step": "Concrete action", "duration": "X months"},
      {"step": "Next concrete action", "duration": "X months"}
    ],
    "affirmations": ["I am...", "I create...", "My work..."],
    "typical_day_routine": ["Morning: task", "Midday: task", "Afternoon: task"]
  }
]}

Generate exactly 7 paths following this structure.`;

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
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('AI_GENERATION_FAILED');
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
        throw new Error('DATABASE_ERROR');
      }

      careerPaths.push(savedPath);
    }

      // Save wizard data to user profile
      const { data: existingProfile } = await supabaseClient
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const profileData = {
        cv_url: cvUrl,
        voice_transcription: voiceTranscription,
        wizard_data: wizardData,
      };

      if (existingProfile) {
        const { error: updateError } = await supabaseClient
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user.id);
        
        if (updateError) console.error('Error updating user profile:', updateError);
      } else {
        const { error: insertError } = await supabaseClient
          .from('user_profiles')
          .insert({
            user_id: user.id,
            ...profileData
          });
        
        if (insertError) console.error('Error creating user profile:', insertError);
      }

    return new Response(
      JSON.stringify({ success: true, careerPaths }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating career paths:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const errorMessage = error instanceof Error && error.message === 'SERVICE_UNAVAILABLE'
      ? 'Service temporarily unavailable'
      : error instanceof Error && error.message === 'Unauthorized'
      ? 'Authentication required'
      : 'Unable to generate career paths';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
