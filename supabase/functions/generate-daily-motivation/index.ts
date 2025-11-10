import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// No user input expected for this function
const inputSchema = z.object({}).strict();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      console.error('Missing bearer token');
      throw new Error('Not authenticated');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError) {
      console.error('getUser error:', getUserError);
    }
    if (!user) throw new Error('Not authenticated');

    const body = await req.json().catch(() => ({}));
    const validationResult = inputSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user context
    const [profileRes, statsRes, pathRes, goalsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
      supabase.from('career_paths').select('*').eq('user_id', user.id).eq('id', 
        (await supabase.from('user_profiles').select('active_path_id').eq('user_id', user.id).single()).data?.active_path_id || ''
      ).single(),
      supabase.from('goals').select('*').eq('user_id', user.id).eq('completed', false).limit(3)
    ]);

    const profile = profileRes.data;
    const stats = statsRes.data;
    const path = pathRes.data;
    const goals = goalsRes.data || [];

    // Build context for AI
    const context = {
      pathTitle: path?.title || 'your career',
      currentLevel: stats?.current_level || 1,
      streak: stats?.current_streak || 0,
      missionsCompleted: stats?.missions_completed || 0,
      keySkills: path?.key_skills || [],
      upcomingGoals: goals.map(g => g.title),
      journeyStage: stats?.current_level < 3 ? 'beginning' : stats?.current_level < 6 ? 'developing' : 'advancing',
      pathDescription: path?.description || '',
      roadmap: path?.roadmap || []
    };

    // Determine if today is a motivation or affirmation day (alternate based on day of year)
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const isAffirmationDay = dayOfYear % 2 === 0;

    // Generate personalized message using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    let prompt: string;
    let systemMessage: string;
    
    if (isAffirmationDay) {
      prompt = `Generate a single powerful, personal affirmation (max 15 words) for someone on their ${context.pathTitle} journey.

Context:
- Path: ${context.pathDescription}
- Level ${context.currentLevel}, ${context.streak} day streak
- Key skills developing: ${context.keySkills.slice(0, 3).join(', ')}
- Current goals: ${context.upcomingGoals.slice(0, 2).join(', ')}

Create a practical, inspirational affirmation that reinforces their capabilities and aligns with their specific path. Use "you" or "I" statements. Make it actionable and empowering.`;
      
      systemMessage = 'You are a supportive career mentor creating powerful, practical affirmations that inspire action.';
    } else {
      prompt = `Generate a single short, personal, encouraging motivation (max 15 words) for someone on their ${context.pathTitle} journey.

Context:
- Level ${context.currentLevel}, ${context.streak} day streak
- Skills focus: ${context.keySkills.slice(0, 3).join(', ')}
- Next goals: ${context.upcomingGoals.slice(0, 2).join(', ')}

Keep it gentle, concise, and specific to their path. Avoid clichés. Make it feel personal and uplifting.`;
      
      systemMessage = 'You are a supportive career mentor. Create brief, gentle motivations that encourage progress.';
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices[0].message.content.trim();
    const messageType = isAffirmationDay ? 'affirmation' : 'motivation';

    console.log(`Generated ${messageType}:`, message);

    return new Response(
      JSON.stringify({ 
        motivation: message, 
        type: messageType,
        context 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating motivation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        motivation: 'Today is a great day to keep moving forward.' // fallback
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
