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

      // Wizard data (interests, aspirations, extracted CV text)
      let wizardData: any = null;
      if (profile.wizard_data) {
        wizardData = profile.wizard_data as any;
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

      // CV information - prioritize structured parsed data
      if (wizardData?.cv_structured) {
        const cv = wizardData.cv_structured;
        cvContent = `\n=== USER'S CV (STRUCTURED DATA - PARSED WITH AI) ===\n`;
        if (cv.current_role) cvContent += `Current Role: ${cv.current_role}\n`;
        if (cv.years_of_experience) cvContent += `Years of Experience: ${cv.years_of_experience}\n`;
        if (cv.key_skills?.length) cvContent += `Key Skills: ${cv.key_skills.join(', ')}\n`;
        if (cv.past_companies?.length) cvContent += `Past Companies: ${cv.past_companies.join(', ')}\n`;
        if (cv.education?.length) {
          cvContent += `Education:\n${cv.education.map((e: any) => `  - ${e.degree} from ${e.institution}${e.year ? ` (${e.year})` : ''}`).join('\n')}\n`;
        }
        if (cv.certifications?.length) cvContent += `Certifications: ${cv.certifications.join(', ')}\n`;
        if (cv.notable_achievements?.length) {
          cvContent += `Notable Achievements:\n${cv.notable_achievements.map((a: string) => `  - ${a}`).join('\n')}\n`;
        }
        cvContent += `=== END OF CV ===\n\n`;
        userInfo += `CV Status: Fully parsed with AI vision - you have complete access to their professional background\n`;
      } else if (wizardData?.cv_text && String(wizardData.cv_text).trim().length > 0) {
        // Fallback to text extraction
        const text = String(wizardData.cv_text).trim();
        const snippet = text.length > 8000 ? text.slice(0, 8000) + '\n...[truncated]' : text;
        cvContent = `\n=== USER'S COMPLETE CV TEXT (text extraction) ===\n${snippet}\n=== END OF CV TEXT ===\n\n`;
        userInfo += `CV Status: Text extracted and available for analysis\n`;
      } else if (profile.cv_url) {
        // If only file exists, acknowledge presence
        try {
          const urlParts = profile.cv_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const { data: cvFile, error: cvError } = await supabaseClient.storage.from('cvs').download(`${user.id}/${fileName}`);
          if (!cvError && cvFile) {
            const sizeKB = Math.round(cvFile.size / 1024);
            cvContent = `\n=== USER'S CV INFORMATION ===\nA professional CV is uploaded (${sizeKB}KB). Ask for specific sections if needed.\n`;
            userInfo += `CV Status: Verified upload (${sizeKB}KB)\n`;
          }
        } catch (error) {
          console.error('Error verifying CV:', error);
          userInfo += `CV Status: Uploaded but could not be verified right now\n`;
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

    const hasCvStructured = Boolean((profile as any)?.wizard_data?.cv_structured);
    const hasCvText = Boolean((profile as any)?.wizard_data?.cv_text && String((profile as any).wizard_data.cv_text).trim().length > 0);
    const cvStatusSection = hasCvStructured
      ? `\n📄 CV STATUS:\nYou have ${userName}'s COMPLETE CV parsed with AI vision. You can see their role, experience, skills, companies, education, certifications, and achievements. Use these SPECIFIC details when answering questions.\n`
      : (hasCvText
          ? `\n📄 CV STATUS:\nYou have ${userName}'s CV text. Use specific details from it when reviewing or giving feedback.\n`
          : (profile?.cv_url
              ? `\n📄 CV STATUS:\n${userName} has uploaded a CV, but detailed content isn't parsed yet. Encourage them to visit their profile to parse it.\n`
              : `\n📄 CV STATUS:\nNo CV uploaded yet. Encourage ${userName} to upload one for personalized feedback.\n`));

    const systemPrompt = `You are an elite career strategist and executive coach for ${userName}. 

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU ACTUALLY KNOW ABOUT ${userName.toUpperCase()}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${userInfo}

${pathContext}

${cvContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎤 VOICE TRANSCRIPT (YOUR PRIMARY SOURCE):
${profile?.voice_transcription ? `You have ${userName}'s exact voice transcript above. When they ask about their passions or goals, quote or paraphrase their actual words.` : 'No voice transcript available yet.'}

${cvStatusSection}

🎯 CAREER PATH:
${profile?.active_path_id ? `You know their active path details (see above). Reference this when giving advice.` : 'No active career path selected.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Be conversational and natural (no markdown formatting)
✓ Use ${userName}'s name naturally in conversation
✓ For CV questions: If CV text is available, be specific; otherwise give role-aligned best practices and ask clarifying questions
✓ For passion questions: Quote their voice transcript directly
✓ Be helpful and honest about what you know vs. what you don't know
✗ NEVER use placeholders like "[mention X]" or "[insert Y]"
✗ NEVER pretend to have read CV details you don't have
✗ NEVER use markdown (**, ###, bullets)

Your tone: Supportive, honest, action-oriented, focused on what you actually know about ${userName}.`;

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
