// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  phone: string;
  action: "send_otp" | "verify_otp";
  otp?: string;
  newPassword?: string;
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { phone, action, otp, newPassword } =
      (await req.json()) as PasswordResetRequest;

    // Validate the request
    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    if (action === "send_otp") {
      // 1. Check if user exists
      const { data: user, error: userError } = await supabaseClient
        .from("auth.users")
        .select("id")
        .eq("phone", phone)
        .single();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "User not found with this phone number" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          },
        );
      }

      // 2. Generate OTP
      const generatedOTP = generateOTP();

      // 3. Store OTP in the database (with expiry)
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10); // OTP valid for 10 minutes

      const { error: otpStoreError } = await supabaseClient
        .from("password_reset_otps")
        .upsert([
          {
            phone,
            otp: generatedOTP,
            expires_at: expiryTime.toISOString(),
          },
        ]);

      if (otpStoreError) {
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      // 4. Send OTP via Heltar API
      const heltarApiKey = Deno.env.get("HELTAR_API_KEY");
      if (!heltarApiKey) {
        return new Response(
          JSON.stringify({ error: "Heltar API key not configured" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      const messagePayload = {
        messages: [
          {
            clientWaNumber: phone,
            templateName: "RESET_PASSWORD_OTP",
            templateContent:
              "Your OTP for password reset is {{1}}. Valid for 10 minutes.",
            templateHeader: "",
            languageCode: "en",
            variables: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: generatedOTP,
                  },
                ],
              },
            ],
            messageType: "template",
            refId: `otp-${phone}-${Date.now()}`,
          },
        ],
      };

      const response = await fetch("https://api.heltar.com/v1/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${heltarApiKey}`,
        },
        body: JSON.stringify(messagePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ error: `Failed to send OTP: ${errorText}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent successfully" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else if (action === "verify_otp") {
      // Validate additional parameters for OTP verification
      if (!otp) {
        return new Response(JSON.stringify({ error: "OTP is required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (!newPassword) {
        return new Response(
          JSON.stringify({ error: "New password is required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // 1. Verify OTP from database
      const { data: otpData, error: otpError } = await supabaseClient
        .from("password_reset_otps")
        .select("*")
        .eq("phone", phone)
        .eq("otp", otp)
        .single();

      if (otpError || !otpData) {
        return new Response(JSON.stringify({ error: "Invalid OTP" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // 2. Check if OTP has expired
      const now = new Date();
      const expiryTime = new Date(otpData.expires_at);

      if (now > expiryTime) {
        return new Response(JSON.stringify({ error: "OTP has expired" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // 3. Update the user's password
      const { error: updateError } =
        await supabaseClient.auth.admin.updateUserById(otpData.user_id, {
          password: newPassword,
        });

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update password" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      // 4. Delete the used OTP
      await supabaseClient
        .from("password_reset_otps")
        .delete()
        .eq("phone", phone);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Password updated successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
  } catch (error) {
    console.error("Error processing request:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
