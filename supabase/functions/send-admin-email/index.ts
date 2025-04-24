import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configuration for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second between retries

// Helper function to add delay between retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to send email with retry logic
async function sendEmailWithRetry(
  client: SMTPClient,
  emailOptions: any,
  retries = MAX_RETRIES
): Promise<boolean> {
  try {
    await client.send(emailOptions);
    return true;
  } catch (error) {
    console.error(`Email send attempt failed: ${error.message}`);
    
    if (retries <= 0) {
      console.error("Maximum retries reached, giving up");
      throw error;
    }
    
    console.log(`Retrying in ${RETRY_DELAY_MS}ms... (${retries} attempts left)`);
    await delay(RETRY_DELAY_MS);
    
    // Create a new SMTP client for each retry to avoid connection issues
    const newClient = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USERNAME"),
          password: Deno.env.get("SMTP_PASSWORD"),
        },
      },
    });
    
    try {
      return await sendEmailWithRetry(newClient, emailOptions, retries - 1);
    } finally {
      try {
        await newClient.close();
      } catch (closeErr) {
        console.warn("Error closing SMTP connection during retry:", closeErr);
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Parsing request body");
    const requestBody = await req.json();
    console.log(
      "Request body parsed:",
      JSON.stringify(requestBody).substring(0, 100) + "...",
    );
    const { subject, message } = requestBody;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Verify authentication
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Track email sending status
    const emailResults = {
      success: false,
      errors: [] as string[],
    };

    try {
      // Configure base SMTP client
      const smtpConfig = {
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: Deno.env.get("SMTP_USERNAME"),
            password: Deno.env.get("SMTP_PASSWORD"),
          },
        },
      };
      
      const smtpFrom = Deno.env.get("SMTP_FROM");
      const adminEmail = Deno.env.get("ADMIN_EMAIL");

      // Prepare email content for admin
      const adminEmailContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
              <h2 style="color: #2563eb;">${subject}</h2>
              <p>${message}</p>
              <div style="margin: 30px 0;">
                <a href="${Deno.env.get("APP_URL") || "https://inlane-web-app.vercel.app"}/admin-login" 
                   style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Go to Admin Portal
                </a>
              </div>
              <p>Thank you,<br>InLane Notification System</p>
            </div>
          </body>
        </html>
      `;

      // Send admin email
      const adminClient = new SMTPClient(smtpConfig);
      try {
        const adminEmailOptions = {
          from: smtpFrom,
          to: adminEmail,
          subject: `InLane Admin Alert: ${subject}`,
          html: String(adminEmailContent),
        };
        
        emailResults.success = await sendEmailWithRetry(adminClient, adminEmailOptions);
        console.log("Sent email to admin successfully");
      } catch (adminError) {
        emailResults.errors.push(`Admin email error: ${adminError.message}`);
        console.error("Admin email error:", adminError);
        
        // Log to Supabase for debugging
        await supabaseClient.from("email_errors").insert([
          {
            error: adminError.message,
            stack: adminError.stack,
            details: {
              email: adminEmail,
              type: "admin",
              subject,
              message,
            },
          },
        ]);
      } finally {
        try {
          await adminClient.close();
        } catch (closeError) {
          console.warn("Error closing admin SMTP connection:", closeError);
        }
      }

      // Store failed email attempts for manual retry later if needed
      if (!emailResults.success) {
        await supabaseClient.from("failed_emails").insert([
          {
            admin_email: adminEmail,
            admin_sent: emailResults.success,
            subject,
            message,
            errors: emailResults.errors,
          },
        ]);
      }

      return new Response(
        JSON.stringify({
          success: emailResults.success,
          details: emailResults,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (smtpError) {
      console.error("SMTP Error:", smtpError);

      // If SMTP fails, log to Supabase for debugging
      await supabaseClient.from("email_errors").insert([
        {
          error: smtpError.message,
          stack: smtpError.stack,
          details: {
            adminEmail: Deno.env.get("ADMIN_EMAIL"),
            subject,
            message,
          },
        },
      ]);

      throw new Error(`SMTP error: ${smtpError.message}`);
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
