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

    const { instructorPhone, events } = await req.json();

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

    // Clear existing Google Calendar events for this instructor
    await supabase
      .from("GoogleCalendarEvent")
      .delete()
      .eq("instructor_id", instructor.id);

    // Insert new Google Calendar events
    if (events && events.length > 0) {
      const googleCalendarEvents = events.map((event: any) => ({
        instructor_id: instructor.id,
        google_event_id: event.googleEventId,
        title: event.title || "Untitled Event",
        description: event.description || "",
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location || "",
        is_all_day: event.isAllDay || false,
        recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("GoogleCalendarEvent")
        .insert(googleCalendarEvents);

      if (insertError) {
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventsCount: events?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error syncing Google Calendar:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to sync calendar",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
