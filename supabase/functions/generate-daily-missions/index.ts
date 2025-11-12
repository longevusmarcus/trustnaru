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
    const { pathTitle, pathDescription, category, keySkills, roadmap } = await req.json();

    console.log('Generating daily missions for path:', pathTitle);

    // Format key skills and roadmap for context
    const skillsContext = keySkills?.length ? `Key Skills Needed: ${keySkills.join(', ')}` : '';
    const roadmapContext = roadmap?.length 
      ? `Roadmap Phases: ${roadmap.map((phase: any) => phase.title).join(', ')}` 
      : '';

    const prompt = `Generate 3 highly specific and actionable daily missions for someone pursuing this career path:

Career Path: ${pathTitle}
Description: ${pathDescription}
Category: ${category || 'General'}
${skillsContext}
${roadmapContext}

IMPORTANT: Be VERY SPECIFIC. Do not use generic placeholders.

Create 3 specific missions:
1. **Research Mission**: Provide a SPECIFIC article topic or resource name about current trends in ${category || 'this field'}. Example: "Read 'The Rise of AI Agents in 2025' article on TechCrunch" NOT "Read one article about trends"

2. **Skill Practice Mission**: Identify ONE SPECIFIC skill from their path (${keySkills?.join(', ') || 'their key skills'}) and suggest a CONCRETE practice activity. Example: "Practice Python list comprehensions - solve 3 problems on LeetCode" NOT "Practice a core skill"

3. **Reflection/Networking Mission**: A specific action they can take today related to their journey.

Each mission must:
- Be completable in 5-15 minutes
- Include specific resource names, skill names, or concrete actions
- Be directly related to ${pathTitle}

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Mission title (max 6 words)",
    "description": "One sentence with SPECIFIC details (resource names, skill names, concrete actions)",
    "duration": "X min",
    "type": "Learning/Practice/Reflection/Networking"
  }
]`;

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
      title: `Research ${field} Innovations`,
      description: `Find and read a specific article about emerging ${field} trends on Medium or industry blogs`,
      duration: "10 min",
      type: "Learning"
    },
    {
      title: "Map Your Skill Gap",
      description: `Identify one specific skill from ${path} you need to develop and write why it matters`,
      duration: "8 min",
      type: "Reflection"
    },
    {
      title: "Practice Core Competency",
      description: `Spend focused time practicing one key skill from your roadmap using online resources`,
      duration: "15 min",
      type: "Practice"
    }
  ];
}
