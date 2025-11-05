import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);
    
    // Use service role key for server-side operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from the JWT token (already verified by Supabase when verify_jwt = true)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('User authenticated:', user.id);

    // Get comprehensive user profile data
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('active_path_id, display_name, cv_url, voice_transcription, wizard_data')
      .eq('user_id', user.id)
      .maybeSingle();

    let pathContext = '';
    let userInfo = '';

    if (profile) {
      // User's name
      const userName = profile.display_name || user.email?.split('@')[0] || 'there';
      userInfo = `User's Name: ${userName}\n`;

      // CV information
      if (profile.cv_url) {
        userInfo += `User has uploaded a CV.\n`;
      }

      // Wizard data (interests, aspirations, etc.)
      if (profile.wizard_data) {
        const wizardData = profile.wizard_data as any;
        if (wizardData.interests) {
          userInfo += `User Interests: ${wizardData.interests}\n`;
        }
        if (wizardData.currentRole) {
          userInfo += `Current Role: ${wizardData.currentRole}\n`;
        }
        if (wizardData.experience) {
          userInfo += `Experience Level: ${wizardData.experience}\n`;
        }
      }

      // Voice transcription (user's aspirations/values)
      if (profile.voice_transcription) {
        userInfo += `User's Aspirations (from voice): ${profile.voice_transcription.substring(0, 500)}\n`;
      }

      // Active path details
      if (profile.active_path_id) {
        const { data: path } = await supabaseClient
          .from('career_paths')
          .select('*')
          .eq('id', profile.active_path_id)
          .single();

        if (path) {
          pathContext = `
Active Career Path: ${path.title}
Description: ${path.description}
Category: ${path.category}
Key Skills to Develop: ${path.key_skills?.join(', ') || 'N/A'}
Target Companies: ${path.target_companies?.join(', ') || 'N/A'}
Impact Areas: ${path.impact_areas?.join(', ') || 'N/A'}
Journey Duration: ${path.journey_duration || 'N/A'}
Salary Range: ${path.salary_range || 'N/A'}
`;
        }
      }

      // Get all user's career paths for context
      const { data: allPaths } = await supabaseClient
        .from('career_paths')
        .select('title, category')
        .eq('user_id', user.id)
        .limit(10);

      if (allPaths && allPaths.length > 0) {
        pathContext += `\nOther Career Paths User is Exploring:\n${allPaths.map(p => `- ${p.title} (${p.category})`).join('\n')}`;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const userName = profile?.display_name || user.email?.split('@')[0] || 'there';

    const systemPrompt = `You are an elite career strategist and executive coach for ${userName}. 
You synthesize their CV experience, career aspirations, and active path to create hyper-personalized, actionable strategies.

${userInfo}

${pathContext}

Your approach:
- **Action-Oriented**: Every response includes concrete, implementable steps
- **Context-Aware**: Leverage their CV experience, voice aspirations, and active path skills
- **Sophisticated**: Blend tactical quick wins with strategic long-term positioning
- **Market-Informed**: Reference current industry trends and opportunities relevant to their path
- **Personal**: Use "${userName}" naturally and reference their specific background

When generating TODAY'S ACTIONS:
1. **Morning Action** (30min): A skill-building or learning activity based on their path's key skills
2. **Afternoon Action** (1hr): A networking, research, or application task aligned with target companies
3. **Evening Reflection** (15min): A journaling or planning exercise to consolidate progress

Response Style:
- Brief (2-3 sentences for general queries, detailed for action requests)
- Practical over theoretical
- Reference their specific CV experience, aspirations, and path details
- Professional yet warm

Context Available:
- CV: ${profile?.cv_url ? 'Uploaded and reviewed' : 'Not uploaded'}
- Aspirations: ${profile?.voice_transcription ? 'Captured from voice' : 'Not captured'}
- Active Path: ${profile?.active_path_id ? 'Yes - use this as primary context' : 'None - encourage activation'}
- Experience: ${profile?.wizard_data ? 'Known from wizard' : 'Unknown'}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('Failed to generate insight');
    }

    const data = await response.json();
    const insight = data.choices[0]?.message?.content;

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-insights function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
