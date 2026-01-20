import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};

// Orange PG Configuration
const ORANGE_PG_CONFIG = {
  merchantId: Deno.env.get("ORANGE_PG_MERCHANT_ID") || "100000000007164",
  aggregatorId: Deno.env.get("ORANGE_PG_AGGREGATOR_ID") || "A100000000007164",
  secretKey:
    Deno.env.get("ORANGE_PG_SECRET_KEY") ||
    "db06cca0-838b-4e01-8b20-6ac446ffb6bd",
  commandUrl:
    Deno.env.get("ORANGE_PG_STATUS_CHECK_URL") ||
    "https://pgpay.icicibank.com/tsp/pg/api/command",
};

/**
 * Generate HMAC-SHA256 hash for Orange PG
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

  try {
    const { merchantTxnNo, transactionType = "STATUS" } = await req.json();

    if (!merchantTxnNo) {
      throw new Error("merchantTxnNo is required");
    }

    // Build request data for status check
    const requestData: Record<string, string> = {
      merchantId: ORANGE_PG_CONFIG.merchantId,
      aggregatorID: ORANGE_PG_CONFIG.aggregatorId,
      merchantTxnNo: merchantTxnNo,
      originalTxnNo: merchantTxnNo,
      transactionType: transactionType, // "STATUS" for status check
    };

    console.log(
      "Status check request data:",
      JSON.stringify(requestData, null, 2),
    );

    // Generate secure hash
    const secureHash = await generateSecureHash(
      requestData,
      ORANGE_PG_CONFIG.secretKey,
    );

    console.log("Generated secureHash:", secureHash);

    // Add secureHash to request
    const finalRequest = {
      ...requestData,
      secureHash: secureHash,
    };

    console.log(
      "Final request to Orange PG:",
      JSON.stringify(finalRequest, null, 2),
    );

    // Call Orange PG Status Check API
    const response = await fetch(ORANGE_PG_CONFIG.commandUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finalRequest),
    });

    const responseText = await response.text();
    console.log("Orange PG Status Response:", response.status, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Parse response status
    // Per documentation: responseCode "000" means success, txnStatus "SUC" means transaction successful
    const isSuccess = responseData.responseCode === "000";
    const txnStatus = responseData.txnStatus; // SUC = Success, FAIL = Failed, PEN = Pending

    return new Response(
      JSON.stringify({
        success: isSuccess,
        merchantTxnNo: merchantTxnNo,
        transactionStatus: txnStatus,
        response: responseData,
        statusDescription: getStatusDescription(txnStatus),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in Orange PG status check:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function getStatusDescription(status: string): string {
  switch (status) {
    case "SUC":
      return "Transaction successful";
    case "FAIL":
      return "Transaction failed";
    case "PEN":
      return "Transaction pending";
    case "REF":
      return "Transaction refunded";
    default:
      return `Unknown status: ${status}`;
  }
}
