import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};

/**
 * Generate HMAC-SHA256 hash for verification (Orange PG)
 */
async function generateSecureHash(
  data: Record<string, string>,
  secretKey: string,
): Promise<string> {
  const sortedKeys = Object.keys(data).sort();
  let hashText = "";
  for (const key of sortedKeys) {
    hashText += data[key];
  }

  console.log("HashText for HMAC:", hashText);
  console.log("Sorted keys:", sortedKeys);

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(hashText);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("MY_SUPABASE_URL") ?? "",
    Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const secretKey = Deno.env.get("ORANGE_PG_SECRET_KEY") ?? "";
  const PAYMENT_SUCCESS_URL = (Deno.env.get("PAYMENT_SUCCESS_URL") ?? "").trim();
  const PAYMENT_FAILURE_URL = (Deno.env.get("PAYMENT_FAILURE_URL") ?? "").trim();

  try {
    // Orange PG can send response as POST with JSON or form data
    let responseData: Record<string, string> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      responseData = await req.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        responseData[key] = value.toString();
      });
    } else {
      // Try URL parameters for GET requests
      const url = new URL(req.url);
      url.searchParams.forEach((value, key) => {
        responseData[key] = value;
      });
    }

    console.log(
      "Orange PG Callback Response:",
      JSON.stringify(responseData, null, 2),
    );

    // Extract key fields from Orange PG response
    const {
      secureHash: receivedHash,
      responseCode,
      merchantTxnNo,
      paymentID,
      amount,
      paymentMode,
      paymentDateTime,
      txnID,
      respDescription,
      addlParam1, // installmentType
      addlParam2, // paymentType
      customerEmailID,
      customerMobileNo,
      paymentSubInstType,
      merchantId,
    } = responseData;

    // Build data object for hash verification - all response fields except secureHash
    // and fields not included in Orange PG's hash calculation
    // Same approach as process-payment: sort ascending, concatenate values, HMAC-SHA256
    const dataForHash: Record<string, string> = { ...responseData };
    delete dataForHash.secureHash;
    delete dataForHash.isCallFromPaymentOptionsPage;
    delete dataForHash.paymentDateTime;

    // Verify secure hash
    const calculatedHash = await generateSecureHash(dataForHash, secretKey);

    console.log("Hash verification:", {
      received: receivedHash,
      calculated: calculatedHash,
      match: calculatedHash === receivedHash,
      hashFields: dataForHash,
    });

    if (calculatedHash !== receivedHash) {
      console.warn("Hash mismatch - response may have been tampered");
    }

    // Extract payment ID from merchantTxnNo (format: ORD-{paymentId})
    if (!merchantTxnNo) {
      console.error("Missing merchantTxnNo in callback response");
      throw new Error("Missing merchantTxnNo");
    }

    const paymentId = merchantTxnNo.replace(/^ORD-/, "");
    if (!paymentId || paymentId === merchantTxnNo) {
      console.error("Invalid merchantTxnNo format:", merchantTxnNo);
      throw new Error(`Invalid merchantTxnNo format: ${merchantTxnNo}`);
    }

    // Determine payment status
    // Orange PG uses "0000" for successful transactions
    // Log all relevant fields for debugging
    console.log("Orange PG callback data:", {
      merchantTxnNo,
      paymentId,
      responseCode,
      respDescription,
      txnID,
      paymentID,
      amount,
      paymentMode,
    });

    const isSuccess = responseCode === "0000";
    const status = isSuccess ? "completed" : "failed";
    const gatewayReference = txnID || paymentID || "";

    console.log("Determined payment status:", {
      paymentId,
      status,
      isSuccess,
      responseCode,
      gatewayReference,
    });

    // First verify the payment exists
    const { data: existingPayment, error: fetchError } = await supabaseClient
      .from("payment")
      .select("id, status")
      .eq("id", paymentId)
      .single();

    if (fetchError || !existingPayment) {
      console.error("Payment not found:", { paymentId, fetchError });
      throw new Error(`Payment not found: ${paymentId}`);
    }

    console.log("Found existing payment:", {
      paymentId,
      currentStatus: existingPayment.status,
      newStatus: status,
    });

    // Update payment record (only status and gateway_reference - no pg_response column exists)
    const { data: updatedPayment, error: updateError } = await supabaseClient
      .from("payment")
      .update({
        status,
        gateway_reference: gatewayReference,
      })
      .eq("id", paymentId)
      .select("id, status")
      .single();

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw updateError;
    }

    console.log("Payment updated successfully:", {
      paymentId,
      updatedStatus: updatedPayment?.status,
    });

    // Get payment details with learner info
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payment")
      .select(
        `
        learner_id,
        payment_type,
        amount,
        installment_type,
        Learner (
          phone
        )
      `,
      )
      .eq("id", paymentId)
      .single();

    if (paymentError) {
      console.error("Error fetching payment:", paymentError);
      throw paymentError;
    }

    // Use addlParam1 for installmentType if available, otherwise use from payment record
    const installmentType = addlParam1 || payment.installment_type || "full";
    // Use addlParam2 for paymentType if available, otherwise use from payment record
    const paymentType = addlParam2 || payment.payment_type || "course";

    // If payment is successful, update related records
    if (isSuccess) {
      try {
        if (paymentType === "course") {
          // Get enrollment record with existing unlocked lessons
          const { data: enrollment, error: enrollmentQueryError } =
            await supabaseClient
              .from("enrollment")
              .select("*, unlocked_lessons")
              .eq("payment_id", paymentId)
              .single();

          if (enrollmentQueryError) throw enrollmentQueryError;
          if (!enrollment) throw new Error("Enrollment record not found");

          // Update enrollment status based on payment type
          let newPaymentStatus = enrollment.payment_status;
          let unlockedLessons = enrollment.unlocked_lessons || [];

          if (installmentType === "full") {
            unlockedLessons = Array.from({ length: 10 }, (_, i) => i + 1);
            newPaymentStatus = "full_paid";
          } else if (installmentType === "first_half") {
            unlockedLessons = [1, 2];
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

          if (scheduleError) throw scheduleError;
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
            unlockedLessons = [1, 2];
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

        // Send thank you message
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
      } catch (error) {
        console.error("Error updating related records:", error);
        // Don't throw here, we still want to redirect the user
      }
    }

    // Build redirect URL
    const redirectUrl = isSuccess
      ? `${PAYMENT_SUCCESS_URL}?status=completed&reference=${gatewayReference}&phone=${encodeURIComponent(
          payment.Learner?.phone || "",
        )}&type=${paymentType}`
      : `${PAYMENT_FAILURE_URL}?status=failed&reference=${gatewayReference}&reason=${encodeURIComponent(
          respDescription || "Payment failed",
        )}`;

    // Return HTML that redirects the browser
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
          <script>window.location.href = "${redirectUrl}";</script>
        </head>
        <body>
          <p>Redirecting... If not redirected, <a href="${redirectUrl}">click here</a>.</p>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Payment callback error:", error);

    const errorRedirectUrl = `${PAYMENT_FAILURE_URL}?status=failed&error=verification_failed`;

    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${errorRedirectUrl}">
          <script>window.location.href = "${errorRedirectUrl}";</script>
        </head>
        <body>
          <p>Redirecting... If not redirected, <a href="${errorRedirectUrl}">click here</a>.</p>
        </body>
      </html>
    `;

    return new Response(errorHtml, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }
});
