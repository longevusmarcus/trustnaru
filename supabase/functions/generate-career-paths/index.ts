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

CRITICAL PERSONALIZATION RULES:

1. START WITH THEIR REAL EXPERIENCE:
   - Use their ACTUAL roles, years of experience, and career progression
   - Reference their SPECIFIC industries they've worked in
   - Build on their PROVEN skills (not generic ones)
   - Consider their seniority level and achievements
   - Example: If they have 5 years in sales at tech companies → don't suggest entry-level roles
   - Example: If they've progressed from coordinator → manager → senior manager → suggest director-level paths

2. LAYER THEIR AUTHENTIC PASSIONS:
   - Use EXACT interests/energizers from voice transcription
   - If they mention "tea" → incorporate tea industry, tea culture, tea brands
   - If they say "organizing events" → event management, experiential, hospitality
   - If they're energized by "people" → coaching, training, community building
   - Match their energy level to role type (high energy → dynamic roles, calm energy → strategic roles)

3. CREATE LOGICAL CAREER BRIDGES:
   - Each path must be a REALISTIC next step from their current position
   - Respect their years of experience (don't go backwards)
   - Use their industry knowledge as an advantage
   - Example: "3 years marketing at fintech" + "loves tea" → "Marketing Director at Premium Tea E-commerce Brand"
   - Example: "8 years operations management" + "passionate about wellness" → "Head of Operations at Wellness Retreat Chain"

4. CAREER PATH MIX (7 total):
   - 3 EXPERIENCE-FORWARD: Natural progression in their field + passion context (80% experience, 20% passion)
     Ex: If Senior Sales Manager → "VP of Sales at Organic Tea Import Company"
   - 2 BALANCED FUSION: Equal weight to experience and passion (50/50)
     Ex: If Event Coordinator + loves tea → "Tea Experience Designer & Corporate Event Lead"
   - 2 PASSION-FORWARD: Entrepreneurial pivot using their skills (30% experience, 70% passion)
     Ex: If Marketing Manager + tea enthusiast → "Tea Brand Founder & Digital Marketing Consultant"

5. MAKE IT HYPER-SPECIFIC:
   - Use their exact experience level in titles
   - Reference their actual skills in descriptions
   - Cite their industry experience
   - Example: "With your 6 years leading sales teams in SaaS and your passion for mindfulness, you'd excel as a Sales Director at wellness tech startups like Calm, Headspace, or meditation app companies."

6. DESCRIPTION STRUCTURE (each path):
   - Sentence 1: "Building on your [X years] as [actual role] in [actual industry]..."
   - Sentence 2: "This role channels your passion for [exact interest from voice] into [specific context]..."
   - Sentence 3: "Day-to-day involves [realistic tasks using their proven skills + passion elements]."

Generate 7 career paths (JSON):
{"archetypes": [{"title": "Specific Role at Experience-Appropriate Level", "description": "3 sentences following structure above, deeply personalized to their experience and passions", "journey_duration": "1-3 years|3-5 years|5-7 years", "salary_range": "Realistic based on their experience level", "lifestyle_benefits": ["benefit tied to passion", "benefit from role level", "specific perk"], "impact_areas": ["impact related to industry", "impact related to passion"], "key_skills": ["proven_skill_from_cv", "proven_skill_from_cv", "passion_skill", "growth_skill"], "target_companies": ["real_company_1", "real_company_2", "real_company_3"], "category": "experience-forward|balanced-fusion|passion-forward|corporate|entrepreneurial", "difficulty_level": "appropriate to their experience level"}]}`;

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

    if (existingProfile) {
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update({
          cv_url: cvUrl,
          voice_transcription: voiceTranscription,
          wizard_data: wizardData,
        })
        .eq('user_id', user.id);
      
      if (updateError) console.error('Error updating user profile:', updateError);
    } else {
      const { error: insertError } = await supabaseClient
        .from('user_profiles')
        .insert({
          user_id: user.id,
          cv_url: cvUrl,
          voice_transcription: voiceTranscription,
          wizard_data: wizardData,
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
