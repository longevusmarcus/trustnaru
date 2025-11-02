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
          const cvResponse = await fetch(signedCvUrl.signedUrl);
          const cvText = await cvResponse.text();
          
          const analysisPrompt = `Analyze this CV/resume and extract key information:
${cvText}

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
                contents: [{ parts: [{ text: analysisPrompt }] }],
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
    const prompt = `You are an expert career fusion strategist. Create exactly 7 UNIQUE and PERSONALIZED career paths by BLENDING professional skills from their CV with their personal interests and passions.

${cvAnalysis}

${voiceInterests}

Voice Transcription (full context):
${voiceTranscription ? `"${voiceTranscription}"` : 'Not provided'}

CRITICAL FUSION STRATEGY:
1. BLEND professional skills with personal passions to create HYBRID roles
   Example: Sales skills + Tea passion = "Tea Sommelier & Corporate Wellness Consultant"
   Example: Communication skills + Mindfulness = "Mindfulness Retreat Director & Corporate Training Lead"
   Example: Tech skills + Travel = "Digital Nomad Tech Consultant"
   
2. Each path should COMBINE at least 2 elements:
   - Professional expertise from CV
   - Personal interest or passion from voice
   
3. Make titles CREATIVE but PRACTICAL:
   - "Wellness-Focused Sales Director for Conscious Brands"
   - "Tea Travel Guide & Cultural Experience Designer"
   - "Mindful Leadership Coach for Tech Companies"
   - "Sustainable Business Consultant in Tea Industry"
   
4. Variety in paths:
   - 2-3 corporate-hybrid roles (traditional job with passion twist)
   - 2-3 entrepreneurial paths (building something around their passion)
   - 1-2 completely reimagined careers (bold but grounded in their skills)
   
5. In descriptions, EXPLAIN THE FUSION:
   "This role leverages your [CV skill] expertise while allowing you to pursue your passion for [interest]. You'd be working with [specific context] where both skills create unique value."

Generate exactly 7 distinct FUSION career paths. Response format (JSON): 
{"archetypes": [{"title": "Creative Fusion Title", "description": "2-3 sentences explaining HOW this fuses their professional skills with personal passions, WHY this is uniquely suited to them, and what their day-to-day would look like", "journey_duration": "1-3 years" or "3-5 years" or "5-7 years", "salary_range": "Realistic range", "lifestyle_benefits": ["benefit1", "benefit2", "benefit3"], "impact_areas": ["impact1", "impact2"], "key_skills": ["existing_skill_from_cv", "passion_skill_1", "skill_to_develop"], "target_companies": ["company1", "company2", "company3"], "category": "fusion|hybrid|entrepreneurial|corporate-reimagined|passion-career", "difficulty_level": "beginner|intermediate|advanced"}]}`;

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
