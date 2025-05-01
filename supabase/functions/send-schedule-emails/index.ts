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
const MAX_RETRIES = 7;
const RETRY_DELAY_MS = 2000; // 2 second between retries

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

// Function to send admin notification when emails fail
async function notifyAdminOfFailedEmails(
  supabaseClient: any,
  details: {
    learnerEmail: string;
    instructorEmail: string;
    events: Array<{
      lessonNumber: number;
      startTime: string;
      endTime: string;
    }>;
    errors: string[];
  },
) {
  try {
    const lessonsList = details.events
      .map((e) => {
        const formattedDate = format(new Date(e.startTime), "dd/MM/yyyy");
        return `- Lesson ${e.lessonNumber}: ${formattedDate} from ${formatIndianTime(e.startTime)} to ${formatIndianTime(e.endTime)}`;
      })
      .join("\n");

    const subject = `Failed Email Notifications for Multiple Lessons`;
    const message = `
      We were unable to send schedule notification emails after multiple attempts.
      
      Lesson Details:
      ${lessonsList}
      
      Recipients:
      - Learner: ${details.learnerEmail}
      - Instructor: ${details.instructorEmail}
      
      Error Details:
      ${details.errors.join("\n")}
      
      Please check the email_errors table for more information and consider sending these notifications manually.
    `;

    // Use anon key instead of service role key for function-to-function calls
    const response = await fetch(
      `${Deno.env.get("MY_SUPABASE_URL")}/functions/v1/send-admin-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("MY_SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ subject, message }),
      },
    );

    if (!response.ok) {
      console.error(
        "Failed to send admin notification:",
        await response.text(),
      );
      return false;
    }

    console.log("Admin notification sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending admin notification:", error);
    return false;
  }
}

// Custom function to format time in Indian time (UTC+5:30)
function formatIndianTime(dateString: string) {
  try {
    // Create date object from string
    const date = new Date(dateString);
    
    // Add the IST offset (UTC+5:30) to properly display in Indian time
    // This is 5 hours and 30 minutes offset from UTC
    const offsetHours = 5;
    const offsetMinutes = 30;
    
    // Clone the date to avoid modifying the original
    const istDate = new Date(date.getTime());
    istDate.setHours(istDate.getHours());
    istDate.setMinutes(istDate.getMinutes());
    
    // Get hours and minutes from the adjusted date
    let hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    
    // Format for 12-hour clock with AM/PM
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    // Add leading zero to minutes if needed
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    
    return `${hours}:${minutesStr} ${ampm}`;
  } catch (error) {
    console.error("Error formatting time:", error, dateString);
    return dateString; // Return original in case of error
  }
}

// Main serve function
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

    // New structure for multi-event support
    const {
      learnerEmail,
      instructorEmail,
      learnerICSArray = [],
      instructorICSArray = [],
      isMultiEvent = false,
      events = [], // Array of events with lesson details
      instructorName,
      learnerName,
      emailType = "", // Add this parameter to differentiate between cancellation and new emails
      batchInfo = "", // Add this parameter for batch information
      allEvents = [], // Array of all events
      learnerId = "", // Add learner ID to fetch all schedules
    } = requestBody;

    // If it's not a multi-event, treat as a single event using the old fields
    if (!isMultiEvent) {
      const {
        learnerICS,
        instructorICS,
        lessonNumber,
        startTime,
        endTime,
        pickupLocation,
        isCancellation = false,
        isReschedule = false,
        uid,
        instructorPhone = null,
      } = requestBody;

      // Initialize events array with single event
      events.push({
        lessonNumber,
        startTime,
        endTime,
        pickupLocation,
        isCancellation,
        isReschedule,
        uid,
        instructorPhone,
      });

      // For single event, we use the single ICS files
      learnerICSArray.push({
        content: learnerICS,
        filename: `lesson_${lessonNumber}.ics`,
        lessonNumber,
      });

      instructorICSArray.push({
        content: instructorICS,
        filename: `lesson_${lessonNumber}.ics`,
        lessonNumber,
      });
    }

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all active schedules for the learner
    let allLearnerSchedules = [];
    try {
      // Extract learner ID from the first event if not provided directly
      const learnerIdToUse = learnerId || events[0]?.learnerId;
      if (learnerIdToUse) {
        const { data: schedules, error: schedulesError } = await supabaseClient
          .from("Schedule")
          .select(
            "*, Instructor:instructor_id(*), Learner:learner_id(*), Lesson:lesson_id(*)",
          )
          .eq("learner_id", learnerIdToUse)
          .order("date", { ascending: true });

        if (schedulesError) {
          console.log("Error fetching learner schedules:", schedulesError);
          console.error("Error fetching learner schedules:", schedulesError);
        } else if (schedules && schedules.length > 0) {
          console.log("Fetched learner schedules:", schedules);
          // Transform the schedules into the format needed for email content
          allLearnerSchedules = schedules.map((schedule) => ({
            lessonNumber: schedule.Lesson.number,
            startTime: schedule.date + "T" + schedule.start_time,
            endTime: schedule.date + "T" + schedule.end_time,
            pickupLocation:
              schedule.Learner.pick_up_location || "Contact Inlane",
            instructorName: schedule.Instructor.name || "Contact Inlane",
            instructorPhone: schedule.Instructor.phone || "Contact Inlane",
            instructorId: schedule.instructor_id, // Store instructor ID for filtering
            instructorEmail: schedule.Instructor.email || null, // Store instructor email
            isCancellation: false,
          }));
        }
      } else {
        console.error("No learner ID provided to fetch schedules.");
      }
      console.log("Fetched learner schedules:", allLearnerSchedules);
    } catch (fetchError) {
      console.error("Error fetching all learner schedules:", fetchError);
      // Continue with the process even if fetching all schedules fails
    }

    // If we couldn't fetch from database, fall back to the provided events
    if (allLearnerSchedules.length === 0) {
      console.log("Using provided events as fallback for email content");
      allLearnerSchedules = allEvents.length > 0 ? allEvents : events;
    } else {
      console.log(
        `Using ${allLearnerSchedules.length} schedules from database for email content`,
      );
    }

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
            username: Deno.env.get("SMTP_USERNAME"),
            password: Deno.env.get("SMTP_PASSWORD"),
          },
        },
      };

      const smtpFrom = Deno.env.get("SMTP_FROM");
      const bccEmail = Deno.env.get("ADMIN_CAL_EMAIL"); // <-- Import ADMIN_CAL_EMAIL from env

      // Simplified email content generation
      function generateEmailContent(
        name: string,
        lessons: any[],
        isLearner: boolean,
        learnerPhone: string | null,
      ) {
        // Filter out cancellation events for the table display
        const activeEvents = lessons.filter((lesson) => !lesson.isCancellation);

        const lessonsTable = activeEvents
          .sort((a, b) => a.lessonNumber - b.lessonNumber)
          .map((lesson) => {
            const date = format(new Date(lesson.startTime), "dd/MM/yyyy");
            return `<tr>
              <td>${lesson.lessonNumber}</td>
              <td>${date}</td>
              <td>${formatIndianTime(lesson.startTime)} - ${formatIndianTime(lesson.endTime)}</td>
              <td>${lesson.pickupLocation}</td>
              <td>${lesson.instructorName || instructorName || "Contact Inlane"}</td><td>${lesson.instructorPhone || "Contact Inlane"}</td>
            </tr>`;
          })
          .join("");
        const learnerInfoSection = `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
            <h3 style="margin-top: 0;">Student Information:</h3>
            <p><strong>Name:</strong> ${learnerName}</p>
            <p><strong>Phone:</strong> ${learnerPhone || "Contact Inlane"}</p>
            <p><strong>Email:</strong> ${learnerEmail}</p>
          </div>
        `;

        return `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #3182ce;">Your Driving Lessons Schedule</h2>
                <p>Hello ${name},</p>${isLearner ? "" : learnerInfoSection}<h3>Complete Lesson Schedule:</h3>
                <div style="overflow-x: auto;">
                  <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                    <tr style="background-color: #f2f2f2;">
                      <th>Lesson</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Pickup Location</th>
                      <th>Instructor Name</th>
                      <th>Instructor Phone</th>
                    </tr>
                    ${lessonsTable}
                  </table>
                </div>
                <p style="margin-top: 20px;">Please find the calendar invitations attached to this email.</p>
                <div style="margin: 30px 0;">
                  <a href="https://inlane-web-app.vercel.app/${isLearner ? "login" : "instructor-login"}" 
                     style="background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    View in WebApp
                  </a>
                </div>
                <p>Thank you for choosing InLane!</p>
              </div>
            </body>
          </html>`;
      }

      // Extract learner and instructor phone numbers
      const learnerPhone = requestBody.learnerPhone || "Contact Inlane";

      // Generate learner email content with ALL lessons
      const learnerEmailContent = generateEmailContent(
        learnerName,
        allLearnerSchedules,
        true,
        learnerPhone,
      );

      // For instructor, filter to only show their lessons
      const instructorId = events[0]?.instructorId;
      
      // Properly filter instructor schedules based on instructor email
      // This ensures instructors only see their own lessons
      let instructorSchedules = allLearnerSchedules.filter(lesson => {
        // Filter by instructor's email (most reliable)
        if (lesson.instructorEmail && instructorEmail) {
          return lesson.instructorEmail.toLowerCase() === instructorEmail.toLowerCase();
        }
        // Fall back to instructor ID if email is not available
        if (instructorId && lesson.instructorId) {
          return lesson.instructorId === instructorId;
        }
        return false;
      });
      
      // If no lessons matched this instructor (unlikely), use the directly provided events
      if (instructorSchedules.length === 0) {
        console.log("No matching lessons for instructor - using event-specific data");
        instructorSchedules = events.filter(event => !event.isCancellation);
      }

      console.log(`Sending ${instructorSchedules.length} lessons to instructor email: ${instructorEmail}`);

      const instructorEmailContent = generateEmailContent(
        instructorName,
        instructorSchedules,
        false,
        learnerPhone,
      );

      const encoder = new TextEncoder();

      function toBase64(buffer: Uint8Array): string {
        return btoa(String.fromCharCode(...buffer));
      }

      // Define a default email subject
      const emailSubject = "Driving Lessons Schedule";

      // Send learner email with ALL lessons
      const learnerClient = new SMTPClient(smtpConfig);
      try {
        const batchSize = 5;
        const learnerICSBatches = [];
        for (let i = 0; i < learnerICSArray.length; i += batchSize) {
          learnerICSBatches.push(learnerICSArray.slice(i, i + batchSize));
        }
        for (let i = 0; i < learnerICSBatches.length; i++) {
          const batchNumber =
            learnerICSBatches.length > 1
              ? ` (${i + 1}/${learnerICSBatches.length})`
              : "";

          const learnerEmailOptions = {
            from: smtpFrom,
            to: learnerEmail,
            bcc: bccEmail, // <-- Use bcc email from env
            subject: emailSubject + batchNumber,
            html: String(learnerEmailContent),
            attachments: learnerICSBatches[i].map((ics) => {
              const rawData = encoder.encode(ics.content);
              const base64Content = toBase64(rawData);
              return {
                filename: ics.filename || `lesson_${ics.lessonNumber}.ics`,
                content: base64Content,
                contentType: "text/calendar; method=REQUEST; charset=UTF-8",
                contentDisposition: "attachment",
                encoding: "base64",
              };
            }),
            headers: {
              "Content-Class": "urn:content-classes:calendarmessage",
              "X-Mailer": "InLane Scheduling System",
            },
          };

          emailResults.learner = await sendEmailWithRetry(
            learnerClient,
            learnerEmailOptions,
          );
          console.log(
            `Sent ${isMultiEvent ? "multi-event" : "single-event"} schedule email to learner successfully`,
          );
        }
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
              isMultiEvent,
              events,
            },
          },
        ]);
      } finally {
        if (learnerClient) {
          try {
            await learnerClient.close();
          } catch (closeError) {
            console.warn("Error closing learner SMTP connection:", closeError);
          }
        }
      }

      // Send instructor email
      const instructorClient = new SMTPClient(smtpConfig);
      try {
        const batchSize = 5;
        const instructorICSBatches = [];
        for (let i = 0; i < instructorICSArray.length; i += batchSize) {
          instructorICSBatches.push(instructorICSArray.slice(i, i + batchSize));
        }
        for (let i = 0; i < instructorICSBatches.length; i++) {
          const batchNumber =
            instructorICSBatches.length > 1
              ? ` (${i + 1}/${instructorICSBatches.length})`
              : "";

          const instructorEmailOptions = {
            from: smtpFrom,
            to: instructorEmail,
            bcc: "", 
            subject: emailSubject + batchNumber,
            html: String(instructorEmailContent),
            attachments: instructorICSBatches[i].map((ics) => {
              const rawData = encoder.encode(ics.content);
              const base64Content = toBase64(rawData);
              return {
                filename: ics.filename || `lesson_${ics.lessonNumber}.ics`,
                content: base64Content,
                contentType: "text/calendar; method=REQUEST; charset=UTF-8",
                contentDisposition: "attachment",
                encoding: "base64",
              };
            }),
            headers: {
              "Content-Class": "urn:content-classes:calendarmessage",
              "X-Mailer": "InLane Scheduling System",
            },
          };

          emailResults.instructor = await sendEmailWithRetry(
            instructorClient,
            instructorEmailOptions,
          );
          console.log(
            `Sent ${isMultiEvent ? "multi-event" : "single-event"} schedule email to instructor successfully`,
          );
        }
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
              isMultiEvent,
              events,
            },
          },
        ]);
      } finally {
        if (instructorClient) {
          try {
            await instructorClient.close();
          } catch (closeError) {
            console.warn(
              "Error closing instructor SMTP connection:",
              closeError,
            );
          }
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
            is_multi_event: isMultiEvent,
            events_data: events,
            errors: emailResults.errors,
            learner_ics_array: learnerICSArray,
            instructor_ics_array: instructorICSArray,
            instructor_name: instructorName,
            learner_name: learnerName,
          },
        ]);

        // If either email failed after all retries, notify admin
        if (emailResults.errors.length > 0) {
          await notifyAdminOfFailedEmails(supabaseClient, {
            learnerEmail,
            instructorEmail,
            events,
            errors: emailResults.errors,
          });
        }
      }

      // Return the UID map (or single UID) along with success status
      const response = {
        success: emailResults.learner || emailResults.instructor,
        details: emailResults,
      };

      if (isMultiEvent) {
        // For multi-event, return the map of lesson numbers to UIDs
        const uidMap = {};
        events.forEach((event) => {
          if (!event.isCancellation && event.uid) {
            uidMap[event.lessonNumber] = event.uid;
          }
        });
        response["uidMap"] = uidMap;
      } else if (events.length === 1 && events[0].uid) {
        // For single event, return the single UID
        response["uid"] = events[0].uid;
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
            isMultiEvent,
            events,
          },
        },
      ]);

      // Notify admin about SMTP failure
      await notifyAdminOfFailedEmails(supabaseClient, {
        learnerEmail,
        instructorEmail,
        events,
        errors: [`SMTP configuration error: ${smtpError.message}`],
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
