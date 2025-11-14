import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  focus: z.enum(['energy', 'cv', 'balanced']).optional().default('balanced'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Not authenticated');
    }

    console.log('Authenticated user:', user.id);

    // Get focus parameter from request body
    const body = await req.json().catch(() => ({}));
    const validationResult = inputSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { focus } = validationResult.data;

    // Get user's profile to find active path
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('active_path_id')
      .eq('user_id', user.id)
      .single();

    // Get liked paths and active path
    const { data: likedPaths } = await supabase
      .from('career_paths')
      .select('title, description, category, key_skills, salary_range, journey_duration, impact_areas')
      .eq('user_id', user.id)
      .eq('user_feedback', 'up')
      .limit(10);

    const { data: activePath } = profile?.active_path_id ? await supabase
      .from('career_paths')
      .select('title, description, category, key_skills, salary_range, journey_duration, impact_areas')
      .eq('id', profile.active_path_id)
      .single() : { data: null };

    // Build context from user's preferences
    let preferencesContext = '';
    let focusInstruction = '';
    
    // Add focus-specific instructions
    if (focus === 'energy') {
      focusInstruction = 'IMPORTANT: Focus heavily on passion-driven career paths and people who followed their interests. Prioritize professionals whose journey shows they pursued what they love, made bold career pivots, or work in mission-driven roles.';
    } else if (focus === 'cv') {
      focusInstruction = 'IMPORTANT: Focus heavily on natural career progression and professionals with strong traditional backgrounds. Prioritize people with impressive credentials, systematic career advancement, and proven track records in established companies.';
    }
    
    if (activePath) {
      preferencesContext += `Active Career Path: ${activePath.title}\n`;
      preferencesContext += `Description: ${activePath.description}\n`;
      preferencesContext += `Skills: ${activePath.key_skills?.join(', ') || 'N/A'}\n\n`;
    }

    if (likedPaths && likedPaths.length > 0) {
      preferencesContext += `Liked Career Paths:\n`;
      likedPaths.forEach((path, idx) => {
        preferencesContext += `${idx + 1}. ${path.title} - ${path.description}\n`;
        preferencesContext += `   Skills: ${path.key_skills?.join(', ') || 'N/A'}\n`;
      });
    }

    if (!preferencesContext) {
      preferencesContext = 'User has not selected any career paths yet. Provide diverse recommendations.';
    }

    const prompt = `${focusInstruction}

CRITICAL INSTRUCTIONS FOR FINDING REAL PEOPLE:
1. You MUST search for and verify REAL people who actually exist
2. Search across multiple platforms: LinkedIn, Instagram, TikTok, Twitter/X, YouTube, personal websites, and Google
3. Cross-reference information across at least 2 sources to verify the person exists
4. If you cannot verify a person exists across multiple sources, DO NOT include them
5. Prioritize people with active online presence and verifiable information
6. Include the most relevant and active profile URL (could be LinkedIn, Instagram, TikTok, website, etc.)
7. Absolutely avoid fabricated or placeholder URLs. Only include links you have verified open successfully.
8. Prefer non-LinkedIn links (Instagram, TikTok, YouTube, Twitter/X, personal website). Use LinkedIn only if the person ALSO has an active, verifiable non‑LinkedIn source.

Based on the following user's career interests and preferences, find 5 REAL, VERIFIABLE professionals who match their aspirations and are coherent with the user's journey focus:

${preferencesContext}

SEARCH STRATEGY:
- For creative/entrepreneurial fields: Prioritize Instagram, TikTok, YouTube, personal websites
- For corporate/traditional fields: Prioritize LinkedIn (but still provide a non‑LinkedIn source)
- For tech/innovation: Check Twitter/X, GitHub, personal blogs
- For lifestyle/influencer paths: Check Instagram, TikTok, YouTube

For each person, provide:
1. Their full name (verified across sources)
2. Current job title or primary role
3. Company/Brand name (or "Independent" if self-employed)
4. Best profile URL (the most active/relevant platform)
5. Platform type (one of: "linkedin", "instagram", "tiktok", "twitter", "youtube", "website", "other")
6. Brief description (2-3 sentences) explaining why they match and a recent achievement/content
7. 2-3 relevant tags
8. Career journey (2-3 key milestones with approximate years if available)
9. Optional but preferred: a second verification URL on a different platform (support_url) and its support_platform

VERIFICATION CHECKLIST for each person:
✓ Can be found on Google with their full name + industry
✓ Has active social media or professional presence
✓ Information is consistent across platforms
✓ Recent activity or content (within last 2 years)
✓ At least one non‑LinkedIn source (instagram/tiktok/twitter/youtube/website) that is active

Return ONLY valid JSON in this exact format:
{
  "mentors": [
    {
      "name": "Full Name",
      "title": "Job Title or Role",
      "company": "Company/Brand Name",
      "profile_url": "https://...",
      "platform_type": "instagram",
      "description": "Why this person matches and what they're known for...",
      "tags": ["Tag1", "Tag2"],
      "career_journey": "Brief career progression with years",
      "support_url": "https://...",
      "support_platform": "website"
    }
  ]
}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI for personalized mentors...');

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
            content: 'You are a career research expert who finds REAL, VERIFIABLE professionals across multiple platforms (LinkedIn, Instagram, TikTok, Twitter, YouTube, personal websites). You MUST verify each person exists and has an active online presence before recommending them. Cross-reference information across sources. Always return valid JSON only with accurate profile URLs.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI Response:', content);

    // Parse the JSON response
    let mentors: any[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        mentors = parsed.mentors || [];
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      throw new Error('Failed to parse AI response');
    }

    // Post-validation to ensure links are real and platform types match
    const inferPlatformFromUrl = (url: string): string => {
      try {
        const u = new URL(url);
        const h = u.hostname.replace('www.', '').toLowerCase();
        if (h.includes('linkedin.')) return 'linkedin';
        if (h.includes('instagram.')) return 'instagram';
        if (h.includes('tiktok.')) return 'tiktok';
        if (h.includes('twitter.') || h.includes('x.com')) return 'twitter';
        if (h.includes('youtube.') || h.includes('youtu.be')) return 'youtube';
        return 'website';
      } catch {
        return 'other';
      }
    };

    const isValidSocialUrl = (url: string, platform: string): boolean => {
      try {
        const u = new URL(url);
        const p = u.pathname;
        const host = u.hostname.toLowerCase();
        switch (platform) {
          case 'instagram':
            return host.includes('instagram.') && /^\/[a-zA-Z0-9._]{2,30}\/??$/.test(p);
          case 'tiktok':
            return (host.includes('tiktok.') && /^\/@[\w.]{2,24}/.test(p));
          case 'twitter':
            return ((host.includes('twitter.') || host.includes('x.com')) && /^\/[A-Za-z0-9_]{1,15}$/.test(p));
          case 'youtube':
            return (host.includes('youtube.') || host.includes('youtu.be')) && (/^\/@[\w.-]{2,}/.test(p) || /\/channel\//.test(p) || /\/c\//.test(p));
          case 'linkedin':
            return host.includes('linkedin.') && p.includes('/in/');
          case 'website':
          default:
            return true;
        }
      } catch {
        return false;
      }
    };

    const fetchTitle = async (url: string, timeoutMs = 8000): Promise<string | null> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
        if (!res.ok) return null;
        const text = await res.text();
        const m = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        return m ? m[1].trim() : null;
      } catch {
        return null;
      } finally {
        clearTimeout(id);
      }
    };

    const urlReachable = async (url: string, timeoutMs = 7000): Promise<boolean> => {
      const tryFetch = async (method: 'HEAD' | 'GET') => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, { method, redirect: 'follow', signal: controller.signal });
          return res.ok || (res.status >= 200 && res.status < 400);
        } catch (_e) {
          return false;
        } finally {
          clearTimeout(id);
        }
      };
      return (await tryFetch('HEAD')) || (await tryFetch('GET'));
    };

    const validateMentors = async (items: any[]) => {
      const valid: any[] = [];
      const invalid: Array<{ item: any; reason: string }> = [];

      for (const m of items) {
        if (!m?.name || !m?.profile_url) {
          invalid.push({ item: m, reason: 'missing_name_or_url' });
          continue;
        }
        let platform = (m.platform_type as string) || inferPlatformFromUrl(m.profile_url);
        if (platform === 'x') platform = 'twitter';

        // LinkedIn: allow if URL matches profile pattern; skip network check due to bot protection
        if (platform === 'linkedin') {
          if (isValidSocialUrl(m.profile_url, 'linkedin')) {
            valid.push({ ...m, platform_type: 'linkedin' });
          } else {
            invalid.push({ item: m, reason: 'linkedin_profile_pattern_invalid' });
          }
          continue;
        }


        // Platform-specific URL structure check
        if (!isValidSocialUrl(m.profile_url, platform)) {
          invalid.push({ item: m, reason: 'platform_url_pattern_invalid' });
          continue;
        }

        // Reachability check
        const reachable = await urlReachable(m.profile_url);
        if (!reachable) {
          invalid.push({ item: m, reason: 'url_unreachable' });
          continue;
        }

        // Title check removed to avoid false negatives on About pages; rely on reachability and URL patterns
        // Previously we attempted to match the person's name in the page title for websites/YouTube, which
        // rejected legitimate About pages. We now trust reachability + pattern checks.


        valid.push({ ...m, platform_type: platform });
      }

      // De-duplicate by name + profile_url
      const deduped: any[] = [];
      const seen = new Set<string>();
      for (const v of valid) {
        const key = `${v.name}__${v.profile_url}`.toLowerCase();
        if (!seen.has(key)) { seen.add(key); deduped.push(v); }
      }

      return { valid: deduped, invalid };
    };

    let { valid: verifiedMentors, invalid: invalidMentors } = await validateMentors(mentors);

    if (invalidMentors.length > 0 && verifiedMentors.length < 5) {
      try {
        const missing = Math.max(0, 5 - verifiedMentors.length);
        const replacementPrompt = `Some suggested mentors were invalid or unverifiable. Replace them with REAL, VERIFIED people (avoid LinkedIn-only).\n\nUser preferences:\n${preferencesContext}\n\nInvalid entries to replace (reasons included):\n${invalidMentors.map((i, idx) => `${idx + 1}. ${i.item?.name || 'Unknown'} - ${i.reason} - ${i.item?.profile_url || 'no url'}`).join('\n')}\n\nCRITICAL REQUIREMENTS:\n- Each replacement MUST have an accurate, working non-LinkedIn URL (Instagram/TikTok/Twitter/X/YouTube/Website).\n- Do not fabricate. Only include people you can verify exist.\n- Return ONLY JSON with exactly ${missing} mentors in the 'mentors' array, same schema as before.`;

        const replaceResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You suggest REAL, VERIFIED professionals with accurate, working non-LinkedIn profile URLs when possible. Output valid JSON only.' },
              { role: 'user', content: replacementPrompt },
            ],
          }),
        });

        if (replaceResp.ok) {
          const replaceData = await replaceResp.json();
          const replaceContent = replaceData.choices?.[0]?.message?.content as string | undefined;
          if (replaceContent) {
            const match = replaceContent.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              const replacements = Array.isArray(parsed?.mentors) ? parsed.mentors : [];
              const { valid: verifiedReplacements } = await validateMentors(replacements);
              for (const r of verifiedReplacements) {
                if (verifiedMentors.length < 5) verifiedMentors.push(r);
              }
            }
          }
        } else {
          console.error('Replacement AI call failed:', await replaceResp.text());
        }
      } catch (e) {
        console.error('Error during replacements:', e);
      }
    }

    if (verifiedMentors.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not verify real mentors. Please try again.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ mentors: verifiedMentors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-personalized-mentors:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        mentors: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
