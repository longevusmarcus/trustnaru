import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await req.json().catch(() => ({}));

    // Query for users with cv_url but no cv_structured
    let query = supabase
      .from("user_profiles")
      .select("user_id, cv_url, wizard_data");

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: profiles, error: profileError } = await query;

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unparsedProfiles = profiles?.filter(p => {
      const wizardData = p.wizard_data as any;
      return p.cv_url && (!wizardData?.cv_structured);
    }) || [];

    console.log(`Found ${unparsedProfiles.length} profiles with unparsed CVs`);

    const results = [];

    for (const profile of unparsedProfiles) {
      try {
        console.log(`Processing CV for user: ${profile.user_id}`);

        // Extract file path from cv_url (could be full URL or just path)
        let filePath = profile.cv_url;
        if (filePath.includes('supabase.co')) {
          // Extract path from full URL
          const urlParts = filePath.split('/cvs/');
          filePath = urlParts[urlParts.length - 1];
        }
        
        console.log(`Downloading CV from path: ${filePath}`);

        // Download CV from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("cvs")
          .download(filePath);

        if (downloadError) {
          console.error(`Error downloading CV for ${profile.user_id}:`, downloadError);
          results.push({ user_id: profile.user_id, success: false, error: "Download failed" });
          continue;
        }

        // Convert to base64 using Deno's standard library (more memory efficient)
        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = encodeBase64(new Uint8Array(arrayBuffer));
        const pdfBase64 = `data:application/pdf;base64,${base64}`;

        // Call parse-cv function
        const { data: parsedData, error: parseError } = await supabase.functions.invoke("parse-cv", {
          body: { pdfBase64 },
        });

        if (parseError || parsedData?.error) {
          console.error(`Error parsing CV for ${profile.user_id}:`, parseError || parsedData?.error);
          results.push({ user_id: profile.user_id, success: false, error: "Parse failed" });
          continue;
        }

        // Update wizard_data with cv_structured
        const wizardData = (profile.wizard_data as any) || {};
        const updatedWizardData = {
          ...wizardData,
          cv_structured: parsedData,
        };

        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({ wizard_data: updatedWizardData })
          .eq("user_id", profile.user_id);

        if (updateError) {
          console.error(`Error updating profile for ${profile.user_id}:`, updateError);
          results.push({ user_id: profile.user_id, success: false, error: "Update failed" });
          continue;
        }

        console.log(`Successfully processed CV for ${profile.user_id}`);
        results.push({ user_id: profile.user_id, success: true });

      } catch (err) {
        console.error(`Exception processing ${profile.user_id}:`, err);
        results.push({ user_id: profile.user_id, success: false, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("Batch parse error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
