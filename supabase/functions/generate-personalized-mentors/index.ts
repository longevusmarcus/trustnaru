import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  focus: z.enum(['energy', 'cv', 'balanced']).optional().default('balanced'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Not authenticated');
    }

    console.log('Authenticated user:', user.id);

    // Get focus parameter from request body
    const body = await req.json().catch(() => ({}));
    const validationResult = inputSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { focus } = validationResult.data;

    // Get user's profile to find active path
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('active_path_id')
      .eq('user_id', user.id)
      .single();

    // Get liked paths and active path
    const { data: likedPaths } = await supabase
      .from('career_paths')
      .select('title, description, category, key_skills, salary_range, journey_duration, impact_areas')
      .eq('user_id', user.id)
      .eq('user_feedback', 'up')
      .limit(10);

    const { data: activePath } = profile?.active_path_id ? await supabase
      .from('career_paths')
      .select('title, description, category, key_skills, salary_range, journey_duration, impact_areas')
      .eq('id', profile.active_path_id)
      .single() : { data: null };

    // Build context from user's preferences
    let preferencesContext = '';
    let focusInstruction = '';
    
    // Add focus-specific instructions
    if (focus === 'energy') {
      focusInstruction = 'IMPORTANT: Focus heavily on passion-driven career paths and people who followed their interests. Prioritize professionals whose journey shows they pursued what they love, made bold career pivots, or work in mission-driven roles.';
    } else if (focus === 'cv') {
      focusInstruction = 'IMPORTANT: Focus heavily on natural career progression and professionals with strong traditional backgrounds. Prioritize people with impressive credentials, systematic career advancement, and proven track records in established companies.';
    }
    
    if (activePath) {
      preferencesContext += `Active Career Path: ${activePath.title}\n`;
      preferencesContext += `Description: ${activePath.description}\n`;
      preferencesContext += `Skills: ${activePath.key_skills?.join(', ') || 'N/A'}\n\n`;
    }

    if (likedPaths && likedPaths.length > 0) {
      preferencesContext += `Liked Career Paths:\n`;
      likedPaths.forEach((path, idx) => {
        preferencesContext += `${idx + 1}. ${path.title} - ${path.description}\n`;
        preferencesContext += `   Skills: ${path.key_skills?.join(', ') || 'N/A'}\n`;
      });
    }

    if (!preferencesContext) {
      preferencesContext = 'User has not selected any career paths yet. Provide diverse recommendations.';
    }

    const prompt = `${focusInstruction}

Based on the following user's career interests and preferences, find 5 REAL professionals on LinkedIn who match their aspirations:

${preferencesContext}

For each person, provide:
1. Their full name
2. Current job title
3. Company name
4. LinkedIn profile URL (must be a real LinkedIn URL)
5. Brief description (2-3 sentences) explaining why they match the user's interests
6. 2-3 relevant tags (e.g., "Product", "Leadership", "AI")
7. A brief career journey summary (2-3 key roles)

Return ONLY valid JSON in this exact format:
{
  "mentors": [
    {
      "name": "Full Name",
      "title": "Job Title",
      "company": "Company Name",
      "profile_url": "https://www.linkedin.com/in/...",
      "description": "Why this person matches...",
      "tags": ["Tag1", "Tag2"],
      "career_journey": "Brief career progression summary"
    }
  ]
}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI for personalized mentors...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a career advisor who finds real professionals on LinkedIn. Always return valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Parse the JSON response
    let mentors;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        mentors = parsed.mentors || [];
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      throw new Error('Failed to parse AI response');
    }

    return new Response(
      JSON.stringify({ mentors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-personalized-mentors:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        mentors: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
