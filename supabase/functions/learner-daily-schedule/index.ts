import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

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
      Deno.env.get("MY_SUPABASE_URL") ?? "",
      Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Calculate the next day's date
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayString = nextDay.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    // First, get all learners who have schedules for tomorrow
    const { data: learnersWithSchedules, error: learnersError } =
      await supabaseClient
        .from("Schedule")
        .select(`learner_id`)
        .eq("date", nextDayString)
        .neq("status", "paused")
        .order("learner_id");

    if (learnersError) {
      throw learnersError;
    }

    // Extract unique learner IDs
    const uniqueLearnerIds = [
      ...new Set(learnersWithSchedules.map((s) => s.learner_id)),
    ];

    if (uniqueLearnerIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No learners have schedules for tomorrow.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Process each learner
    const results = [];

    for (const learner_id of uniqueLearnerIds) {
      // Fetch tomorrow's schedules + ALL schedules for this learner to calculate correct lesson numbers
      const [tomorrowResult, allResult, learnerResult] = await Promise.all([
        supabaseClient
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
          .eq("date", nextDayString)
          .neq("status", "paused")
          .order("start_time"),
        supabaseClient
          .from("Schedule")
          .select("id, date, start_time, course_id, lesson_id")
          .eq("learner_id", learner_id)
          .neq("status", "paused")
          .order("date", { ascending: true })
          .order("start_time", { ascending: true }),
        supabaseClient
          .from("Learner")
          .select("id, name, phone")
          .eq("id", learner_id)
          .single(),
      ]);

      const schedules = tomorrowResult.data;
      const allSchedules = allResult.data;
      const learner = learnerResult.data;

      if (tomorrowResult.error || !schedules || schedules.length === 0)
        continue;
      if (learnerResult.error || !learner) continue;

      // Calculate chronological lesson numbers per course
      const scheduleToLessonNumber = new Map<number, number>();
      if (allSchedules) {
        const grouped: Record<string, any[]> = {};
        for (const s of allSchedules) {
          const key = s.course_id || "no-course";
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(s);
        }
        for (const group of Object.values(grouped)) {
          group
            .sort(
              (a, b) =>
                new Date(`${a.date}T${a.start_time}`).getTime() -
                new Date(`${b.date}T${b.start_time}`).getTime(),
            )
            .forEach((s, i) => {
              scheduleToLessonNumber.set(s.id, i + 1);
            });
        }
      }

      // Format schedule messages with correct lesson numbers
      const scheduleMessages = schedules.map((schedule) => {
        const startTime = formatTime(schedule.start_time);
        const endTime = formatTime(schedule.end_time);
        const lessonNum =
          scheduleToLessonNumber.get(schedule.id) ||
          schedule.Lesson?.number ||
          "?";
        return `${startTime} - ${endTime}: Lesson ${lessonNum}`;
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

      const result = {
        learner_id,
        name: learner.name,
        success: response.ok,
        status: response.status,
      };

      console.log(`Message sent to learner ${learner.name}:`, result);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to send message to learner ${learner.name}: ${errorText}`,
        );
        result.error = errorText;
      }

      results.push(result);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
