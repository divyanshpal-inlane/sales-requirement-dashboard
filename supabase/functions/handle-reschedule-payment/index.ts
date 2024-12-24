// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event: string;
  payload: {
    payment_id: string;
    order_id: string;
    payment_link_id: string | null;
    payment_link_reference_id: string | null;
    status: string;
    amount: number;
    attempts: number;
    created_at: number;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const payload: WebhookPayload = await req.json();

    // Only process successful payments
    if (payload.event !== "payment.captured") {
      return new Response(JSON.stringify({ message: "Ignored event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payment")
      .select("*")
      .eq("gateway_reference", payload.payload.payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment not found");
    }

    // Get reschedule request
    const { data: request, error: requestError } = await supabaseClient
      .from("reschedule_requests")
      .select("*")
      .eq("payment_id", payment.id)
      .single();

    if (requestError || !request) {
      throw new Error("Reschedule request not found");
    }

    // Update reschedule request status
    const { error: updateError } = await supabaseClient
      .from("reschedule_requests")
      .update({ status: "pending" })
      .eq("id", request.id);

    if (updateError) {
      throw new Error("Failed to update reschedule request");
    }

    // Update learner's needs_scheduling flag
    const { error: learnerError } = await supabaseClient
      .from("Learner")
      .update({ needs_scheduling: true })
      .eq("id", request.learner_id);

    if (learnerError) {
      throw new Error("Failed to update learner");
    }

    return new Response(
      JSON.stringify({ message: "Successfully processed payment" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/handle-reschedule-payment' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
