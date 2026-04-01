import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch OG preview images for a list of URLs.
 * Completely fail-soft: returns empty map on any error.
 */
export async function fetchPreviewImages(
  urls: string[]
): Promise<Record<string, string | null>> {
  try {
    if (!urls || urls.length === 0) return {};

    const { data, error } = await supabase.functions.invoke("preview-images", {
      body: { urls },
    });

    if (error) {
      console.warn("preview-images call failed, using defaults:", error.message);
      return {};
    }

    return data?.images ?? {};
  } catch (e) {
    console.warn("preview-images unexpected error:", e);
    return {};
  }
}
