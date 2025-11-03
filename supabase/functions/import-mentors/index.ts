import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse CSV data from request
    const { csvData } = await req.json();
    
    if (!csvData || !Array.isArray(csvData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSV data format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform CSV data to match database schema
    const mentors = csvData.map((row: any) => {
      // Parse JSON strings in the CSV
      const parseJsonField = (field: string) => {
        try {
          return typeof field === 'string' ? JSON.parse(field) : field;
        } catch {
          return field;
        }
      };

      return {
        name: row.name,
        title: row.title || null,
        company: row.company || null,
        company_url: row.company_url || null,
        location: row.location || null,
        headline: row.headline || null,
        experience_years: row.experience_years ? parseInt(row.experience_years) : null,
        key_skills: parseJsonField(row.key_skills) || [],
        education: parseJsonField(row.education) || [],
        achievements: parseJsonField(row.achievements) || [],
        career_path: parseJsonField(row.career_path) || [],
        industry: row.industry || null,
        profile_url: row.profile_url || null,
        profile_image_url: row.profile_image_url || null,
        follower_count: row.follower_count || null,
        category: row.category || null,
        visualization_images: parseJsonField(row.visualization_images) || [],
        typical_day_routine: parseJsonField(row.typical_day_routine) || [],
        leadership_philosophy: parseJsonField(row.leadership_philosophy) || [],
      };
    });

    // Insert mentors into database
    const { data, error } = await supabase
      .from('mentors')
      .upsert(mentors, { onConflict: 'name', ignoreDuplicates: false });

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${mentors.length} mentors`,
        data 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-mentors function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
