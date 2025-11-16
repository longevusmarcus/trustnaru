import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Starting mentor embeddings generation...");

    // Get all mentors without embeddings
    const { data: mentors, error: fetchError } = await supabaseClient
      .from("mentors")
      .select("*")
      .is("mentor_embedding", null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${mentors?.length || 0} mentors without embeddings`);

    if (!mentors || mentors.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No mentors need embeddings", 
          processed: 0 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let processed = 0;
    let failed = 0;

    // Process mentors in batches
    for (const mentor of mentors) {
      try {
        // Build mentor text representation
        const mentorText = `
Name: ${mentor.name}
Title: ${mentor.title || ""}
Company: ${mentor.company || ""}
Headline: ${mentor.headline || ""}
Location: ${mentor.location || ""}
Industry: ${mentor.industry || ""}
Category: ${mentor.category || ""}
Key Skills: ${mentor.key_skills?.join(", ") || ""}
Achievements: ${mentor.achievements?.join(", ") || ""}
Leadership Philosophy: ${mentor.leadership_philosophy?.join(", ") || ""}
        `.trim();

        console.log(`Generating embedding for mentor: ${mentor.name}`);

        // Generate embedding
        const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-004",
            input: mentorText,
          }),
        });

        if (!embeddingResponse.ok) {
          console.error(`Failed to generate embedding for ${mentor.name}`);
          failed++;
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Update mentor with embedding
        const { error: updateError } = await supabaseClient
          .from("mentors")
          .update({ mentor_embedding: embedding })
          .eq("id", mentor.id);

        if (updateError) {
          console.error(`Failed to update ${mentor.name}:`, updateError);
          failed++;
        } else {
          processed++;
          console.log(`✓ Processed ${mentor.name}`);
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing mentor ${mentor.name}:`, error);
        failed++;
      }
    }

    console.log(`Completed: ${processed} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: "Mentor embeddings generated",
        processed,
        failed,
        total: mentors.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
