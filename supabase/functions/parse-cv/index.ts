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
    console.log('Parse-cv function called');
    const { pdfBase64 } = await req.json();
    console.log('PDF base64 received, length:', pdfBase64?.length || 0);
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'PDF data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling Lovable AI to parse CV with vision...');

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
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this CV/resume and extract structured career data. Extract current role, experience, skills, companies, education, and achievements. If a field is not found, return null or empty array.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: pdfBase64
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_cv_data',
              description: 'Extract structured career data from CV',
              parameters: {
                type: 'object',
                properties: {
                  current_role: {
                    type: ['string', 'null'],
                    description: 'Current job title or most recent role'
                  },
                  years_of_experience: {
                    type: ['number', 'null'],
                    description: 'Total years of professional experience'
                  },
                  key_skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of key skills and competencies'
                  },
                  past_companies: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Companies worked at (most recent first)'
                  },
                  education: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        degree: { type: 'string' },
                        institution: { type: 'string' },
                        year: { type: ['number', 'null'] }
                      }
                    },
                    description: 'Educational background'
                  },
                  certifications: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Professional certifications'
                  },
                  notable_achievements: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Key achievements or accomplishments (max 5)'
                  }
                },
                required: ['current_role', 'years_of_experience', 'key_skills', 'past_companies', 'education', 'certifications', 'notable_achievements']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_cv_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI parsing failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in response');
      throw new Error('Failed to extract CV data');
    }

    const cvData = JSON.parse(toolCall.function.arguments);
    console.log('Successfully parsed CV with structured data');

    return new Response(
      JSON.stringify(cvData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-cv function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        current_role: null,
        years_of_experience: null,
        key_skills: [],
        past_companies: [],
        education: [],
        certifications: [],
        notable_achievements: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
