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

interface RecoverRequest {
  paymentId: string;
}

interface RazorpayPayment {
  id: string;
  status: string;
  order_id: string;
  amount: number;
  method?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("MY_SUPABASE_URL") ?? "",
      Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { paymentId } = (await req.json()) as RecoverRequest;
    if (!paymentId) throw new Error("paymentId is required");

    const { data: payment, error: paymentError } = await supabaseClient
      .from("payment")
      .select("id, status, gateway_reference, learner_id, amount, payment_type")
      .eq("id", paymentId)
      .single();
    if (paymentError || !payment) throw new Error("Payment not found");

    if (payment.status === "completed") {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyCompleted: true,
          message: "Payment already completed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const orderId = payment.gateway_reference;
    if (!orderId || !orderId.startsWith("order_")) {
      throw new Error(
        `Payment ${paymentId} does not look like a Razorpay order (gateway_reference=${orderId})`,
      );
    }

    const basicAuth = btoa(`${keyId}:${keySecret}`);
    const rpResp = await fetch(
      `https://api.razorpay.com/v1/orders/${orderId}/payments`,
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!rpResp.ok) {
      const body = await rpResp.text();
      throw new Error(`Razorpay API error: ${rpResp.status} - ${body}`);
    }

    const data = (await rpResp.json()) as {
      count: number;
      items: RazorpayPayment[];
    };

    const captured = (data.items || []).find((p) => p.status === "captured");
    if (!captured) {
      const statuses = (data.items || []).map((p) => p.status).join(",");
      return new Response(
        JSON.stringify({
          success: false,
          captured: false,
          message:
            data.count === 0
              ? "No payment attempt found for this order — learner never paid"
              : `Found ${data.count} attempt(s) but none captured (statuses: ${statuses})`,
          razorpayPayments: data.items,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await completePayment(
      supabaseClient,
      payment.id,
      captured.id,
    );

    return new Response(
      JSON.stringify({
        success: true,
        captured: true,
        alreadyCompleted: result.alreadyCompleted,
        razorpayPaymentId: captured.id,
        razorpayAmount: captured.amount,
        message: result.alreadyCompleted
          ? "Payment was already completed"
          : "Payment recovered and marked completed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Recover error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
