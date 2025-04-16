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

    // Calculate the next day's date
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayString = nextDay.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    // First, get all instructors who have schedules for tomorrow
    const { data: instructorsWithSchedules, error: instructorsError } = await supabaseClient
      .from("Schedule")
      .select(`instructor_id`)
      .eq("date", nextDayString)
      .order("instructor_id");

    if (instructorsError) {
      throw instructorsError;
    }

    // Extract unique instructor IDs
    const uniqueInstructorIds = [...new Set(instructorsWithSchedules.map(s => s.instructor_id))];
    
    if (uniqueInstructorIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No instructors have schedules for tomorrow." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Process each instructor
    const results = [];
    
    for (const instructor_id of uniqueInstructorIds) {
      // Fetch schedules for this instructor for tomorrow
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
        .eq("date", nextDayString)
        .order("start_time");

      if (schedulesError) {
        console.error(`Error fetching schedules for instructor ${instructor_id}:`, schedulesError);
        continue;
      }

      if (schedules.length === 0) {
        continue; // Skip if no schedules (shouldn't happen based on our first query)
      }

      // Get the instructor's phone number
      const instructorPhone = schedules[0].Instructor.phone;
      const instructorName = schedules[0].Instructor.name;

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
            clientWaNumber: instructorPhone,
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
                    text: instructorName,
                  },
                  ...filledScheduleMessages.map((msg) => ({
                    type: "text",
                    text: msg || " ",
                  })),
                ].slice(0, 8), // Ensure only 9 parameters are sent (1 for name + 8 for schedule)
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

      const result = {
        instructor_id,
        name: instructorName,
        success: response.ok,
        status: response.status,
      };
      
      console.log(`Message sent to instructor ${instructorName}:`, result);
      
      if (!response.ok) {
        const errorResponse = await response.text();
        console.error(`Failed to send message to instructor: ${errorResponse}`);
        result.error = errorResponse;
      }
      
      results.push(result);
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed: results.length,
      results 
    }), {
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
