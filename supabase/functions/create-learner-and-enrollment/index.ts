import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load environment variables
const supabaseUrl = Deno.env.get("MY_SUPABASE_URL");
const supabaseKey = Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

export async function createLearnerAndEnrollment(data: {
  name: string;
  email: string;
  phone: string;
  courseId: string;
  amount: number;
  installmentType: string;
  installment1Amount: number;
  installment2Amount: number;
  unlockedLessons: number[];
}) {
  const {
    name,
    email,
    phone,
    courseId,
    amount,
    installmentType,
    installment1Amount,
    installment2Amount,
    unlockedLessons,
  } = data;

  // Create learner entry
  const { data: learners, error: learnerError } = await supabase
    .from("Learner")
    .insert([{ name, email, phone }])
    .select()
    .maybeSingle();

  if (learnerError || !learners) {
    console.error("Supabase learner insert error:", learnerError);
    throw new Error(learnerError?.message || "Failed to create learner");
  }

  // Create enrollment entry
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollment")
    .insert([
      {
        learner_id: learners.id,
        course_id: courseId,
        amount,
        installment_mode: installmentType,
        installment1_amount: installment1Amount,
        installment2_amount: installment2Amount,
        unlocked_lessons: unlockedLessons,
      },
    ])
    .select()
    .maybeSingle();

  if (enrollmentError || !enrollments)
    throw new Error(enrollmentError?.message || "Failed to create enrollment");

  return { learner: learners, enrollment: enrollments };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const result = await createLearnerAndEnrollment(body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating learner and enrollment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
