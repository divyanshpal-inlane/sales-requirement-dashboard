import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format } from "https://esm.sh/date-fns@4.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Function to format time from 24-hour to 12-hour format
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  let period = "AM";
  let hourNum = parseInt(hours);

  if (hourNum >= 12) {
    period = "PM";
    if (hourNum > 12) {
      hourNum -= 12;
    }
  }

  if (hourNum === 0) {
    hourNum = 12;
  }

  return `${hourNum}:${minutes} ${period}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get the instructor ID from the request body
    const { instructor_id } = await req.json();
    console.log(instructor_id, "called");

    // Calculate the next day's date
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayString = nextDay.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    // Fetch schedules for the next day with related data
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from("Schedule")
      .select(
        `
        *,
        Instructor (
          id_instructor,
          name,
          phone
        ),
        Learner (
          id,
          name
        ),
        Lesson (
          id,
          number
        )
      `)
      .eq("instructor_id", instructor_id)
      .eq("date", nextDayString) // Filter for the next day's date
      .order("start_time");

    if (schedulesError) {
      throw schedulesError;
    }

    // Check if there are any schedules for the next day
    if (schedules.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No schedules for tomorrow." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get the instructor's phone number
    const instructorPhone = schedules[0].Instructor.phone;

    // Format schedule messages for multiple lessons
    const scheduleMessages = schedules.map((schedule) => {
      const startTime = formatTime(schedule.start_time);
      const endTime = formatTime(schedule.end_time);
      return `${startTime} - ${endTime}: Lesson ${schedule.Lesson.number} with ${schedule.Learner.name}`;
    });

    // Ensure there are 8 slots in the message, filling with empty strings if necessary
    const filledScheduleMessages = [...scheduleMessages, ...Array(8).fill("")].slice(0, 8);

    // Prepare the message payload for the instructor
    const messagePayload = {
      messages: [
        {
          clientWaNumber: instructorPhone, // Send to the instructor's phone
          templateName: "instructor_reminder_class_message_1_day_before",
          templateContent:
            "Hey {{1}}, We hope your day went well and you had the best time! Here is your schedule for tomorrow: {{2}} {{3}} {{4}} {{5}} {{6}} {{7}} {{8}} Please check your calendar for more details and plan your day accordingly! 😊 Thank you! The Lane Team 🚘",
          templateHeader: "",
          languageCode: "en",
          variables: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: schedules[0].Instructor.name, // Parameter 1: Instructor's name
                },
                ...filledScheduleMessages.map((msg) => ({
                  type: "text",
                  text: msg || " ", // Fill with empty string if undefined
                })),
              ].slice(0, 8), // Ensure only 8 parameters are sent
            },
          ],
          messageType: "template",
          refId: `schedule-${instructor_id}-${Date.now()}`,
        },
      ],
    };

    // Send WhatsApp message
    const response = await fetch("https://api.heltar.com/v1/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("HELTAR_API_KEY")}`,
      },
      body: JSON.stringify(messagePayload),
    });

    console.log(
      `Message sent to instructor ${schedules[0].Instructor.name}`,
      messagePayload,
      response.ok,
      response.status,
    );
    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(`Failed to send message to instructor: ${errorResponse.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
