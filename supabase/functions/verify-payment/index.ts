// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import CryptoJS from "npm:crypto-js";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};
function decrypt(encryptedBase64, key) {
  const decrypted = CryptoJS.AES.decrypt(
    encryptedBase64,
    CryptoJS.enc.Utf8.parse(key),
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    },
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
}
function parseDecryptedEncData(decryptedStr) {
  const fields = decryptedStr.split("::");
  const result = {};
  for (const field of fields) {
    const [key, value] = field.split("||");
    if (key && value !== undefined) {
      result[key.trim()] = value.trim();
    }
  }
  return result;
}
function generateSecureHash(sortedData, secret) {
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
async function getThePaymentStatus(transactionId) {
  if (!transactionId) {
    throw new Error("Transaction ID is required");
  }
  const merchantId = Deno.env.get("PAYMENT_STATUS_merchantId") || "";
  const terminalId = Deno.env.get("PAYMENT_STATUS_terminalId") || "";
  const bankId = Deno.env.get("PAYMENT_STATUS_bankId") || "";
  const passCode = Deno.env.get("PAYMENT_STATUS_passCode") || "";
  const mcc = Deno.env.get("PAYMENT_STATUS_mcc") || "";
  const saltKey = Deno.env.get("PAYMENT_STATUS_saltKey") || "";
  const gatewayURL = Deno.env.get("PAYMENT_STATUS_gatewayURL") || "";
  const txnType = Deno.env.get("PAYMENT_STATUS_txnType") || "";
  const data = {
    BankId: bankId,
    MerchantId: merchantId,
    TerminalId: terminalId,
    TxnRefNo: transactionId,
    PassCode: passCode,
    TxnType: txnType,
    MCC: mcc,
  };
  const sortedData = Object.fromEntries(Object.entries(data).sort());
  const secureHash = generateSecureHash(sortedData, saltKey);
  const statusQuery = {
    ...data,
    SecureHash: secureHash,
  };
  console.log("Status Query:", statusQuery);
  const pgResponse = await fetch(gatewayURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(statusQuery),
  });
  const responseData = await pgResponse.json();
  console.log("Payment Gateway Response:", responseData);
  return JSON.stringify(responseData);
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }
  const { EncData } = await req.json();
  console.log("Received EncData:", EncData);
  const decryptedData = decrypt(
    EncData,
    Deno.env.get("PAYMENT_STATUS_encKey") || "",
  );
  if (decryptedData == "") {
    console.log("encKey wasn't found in secrets");
  }
  console.log("Decrypted Data:", decryptedData);
  const parsedData = JSON.parse(
    JSON.stringify(parseDecryptedEncData(decryptedData)),
  );
  const transactionId = parsedData?.TxnRefNo;
  if (!transactionId) {
    return new Response(
      JSON.stringify({
        error: "TxnRefNo not found in decrypted data",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
  const data = JSON.parse(await getThePaymentStatus(transactionId));
  if (!data || data.ResponseCode === undefined) {
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve payment status",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
  return new Response(
    JSON.stringify({
      ResponseCode: data.ResponseCode,
      ResponseMessage: data.Message,
      TransactionId: transactionId.replace("ORD", ""),
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
});
