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

    // Step 2: Construct enhanced prompt for career paths
    const prompt = `You are a career path strategist. Generate exactly 7 personalized career paths that represent NATURAL EVOLUTIONS of this person's existing skills and interests.

${cvAnalysis}

Voice Energy/Motivation:
${voiceTranscription ? `"${voiceTranscription}"` : 'Not provided'}

Additional Context:
${wizardData.givesEnergy ? `- What gives them energy: ${wizardData.givesEnergy}` : ''}
${wizardData.passions ? `- Passions outside work: ${wizardData.passions}` : ''}
${wizardData.achievements ? `- What they want to be known for: ${wizardData.achievements}` : ''}
${wizardData.visionBoard?.length > 0 ? `- Vision board selections: ${wizardData.visionBoard.join(', ')}` : ''}
${wizardData.lifestyle?.length > 0 ? `- Lifestyle preferences: ${wizardData.lifestyle.join(', ')}` : ''}
${wizardData.trends?.length > 0 ? `- Industry interests: ${wizardData.trends.join(', ')}` : ''}
${wizardData.timeframe ? `- Timeframe: ${wizardData.timeframe}` : ''}

CRITICAL REQUIREMENTS:
1. Each path must be a NATURAL EVOLUTION of their existing skills and experience
2. Build on their current strengths and interests - don't suggest random careers
3. Consider their voice transcription energy and motivations
4. Align with their lifestyle preferences and what they want to be known for
5. Paths should vary in: risk level, time investment, industry, and growth trajectory
6. Make titles specific (e.g., "Senior Product Manager in HealthTech" not just "Product Manager")

Generate exactly 7 distinct career paths. Response format (JSON): 
{"archetypes": [{"title": "Specific Role Title", "description": "Brief compelling description explaining WHY this is a natural fit based on their background", "journey_duration": "1-3 years" or "3-5 years", "salary_range": "Realistic range in USD", "lifestyle_benefits": ["benefit1", "benefit2"], "impact_areas": ["impact1", "impact2"], "key_skills": ["skill1", "skill2", "skill3"], "target_companies": ["company1", "company2"], "category": "tech|product|sales|marketing|healthcare|finance|creative|business", "difficulty_level": "beginner|intermediate|advanced"}]}`;

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
