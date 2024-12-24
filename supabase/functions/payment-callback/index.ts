import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};

function decrypt(sStr: string, key: string): string {
  const decrypted = CryptoJS.AES.decrypt(sStr, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

function generateSecureHash(
  data: Record<string, string>,
  secret: string,
): string {
  let secureHash = secret;

  // Sort keys and concatenate values in order
  const sortedKeys = Object.keys(data).sort();
  for (const key of sortedKeys) {
    secureHash += data[key];
  }

  // Generate SHA-256 hash and convert to uppercase
  const hashed = CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(secureHash));
  return hashed.toString(CryptoJS.enc.Hex).toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const formData = await req.formData();
    const encKey = Deno.env.get("PAYMENT_ENC_KEY") ?? "";
    const saltKey = Deno.env.get("PAYMENT_SALT_KEY") ?? "";

    // Get the encrypted response data
    const encData = formData.get("EncData")?.toString() ?? "";
    const formattedEncData = encData.replace(/ /g, "+");

    // Decrypt the response
    const decryptedData = decrypt(formattedEncData, encKey);
    const dataArray = decryptedData.split("::");

    // Parse the decrypted data
    const responseData: Record<string, string> = {};
    for (const value of dataArray) {
      const [key, val] = value.split("||");
      if (key && val) {
        responseData[key] = decodeURIComponent(val);
      }
    }

    // Extract the secure hash
    const receivedHash = responseData["SecureHash"];
    delete responseData.SecureHash;

    // Generate hash for verification
    const calculatedHash = generateSecureHash(responseData, saltKey);

    // Verify hash
    if (calculatedHash !== receivedHash) {
      console.error("Hash mismatch:", {
        calculated: calculatedHash,
        received: receivedHash,
        responseData,
      });
      throw new Error("Invalid response hash");
    }

    console.log("responseData\n", responseData);
    // Update payment record
    const txnRefNo = responseData["TxnRefNo"];
    // Extract payment ID by removing 'ORD' prefix
    const paymentId = txnRefNo.replace(/^ORD-/, "");
    const status =
      responseData["ResponseCode"]?.toLowerCase() === "00"
        ? "completed"
        : "failed";
    const gatewayReference = responseData["RetRefNo"] ?? "";

    // Update payment status
    const { error: updateError } = await supabaseClient
      .from("payment")
      .update({
        status,
        gateway_reference: gatewayReference,
      })
      .eq("id", paymentId);

    if (updateError) throw updateError;

    // After updating the payment record
    const { PAYMENT_SUCCESS_URL, PAYMENT_FAILURE_URL } = Deno.env.toObject();

    // Get payment details with learner info
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payment")
      .select(
        `
        learner_id,
        payment_type,
        Learner (
          phone
        )
        `,
      )
      .eq("id", paymentId)
      .single();

    if (paymentError) throw paymentError;

    // If payment is successful, update related records
    if (status === "completed") {
      try {
        if (payment.payment_type === "course") {
          // Get enrollment record
          const { data: enrollment, error: enrollmentQueryError } =
            await supabaseClient
              .from("enrollment")
              .select()
              .eq("payment_id", paymentId)
              .single();

          if (enrollmentQueryError) throw enrollmentQueryError;
          if (!enrollment) throw new Error("Enrollment record not found");

          // Update enrollment status to active
          const { error: enrollmentError } = await supabaseClient
            .from("enrollment")
            .update({
              status: "active",
              progress: {
                completed_lessons: [],
                current_lesson: 1,
                last_accessed: new Date().toISOString(),
              },
            })
            .eq("id", enrollment.id);

          if (enrollmentError) throw enrollmentError;
        } else if (payment.payment_type === "reschedule") {
          // Handle reschedule payment success
          const { error: scheduleError } = await supabaseClient
            .from("Schedule")
            .update({
              status: "confirmed",
              payment_confirmed: true,
            })
            .eq("payment_id", paymentId);

          if (scheduleError) throw scheduleError;
        }
      } catch (error) {
        console.error("Error updating related records:", error);
        // Don't throw here, we still want to redirect the user
      }
    }

    const redirectUrl =
      status === "completed"
        ? `${PAYMENT_SUCCESS_URL}?status=completed&reference=${gatewayReference}&phone=${encodeURIComponent(
            payment.Learner.phone,
          )}&type=${payment.payment_type}`
        : `${PAYMENT_FAILURE_URL}?status=failed&reference=${gatewayReference}`;

    return new Response(JSON.stringify({ redirectUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Payment callback error:", error);
    return new Response(
      JSON.stringify({ error: "Payment verification failed" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
