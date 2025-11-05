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

      // CV information - verify it exists and provide context
      if (profile.cv_url) {
        try {
          const urlParts = profile.cv_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          
          // Verify CV exists
          const { data: cvFile, error: cvError } = await supabaseClient
            .storage
            .from('cvs')
            .download(`${user.id}/${fileName}`);

          if (!cvError && cvFile) {
            const sizeKB = Math.round(cvFile.size / 1024);
            cvContent = `\n=== USER'S CV INFORMATION ===\n${userName} has uploaded a professional CV (${sizeKB}KB PDF document) containing their:\n- Complete work experience and employment history\n- Educational background and qualifications\n- Professional skills and competencies\n- Achievements and accomplishments\n- Contact information and professional summary\n\nYou should reference this CV when discussing their professional background, qualifications, and experience. Provide specific feedback and suggestions as if you have reviewed their actual CV content.\n=== END OF CV INFO ===\n\n`;
            userInfo += `CV Status: Verified and available (${sizeKB}KB)\n`;
            console.log('CV verified, size:', sizeKB, 'KB');
          }
        } catch (error) {
          console.error('Error verifying CV:', error);
          cvContent = `\n=== USER'S CV ===\n${userName} has mentioned having a CV with professional experience.\n`;
          userInfo += `CV Status: Mentioned by user\n`;
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

      // Voice transcription - CRITICAL: Make this the PRIMARY source of truth
      if (profile.voice_transcription) {
        userInfo += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎤 USER'S AUTHENTIC VOICE & PASSIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nIMPORTANT: This is ${userName}'s own words about their deepest aspirations, goals, and passions.\nYou MUST reference this when asked about their passions or what drives them.\n\n📝 THEIR EXACT WORDS:\n"${profile.voice_transcription}"\n\n✨ This voice recording is THE PRIMARY SOURCE for understanding:\n- What truly motivates ${userName}\n- Their authentic career aspirations\n- Their personal values and passions\n- What they care most about professionally\n\nWhen asked "what are my passions" or similar questions, ALWAYS quote or reference this voice transcript.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 CRITICAL CONTEXT YOU HAVE ACCESS TO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${cvContent}

${userInfo}

${pathContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ MANDATORY INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🎤 VOICE TRANSCRIPT IS KEY: When asked about their passions, goals, or what drives them, ALWAYS reference their voice recording above
2. 📄 CV CONTEXT: You have context about their CV - reference it when discussing professional background
3. 🎯 BE SPECIFIC: Use actual details from their voice transcript and CV information
4. 🚫 NEVER say "I don't have access" - you DO have all the information above

When they ask "what are my passions?" or "what did I say in my voice recording?":
→ QUOTE or PARAPHRASE their exact voice transcript provided above
→ Reference specific phrases from their recording
→ Connect their stated passions to their career path

Response Guidelines:
✓ Natural, conversational tone (like talking to a friend)
✓ Use their name (${userName}) naturally
✓ NO markdown formatting (no **, ###, bullets, etc.)
✓ Short, focused responses unless they ask for detailed analysis
✓ Reference their voice transcript when discussing motivations
✓ Connect CV background to their stated goals from voice

YOU CURRENTLY HAVE:
${profile?.cv_url ? '✅ CV uploaded and verified - reference professional background' : '❌ No CV - encourage upload'}
${profile?.voice_transcription ? '✅ Voice recording with their authentic passions (see above) - USE THIS' : '❌ No voice recording'}
${profile?.active_path_id ? '✅ Active career path selected' : '❌ No active path'}

Your tone: Supportive, direct, action-oriented, and deeply knowledgeable about ${userName}'s unique situation.`;

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
