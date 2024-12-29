// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import CryptoJS from "npm:crypto-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function decrypt(input: string, key: string): string {
  const decipher = CryptoJS.AES.decrypt(input, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return CryptoJS.enc.Utf8.stringify(decipher);
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
    const encData = formData.get("EncData");
    if (!encData) {
      throw new Error("No encrypted data received");
    }

    // Decrypt the response data
    const decryptedData = decrypt(
      encData.toString(),
      Deno.env.get("PAYMENT_ENC_KEY") ?? "",
    );

    // Parse the decrypted data
    const responseData: Record<string, string> = {};
    decryptedData.split("::").forEach((pair) => {
      const [key, value] = pair.split("||");
      responseData[key] = value;
    });

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

    // Get reschedule request
    const { data: request, error: requestError } = await supabaseClient
      .from("reschedule_requests")
      .select("*")
      .eq("payment_id", paymentId)
      .single();

    if (requestError || !request) {
      throw new Error("Reschedule request not found");
    }

    // If payment is successful, update reschedule request status
    if (status === "completed") {
      const { error: rescheduleError } = await supabaseClient
        .from("reschedule_requests")
        .update({ status: "pending" })
        .eq("id", request.id);

      if (rescheduleError) throw rescheduleError;

      // Update learner's needs_scheduling flag
      const { error: learnerError } = await supabaseClient
        .from("Learner")
        .update({ needs_scheduling: true })
        .eq("id", request.learner_id);

      if (learnerError) throw learnerError;
    }

    return new Response(JSON.stringify({ message: "Success" }), {
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
