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
    const prompt = `You are an expert career strategist. Create 7 DEEPLY PERSONALIZED career paths by analyzing their ACTUAL experience and REAL passions.

${cvAnalysis}

${voiceInterests}

Voice Transcription: ${voiceTranscription ? `"${voiceTranscription}"` : 'Not provided'}

⚠️ CRITICAL: SCAN THE VOICE TRANSCRIPTION FOR SPECIFIC INTERESTS ⚠️
Before generating ANY career paths, you MUST:
1. Read the voice transcription word-by-word
2. Identify EVERY specific noun or activity mentioned (tea, yoga, cooking, travel, art, music, gaming, etc.)
3. For EACH specific interest found, create AT LEAST ONE specialized career path around it
4. These are NOT optional - if they mention "tea", you MUST include tea-related careers

CRITICAL PERSONALIZATION RULES:

1. START WITH THEIR REAL EXPERIENCE:
   - Use their ACTUAL roles, years of experience, and career progression
   - Reference their SPECIFIC industries they've worked in
   - Build on their PROVEN skills (not generic ones)
   - Consider their seniority level and achievements

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
   - Direct next steps in their current field/industry
   - Use their proven track record and experience level
   - Example: Senior Manager → Director → VP path
   - Focus: 90% experience, 10% passion context
   
   PATH 3-4: CAREER CHANGE WITH SKILLS TRANSFER (2 paths)
   - New industries but leveraging their existing skills
   - Realistic pivots based on transferable expertise
   - Example: Marketing Manager in tech → Marketing Director in another industry
   - Focus: 60% experience, 40% new direction
   
   PATH 5-7: PASSION-DRIVEN CAREERS (3 paths) ⚠️ MOST IMPORTANT ⚠️
   - These MUST be based on specific interests mentioned in voice
   - Use the EXACT words from their transcription
   - Create niche, specialized careers around those interests
   - Can combine their experience with passion (e.g., "Marketing expertise + tea passion = Tea Brand Marketing Director")
   - Example: Loves tea → "Premium Tea Sommelier", "Tea Travel Guide", "Founder of Artisan Tea Company"
   - Focus: 70% passion, 30% skills application

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
{"archetypes": [{"title": "Specific Role Title", "description": "3 sentences following structure", "journey_duration": "1-3 years|3-5 years|5-7 years", "salary_range": "Realistic range", "lifestyle_benefits": ["benefit 1", "benefit 2", "benefit 3"], "impact_areas": ["impact 1", "impact 2"], "key_skills": ["skill 1", "skill 2", "skill 3", "skill 4"], "target_companies": ["company 1", "company 2", "company 3"], "category": "natural-progression|career-change|passion-driven", "difficulty_level": "entry|mid|senior|executive"}]}`;

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
