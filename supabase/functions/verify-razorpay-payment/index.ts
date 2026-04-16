import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};

/**
 * Calculate how many lessons to unlock for half (first installment) payment.
 * 10hr→8, 8hr→6, 6hr→4, 4hr→2, 2hr→1. Demo (1hr) = full payment only.
 */
function getHalfPaymentLessons(totalHours: number): number[] {
  if (totalHours <= 1) return [1];
  if (totalHours === 2) return [1];
  const count = totalHours - 2;
  return Array.from({ length: count }, (_, i) => i + 1);
}

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  paymentId: string;
}

/**
 * Verify Razorpay signature using HMAC-SHA256
 * Signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const body = orderId + "|" + paymentId;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const calculatedSignature = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return calculatedSignature === signature;
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

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

    if (!razorpayKeySecret) {
      throw new Error("Razorpay credentials not configured");
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId,
    } = (await req.json()) as VerifyPaymentRequest;

    console.log("Verifying Razorpay payment:", {
      razorpay_order_id,
      razorpay_payment_id,
      paymentId,
    });

    // 1. Verify signature
    const isValid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret,
    );

    if (!isValid) {
      console.error("Razorpay signature verification failed");
      throw new Error("Payment signature verification failed");
    }

    console.log("Signature verified successfully");

    // 2. Get payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payment")
      .select(
        `
        id,
        learner_id,
        payment_type,
        amount,
        installment_type,
        status,
        Learner (
          phone
        )
      `,
      )
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      throw new Error("Payment not found");
    }

    // Check if payment is already completed
    if (payment.status === "completed") {
      console.log("Payment already completed");
      return new Response(
        JSON.stringify({ success: true, message: "Payment already completed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Update payment record
    const { error: updateError } = await supabaseClient
      .from("payment")
      .update({
        status: "completed",
        gateway_reference: razorpay_payment_id,
      })
      .eq("id", paymentId);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw updateError;
    }

    console.log("Payment status updated to completed");

    // 4. Update related records (enrollment, etc.)
    const installmentType = payment.installment_type || "full";
    const paymentType = payment.payment_type || "course";

    if (paymentType === "course") {
      const { data: enrollment, error: enrollmentQueryError } =
        await supabaseClient
          .from("enrollment")
          .select("*, unlocked_lessons")
          .eq("payment_id", paymentId)
          .single();

      if (enrollmentQueryError) {
        console.error("Error fetching enrollment:", enrollmentQueryError);
        throw enrollmentQueryError;
      }

      if (!enrollment) {
        throw new Error("Enrollment record not found");
      }

      let newPaymentStatus = enrollment.payment_status;
      let unlockedLessons = enrollment.unlocked_lessons || [];

      if (installmentType === "full") {
        unlockedLessons = Array.from({ length: 10 }, (_, i) => i + 1);
        newPaymentStatus = "full_paid";
      } else if (installmentType === "first_half") {
        unlockedLessons = getHalfPaymentLessons(10);
        newPaymentStatus = "half_paid";
      } else if (
        installmentType === "second_half" &&
        enrollment.payment_status === "half_paid"
      ) {
        unlockedLessons = Array.from({ length: 10 }, (_, i) => i + 1);
        newPaymentStatus = "full_paid";
      }

      console.log("Updating enrollment:", {
        paymentStatus: newPaymentStatus,
        unlockedLessons,
        enrollmentId: enrollment.id,
      });

      const { error: enrollmentError } = await supabaseClient
        .from("enrollment")
        .update({
          payment_status: newPaymentStatus,
          unlocked_lessons: unlockedLessons,
          status: "active",
          progress: {
            completed_lessons: enrollment.progress?.completed_lessons || [],
            current_lesson: enrollment.progress?.current_lesson || 1,
            last_accessed: new Date().toISOString(),
          },
        })
        .eq("id", enrollment.id);

      if (enrollmentError) {
        console.error("Error updating enrollment:", enrollmentError);
        throw enrollmentError;
      }
    } else if (paymentType === "reschedule") {
      const { error: scheduleError } = await supabaseClient
        .from("Schedule")
        .update({
          status: "confirmed",
          payment_confirmed: true,
        })
        .eq("payment_id", paymentId);

      if (scheduleError) {
        console.error("Error updating schedule:", scheduleError);
        throw scheduleError;
      }
    } else if (paymentType === "demo") {
      const { data: enrollment, error: enrollmentQueryError } =
        await supabaseClient
          .from("enrollment")
          .select("*")
          .eq("payment_id", paymentId)
          .single();

      if (enrollmentQueryError) throw enrollmentQueryError;
      if (!enrollment) throw new Error("Demo enrollment not found");

      const { error: enrollmentError } = await supabaseClient
        .from("enrollment")
        .update({
          payment_status: "full_paid",
          unlocked_lessons: [1],
          status: "active",
          progress: {
            type: "demo",
            total_hours: 1,
            completed_lessons: [],
            current_lesson: 1,
            last_accessed: new Date().toISOString(),
          },
        })
        .eq("id", enrollment.id);

      if (enrollmentError) throw enrollmentError;
    } else if (paymentType === "custom") {
      const { data: enrollment, error: enrollmentQueryError } =
        await supabaseClient
          .from("enrollment")
          .select("*")
          .eq("payment_id", paymentId)
          .single();

      if (enrollmentQueryError) throw enrollmentQueryError;
      if (!enrollment) throw new Error("Custom enrollment not found");

      const totalHours = enrollment.progress?.total_hours || 10;
      const lessonsToUnlock = Math.min(Math.ceil(totalHours / 1), 10);
      let unlockedLessons = enrollment.unlocked_lessons || [];
      let newPaymentStatus = enrollment.payment_status;

      if (installmentType === "full") {
        unlockedLessons = Array.from(
          { length: lessonsToUnlock },
          (_, i) => i + 1,
        );
        newPaymentStatus = "full_paid";
      } else if (installmentType === "first_half") {
        unlockedLessons = getHalfPaymentLessons(totalHours);
        newPaymentStatus = "half_paid";
      } else if (
        installmentType === "second_half" &&
        enrollment.payment_status === "half_paid"
      ) {
        unlockedLessons = Array.from(
          { length: lessonsToUnlock },
          (_, i) => i + 1,
        );
        newPaymentStatus = "full_paid";
      }

      const { error: enrollmentError } = await supabaseClient
        .from("enrollment")
        .update({
          payment_status: newPaymentStatus,
          unlocked_lessons: unlockedLessons,
          status: "active",
          progress: {
            ...enrollment.progress,
            completed_lessons: enrollment.progress?.completed_lessons || [],
            current_lesson: enrollment.progress?.current_lesson || 1,
            last_accessed: new Date().toISOString(),
          },
        })
        .eq("id", enrollment.id);

      if (enrollmentError) throw enrollmentError;
    }

    // 5. Send thank you message
    try {
      const { error: messageError } = await supabaseClient.functions.invoke(
        "send-message",
        {
          body: {
            message_type: "WEBAPP_THANK_YOU_FOR_PAYMENT_GENERIC",
            learner_id: payment.learner_id,
            payment_amount: payment.amount,
          },
        },
      );

      if (messageError) {
        console.error("Error sending thank you message:", messageError);
      }
    } catch (msgErr) {
      console.error("Error invoking send-message:", msgErr);
    }

    console.log("Razorpay payment verified successfully:", {
      paymentId,
      razorpayPaymentId: razorpay_payment_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
