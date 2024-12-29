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

interface PaymentDetails {
  amount: number;
  paymentId: string;
  requestId: string;
}

// Utility functions for encryption and hash generation
function encrypt(input: string, key: string): string {
  const cipher = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(input),
    CryptoJS.enc.Utf8.parse(key),
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    },
  );
  return cipher.toString();
}

function generateSecureHash(
  sortedData: Record<string, string>,
  secret: string,
): string {
  let secureHash = secret;

  if (sortedData) {
    for (const val of Object.values(sortedData)) {
      secureHash += val;
    }
  }

  // Generate SHA-256 hash
  const hashed = CryptoJS.SHA256(CryptoJS.enc.Utf8.parse(secureHash));
  return hashed.toString(CryptoJS.enc.Hex);
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

    const { amount, paymentId } = (await req.json()) as PaymentDetails;

    // Get payment details with learner info
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payment")
      .select(
        `
        *,
        Learner (
          email,
          phone
        )
      `,
      )
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment not found");
    }

    // Get payment gateway parameters from environment
    const merchantId = Deno.env.get("PAYMENT_MERCHANT_ID") ?? "";
    const terminalId = Deno.env.get("PAYMENT_TERMINAL_ID") ?? "";
    const bankId = Deno.env.get("PAYMENT_BANK_ID") ?? "";
    const passCode = Deno.env.get("PAYMENT_PASS_CODE") ?? "";
    const mcc = Deno.env.get("PAYMENT_MCC") ?? "";
    const encKey = Deno.env.get("PAYMENT_ENC_KEY") ?? "";
    const saltKey = Deno.env.get("PAYMENT_SALT_KEY") ?? "";
    const returnURL = Deno.env.get("HOST_URL") + "/reschedule/callback";
    const gatewayURL = Deno.env.get("PAYMENT_GATEWAY_URL") ?? "";

    // Prepare payment data
    const txnRefNo = `ORD-${paymentId}`;
    const txnType = "Pay";
    const currency = "356";
    const amountInPaise = Math.round(amount * 100).toString();

    // Create data object in required format
    const data = {
      BankId: bankId,
      MerchantId: merchantId,
      TerminalId: terminalId,
      TxnRefNo: txnRefNo,
      MCC: mcc,
      PassCode: passCode,
      TxnType: txnType,
      Currency: currency,
      Amount: amountInPaise,
      CurrencyCode: "356",
      ReturnURL: returnURL,
      gatewayURL: gatewayURL,
      OrderInfo: txnRefNo,
      Email: payment.Learner.email,
      Phone: payment.Learner.phone,
      UDF01: "",
      UDF02: "",
      UDF03: "",
      UDF04: "",
      UDF05: "",
      UDF06: "",
      UDF07: "",
      UDF08: "",
      UDF09: "",
      UDF10: "",
    };

    // Sort data alphabetically
    const sortedData = Object.fromEntries(Object.entries(data).sort());

    // Generate data string for encryption
    let dataToPostToPG = "";
    Object.entries(sortedData).forEach(([key, value]) => {
      dataToPostToPG += `${key}||${value}::`;
    });

    // Generate secure hash
    const secureHash = generateSecureHash(sortedData, saltKey);

    // Add secure hash to data string
    dataToPostToPG = `SecureHash||${secureHash}::${dataToPostToPG}`;
    dataToPostToPG = dataToPostToPG.slice(0, -2); // Remove last '::'

    // Encrypt the final data
    const encData = encrypt(dataToPostToPG, encKey);

    // Return the form data and gateway URL
    return new Response(
      JSON.stringify({
        gatewayURL,
        formData: {
          EncData: encData,
          MerchantId: merchantId,
          BankId: bankId,
          TerminalId: terminalId,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error processing payment", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
