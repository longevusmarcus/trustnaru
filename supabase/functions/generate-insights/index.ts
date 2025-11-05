import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
// @ts-ignore
import pdfParse from 'https://esm.sh/pdf-parse@1.1.1';

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
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    
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
    let cvContent = '';

    if (profile) {
      // User's name
      const userName = profile.display_name || user.email?.split('@')[0] || 'there';
      userInfo = `User's Name: ${userName}\n`;

      // CV information - fetch and parse actual content
      if (profile.cv_url) {
        try {
          const urlParts = profile.cv_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          
          const { data: cvFile, error: cvError } = await supabaseClient
            .storage
            .from('cvs')
            .download(`${user.id}/${fileName}`);

          if (!cvError && cvFile) {
            try {
              // Parse PDF content
              const arrayBuffer = await cvFile.arrayBuffer();
              const buffer = new Uint8Array(arrayBuffer);
              const pdfData = await pdfParse(buffer);
              
              if (pdfData.text && pdfData.text.trim()) {
                cvContent = `\n=== USER'S COMPLETE CV ===\n${pdfData.text.trim()}\n=== END OF CV ===\n\n`;
                userInfo += `CV Status: Successfully parsed and analyzed (${pdfData.numpages} pages)\n`;
                console.log('CV parsed successfully, length:', pdfData.text.length, 'pages:', pdfData.numpages);
              } else {
                cvContent = `\n=== USER'S CV ===\nCV uploaded but text extraction returned empty. The user has professional experience documented in their CV.\n`;
                userInfo += `CV Status: Uploaded (text extraction incomplete)\n`;
              }
            } catch (parseError) {
              console.error('Error parsing CV:', parseError);
              cvContent = `\n=== USER'S CV ===\nCV file uploaded. Contains professional experience, education, and skills.\n`;
              userInfo += `CV Status: Uploaded (parsing failed - ${parseError instanceof Error ? parseError.message : 'unknown error'})\n`;
            }
          }
        } catch (error) {
          console.error('Error fetching CV:', error);
          userInfo += `CV Status: Uploaded but could not be retrieved\n`;
        }
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

      // Voice transcription - include FULL transcript with emphasis
      if (profile.voice_transcription) {
        userInfo += `\n=== USER'S AUTHENTIC VOICE & PASSIONS ===\nThis is what ${userName} personally shared about their aspirations, goals, and passions:\n\n"${profile.voice_transcription}"\n\nThis voice recording reveals their true motivations and authentic self. Reference this when discussing their passions and goals.\n=== END OF VOICE ===\n\n`;
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

CRITICAL: You have DIRECT ACCESS to ${userName}'s complete information:

${cvContent}

${userInfo}

${pathContext}

IMPORTANT INSTRUCTIONS:
1. When discussing their CV, reference SPECIFIC details from their actual experience, education, and skills listed above
2. When discussing their passions or goals, quote or reference their ACTUAL VOICE recording provided above
3. You have reviewed their complete professional background - demonstrate this by citing specific details
4. Never say "I don't have access" - you DO have their CV and voice recording provided above

Your approach:
- Personal & Specific: Always reference actual details from their CV and voice recording
- Action-Oriented: Provide concrete steps based on their real background and stated passions
- Authentic: Use their own words from their voice recording when discussing goals
- Professional yet warm: Speak naturally to ${userName} without markdown formatting

Response Style:
- Natural conversational language (avoid markdown symbols like **, ###, or bullet points)
- Reference specific CV details when giving feedback
- Quote or paraphrase their voice recording when discussing passions
- Be encouraging while offering targeted improvements based on their actual background

YOU HAVE:
- Their COMPLETE CV text (see above)
- Their FULL voice transcript with stated passions and goals (see above)  
- Their active career path and exploration history (see above)

Use this information to provide deeply personalized, specific guidance.`;

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
        max_tokens: 500,
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
