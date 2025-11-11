import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pathTitle, pathDescription, category } = await req.json();

    console.log('Generating daily missions for path:', pathTitle);

    const prompt = `Generate 3 personalized daily missions for someone pursuing this career path:

Career Path: ${pathTitle}
Description: ${pathDescription}
Category: ${category || 'General'}

Create 3 specific, actionable missions that:
1. Are directly related to this career path
2. Can be completed in 5-15 minutes
3. Help build relevant skills or mindset
4. Are varied (reflection, learning, practice, networking, etc.)

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Mission title (max 6 words)",
    "description": "One sentence describing the mission",
    "duration": "X min",
    "type": "Reflection/Learning/Practice/Networking/etc"
  }
]

Make the missions specific to ${category || 'this field'} and practical for today.`;

    const response = await fetch('https://api.lovable.app/v1/ai/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Lovable AI error: ${response.statusText}`);
    }

    const data = await response.json();
    let missions = [];

    try {
      const content = data.choices?.[0]?.message?.content || data.output || data.text || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        missions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing missions:', parseError);
      // Fallback missions based on category
      missions = generateFallbackMissions(category, pathTitle);
    }

    console.log('Generated missions:', missions);

    return new Response(
      JSON.stringify({ missions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-daily-missions:', error);
    
    // Return fallback missions on error
    const { category, pathTitle } = await req.json().catch(() => ({}));
    const missions = generateFallbackMissions(category, pathTitle);
    
    return new Response(
      JSON.stringify({ missions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackMissions(category: string, pathTitle: string) {
  const field = category || 'your field';
  const path = pathTitle || 'your career path';
  
  return [
    {
      title: `Research ${field} Trends`,
      description: `Read one article about current trends in ${field}`,
      duration: "10 min",
      type: "Learning"
    },
    {
      title: "Reflect on Your Progress",
      description: `Write about one skill you want to develop for ${path}`,
      duration: "8 min",
      type: "Reflection"
    },
    {
      title: "Practice Key Skills",
      description: `Spend time practicing a core skill relevant to ${field}`,
      duration: "15 min",
      type: "Practice"
    }
  ];
}
