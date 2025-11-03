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

    // Get user's active path for personalization
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('active_path_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let activePathContext = '';
    if (profile?.active_path_id) {
      const { data: path } = await supabaseClient
        .from('career_paths')
        .select('*')
        .eq('id', profile.active_path_id)
        .single();

      if (path) {
        activePathContext = `The user is currently working towards becoming a ${path.title}. Their key skills include: ${path.key_skills?.join(', ')}.`;
      }
    }

    const prompt = `You are a sophisticated career coach providing personalized guidance.

Topic: ${topic}

${activePathContext || 'The user is exploring their career options.'}

Create inspiring, actionable content about "${topic}" specifically tailored to this person's journey. 

Structure your response as:
1. A powerful opening statement (1-2 sentences)
2. Three key insights or actions (each 2-3 sentences)
3. A motivating closing thought (1-2 sentences)

Be specific, authentic, and inspiring. Use "you" to make it personal. Keep it concise and impactful.`;

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
