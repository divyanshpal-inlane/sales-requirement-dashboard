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

interface PaymentDetails {
  amount: number;
  email: string;
  phone: string;
  paymentType: "course";
  courseId?: string;
  name: string;
  installmentType?: "full" | "installment" | "second_half" | "first_half";
  installment1Amount?: number;
  installment2Amount?: number;
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

// TODO: if the user with the same phone number already has an active enrolled course
// then don't allow them to make this payment, return the error message and show it on the UI with a a way to go back to login page or automatically incorrect
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("MY_SUPABASE_URL") ?? "",
      Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const {
      amount,
      email,
      phone,
      paymentType,
      courseId,
      name,
      installmentType,
      installment1Amount,
      installment2Amount,
    } = (await req.json()) as PaymentDetails;

    // 1. Find or create learner
    const { data: existingLearners, error: learnerQueryError } =
      await supabaseClient
        .from("Learner")
        .select()
        .eq("email", email)
        .eq("phone", phone)
        .eq("name", name)
        .limit(1);

    if (learnerQueryError) throw learnerQueryError;

    let learnerId: string;
    if (existingLearners?.length) {
      learnerId = existingLearners[0].id;
    } else {
      const { data: newLearner, error: learnerCreateError } =
        await supabaseClient
          .from("Learner")
          .insert([
            {
              email,
              phone,
              name,
              onboarding_completed: false,
            },
          ])
          .select()
          .single();

      if (learnerCreateError) throw learnerCreateError;
      learnerId = newLearner.id;
    }

    // 2. Create a payment record
    const { data: paymentRecord, error: dbError } = await supabaseClient
      .from("payment")
      .insert([
        {
          learner_id: learnerId,
          amount,
          email,
          phone,
          payment_type: paymentType,
          status: "pending",
          name,
          installment_type: installmentType,
          installment1_amount: installment1Amount,
          installment2_amount: installment2Amount,
        },
      ])
      .select()
      .single();
    console.log("paymentRecord ---> ", paymentRecord, dbError);
    if (dbError) throw dbError;

    // 3. Update related records based on payment type
    if (paymentType === "course" && courseId) {
      // Check for existing enrollment
      const { data: existingEnrollment, error: enrollmentQueryError } =
        await supabaseClient
          .from("enrollment")
          .select("*")
          .eq("learner_id", learnerId)
          .eq("course_id", courseId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (enrollmentQueryError) throw enrollmentQueryError;

      if (existingEnrollment) {
        // If enrollment exists, update it with new payment details
        if (existingEnrollment.payment_status === "full_paid") {
          throw new Error("This course is already fully paid for");
        }

        if (
          installmentType === "second_half" &&
          existingEnrollment.payment_status !== "half_paid"
        ) {
          throw new Error(
            "Cannot process second installment before first payment",
          );
        }

        // Update the existing enrollment
        const { error: updateError } = await supabaseClient
          .from("enrollment")
          .update({
            payment_id: paymentRecord.id,
            status:
              existingEnrollment?.payment_status === "half_paid"
                ? "active"
                : "pending",
            installment_mode:
              installmentType || existingEnrollment.installment_mode,
            installment1_amount:
              installment1Amount || existingEnrollment.installment1_amount,
            installment2_amount:
              installment2Amount || existingEnrollment.installment2_amount,
          })
          .eq("id", existingEnrollment.id);

        if (updateError) throw updateError;
      } else {
        // Only create new enrollment if one doesn't exist
        const { error: courseError } = await supabaseClient
          .from("enrollment")
          .insert([
            {
              learner_id: learnerId,
              course_id: courseId,
              payment_id: paymentRecord.id,
              status: "pending",
              payment_status:
                installmentType === "full" ? "pending" : "pending",
              installment_mode: installmentType,
              installment1_amount: installment1Amount,
              installment2_amount: installment2Amount,
              unlocked_lessons:
                installmentType === "first_half" ? [1, 2, 3, 4, 5] : [],
            },
          ]);

        if (courseError) throw courseError;
      }
    }

    // 4. Get payment gateway parameters from environment
    const merchantId = Deno.env.get("PAYMENT_MERCHANT_ID") ?? "";
    const terminalId = Deno.env.get("PAYMENT_TERMINAL_ID") ?? "";
    const bankId = Deno.env.get("PAYMENT_BANK_ID") ?? "";
    const passCode = Deno.env.get("PAYMENT_PASS_CODE") ?? "";
    const mcc = Deno.env.get("PAYMENT_MCC") ?? "";
    const encKey = Deno.env.get("PAYMENT_ENC_KEY") ?? "";
    const saltKey = Deno.env.get("PAYMENT_SALT_KEY") ?? "";
    const returnURL = Deno.env.get("PAYMENT_RETURN_URL") ?? "";
    const gatewayURL = Deno.env.get("PAYMENT_GATEWAY_URL") ?? "";

    // 5. Prepare payment data
    const txnRefNo = `ORD-${paymentRecord.id}`;
    const txnType = "Pay";
    const currency = "356";
    const amountInPaise = Math.round(amount * 100).toString();

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
      Email: email,
      Phone: phone,
      UDF01: installmentType || "",
      UDF02: installment1Amount?.toString() || "",
      UDF03: installment2Amount?.toString() || "",
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
