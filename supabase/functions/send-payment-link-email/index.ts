import { format } from "https://deno.land/std@0.168.0/datetime/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// Configuration for retry mechanism
const MAX_RETRIES = 7;
const RETRY_DELAY_MS = 2000; // 2 second between retries
// Helper function to add delay between retries
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Function to send email with retry logic
async function sendEmailWithRetry(client, emailOptions, retries = MAX_RETRIES) {
  try {
    await client.send(emailOptions);
    return true;
  } catch (error) {
    console.error(`Email send attempt failed: ${error.message}`);
    if (retries <= 0) {
      console.error("Maximum retries reached, giving up");
      throw error;
    }
    console.log(
      `Retrying in ${RETRY_DELAY_MS}ms... (${retries} attempts left)`,
    );
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
        console.warn("Error closing learner SMTP connection:", closeErr);
      }
    }
  }
}
// Function to format time (Kept for backward compatibility, though unused now)
function formatIndianTime(dateString) {
  try {
    const date = new Date(dateString);
    const istDate = new Date(date.getTime());
    istDate.setHours(istDate.getHours());
    istDate.setMinutes(istDate.getMinutes());
    let hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  } catch (error) {
    console.error("Error formatting time:", error, dateString);
    return dateString;
  }
}
// --- MODIFIED HELPER FUNCTION (Minimal Styling and Minified HTML) ---
function generatePaymentLinkEmailContent(
  learnerName,
  course,
  amount,
  paymentLink,
) {
  const mainColor = "#00ce84";
  // 1. Plain Text Version (Kept as best practice)
  const textContent = `
Hi ${learnerName},

Thank you for choosing Lane! Please find the details for your course payment below:

Course: ${course}
Total Amount: ${amount}

Click the link below to complete your payment securely:
${paymentLink}

If you have any questions, please feel free to contact us.


*This is an automated email. Please do not reply to this address.
`;
  // 2. HTML Version (Minified and stripped of all remaining non-essential CSS padding/margin)
  const rawHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 5px;">
            <div style="padding: 20px;">
              <h2 style="color: ${mainColor};">Your Payment Link for ${course}</h2>
              <p>Hi ${learnerName},</p>
              <p>Thank you for choosing Lane! Please find the details for your course payment below:</p>
              
              <div style="background-color: #f2f2f2; border-radius: 5px;">
                <p style="margin: 0; padding: 10px;"><strong>Course:</strong> ${course}<br><strong>Total Amount:</strong> ${amount}</p>
              </div>
              
              <p>Click the link below to complete your payment securely:</p>
              
              <p><a href="${paymentLink}">${paymentLink}</a></p>
              
              <p style="font-size: 0.8em; color: #777;">
                *This is an automated email. Please do not reply to this address.
              </p>
            </div>
          </div>
        </body>
      </html>`;
  // **CRITICAL FIX:** Minify the HTML string to remove all line breaks and extra spaces
  const htmlContent = rawHtml.replace(/\s+/g, " ").trim();
  return {
    text: textContent,
    html: htmlContent,
  };
}
// --- END MODIFIED HELPER FUNCTION ---
// Main serve function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    console.log("Parsing request body");
    const requestBody = await req.json();
    // Destructure only necessary fields
    const {
      learnerEmail,
      learnerName,
      course,
      amount,
      paymentLink,
      message_type = "PAYMENT_LINK",
    } = requestBody;
    if (message_type !== "PAYMENT_LINK") {
      console.warn(
        `Unexpected message_type: ${message_type}. Proceeding with PAYMENT_LINK logic.`,
      );
    }
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
    // Use the unique timestamp in the subject to break email threading
    const timestamp = format(new Date(), "yyyyMMdd-HHmmss");
    const emailSubject = `Payment Link for ${course} (${timestamp})`;
    // --------------------------------------------------------------------------------------------------
    // Generate the new email content (both text and html)
    const emailContent = generatePaymentLinkEmailContent(
      learnerName,
      course,
      amount,
      paymentLink,
    );
    // Configure email options (only for learner)
    const learnerEmailOptions = {
      from: smtpFrom,
      to: learnerEmail,
      bcc: "admin@inlane.in",
      subject: emailSubject,
      text: emailContent.text,
      html: emailContent.html,
    };
    const learnerClient = new SMTPClient(smtpConfig);
    const emailResults = {
      learner: false,
      errors: [],
    };
    try {
      // Ensure we have the minimum required data
      if (!learnerEmail || !learnerName || !course || !amount || !paymentLink) {
        throw new Error(
          "Missing required data (email, name, course, amount, or link) for PAYMENT_LINK email.",
        );
      }
      emailResults.learner = await sendEmailWithRetry(
        learnerClient,
        learnerEmailOptions,
      );
      console.log("Sent PAYMENT_LINK email to learner successfully");
    } catch (learnerError) {
      emailResults.errors.push(
        `Learner email error (PAYMENT_LINK): ${learnerError.message}`,
      );
      console.error("Learner email error (PAYMENT_LINK):", learnerError);
    } finally {
      if (learnerClient) {
        try {
          await learnerClient.close();
        } catch (closeError) {
          console.warn("Error closing learner SMTP connection:", closeError);
        }
      }
    }
    // Respond to the client
    const response = {
      success: emailResults.learner,
      details: {
        learner: emailResults.learner,
        errors: emailResults.errors,
      },
    };
    return new Response(JSON.stringify(response), {
      status: emailResults.learner ? 200 : 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
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
});
