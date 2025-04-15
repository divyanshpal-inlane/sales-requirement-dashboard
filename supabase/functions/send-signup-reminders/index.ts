import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { format } from "https://esm.sh/date-fns@4.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const currentDate = new Date();
    const cutoffDate = new Date(currentDate);
    cutoffDate.setDate(currentDate.getDate() - 3);

    const { data: payments, error: paymentError } = await supabaseClient
      .from("payment")
      .select("id, learner_id, created_at")
      .lte("created_at", cutoffDate.toISOString())
      .eq("status", "completed")
      .eq("payment_type", "course");

    if (paymentError) throw paymentError;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) throw authError;

    const signedUpPhones = new Set();
    if (authData?.users) {
      authData.users.forEach((user) => {
        if (user.phone) signedUpPhones.add(user.phone);
      });
    }

    const usersToRemind = new Set<{ phone: string; name: string }>();


    for (const payment of payments ?? []) {
      const { data: learner, error: learnerError } = await supabaseClient
        .from("Learner")
        .select("phone, name")
        .eq("id", payment.learner_id)
        .single();

      if (learnerError) {
        console.error("Error fetching learner:", learnerError);
        continue;
      }

      if (!signedUpPhones.has(learner.phone)) {
        usersToRemind.add({
          phone: learner.phone,
          name: learner.name,
        });
      }
    }
    const uniqueUsersMap = new Map();
for (const user of usersToRemind) {
  uniqueUsersMap.set(user.phone, user);
}

// Convert back to array
const uniqueUsersToRemind = Array.from(uniqueUsersMap.values());
console.log(`After deduplication: ${uniqueUsersToRemind.length} unique users to remind`);
    
    console.log(`Found ${payments?.length || 0} recent payments`);
    console.log(`Found ${signedUpPhones.size} signed up users`);
    console.log(`Found ${usersToRemind.size} users to remind`);

    const messageResponses = [];

    for (const user of uniqueUsersToRemind) {
      console.log(`[${new Date().toISOString()}] Sending message to ${user.phone}`);

      
      const messagePayload = {
        messages: [
          {
            clientWaNumber: user.phone,
            templateName: "webapp_sign_up_on_the_app",
            templateContent:
              "Hey {{1}}, We hope you are having the best day! 🤗👋 We wanted to check in on our future driving superstar! ⭐ We are super close to starting your on-road practice lessons 🚘🚘 Please do check out our web app and take the next steps, if you haven't already 📝✅ In case you need any help, we are one ping away ❤️ Best, Lane",
            templateHeader: "",
            languageCode: "en",
            variables: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: user.name,
                  },
                ],
              },
            ],
            messageType: "template", // This was missing in your original code
            refId: `signup-reminder-${Date.now()}`, // Adding a reference ID
          },
        ],
      };

      console.log(`Sending message to ${user.phone} with payload:`, JSON.stringify(messagePayload));

      const response = await fetch("https://api.heltar.com/v1/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("HELTAR_API_KEY")}`,
        },
        body: JSON.stringify(messagePayload),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }

      const messageResult = {
        phone: user.phone,
        success: response.ok,
        status: response.status,
        response: responseData
      };
      
      messageResponses.push(messageResult);
      
      if (!response.ok) {
        console.error(`Failed to send message to ${user.phone}:`, JSON.stringify(messageResult));
      } else {
        console.log(`Message sent to ${user.phone}. Response:`, JSON.stringify(messageResult));
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      usersCount: usersToRemind.length,
      messageResponses: messageResponses 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
