import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  pathId: z.string().uuid("Invalid path ID format"),
  userId: z.string().uuid("Invalid user ID format")
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate goals function called');
    const body = await req.json();
    const validated = inputSchema.parse(body);
    const { pathId, userId } = validated;
    console.log('Parameters:', { pathId, userId });

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
    console.log('Fetching career path...');
    const { data: path, error: pathError } = await supabaseClient
      .from('career_paths')
      .select('*')
      .eq('id', pathId)
      .single();

    if (pathError || !path) {
      console.error('Failed to fetch career path:', pathError);
      throw new Error('RESOURCE_NOT_FOUND');
    }

    console.log('Career path found:', path.title);

    // Generate goals using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('SERVICE_UNAVAILABLE');
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

    console.log('Calling AI to generate goals...');
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
      throw new Error('AI_GENERATION_FAILED');
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in AI response:', JSON.stringify(aiData));
      throw new Error('AI_RESPONSE_INVALID');
    }

    const goalsData = JSON.parse(toolCall.function.arguments);
    const goals = goalsData.goals;
    console.log(`Generated ${goals.length} goals`);

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

    console.log('Inserting goals into database...');
    const { data: insertedGoals, error: insertError } = await supabaseClient
      .from('goals')
      .insert(goalsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to insert goals:', insertError);
      throw new Error('DATABASE_ERROR');
    }

    console.log(`Successfully inserted ${insertedGoals.length} goals`);
    return new Response(
      JSON.stringify({ goals: insertedGoals }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-goals function:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const errorMessage = error instanceof Error && error.message === 'SERVICE_UNAVAILABLE'
      ? 'Service temporarily unavailable'
      : error instanceof Error && error.message === 'RESOURCE_NOT_FOUND'
      ? 'Resource not found'
      : 'Unable to generate goals';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});