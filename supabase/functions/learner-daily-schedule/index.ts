/* eslint-disable prettier/prettier */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format } from "https://esm.sh/date-fns@4.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Schedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  instructor_id: string;
  learner_id: string;
  lesson_id: string;
  status: string;
}

interface Instructor {
  id_instructor: string;
  name: string;
  phone: string;
}

interface Lesson {
  id: string;
  number: number;
}

interface ScheduleWithDetails extends Schedule {
  Instructor: Instructor;
  Lesson: Lesson;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

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
      // .eq("date", tomorrowStr)
      .order("start_time");

    if (schedulesError) {
      throw schedulesError;
    }

    // Fetch all learners
    const { data: learners, error: learnersError } = await supabaseClient
      .from("Learner")
      .select("id, name, phone");

    if (learnersError) {
      throw learnersError;
    }

    // Group schedules by learner
    const schedulesByLearner = schedules.reduce(
      (acc, schedule) => {
        const learnerId = schedule.learner_id;
        if (!acc[learnerId]) {
          acc[learnerId] = [];
        }
        acc[learnerId].push(schedule);
        return acc;
      },
      {} as Record<string, ScheduleWithDetails[]>,
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

    // Send messages to each learner
    for (const learner of learners) {
      const learnerSchedules = schedulesByLearner[learner.id] || [];

      // Format schedule messages
      const scheduleMessages = learnerSchedules.map((schedule, index) => {
        const startTime = formatTime(schedule.start_time);
        const endTime = formatTime(schedule.end_time);
        return `${index + 1}. ${startTime} - ${endTime}: Lesson ${schedule.Lesson.number} with ${schedule.Instructor.name}`;
      });

      // Fill remaining slots with empty strings if less than 6 schedules
      while (scheduleMessages.length < 6) {
        scheduleMessages.push("");
      }

      // Prepare the message payload
      const messagePayload = {
        messages: [
          {
            clientWaNumber: learner.phone,
            templateName: "learner_daily_schedule",
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
                  ...scheduleMessages.map((msg) => ({
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
