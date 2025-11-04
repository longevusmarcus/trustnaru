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

    const { topic } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get comprehensive user data for deep personalization
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('active_path_id, display_name, cv_url, voice_transcription, wizard_data')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get user stats for progress context
    const { data: stats } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get all career paths for diversity insights
    const { data: allPaths } = await supabaseClient
      .from('career_paths')
      .select('title, category, key_skills')
      .eq('user_id', user.id)
      .limit(5);

    let userContext = '';
    const userName = profile?.display_name || user.email?.split('@')[0] || 'there';
    
    // Build rich user context
    if (profile) {
      userContext += `User's Name: ${userName}\n`;
      
      // Active path details
      if (profile.active_path_id) {
        const { data: path } = await supabaseClient
          .from('career_paths')
          .select('*')
          .eq('id', profile.active_path_id)
          .single();

        if (path) {
          userContext += `Active Path: ${path.title}\n`;
          userContext += `Category: ${path.category}\n`;
          userContext += `Key Skills: ${path.key_skills?.join(', ') || 'N/A'}\n`;
          userContext += `Target Companies: ${path.target_companies?.join(', ') || 'N/A'}\n`;
          userContext += `Journey Duration: ${path.journey_duration || 'N/A'}\n`;
        }
      }

      // CV info
      if (profile.cv_url) {
        userContext += `Has uploaded CV: Yes\n`;
      }

      // Wizard data
      if (profile.wizard_data) {
        const wizardData = profile.wizard_data as any;
        if (wizardData.currentRole) {
          userContext += `Current Role: ${wizardData.currentRole}\n`;
        }
        if (wizardData.experience) {
          userContext += `Experience: ${wizardData.experience}\n`;
        }
      }

      // Voice aspirations
      if (profile.voice_transcription) {
        userContext += `Career Aspirations: ${profile.voice_transcription.substring(0, 200)}...\n`;
      }
    }

    // Progress stats
    if (stats) {
      userContext += `\nProgress:\n`;
      userContext += `- Current Streak: ${stats.current_streak} days\n`;
      userContext += `- Paths Explored: ${stats.paths_explored}\n`;
      userContext += `- Missions Completed: ${stats.missions_completed}\n`;
    }

    // Path diversity
    if (allPaths && allPaths.length > 0) {
      userContext += `\nExploring ${allPaths.length} Career Directions:\n`;
      allPaths.forEach(p => {
        userContext += `- ${p.title} (${p.category})\n`;
      });
    }

    const prompt = `You are a sophisticated career coach providing deeply personalized guidance for ${userName}.

Topic: ${topic}

User Context:
${userContext || 'The user is exploring their career options.'}

Create inspiring, actionable content about "${topic}" specifically tailored to ${userName}'s journey, current progress, and career aspirations. Reference their specific path, skills, and goals when relevant.

Format your response in clean, beautiful paragraphs without any markdown symbols (no **, no #, no bullets).

Structure:
• Start with a powerful opening statement addressing ${userName} (1-2 sentences)
• Follow with three key insights or actionable steps (each 2-3 sentences), separated by blank lines
• End with a motivating closing thought (1-2 sentences)

Use "you" to make it personal. Be specific, authentic, and inspiring. Keep it concise and elegant. Reference market trends in ${profile?.active_path_id ? 'their field' : 'general career development'} when relevant.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a sophisticated, empowering career coach. Be concise, specific, and inspiring.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'Unable to generate content at this time.';

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating featured content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
