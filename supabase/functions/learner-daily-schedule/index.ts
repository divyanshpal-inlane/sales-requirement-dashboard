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
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Calculate the next day's date
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayString = nextDay.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    // First, get all learners who have schedules for tomorrow
    const { data: learnersWithSchedules, error: learnersError } = await supabaseClient
      .from("Schedule")
      .select(`learner_id`)
      .eq("date", nextDayString)
      .order("learner_id");

    if (learnersError) {
      throw learnersError;
    }

    // Extract unique learner IDs
    const uniqueLearnerIds = [...new Set(learnersWithSchedules.map(s => s.learner_id))];
    
    if (uniqueLearnerIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No learners have schedules for tomorrow." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Process each learner
    const results = [];
    
    for (const learner_id of uniqueLearnerIds) {
      // Fetch schedules for this learner for tomorrow
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
        .eq("date", nextDayString)
        .order("start_time");

      if (schedulesError) {
        console.error(`Error fetching schedules for learner ${learner_id}:`, schedulesError);
        continue;
      }

      if (schedules.length === 0) {
        continue; // Skip if no schedules (shouldn't happen based on our first query)
      }

      // Get the learner details
      const { data: learner, error: learnerError } = await supabaseClient
        .from("Learner")
        .select("id, name, phone")
        .eq("id", learner_id)
        .single();

      if (learnerError) {
        console.error(`Error fetching learner ${learner_id}:`, learnerError);
        continue;
      }

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

      const result = {
        learner_id,
        name: learner.name,
        success: response.ok,
        status: response.status,
      };
      
      console.log(`Message sent to learner ${learner.name}:`, result);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to send message to learner ${learner.name}: ${errorText}`);
        result.error = errorText;
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
