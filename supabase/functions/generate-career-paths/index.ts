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

    const { wizardData, cvUrl, voiceTranscription } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
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
            console.error('CV analysis API error:', errorText);
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
    const prompt = `You are an expert career strategist. Create 7 DEEPLY PERSONALIZED, REALISTIC, and PRACTICAL career paths by analyzing their ACTUAL experience and REAL passions.

${cvAnalysis}

${voiceInterests}

Voice Transcription: ${voiceTranscription ? `"${voiceTranscription}"` : 'Not provided'}

🔴 ABSOLUTE REQUIREMENT: EXTRACT AND USE SPECIFIC INTERESTS FROM VOICE 🔴

STEP 1 - MANDATORY INTEREST EXTRACTION:
Read the voice transcription CAREFULLY and extract EVERY specific interest, passion, hobby, or topic mentioned:
- Foods/Beverages: tea, coffee, wine, chocolate, baking, matcha, craft beer, etc.
- Practices: yoga, meditation, mindfulness, wellness, fitness, running, etc.
- Creative: art, music, photography, writing, design, crafts, etc.
- Topics: sustainability, technology, education, travel, nature, fashion, etc.
- Activities: cooking, gaming, hiking, reading, gardening, etc.

STEP 2 - MANDATORY SPECIALIZED CAREER CREATION:
For EVERY interest you found, you MUST create at least ONE ultra-specific career:

Examples by interest:
• "tea" → Tea Sommelier, Tea Brand Founder, Tea Ceremony Educator, Premium Tea Buyer, Tea Tourism Guide, Tea Café Owner
• "mindfulness" → Mindfulness Retreat Director, Corporate Mindfulness Coach, Mindfulness App Developer, Meditation Studio Owner
• "yoga" → Yoga Retreat Designer, Yoga Therapy Specialist, Corporate Wellness Director, Yoga Teacher Training Leader
• "sustainability" → Sustainability Consultant, Circular Economy Advisor, Green Brand Strategist, Sustainability Educator
• "travel" → Luxury Travel Curator, Destination Experience Designer, Travel Content Creator, Cultural Tour Operator
• "wine" → Wine Sommelier, Wine Education Director, Wine Tour Operator, Wine Brand Ambassador
• "wellness" → Wellness Retreat Coordinator, Holistic Health Coach, Wellness Product Developer, Spa Experience Designer

CRITICAL: These passion-driven careers are MANDATORY, not suggestions. If voice mentions "tea" and "mindfulness", you MUST include careers like "Mindful Tea Retreat Owner" or "Tea Meditation Studio Founder".

🔴 CRITICAL PERSONALIZATION RULES 🔴

1. EXPERIENCE LEVEL CALIBRATION (HIGHEST PRIORITY):
   - EXTRACT: Current experience level from CV (entry/mid/senior/executive)
   - EXTRACT: Actual years of experience from CV
   - EXTRACT: Current role seniority from CV
   
   THEN APPLY STRICT REALISM RULES:
   
   IF ENTRY LEVEL (0-3 years):
   - Suggest: Junior/Coordinator/Associate level roles
   - Salary Range: $40k-$70k appropriate for entry level
   - Roadmap: Must include skill-building, not immediate leadership
   - NO: Director, VP, C-level, "Founder" roles without clear path
   
   IF MID LEVEL (3-7 years):
   - Suggest: Manager/Senior/Lead level roles
   - Salary Range: $70k-$120k appropriate for mid level
   - Roadmap: Can include management track but realistic timeline
   - NO: Immediate executive roles, skip VP/Director steps
   
   IF SENIOR LEVEL (7-12 years):
   - Suggest: Senior Manager/Director/Principal level roles
   - Salary Range: $120k-$180k appropriate for senior level
   - Roadmap: Leadership expansion, strategy roles
   - YES: Can suggest VP track with 2-3 year roadmap
   
   IF EXECUTIVE (12+ years):
   - Suggest: VP/C-level/Founder roles appropriate
   - Salary Range: $180k-$300k+ appropriate for executive
   - Roadmap: Can be faster, assumes proven leadership
   - YES: Can suggest founder/entrepreneur paths realistically

2. BUILD ON THEIR REAL EXPERIENCE:
   - Use their ACTUAL roles, exact titles, and career progression from CV
   - Reference their SPECIFIC industries they've worked in (not generic)
   - Build ONLY on their PROVEN skills documented in CV
   - Match difficulty_level field to their actual experience level
   - Make salary_range realistic for their experience level
   - Ensure roadmap timeline matches their seniority (entry needs longer, executive can be faster)

2. MANDATORY: EXTRACT SPECIFIC INTERESTS FROM VOICE:
   
   STEP 1: Scan voice transcription for these types of specific interests:
   - Foods/Beverages: tea, coffee, wine, chocolate, baking, cooking
   - Activities: yoga, running, hiking, gaming, photography, painting
   - Topics: sustainability, wellness, technology, education, music, fashion
   - Places: travel, nature, cities, beaches, mountains
   
   STEP 2: For EACH specific interest found, create specialized careers:
   - "tea" → Tea Sommelier, Tea Brand Founder, Tea Travel Guide, Tea Café Owner, Tea Educator, Tea Import Specialist
   - "yoga" → Yoga Studio Owner, Yoga Retreat Designer, Corporate Wellness Coach, Yoga Therapy Specialist
   - "travel" → Travel Curator, Destination Consultant, Travel Content Creator, Luxury Travel Advisor
   - "cooking" → Personal Chef, Recipe Developer, Food Tourism Guide, Culinary Brand Consultant
   - "wine" → Wine Sommelier, Wine Tour Operator, Wine Education Director, Wine Brand Ambassador
   - "gaming" → Game Designer, Esports Coach, Gaming Content Creator, Game Studio Producer
   - "photography" → Commercial Photographer, Photo Tour Leader, Photography Educator, Photo Brand Consultant
   - "wellness" → Wellness Coach, Retreat Coordinator, Corporate Wellness Director, Wellness Product Developer
   
   STEP 3: These specialized careers are MANDATORY - not optional suggestions

3. MANDATORY PATH DISTRIBUTION (7 total paths):
   
   PATH 1-2: NATURAL CAREER PROGRESSION (2 paths)
   - Direct next steps in their current field/industry based on CV
   - Use their proven track record and experience level
   - Must be realistic and achievable given their background
   - Example: If they're a "Senior Marketing Manager" → "Marketing Director at Tech Company", "VP of Marketing Operations"
   - Focus: 100% based on actual experience and career trajectory
   
   PATH 3-4: CAREER CHANGE WITH SKILLS TRANSFER (2 paths)
   - New industries but leveraging existing skills from CV
   - Realistic pivots that employers would hire them for
   - Must be practical given their experience level
   - Example: "Marketing Manager in tech" → "Brand Strategy Director in Consumer Goods", "Growth Lead in Fintech Startup"
   - Focus: 70% transferable skills, 30% new industry
   
   PATH 5-6: VOICE-ONLY CUSTOM CAREERS (2 paths) 🔴 ABSOLUTELY CRITICAL 🔴
   - MUST be 100% custom roles created by YOU by re-elaborating the voice transcript
   - DO NOT use standard job titles - CREATE NEW, SPECIFIC roles based on voice keywords
   - Extract every single passion, interest, and value from voice
   - Combine multiple interests into unique hybrid roles
   - MUST be ultra-specific to EXACT words used in voice
   
   EXAMPLES OF CUSTOM ROLE CREATION:
   • Voice: "I love tea, meditation, travel, wellness"
     ✅ CORRECT: "Zen Tea Journey Curator", "Mindful Tea Ceremony Educator & Retreat Host"
     ❌ WRONG: "Tea Brand Manager", "Wellness Coach" (too generic)
   
   • Voice: "Passionate about sustainability, fashion, storytelling"
     ✅ CORRECT: "Sustainable Fashion Storytelling Consultant", "Eco-Conscious Style Content Creator"
     ❌ WRONG: "Marketing Manager", "Fashion Consultant" (too standard)
   
   • Voice: "Love yoga, community building, nature, photography"
     ✅ CORRECT: "Outdoor Yoga Community Founder & Visual Storyteller", "Nature-Based Yoga Retreat Experience Designer"
     ❌ WRONG: "Yoga Teacher", "Photographer" (too basic)
   
   PATH 7: PASSION-EXPERIENCE HYBRID (1 path) 🔴 CRITICAL 🔴
   - Blend their CV experience WITH voice passions into ONE cohesive role
   - Use their professional background as foundation
   - Layer voice interests on top strategically
   
   Example: Voice "tea + mindfulness" + CV "10 years marketing" 
   → "Mindful Living Brand Strategist specializing in Tea & Wellness Companies"
   
   These passion careers MUST:
   - Exist in real market or be realistic entrepreneur paths
   - Leverage their experience level appropriately
   - Be hyper-specific to exact voice keywords
   - Include realistic salary ranges and target companies

4. DESCRIPTION STRUCTURE (each path):
   - Sentence 1: "Building on your [X years] as [actual role] in [actual industry]..."
   - Sentence 2: "This role channels your passion for [exact interest from voice] into [specific context]..."
   - Sentence 3: "Day-to-day involves [realistic tasks using their proven skills + passion elements]."

5. MAKE IT HYPER-SPECIFIC:
   - For passion paths: Use EXACT words from their voice (if they say "tea ceremony" → include tea ceremony)
   - Reference actual companies/industries that match their interests (e.g., tea companies: Teavana, Harney & Sons, Art of Tea)
   - Use their experience level in titles appropriately
   - Make sure the careers are REAL and VIABLE in the market

Generate 7 career paths in this exact order (2 progression + 2 career change + 3 passion):
{"archetypes": [{"title": "Specific Role Title", "description": "3 sentences following structure", "journey_duration": "1-3 years|3-5 years|5-7 years", "salary_range": "Realistic range", "lifestyle_benefits": ["benefit 1", "benefit 2", "benefit 3"], "impact_areas": ["impact 1", "impact 2"], "key_skills": ["skill 1", "skill 2", "skill 3", "skill 4"], "target_companies": ["company 1", "company 2", "company 3"], "category": "natural-progression|career-change|passion-driven", "difficulty_level": "entry|mid|senior|executive", "roadmap": [{"step": "Specific action step", "duration": "X months"}], "affirmations": ["Powerful I-statement affirmation 1", "Powerful I-statement affirmation 2", "Powerful I-statement affirmation 3"], "typical_day_routine": ["Morning: activity 1", "Midday: activity 2", "Afternoon: activity 3", "Evening: activity 4"]}]}

IMPORTANT ROADMAP REQUIREMENTS:
- Each path must have 3-5 specific, actionable roadmap steps
- Each step must include a realistic duration (in months or years)
- Steps should be progressive and build on each other
- Example roadmap for "Tea Sommelier": [{"step": "Complete tea certification course", "duration": "3 months"}, {"step": "Work at premium tea house", "duration": "6 months"}, {"step": "Build personal tea brand", "duration": "9 months"}, {"step": "Launch tea consulting business", "duration": "12 months"}]

IMPORTANT AFFIRMATIONS REQUIREMENTS:
- Must be written in first person ("I am", "I create", "My")
- Should be empowering and specific to the career path
- Must reflect the person's actual strengths and passions
- Example affirmations for "Tea Sommelier": ["I transform tea into unforgettable experiences", "My expertise helps people discover the art of tea", "I build a thriving business around what I love"]

TYPICAL DAY ROUTINE REQUIREMENTS:
- Should describe 4-6 specific activities throughout a typical workday
- Must be realistic and specific to the role
- Should capture the rhythm and flow of the day
- Include time-of-day context (Morning, Midday, Afternoon, Evening)
- Example for "Tea Sommelier": ["Morning: Curate daily tea selections and prepare tasting notes", "Midday: Lead private tea tasting sessions for clients", "Afternoon: Source new tea varieties from suppliers worldwide", "Evening: Develop tea pairing menus for events"]`;

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
