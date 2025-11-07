import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
      throw new Error('Not authenticated');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Fetching user preferences for personalized mentor recommendations');

    // Fetch liked and activated career paths
    const { data: likedPaths } = await supabaseClient
      .from('career_paths')
      .select('title, description, category, key_skills, impact_areas, lifestyle_benefits, target_companies')
      .eq('user_id', user.id)
      .eq('user_feedback', 'up')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('active_path_id')
      .eq('user_id', user.id)
      .single();

    let activePath = null;
    if (profile?.active_path_id) {
      const { data: pathData } = await supabaseClient
        .from('career_paths')
        .select('title, description, category, key_skills, impact_areas, lifestyle_benefits, target_companies')
        .eq('id', profile.active_path_id)
        .single();
      activePath = pathData;
    }

    // Build context from user preferences
    let preferencesContext = '';
    if (activePath) {
      preferencesContext += `
🎯 ACTIVE CAREER PATH:
- Title: ${activePath.title}
- Category: ${activePath.category}
- Description: ${activePath.description}
- Key Skills: ${activePath.key_skills?.join(', ')}
- Impact Areas: ${activePath.impact_areas?.join(', ')}
- Target Companies: ${activePath.target_companies?.join(', ')}

`;
    }

    if (likedPaths && likedPaths.length > 0) {
      preferencesContext += `
💚 LIKED CAREER PATHS (${likedPaths.length} paths):
${likedPaths.map((path, idx) => `
${idx + 1}. ${path.title}
   - Category: ${path.category}
   - Skills: ${path.key_skills?.join(', ')}
   - Impact: ${path.impact_areas?.join(', ')}
   - Companies: ${path.target_companies?.join(', ')}
`).join('')}`;
    }

    if (!preferencesContext) {
      preferencesContext = 'No specific preferences available yet. Generate diverse mentor recommendations.';
    }

    const prompt = `Based on the user's career interests and preferences below, find 5 real professionals on LinkedIn who match their aspirations.

${preferencesContext}

CRITICAL REQUIREMENTS:
1. Find REAL people who are currently active in these fields
2. Include their LinkedIn profile URL (format: https://linkedin.com/in/[username])
3. Match their career path, skills, and impact areas to the user's interests
4. Prioritize professionals who are accessible and active on LinkedIn
5. Include diverse backgrounds and career stages

Return a JSON array with exactly 5 mentors:
[
  {
    "name": "Full Name",
    "title": "Current Job Title",
    "company": "Current Company",
    "linkedin_url": "https://linkedin.com/in/username",
    "description": "Brief 1-2 sentence description of why they match",
    "tags": ["tag1", "tag2"],
    "journey": "Brief career progression summary"
  }
]

IMPORTANT: Only return the JSON array, no other text.`;

    console.log('Calling Lovable AI for personalized mentor recommendations');

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
            content: 'You are a career advisor expert at finding real professionals on LinkedIn who match user career aspirations. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI Response:', content);

    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse mentor recommendations from AI response');
    }

    const mentors = JSON.parse(jsonMatch[0]);

    console.log(`Generated ${mentors.length} personalized mentor recommendations`);

    return new Response(
      JSON.stringify({ mentors }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-personalized-mentors:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
