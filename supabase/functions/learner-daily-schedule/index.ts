/* eslint-disable prettier/prettier */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// interface Schedule {
//   id: string;
//   date: string;
//   start_time: string;
//   end_time: string;
//   instructor_id: string;
//   learner_id: string;
//   lesson_id: string;
//   status: string;
// }

// interface Instructor {
//   id_instructor: string;
//   name: string;
//   phone: string;
// }

// interface Lesson {
//   id: string;
//   number: number;
// }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { learner_id, reschedule_lesson_number = 1 } = await req.json();
    console.log(learner_id, "called");
    // Fetch all schedules for tomorrow with related data
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
        Lesson (
          id,
          number
        )
      `,
      )
      .eq("learner_id", learner_id)
      .order("date")
      .order("start_time");

    if (schedulesError) {
      throw schedulesError;
    }

    const { data: learner, error: learnerError } = await supabaseClient
      .from("Learner")
      .select("id, name, phone")
      .eq("id", learner_id)
      .single();

    if (learnerError) {
      throw learnerError;
    }

    // Filter schedules based on reschedule_lesson_number
    const filteredSchedules = schedules.filter(schedule => 
      schedule.Lesson.number >= reschedule_lesson_number
    );

    // Format time function
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

    const formatDate = (date: string): string => {
      const [year, month, day] = date.split("-");
      return  `${day}/${month}/${year}`;
    };

    // Format schedule messages
    const scheduleMessages = filteredSchedules.map((schedule, index) => {
      const date = formatDate(schedule.date);
      const startTime = formatTime(schedule.start_time);
      const endTime = formatTime(schedule.end_time);
      return `${
        index + 1
      }.${date}. ${startTime} - ${endTime}: Lesson ${schedule.Lesson.number} with ${schedule.Instructor.name}`;
    });

    // Fill remaining slots with empty strings if less than 6 schedules
    while (scheduleMessages.length < 6) {
      scheduleMessages.push("");
    }

    // Prepare the message payload
    const messagePayload = {
      messages: [
        {
          clientWaNumber: "916289127271",
          templateName: "instructor_daily_schedule",
          templateContent:
            "Hey {{1}},\nWe hope your day went well and you had the best time! Here is your schedule for tomorrow:\n \n{{2}}\n{{3}}\n{{4}}\n{{5}}\n{{6}}\n{{7}}\nPlease check your calendar for more details 😊\nThank you!\nThe Lane Team 🚗",
          templateHeader: "",
          languageCode: "en",
          variables: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: learner.name,
                },
                // only 6 schedules for testing, fix this later
                ...scheduleMessages.slice(0, 6).map((msg) => ({
                  type: "text",
                  text: msg || " ",
                })),
              ],
            },
          ],
          messageType: "template",
          refId: `schedule-${learner.id}-${Date.now()}`,
        },
      ],
    };

    // Send WhatsApp message
    const response = await fetch("https://api.heltar.com/v1/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJidXNpbmVzcyI6eyJpZCI6MTAzfSwiaWF0IjoxNzM2OTU5OTQ4LCJleHAiOjE4MzE1Njc5MTl9.4V3Hs6zLnKfR8qZq5w4HDEhqCDcDXsEBewn6REF4mu0`,
      },
      body: JSON.stringify(messagePayload),
    });

    console.log(
      `Message sent to learner ${learner.name}`,
      messagePayload,
      response.ok,
      response.status,
    );
    if (!response.ok) {
      throw new Error(
        `Failed to send message to learner ${learner.name}: ${await response
          .text()}`,
      );
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
