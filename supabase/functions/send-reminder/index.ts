import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

import { supabase } from "@/lib/supabaseClient";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sendReminders = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formattedDate = formatDate(tomorrow);

  const { data: schedules, error } = await supabaseClient
    .from("Schedule")
    .select(
      `
      id,
      date,
      start_time,
      learner_id,
      Instructor (
        name,
        phone
      )
    `,
    )
    .eq("date", formattedDate);

  if (error) {
    console.error("Error fetching schedules:", error);
    return;
  }

  for (const schedule of schedules) {
    try {
      supabase.functions.invoke("send-message", {
        body: {
          message_type: "CLASS_REMINDER",
          learner_id: schedule.learner_id,
          schedule_id: schedule.id,
        },
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  }
};

sendReminders();
