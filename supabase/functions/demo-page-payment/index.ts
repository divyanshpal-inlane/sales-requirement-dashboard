import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import CryptoJS from "npm:crypto-js";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};
const BASEURL = "https://book-demo.inlane.in";
// const BASEURL = "http://localhost:3000";
function encrypt(input, key) {
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
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }
  const { headers } = req;
  const authHeader = headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  try {
    const supabaseClient = createClient(
      Deno.env.get("MY_SUPABASE_URL") ?? "",
      Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const customerData = await req.json();
    console.log("customerData ---> ", JSON.stringify(customerData));
    // 1. Validate the request body
    if (
      !customerData.email ||
      !customerData.phone ||
      !customerData.name ||
      !customerData.amount ||
      !customerData.hasDrivingLicense
    ) {
      return new Response("Invalid request body", {
        status: 400,
        headers: corsHeaders,
      });
    }
    // 2. Create a payment record
    const { data: paymentRecord, error: dbError } = await supabaseClient
      .from("demo-payments")
      .insert([
        {
          email: customerData.email,
          phone: customerData.phone,
          name: customerData.name,
          amount: customerData.amount,
          hasDrivingLicense: customerData.hasDrivingLicense,
          area: customerData.area,
        },
      ])
      .select("*")
      .single();
    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({
          error: dbError.message,
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
    if (dbError) throw dbError;
    // 3. Get payment gateway parameters from environment
    const merchantId = Deno.env.get("PAYMENT_MERCHANT_ID_TEST") ?? "";
    const terminalId = Deno.env.get("PAYMENT_TERMINAL_ID_TEST") ?? "";
    const bankId = Deno.env.get("PAYMENT_BANK_ID") ?? "";
    const passCode = Deno.env.get("PAYMENT_PASS_CODE_TEST") ?? "";
    const mcc = Deno.env.get("PAYMENT_MCC_TEST") ?? "";
    const encKey = Deno.env.get("PAYMENT_ENC_KEY_TEST") ?? "";
    const saltKey = Deno.env.get("PAYMENT_SALT_KEY_TEST") ?? "";
    // const returnURL = Deno.env.get("PAYMENT_RETURN_URL") ?? "";
    const returnURL = BASEURL + "/payment/status";
    const gatewayURL = Deno.env.get("PAYMENT_GATEWAY_URL_TEST") ?? "";
    // 5. Prepare payment data
    const txnRefNo = `ORD${paymentRecord.id}`;
    const txnType = "Pay";
    const currency = "356";
    const amountInPaise = Math.round(customerData.amount * 100).toString();
    // 6. Create data object in required format
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
      Email: customerData.email,
      Phone: customerData.phone,
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
    // 7. Sort data alphabetically
    const sortedData = Object.fromEntries(Object.entries(data).sort());
    // 8. Generate data string for encryption
    let dataToPostToPG = "";
    Object.entries(sortedData).forEach(([key, value]) => {
      dataToPostToPG += `${key}||${value}::`;
    });
    console.log("dataToPostToPG ---> \n", dataToPostToPG);
    // 9. Generate secure hash
    const secureHash = generateSecureHash(sortedData, saltKey);
    console.log("secureHash ---> ", secureHash);
    // 10. Add secure hash to data string
    dataToPostToPG = `SecureHash||${secureHash}::${dataToPostToPG}`;
    dataToPostToPG = dataToPostToPG.slice(0, -2); // Remove last '::'
    console.log("dataToPostToPG ---> ", dataToPostToPG);
    // 11. Encrypt the final data
    const encData = encrypt(dataToPostToPG, encKey);
    console.log("encData ---> \n", encData);
    // 12. Return the form data and gateway URL
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
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error processing payment", error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
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
});
