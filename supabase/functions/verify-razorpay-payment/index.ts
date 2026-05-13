import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { completePayment } from "../_shared/complete-payment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};

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

    const result = await completePayment(
      supabaseClient,
      paymentId,
      razorpay_payment_id,
    );

    if (result.alreadyCompleted) {
      console.log("Payment already completed");
      return new Response(
        JSON.stringify({ success: true, message: "Payment already completed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
