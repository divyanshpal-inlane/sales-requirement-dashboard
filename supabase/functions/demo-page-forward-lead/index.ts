// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, content-length",
  "Access-Control-Max-Age": "86400",
};

interface FormData {
  email: string;
  phone: string;
  name: string;
  amount: number;
  area: string;
  custom_area: string;
  has_license: boolean | null;
}

async function sendLeadToCRM(leadData: FormData) {
  try {
    const data = await fetch(
      "https://apps.cratiocrm.com/Customize/Webhooks/webhook.php?id=540177",
      {
        method: "POST",
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadSource: "Lane Demo Booking",
          leadDate: new Date().toISOString(),
          ...leadData,
          leadStage: "New",
          amount: leadData.amount || 0,
          phone: leadData.phone.replace(/\D/g, ""), // Ensure phone is stored as digits only
          has_license: leadData.has_license ? "Yes" : "No",
        }),
      },
    );
    if (!data) {
      throw new Error("Failed to send lead to CRM");
    }
    return data;
  } catch (error) {
    console.error("Unexpected error while sending lead to CRM:", error);
  }
}

async function uploadDemoPageLead(leadData: FormData) {
  return await sendLeadToCRM(leadData);
}

async function uploadPaymentAttemptedLead(leadData: Record<string, any>) {
  const transactionId = leadData.transactionId;
  if (!transactionId) {
    console.error("Transaction ID is required for payment attempted lead");
    return "Transaction ID is required";
  }

  const supabase = createClient(
    "https://csnzgfzxnscumvjefpon.supabase.co",
    Deno.env.get("DEMO_PAGE_FORWARD_LEAD_API_KEY")!,
  );

  let { data, error } = await supabase
    .from("demo-payments")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error) {
    console.error("Error fetching payment data from Supabase table:", error);
    return "Error fetching payment data from Supabase table";
  }
  if (data) {
    data.hasDrivingLicense = "yes" === data.hasDrivingLicense ? true : false;
    data = {
      leadStage: "New",
      ...data,
    };
    try {
      const data2 = await fetch(
        "https://apps.cratiocrm.com/Customize/Webhooks/webhook.php?id=1838",
        {
          method: "POST",
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadSource: "Lane Demo Booking",
            leadDate: new Date().toISOString(),
            ...data,
          }),
        },
      );
      if (!data2) {
        throw new Error("Failed to send lead to CRM");
      }
      return data2;
    } catch (error) {
      console.error("Unexpected error while sending lead to CRM:", error);
    }
  }
}

async function uploadGenericLead(_leadSource: string, _leadData: FormData) {
  try {
    const data = await fetch(
      "https://apps.cratiocrm.com/Customize/Webhooks/webhook.php?id=540177",
      {
        method: "POST",
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadSource: _leadSource,
          leadDate: new Date().toISOString(),
          ..._leadData,
          leadStage: "New",
          phone: _leadData.phone.replace(/\D/g, ""), // Ensure phone is stored as digits only
          has_license: _leadData.has_license ? "Yes" : "No",
        }),
      },
    );
    if (!data) {
      throw new Error("Failed to send lead to CRM");
    }
    return data;
  } catch (error) {
    console.error("Unexpected error while sending lead to CRM:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const body = await req.json();

  console.log("Received body:", body);

  if (!body.leadSource || !body.leadData) {
    return new Response("Bad Request: Missing leadSource or leadData", {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  switch (body.leadSource) {
    case "demo-page": {
      const data = await uploadDemoPageLead(body.leadData);
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      });
    }
    case "payment-status": {
      const data = await uploadPaymentAttemptedLead(body.leadData);
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      });
    }
    default: {
      if (!body.leadSource) {
        return new Response("", {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      const data = await uploadGenericLead(body.leadSource, body.leadData);
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      });
    }
  }
});
