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
          
          const analysisPrompt = `Analyze this CV/resume document and extract key information.

Provide a structured analysis in JSON format:
{
  "current_role": "their current or most recent role",
  "experience_level": "entry|mid|senior|executive",
  "core_skills": ["skill1", "skill2", "skill3"],
  "industries": ["industry1", "industry2"],
  "strengths": ["strength1", "strength2"],
  "potential_directions": ["direction1", "direction2", "direction3"]
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
CV Analysis:
- Current Role: ${analysis.current_role}
- Experience Level: ${analysis.experience_level}
- Core Skills: ${analysis.core_skills?.join(', ')}
- Industries: ${analysis.industries?.join(', ')}
- Key Strengths: ${analysis.strengths?.join(', ')}
- Potential Directions: ${analysis.potential_directions?.join(', ')}`;
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

    // Step 3: Construct enhanced prompt for hybrid career paths
    const prompt = `You are an expert career strategist specializing in PRACTICAL career fusion. Generate 7 career paths that intelligently blend CV skills with voice energy/interests.

${cvAnalysis}

${voiceInterests}

Voice Transcription: ${voiceTranscription ? `"${voiceTranscription}"` : 'Not provided'}

STRATEGY - Balance practicality with passion:
1. ROOT IN REALITY: Start with their actual CV skills as the foundation
   - If CV shows sales → roles must involve sales/business development
   - If CV shows project management → roles involve coordination/leadership
   - If CV shows communication → roles leverage presentation/writing
   
2. INFUSE PASSION: Weave voice interests/energy into the role context
   - Tea passion → work IN tea industry or tea-adjacent (hospitality, wellness, import/export)
   - Loves organizing events → event-driven roles or community building
   - Energized by people → client-facing, collaborative, or coaching roles
   
3. CAREER MIX (7 paths):
   - 3 PRACTICAL-FORWARD: Traditional role + passion twist (80% CV skills, 20% passion)
     Ex: "Sales Manager at Premium Tea Importers" or "Event Sales Director for Wellness Brands"
   - 2 BALANCED FUSION: Equal blend (50% CV skills, 50% passion)
     Ex: "Tea Experience Designer & Retail Consultant" or "Corporate Wellness Program Lead"
   - 2 PASSION-FORWARD: Entrepreneurial/bold but skill-grounded (70% passion, 30% CV skills)
     Ex: "Tea Ceremony Facilitator & Mindfulness Coach" or "Tea Tourism Curator"

4. TITLES must be SPECIFIC and REAL:
   - ✅ "Partnership Manager at Organic Tea Brands"
   - ✅ "Sales Trainer for Hospitality & Wellness Sector"  
   - ✅ "Tea Sommelier & Customer Experience Director"
   - ❌ Avoid vague titles like "Wellness Advocate" or "Passion Entrepreneur"

5. DESCRIPTIONS explain the FUSION:
   - Start with CV skill: "Leveraging your [X years] in [CV role]..."
   - Connect to passion: "...you'd work in [passion context] where [specific value]"
   - Make it tangible: "Daily work includes [realistic tasks]"

Generate 7 career paths (JSON):
{"archetypes": [{"title": "Specific Role Title at [Context]", "description": "2-3 sentences: (1) How CV skills apply (2) How passion connects (3) What daily work looks like", "journey_duration": "1-3 years|3-5 years|5-7 years", "salary_range": "$XX,XXX-$XX,XXX", "lifestyle_benefits": ["benefit1", "benefit2", "benefit3"], "impact_areas": ["impact1", "impact2"], "key_skills": ["cv_skill_1", "cv_skill_2", "passion_skill", "skill_to_develop"], "target_companies": ["real_company_1", "real_company_2", "real_company_3"], "category": "practical-fusion|balanced-fusion|passion-forward|corporate|entrepreneurial", "difficulty_level": "beginner|intermediate|advanced"}]}`;

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
