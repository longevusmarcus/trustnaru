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

    // Construct prompt for AI
    const prompt = `You are a career path generator. Based on the following information about the user, generate exactly 7 distinct, personalized career paths.

User Information:
${cvUrl ? '- CV/Resume has been provided (analyze experience level from context)' : '- No CV provided'}
${voiceTranscription ? `- Voice message: "${voiceTranscription}"` : ''}
${wizardData.givesEnergy ? `- What gives them energy: ${wizardData.givesEnergy}` : ''}
${wizardData.passions ? `- Passions outside work: ${wizardData.passions}` : ''}
${wizardData.achievements ? `- What they want to be known for: ${wizardData.achievements}` : ''}
${wizardData.visionBoard?.length > 0 ? `- Vision board selections: ${wizardData.visionBoard.join(', ')}` : ''}
${wizardData.lifestyle?.length > 0 ? `- Lifestyle preferences: ${wizardData.lifestyle.join(', ')}` : ''}
${wizardData.trends?.length > 0 ? `- Industry interests: ${wizardData.trends.join(', ')}` : ''}
${wizardData.timeframe ? `- Timeframe: ${wizardData.timeframe}` : ''}

Create 7 paths that are:
1. Highly specific and personalized
2. Realistic given their experience level
3. Aligned with their energy, passions, and lifestyle goals
4. Incorporate the industry trends they're interested in
5. Diverse in direction and opportunity

Generate exactly 7 distinct career archetypes. Response format (JSON): 
{"archetypes": [{"title": "Specific Role Title", "description": "Brief compelling description", "journey_duration": "1-3 years" or "3-5 years", "salary_range": "Realistic range in USD", "lifestyle_benefits": ["benefit1", "benefit2"], "impact_areas": ["impact1", "impact2"], "key_skills": ["skill1", "skill2", "skill3"], "target_companies": ["company1", "company2"], "category": "tech|product|sales|marketing|healthcare|finance|creative|business", "difficulty_level": "beginner|intermediate|advanced"}]}`;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

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
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        cv_url: cvUrl,
        voice_transcription: voiceTranscription,
        wizard_data: wizardData,
      });

    if (profileError) {
      console.error('Error saving user profile:', profileError);
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
