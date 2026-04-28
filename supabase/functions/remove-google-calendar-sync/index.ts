import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("MY_SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { instructorPhone } = await req.json();

    // Get the instructor ID
    const { data: instructor, error: instructorError } = await supabase
      .from("Instructor")
      .select("id")
      .eq("phone", instructorPhone)
      .single();

    if (instructorError || !instructor) {
      return new Response(JSON.stringify({ error: "Instructor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove all Google Calendar events for this instructor
    const { error: deleteError } = await supabase
      .from("GoogleCalendarEvent")
      .delete()
      .eq("instructor_id", instructor.id);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error removing Google Calendar sync:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to remove calendar sync",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
