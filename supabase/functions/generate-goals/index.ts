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
    const { pathId, userId } = await req.json();
    
    if (!pathId || !userId) {
      throw new Error('Missing required parameters');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the career path details
    const { data: path, error: pathError } = await supabaseClient
      .from('career_paths')
      .select('*')
      .eq('id', pathId)
      .single();

    if (pathError || !path) {
      throw new Error('Failed to fetch career path');
    }

    // Generate goals using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Based on this career path, generate 5 specific, actionable goals:

Career Path: ${path.title}
Description: ${path.description}
Key Skills: ${path.key_skills?.join(', ') || 'N/A'}
Roadmap Steps: ${path.roadmap?.map((r: any) => r.step).join(', ') || 'N/A'}

Generate 5 goals that are:
1. Specific and measurable
2. Aligned with the career path
3. Mix of short-term (1-3 months) and medium-term (3-6 months) timeframes
4. Progressively build towards the career goal

Format each goal as:
- Title: Clear, action-oriented title
- Description: 1-2 sentences explaining the goal
- Priority: high, medium, or low
- Timeline: Number of months to achieve (1-6)`;

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
            content: 'You are a career development expert who creates specific, actionable goals. Return your response as a JSON array of goal objects.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_goals',
            description: 'Create a list of career development goals',
            parameters: {
              type: 'object',
              properties: {
                goals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                      months: { type: 'number' }
                    },
                    required: ['title', 'description', 'priority', 'months']
                  }
                }
              },
              required: ['goals']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_goals' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to generate goals with AI');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const goalsData = JSON.parse(toolCall.function.arguments);
    const goals = goalsData.goals;

    // Insert goals into database
    const goalsToInsert = goals.map((goal: any) => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + goal.months);
      
      return {
        user_id: userId,
        path_id: pathId,
        title: goal.title,
        description: goal.description,
        priority: goal.priority,
        target_date: targetDate.toISOString().split('T')[0],
        completed: false
      };
    });

    const { data: insertedGoals, error: insertError } = await supabaseClient
      .from('goals')
      .insert(goalsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to insert goals:', insertError);
      throw new Error('Failed to save goals');
    }

    return new Response(
      JSON.stringify({ goals: insertedGoals }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-goals function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});