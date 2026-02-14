import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};

interface PaymentDetails {
  amount: number;
  email: string;
  phone: string;
  paymentType: "course" | "demo" | "custom";
  courseId?: string;
  name: string;
  learnerId?: string;
  installmentType?: "full" | "first_half" | "second_half";
  installment1Amount?: number;
  installment2Amount?: number;
  selectedModules?: string[];
  totalHours?: number;
  isDemoUpgrade?: boolean;
  demoPaymentId?: string;
  courseSelectionType?: string;
  enrollmentId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("MY_SUPABASE_URL") ?? "",
      Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Razorpay credentials not configured");
    }

    const {
      amount,
      email,
      phone,
      paymentType,
      courseId,
      name,
      learnerId: providedLearnerId,
      installmentType,
      installment1Amount,
      installment2Amount,
      selectedModules,
      totalHours,
      isDemoUpgrade,
      demoPaymentId,
      courseSelectionType,
    } = (await req.json()) as PaymentDetails;

    // 1. Find or create learner
    let learnerId: string;

    if (providedLearnerId) {
      const { data: existingLearner, error: learnerVerifyError } =
        await supabaseClient
          .from("Learner")
          .select("id")
          .eq("id", providedLearnerId)
          .single();

      if (learnerVerifyError || !existingLearner) {
        throw new Error("Invalid learner ID");
      }
      learnerId = providedLearnerId;

      // Update learner details if provided
      if (name || email) {
        const updateData: { name?: string; email?: string } = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;

        await supabaseClient
          .from("Learner")
          .update(updateData)
          .eq("id", learnerId);
      }
    } else {
      // Lookup by phone
      const { data: existingLearners, error: learnerQueryError } =
        await supabaseClient
          .from("Learner")
          .select()
          .eq("phone", phone)
          .order("created_at", { ascending: false })
          .limit(1);

      if (learnerQueryError) throw learnerQueryError;

      if (existingLearners?.length) {
        learnerId = existingLearners[0].id;
      } else {
        // Create new learner
        const { data: newLearner, error: learnerCreateError } =
          await supabaseClient
            .from("Learner")
            .insert([
              {
                email,
                phone,
                name,
                onboarding_completed: false,
              },
            ])
            .select()
            .single();

        if (learnerCreateError) throw learnerCreateError;
        learnerId = newLearner.id;
      }
    }

    // 2. Create payment record with gateway = 'razorpay'
    const { data: paymentRecord, error: dbError } = await supabaseClient
      .from("payment")
      .insert([
        {
          learner_id: learnerId,
          amount,
          email,
          phone,
          payment_type: paymentType,
          status: "pending",
          name,
          installment_type: installmentType,
          installment1_amount: installment1Amount,
          installment2_amount: installment2Amount,
          gateway: "razorpay",
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    // Handle demo upgrade
    if (isDemoUpgrade && demoPaymentId) {
      await supabaseClient
        .from("payment")
        .update({ status: "upgraded" })
        .eq("id", demoPaymentId);
    }

    // 3. Handle enrollment records (same logic as process-payment)
    if (paymentType === "course" && courseId) {
      const { data: existingEnrollment, error: enrollmentQueryError } =
        await supabaseClient
          .from("enrollment")
          .select("*")
          .eq("learner_id", learnerId)
          .eq("course_id", courseId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (enrollmentQueryError) throw enrollmentQueryError;

      if (existingEnrollment) {
        if (existingEnrollment.payment_status === "full_paid") {
          throw new Error("This course is already fully paid for");
        }

        if (
          installmentType === "second_half" &&
          existingEnrollment.payment_status !== "half_paid"
        ) {
          throw new Error(
            "Cannot process second installment before first payment",
          );
        }

        await supabaseClient
          .from("enrollment")
          .update({
            payment_id: paymentRecord.id,
            status:
              existingEnrollment?.payment_status === "half_paid"
                ? "active"
                : "pending",
            installment_mode:
              installmentType || existingEnrollment.installment_mode,
            installment1_amount:
              installment1Amount || existingEnrollment.installment1_amount,
            installment2_amount:
              installment2Amount || existingEnrollment.installment2_amount,
          })
          .eq("id", existingEnrollment.id);
      } else {
        await supabaseClient.from("enrollment").insert([
          {
            learner_id: learnerId,
            course_id: courseId,
            payment_id: paymentRecord.id,
            status: "pending",
            payment_status: "pending",
            installment_mode: installmentType,
            installment1_amount: installment1Amount,
            installment2_amount: installment2Amount,
            unlocked_lessons: installmentType === "first_half" ? [1, 2] : [],
          },
        ]);
      }
    }

    // Handle demo payment
    if (paymentType === "demo") {
      await supabaseClient.from("enrollment").insert([
        {
          learner_id: learnerId,
          course_id: null,
          payment_id: paymentRecord.id,
          status: "pending",
          payment_status: "pending",
          installment_mode: "full",
          unlocked_lessons: [1],
          progress: {
            type: "demo",
            total_hours: 1,
          },
        },
      ]);
    }

    // Handle custom course payment
    if (
      paymentType === "custom" &&
      selectedModules &&
      selectedModules.length > 0
    ) {
      const lessonsToUnlock = Math.min(Math.ceil((totalHours || 0) / 1), 10);
      const unlockedLessons = Array.from(
        { length: lessonsToUnlock },
        (_, i) => i + 1,
      );

      await supabaseClient.from("enrollment").insert([
        {
          learner_id: learnerId,
          course_id: null,
          payment_id: paymentRecord.id,
          status: "pending",
          payment_status: "pending",
          installment_mode: installmentType || "full",
          installment1_amount: installment1Amount,
          installment2_amount: installment2Amount,
          unlocked_lessons:
            installmentType === "first_half" ? [1, 2] : unlockedLessons,
          progress: {
            type: "custom",
            selected_modules: selectedModules,
            total_hours: totalHours,
            is_demo_upgrade: isDemoUpgrade || false,
          },
        },
      ]);
    }

    // 4. Create Razorpay order
    const razorpayOrderData = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: "INR",
      receipt: `ORD-${paymentRecord.id}`,
      notes: {
        payment_id: paymentRecord.id,
        learner_id: learnerId,
        payment_type: paymentType,
      },
    };

    const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayResponse = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(razorpayOrderData),
      },
    );

    const razorpayOrder = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error("Razorpay error:", razorpayOrder);
      throw new Error(
        razorpayOrder.error?.description || "Failed to create Razorpay order",
      );
    }

    // 5. Update payment record with Razorpay order ID
    await supabaseClient
      .from("payment")
      .update({
        gateway_reference: razorpayOrder.id,
      })
      .eq("id", paymentRecord.id);

    console.log("Razorpay order created:", {
      paymentId: paymentRecord.id,
      orderId: razorpayOrder.id,
    });

    // 6. Return order details for frontend
    return new Response(
      JSON.stringify({
        success: true,
        orderId: razorpayOrder.id,
        paymentId: paymentRecord.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: razorpayKeyId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
