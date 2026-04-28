import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- CONFIGURATION FOR RECIPIENTS ---
/**
 * Directly configurable list of administrative emails that will receive the feedback report.
 */
const ADMIN_RECIPIENTS = [
  // Deno.env.get("ADMIN_EMAIL") || "", // Ensuring ADMIN_EMAIL is included if available
  "nikhilesh@inlane.in", // Placeholder for development testing
].filter((email) => email.length > 0);
// --- END CONFIGURATION ---

// Configuration for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second between retries

// Helper function to add delay between retries
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- HTML GENERATION HELPERS ---

/**
 * Helper function to generate a string of star icons for a given rating.
 */
const generateStars = (rating: string | number, starColor: string): string => {
  const filledStars = parseInt(String(rating || "0"), 10);
  let starsHtml = "";
  const STAR_FILLED = `<span style="color: ${starColor}; font-size: 18px; line-height: 1;">★</span>`;
  const STAR_EMPTY = `<span style="color: #d1d5db; font-size: 18px; line-height: 1;">★</span>`;

  for (let i = 1; i <= 5; i++) {
    starsHtml += i <= filledStars ? STAR_FILLED : STAR_EMPTY;
  }
  return starsHtml;
};

/**
 * Generates the complete, self-contained HTML document string for the Course Feedback email report.
 * **CRITICAL:** This function now uses a `.replace()` chain to flatten the output HTML,
 * removing line breaks and extra spaces to mitigate the Quoted-Printable encoding issue.
 */
const generateFeedbackReportHtml = (
  feedbackData: any,
  customerName: string,
): string => {
  const PRIMARY_COLOR = "#00CE84";
  const STAR_COLOR = "#6257FF";
  const LIGHT_ACCENT_BG = "rgba(0, 206, 132, 0.08)";

  // 1. Map Core Questionnaire Data
  const clutchBrakeRating = feedbackData?.performance?.clutchBrakeRating || "0";
  const distanceMatchRating =
    feedbackData?.performance?.distanceMatchRating || "0";
  const parkingRating = feedbackData?.performance?.parkingRating || "0";
  const planningToBuy = feedbackData?.carBuyingIntent?.planningToBuy || "No";
  const carType = feedbackData?.carBuyingIntent?.carType || "N/A";
  const carCondition = feedbackData?.carBuyingIntent?.carCondition || "N/A";
  const buyTimeframe = feedbackData?.carBuyingIntent?.buyTimeframe || "N/A";
  const lessonRating = feedbackData?.lessonRating || "N/A";
  const textFeedback =
    feedbackData?.textFeedback || "No additional comments provided.";
  const timestamp = feedbackData?.timestamp || Date.now();
  const courseNameValue = feedbackData?.courseName || "N/A";

  // 2. Prepare Secondary Data (Date Formatting Fix)
  const submissionDate = new Date(timestamp);
  const datePart = submissionDate.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const timePart = submissionDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // 24-hour format
  });
  const generatedTimestamp = `${datePart} ${timePart}`;

  // Conditional details block for car buying intent (kept formatted for readability here)
  const intentDetailsBlock =
    planningToBuy === "Yes"
      ? `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 10px; border-left: 2px solid ${PRIMARY_COLOR}; padding-left: 10px;">
                <tr>
                    <td style="padding: 10px 0;">
                        <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: 600; color: #4b5563;">Targeting Details:</h3>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td width="33.3%" style="padding-right: 10px; padding-bottom: 10px;">
                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Type of Car:</p>
                                    <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 700;">${carType}</p>
                                </td>
                                <td width="33.3%" style="padding-right: 10px; padding-bottom: 10px;">
                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">New or Used Car:</p>
                                    <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 700;">${carCondition}</p>
                                </td>
                                <td width="33.3%" style="padding-bottom: 10px;">
                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Planned Purchase Timeline:</p>
                                    <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 700;">${buyTimeframe}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        `
      : `
            <div style="margin-top: 10px; border-left: 2px solid #d1d5db; padding-left: 10px; padding-top: 5px; padding-bottom: 5px;">
                <p style="margin: 0; color: #9ca3af; font-style: italic; font-size: 14px;">User is not currently planning to buy a car.</p>
            </div>
        `;

  // 3. Section Containers (kept formatted for readability here)
  const performanceSection = `
        <div style="border-left: 4px solid ${PRIMARY_COLOR}; padding-left: 1rem; margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px; font-size: 20px; font-weight: 700; color: #374151;">1. Skill Assessment Ratings (0-5)</h2>
            <div style="padding: 0; margin: 0;">
                
                ${[
                  {
                    label: "Controlling & Clutch-Brake Handling",
                    rating: clutchBrakeRating,
                  },
                  {
                    label: "Distance Matching Ability (between vehicles)",
                    rating: distanceMatchRating,
                  },
                  { label: "Parking Skill", rating: parkingRating },
                ]
                  .map(
                    (item) => `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 10px; background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <tr>
                            <td style="padding: 12px; font-size: 14px; color: #374151; font-weight: 500;">
                                ${item.label}
                            </td>
                            <td style="padding: 12px; text-align: right; white-space: nowrap;">
                                ${generateStars(item.rating, STAR_COLOR)}
                                <span style="margin-left: 8px; font-weight: 700; font-size: 16px; color: ${PRIMARY_COLOR};">(${item.rating}/5)</span>
                            </td>
                        </tr>
                    </table>
                `,
                  )
                  .join("")}

            </div>
        </div>
    `;

  const feedbackSection = `
        <div style="border-left: 4px solid ${PRIMARY_COLOR}; padding-left: 1rem; margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px; font-size: 20px; font-weight: 700; color: #374151;">2. Core Additional Feedback</h2>
            
            <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #374151;">Open-Ended Comments</h3>
            <div style="padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                <p style="margin: 0; color: #1f2937; white-space: pre-wrap; font-size: 14px;">${textFeedback}</p>
            </div>
        </div>
    `;

  const intentSection = `
        <div style="border-left: 4px solid ${PRIMARY_COLOR}; padding-left: 1rem; margin-bottom: 25px;">
            <h2 style="margin: 0 0 15px; font-size: 20px; font-weight: 700; color: #374151;">3. Car Buying Intent Analysis</h2>
            
            <div style="padding: 15px; border-radius: 8px; border: 1px solid ${PRIMARY_COLOR}; background-color: ${LIGHT_ACCENT_BG};">
                
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">
                    <tr>
                        <td style="padding-bottom: 5px;">
                            <p style="margin: 0; font-weight: 600; color: #374151; font-size: 14px;">Are you planning to buy a car?</p>
                        </td>
                        <td style="padding-bottom: 5px; text-align: right; white-space: nowrap;">
                            <p style="margin: 0; font-weight: 800; font-size: 18px; color: ${PRIMARY_COLOR};">${planningToBuy}</p>
                        </td>
                    </tr>
                </table>
                
                ${intentDetailsBlock}

            </div>
        </div>
    `;

  // 4. Main Report Container HTML String (Full Document)
  const rawHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Feedback Report</title>
            <style>
                /* Universal Reset and Fonts for Email Clients */
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', Helvetica, Arial, sans-serif;
                    -webkit-text-size-adjust: 100%;
                    -ms-text-size-adjust: 100%;
                    background-color: #f7f7f7;
                }
                table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                a { text-decoration: none; }
                p { margin: 0; }
                .ReadMsgBody { width: 100%; }
                .ExternalClass { width: 100%; }
                /* Responsive Styling for Mobile */
                @media only screen and (max-width: 600px) {
                    .main-content { width: 100% !important; }
                }
            </style>
        </head>
        <body style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f7f7f7; margin: 0; padding: 20px;">
            <center>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="padding: 0 0 20px 0; text-align: center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="main-content" style="background-color: #ffffff; border-radius: 12px; border-top: 8px solid ${PRIMARY_COLOR}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
                                <tr>
                                    <td style="padding: 32px 32px 24px 32px;">
                                        
                                        <h1 style="margin: 0 0 5px; font-size: 28px; font-weight: 800; color: #1f2937;">Course Feedback</h1>
                                        <div style="border-bottom: 1px solid #e5eeeb; padding-bottom: 15px; margin-bottom: 25px;"></div>

                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px; background-color: #f9fafb; border-radius: 8px; padding: 15px;">
                                            <tr>
                                                <td width="25%" style="padding-right: 15px;">
                                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Customer Name:</p>
                                                    <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 800;">${customerName}</p>
                                                </td>
                                                <td width="25%" style="padding-right: 15px;">
                                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Course Name:</p>
                                                    <p style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 800;">${courseNameValue}</p>
                                                </td>
                                                <td width="25%" style="padding-right: 15px;">
                                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Overall Rating:</p>
                                                    <p style="margin: 0; font-size: 16px; color: ${PRIMARY_COLOR}; font-weight: 700;">${lessonRating}/5</p>
                                                </td>
                                                <td width="25%">
                                                    <p style="margin: 0; font-size: 12px; color: #4b5563; font-weight: 500;">Date Filled:</p>
                                                    <p style="margin: 0; font-size: 14px; color: #1f2937; font-weight: 700;">${generatedTimestamp}</p>
                                                </td>
                                            </tr>
                                        </table>

                                        ${performanceSection}
                                        ${feedbackSection}
                                        ${intentSection}

                                        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center;">
                                            <p style="margin: 0 0 5px; font-size: 12px; color: #6b7280;">Report Generated: ${generatedTimestamp}.</p>
                                        </div>

                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </center>
        </body>
        </html>
    `;

  // **CRITICAL FIX**: Flatten the HTML string to remove line breaks and
  // excessive spaces, which prevents Quoted-Printable encoding issues (=20).
  return rawHtml
    .replace(/[\n\r]/g, "")
    .replace(/\s\s+/g, " ")
    .trim();
};
// --- END HTML GENERATION HELPERS ---

/**
 * Function to send email with retry logic and detailed logging.
 */
async function sendEmailWithRetry(
  client: SMTPClient,
  emailOptions: any,
  attempt: number = 1,
  maxRetries: number = MAX_RETRIES,
): Promise<boolean> {
  try {
    console.log(
      `[Email] Attempt ${attempt}/${maxRetries + 1}: Sending report...`,
    );
    await client.send(emailOptions);
    console.log(`[Email] SUCCESS on attempt ${attempt}.`);
    return true;
  } catch (error) {
    console.error(`[Email] FAILED on attempt ${attempt}: ${error.message}`);

    if (attempt >= maxRetries + 1) {
      console.error(
        `[Email] Maximum attempts reached (${maxRetries + 1} total), giving up.`,
      );
      throw error; // Re-throw final error to be caught by the main handler
    }

    console.log(`[Email] Retrying in ${RETRY_DELAY_MS}ms...`);
    await delay(RETRY_DELAY_MS);

    // Recreate SMTP client for retry (Crucial for fresh connection)
    const newClient = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
        port: parseInt(Deno.env.get("SMTP_PORT") || "465", 10),
        tls: (Deno.env.get("SMTP_TLS") || "true") === "true",
        auth: {
          username: Deno.env.get("SMTP_USERNAME"),
          password: Deno.env.get("SMTP_PASSWORD"),
        },
      },
    });

    try {
      // Recursive call for retry, incrementing the attempt number
      return await sendEmailWithRetry(
        newClient,
        emailOptions,
        attempt + 1,
        maxRetries,
      );
    } finally {
      if (newClient) {
        try {
          await newClient.close();
          console.log(
            `[Email] Closed SMTP connection after failed attempt ${attempt}.`,
          );
        } catch (closeErr) {
          console.warn(
            `[Email] Error closing SMTP connection during retry: ${closeErr}`,
          );
        }
      }
    }
  }
}

/**
 * The main Edge Function handler to receive feedback, generate a report, and email it.
 */
serve(async (req) => {
  // 1. Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    // **CORS FIX**: Ensure 200 status for preflight request
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  let requestBody: { customerName: string; feedbackData: any } | undefined;

  try {
    // --- Setup and Validation ---

    console.log("Parsing request body for feedback data...");
    const rawBody: any = await req.json();
    requestBody = {
      customerName: rawBody?.customerName,
      feedbackData: rawBody?.feedbackData as any,
    };

    const { customerName, feedbackData } = requestBody;
    console.log("Successfully parsed request body.");

    // Basic validation check
    if (!customerName || !feedbackData || !feedbackData?.courseName) {
      console.log("Validation failed: Missing required fields.");
      return new Response(
        JSON.stringify({
          error:
            "Missing customerName, feedbackData, or courseName in payload.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Processing feedback for: ${customerName}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("MY_SUPABASE_URL") ?? "",
      Deno.env.get("MY_SUPABASE_ANON_KEY") ?? "",
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
      console.log("Authentication failed: Invalid token or user.");
      return new Response(
        JSON.stringify({ error: "Unauthorized access or invalid token." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // --- Core Logic: Generate HTML and Send Email ---

    // 1. Configure Recipients and Sender
    const adminEmailSender =
      Deno.env.get("ADMIN_EMAIL") || Deno.env.get("SMTP_FROM");
    const adminEmails = ADMIN_RECIPIENTS;

    if (!adminEmailSender || adminEmails.length === 0) {
      console.error(
        `Admin Sender is set: ${!!adminEmailSender}. Admin Email Count: ${adminEmails.length}.`,
      );
      return new Response(
        JSON.stringify({
          error:
            "ADMIN_EMAIL/SMTP_FROM environment variable not set, or ADMIN_RECIPIENTS list is empty.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Report sender: ${adminEmailSender}. Recipients: ${adminEmails.join(", ")}`,
    );

    // 2. Generate the complete HTML report content
    console.log("Generating HTML report content...");
    const reportHtmlContent = generateFeedbackReportHtml(
      feedbackData,
      customerName,
    );

    // 3. Prepare email options
    const subject = `NEW COURSE FEEDBACK: ${feedbackData.courseName} by ${customerName}`;

    const smtpConfig = {
      connection: {
        hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
        port: parseInt(Deno.env.get("SMTP_PORT") || "465", 10),
        tls: (Deno.env.get("SMTP_TLS") || "true") === "true",
        auth: {
          username: Deno.env.get("SMTP_USERNAME"),
          password: Deno.env.get("SMTP_PASSWORD"),
        },
      },
    };

    const adminEmailOptions = {
      from: adminEmailSender,
      to: adminEmails,
      subject: subject,
      html: reportHtmlContent,
    };

    // 4. Configure and send admin email with retry
    let emailSentSuccess = false;
    let lastError: Error | undefined = undefined;
    let adminClient: SMTPClient | undefined;

    try {
      adminClient = new SMTPClient(smtpConfig);
      console.log("Attempting to send email report...");

      emailSentSuccess = await sendEmailWithRetry(
        adminClient,
        adminEmailOptions,
        1,
        MAX_RETRIES,
      );

      if (emailSentSuccess) {
        console.log(
          `[Final] Sent feedback report email successfully to ${adminEmails.length} recipient(s).`,
        );
      } else {
        // Should be unreachable if the retry function correctly throws the final error
        throw new Error("Email failed after all retries.");
      }
    } catch (smtpError) {
      lastError = smtpError as Error;
      console.error(
        `[Final] Failed to send feedback report email (after ${MAX_RETRIES} retries):`,
        lastError.message,
      );

      // Log error to Supabase (assuming 'email_errors' table exists)
      // *** CRITICAL FIX: Ensure user_id is the UUID string, and use feedbackData for debugging ***
      await supabaseClient.from("email_errors").insert([
        {
          user_id: user.id, // <-- Use the string UUID, not the whole user object
          error: lastError.message,
          stack: lastError.stack,
          details: {
            email: adminEmails.join(", "),
            type: "feedback_report",
            subject,
            customerName,
            // Adding the received feedback payload here for debugging
            payload: feedbackData,
          },
        },
      ]);
    } finally {
      if (adminClient) {
        try {
          await adminClient.close();
          console.log("[Final] Closed initial SMTP connection.");
        } catch (closeErr) {
          console.warn(
            "[Final] Error closing initial SMTP connection:",
            closeErr,
          );
        }
      }
    }

    // 5. Return Response Codes
    if (emailSentSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Feedback report sent successfully to ${adminEmails.length} recipient(s).`,
        }),
        {
          status: 200, // SUCCESS
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Failed to send email after multiple retries. Data is saved in DB.",
          details: lastError?.message,
        }),
        {
          status: 500, // FAILURE (Internal Server Error due to email service)
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("General Error (Parsing/Auth/Validation):", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, // GENERAL FAILURE
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
