import { format } from "https://deno.land/std@0.168.0/datetime/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Configuration for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second between retries

// Helper function to add delay between retries
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to send email with retry logic
async function sendEmailWithRetry(
  client: SMTPClient,
  emailOptions: any,
  retries = MAX_RETRIES,
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
          username: "f20220757@goa.bits-pilani.ac.in",
          password: "giqauhuaxbgxroog",
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

// Function to send admin notification when emails fail
async function notifyAdminOfFailedEmails(
  supabaseClient: any,
  details: {
    learnerEmail: string;
    instructorEmail: string;
    lessonNumber: number;
    startTime: string;
    endTime: string;
    errors: string[];
  }
) {
  try {
    const formattedDate = format(new Date(details.startTime), "dd/MM/yyyy");
    const subject = `Failed Email Notifications for Lesson ${details.lessonNumber}`;
    const message = `
      We were unable to send schedule notification emails after multiple attempts.
      
      Lesson Details:
      - Lesson Number: ${details.lessonNumber}
      - Date: ${formattedDate}
      - Start Time: ${details.startTime}
      - End Time: ${details.endTime}
      
      Recipients:
      - Learner: ${details.learnerEmail}
      - Instructor: ${details.instructorEmail}
      
      Error Details:
      ${details.errors.join('\n')}
      
      Please check the email_errors table for more information and consider sending these notifications manually.
    `;

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": supabaseClient.auth.headers().Authorization,
      },
      body: JSON.stringify({ subject, message }),
    });

    if (!response.ok) {
      console.error("Failed to send admin notification:", await response.text());
      return false;
    }

    console.log("Admin notification sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending admin notification:", error);
    return false;
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
    const {
      learnerEmail,
      instructorEmail,
      instructorICS,
      learnerICS,
      lessonNumber,
      startTime,
      endTime,
      pickupLocation,
      instructorName,
      learnerName,
    } = requestBody;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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

    // Custom function to format time in Indian style
    const formatIndianTime = (dateString: string) => {
      // Create date object and adjust to Indian time (UTC+5:30)
      const date = new Date(dateString);
      const indianTime = new Date(date.getTime() + 5.5 * 60 * 60 * 1000); // Add 5.5 hours for IST

      let hours = indianTime.getUTCHours();
      const minutes = indianTime.getUTCMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";

      // Convert to 12-hour format
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'

      // Add leading zero to minutes if needed
      const minutesStr = minutes < 10 ? "0" + minutes : minutes;

      return `${hours}:${minutesStr} ${ampm}`;
    };

    // Format date for email
    const lessonDate = new Date(startTime);
    const formattedDate = format(lessonDate, "dd/MM/yyyy"); // Indian date format (day/month/year)

    // Format times using Indian conventions
    const formattedStartTime = formatIndianTime(startTime);

    // Calculate end time as exactly 1 hour after start time
    const endDate = new Date(new Date(startTime).getTime() + 60 * 60 * 1000);
    const formattedEndTime = formatIndianTime(endDate.toISOString());

    // Track email sending status
    const emailResults = {
      learner: false,
      instructor: false,
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
            username: "f20220757@goa.bits-pilani.ac.in",
            password: Deno.env.get("SMTP_PASSWORD") || "default_password",
          },
        },
      };

      const smtpFrom =
        Deno.env.get("SMTP_FROM") || "f20220757@goa.bits-pilani.ac.in";

      // Prepare email content for learner
      const learnerEmailContent = `
        <html>
          <body>
            <h2>Your Driving Lesson is Scheduled</h2>
            <p>Hello ${learnerName},</p>
            <p>Your driving lesson ${lessonNumber} has been scheduled for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.</p>
            <p><strong>Instructor:</strong> ${instructorName}</p>
            <p><strong>Pickup Location:</strong> ${pickupLocation}</p>
            <p>Please find attached a calendar invitation that you can add to your calendar.</p>
            <p>Thank you for choosing InLane!</p>
          </body>
        </html>
      `;

      // Prepare email content for instructor
      const instructorEmailContent = `
        <html>
          <body>
            <h2>New Driving Lesson Scheduled</h2>
            <p>Hello ${instructorName},</p>
            <p>You have a driving lesson ${lessonNumber} scheduled for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.</p>
            <p><strong>Student:</strong> ${learnerName}</p>
            <p><strong>Pickup Location:</strong> ${pickupLocation}</p>
            <p>Please find attached a calendar invitation that you can add to your calendar.</p>
            <p>Thank you for being part of InLane!</p>
          </body>
        </html>
      `;

      const encoder = new TextEncoder();

      function toBase64(buffer: Uint8Array): string {
        return btoa(String.fromCharCode(...buffer));
      }

      // Send learner email
      const learnerClient = new SMTPClient(smtpConfig);
      try {
        const rawLearnerData = encoder.encode(learnerICS);
        const base64LearnerContent = toBase64(rawLearnerData);

        const learnerEmailOptions = {
          from: smtpFrom,
          to: learnerEmail,
          subject: `Driving Lesson ${lessonNumber} Scheduled`,
          html: String(learnerEmailContent),
          attachments: [
            {
              filename: "invite.ics",
              content: base64LearnerContent,
              contentType: "text/calendar",
              encoding: "base64",
            },
          ],
        };

        emailResults.learner = await sendEmailWithRetry(
          learnerClient,
          learnerEmailOptions,
        );
        console.log("Sent email to learner successfully");
      } catch (learnerError) {
        emailResults.errors.push(
          `Learner email error: ${learnerError.message}`,
        );
        console.error("Learner email error:", learnerError);

        // Log to Supabase for debugging
        await supabaseClient.from("email_errors").insert([
          {
            error: learnerError.message,
            stack: learnerError.stack,
            details: {
              email: learnerEmail,
              type: "learner",
              lessonNumber,
              startTime,
              endTime,
            },
          },
        ]);
      } finally {
        try {
          await learnerClient.close();
        } catch (closeError) {
          console.warn("Error closing learner SMTP connection:", closeError);
        }
      }

      // Send instructor email
      const instructorClient = new SMTPClient(smtpConfig);
      try {
        const rawInstructorData = encoder.encode(instructorICS);
        const base64InstructorContent = toBase64(rawInstructorData);

        const instructorEmailOptions = {
          from: smtpFrom,
          to: instructorEmail,
          subject: `Driving Lesson ${lessonNumber} Scheduled`,
          html: String(instructorEmailContent),
          attachments: [
            {
              filename: "invite.ics",
              content: base64InstructorContent,
              contentType: "text/calendar",
              encoding: "base64",
            },
          ],
        };

        emailResults.instructor = await sendEmailWithRetry(
          instructorClient,
          instructorEmailOptions,
        );
        console.log("Sent email to instructor successfully");
      } catch (instructorError) {
        emailResults.errors.push(
          `Instructor email error: ${instructorError.message}`,
        );
        console.error("Instructor email error:", instructorError);

        // Log to Supabase for debugging
        await supabaseClient.from("email_errors").insert([
          {
            error: instructorError.message,
            stack: instructorError.stack,
            details: {
              email: instructorEmail,
              type: "instructor",
              lessonNumber,
              startTime,
              endTime,
            },
          },
        ]);
      } finally {
        try {
          await instructorClient.close();
        } catch (closeError) {
          console.warn("Error closing instructor SMTP connection:", closeError);
        }
      }

      // Store failed email attempts for manual retry later if needed
      if (!emailResults.learner || !emailResults.instructor) {
        await supabaseClient.from("failed_emails").insert([
          {
            learner_email: learnerEmail,
            instructor_email: instructorEmail,
            learner_sent: emailResults.learner,
            instructor_sent: emailResults.instructor,
            lesson_number: lessonNumber,
            start_time: startTime,
            end_time: endTime,
            pickup_location: pickupLocation,
            instructor_name: instructorName,
            learner_name: learnerName,
            errors: emailResults.errors,
            learner_ics: learnerICS,
            instructor_ics: instructorICS,
          },
        ]);
        
        // If either email failed after all retries, notify admin
        if (emailResults.errors.length > 0) {
          await notifyAdminOfFailedEmails(supabaseClient, {
            learnerEmail,
            instructorEmail,
            lessonNumber,
            startTime,
            endTime,
            errors: emailResults.errors
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: emailResults.learner || emailResults.instructor,
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
            learnerEmail,
            instructorEmail,
            lessonNumber,
            startTime,
            endTime,
          },
        },
      ]);
      
      // Notify admin about SMTP failure
      await notifyAdminOfFailedEmails(supabaseClient, {
        learnerEmail,
        instructorEmail,
        lessonNumber,
        startTime,
        endTime,
        errors: [`SMTP configuration error: ${smtpError.message}`]
      });

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
