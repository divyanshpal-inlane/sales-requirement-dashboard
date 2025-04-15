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

    const { learner_id } = await req.json();
    console.log(learner_id, "called");

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
        Lesson (
          id,
          number
        )
      `)
      .eq("learner_id", learner_id)
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

    const { data: learner, error: learnerError } = await supabaseClient
      .from("Learner")
      .select("id, name, phone")
      .eq("id", learner_id)
      .single();

    if (learnerError) {
      throw learnerError;
    }
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
    

    // Format schedule messages for multiple lessons
    // Format schedule messages for multiple lessons
const scheduleMessages = schedules.map((schedule) => {
  const startTime = formatTime(schedule.start_time);
  const endTime = formatTime(schedule.end_time);
  return `${startTime} - ${endTime}: Lesson ${schedule.Lesson.number}`;
});

// Prepare the message payload
const messagePayload = {
  messages: [
    {
      clientWaNumber: learner.phone,
      templateName: "webapp_reminder_customer_for_class_tomorrow",
      templateContent:
        "Hey {{1}}, We hope you are having the best day. You have lessons tomorrow 📔🚗. Do check the details below: {{2}} Check the Lane App for more details 🥳 Thank you, Lane Team 🚗🚗",
      templateHeader: "",
      languageCode: "en",
      variables: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: learner.name, // Parameter 1: Learner's name
            },
            {
              type: "text",
              text: nextDayString, // Parameter 2: Date of the lesson
            },
            {
              type: "text",
              text: scheduleMessages.join(", "), // Parameter 3: Time and lesson details
            },
            {
              type: "text",
              text: schedules[0].Instructor.name, // Parameter 4: Driving buddy's name
            },
            {
              type: "text",
              text: schedules[0].Instructor.phone, // Parameter 5: Driving buddy's contact details
            },
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
        Authorization: `Bearer ${Deno.env.get("HELTAR_API_KEY")}`,
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
        `Failed to send message to learner ${learner.name}: ${await response.text()}`,
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


