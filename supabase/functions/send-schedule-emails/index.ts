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
          password: Deno.env.get("SMTP_PASSWORD") || "giqauhuaxbgxroog",
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
  }
) {
  try {
    const lessonsList = details.events
      .map(e => {
        const formattedDate = format(new Date(e.startTime), "dd/MM/yyyy");
        return `- Lesson ${e.lessonNumber}: ${formattedDate} from ${formatIndianTime(e.startTime)} to ${formatIndianTime(e.endTime)}`;
      })
      .join('\n');
      
    const subject = `Failed Email Notifications for Multiple Lessons`;
    const message = `
      We were unable to send schedule notification emails after multiple attempts.
      
      Lesson Details:
      ${lessonsList}
      
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

// Custom function to format time in Indian style
function formatIndianTime(dateString: string) {
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
      });

      // For single event, we use the single ICS files
      learnerICSArray.push({ 
        content: learnerICS, 
        filename: `lesson_${lessonNumber}.ics`,
        lessonNumber 
      });
      
      instructorICSArray.push({ 
        content: instructorICS, 
        filename: `lesson_${lessonNumber}.ics`,
        lessonNumber 
      });
    }

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
            password: Deno.env.get("SMTP_PASSWORD") || "giqauhuaxbgxroog",
          },
        },
      };

      const smtpFrom =
        Deno.env.get("SMTP_FROM") || "f20220757@goa.bits-pilani.ac.in";

      // Generate email content for multi-event scenario
      let emailSubject, learnerEmailContent, instructorEmailContent;
      
      if (isMultiEvent) {
        // For multi-event emails, create a summary of all events
        const hasCancellations = events.some(e => e.isCancellation);
        const hasReschedules = events.some(e => e.isReschedule && !e.isCancellation);
        const hasNewSchedules = events.some(e => !e.isReschedule && !e.isCancellation);
        
        // Determine the most appropriate subject line
        if (hasCancellations && (hasReschedules || hasNewSchedules)) {
          emailSubject = "Your Driving Lessons Schedule Updates";
        } else if (hasCancellations) {
          emailSubject = "Driving Lessons Cancelled";
        } else if (hasReschedules) {
          emailSubject = "Driving Lessons Rescheduled";
        } else {
          emailSubject = "Your Driving Lessons Schedule";
        }
        
        // Generate tables for different types of events
        const cancellationsTable = events
          .filter(e => e.isCancellation)
          .map(e => {
            const date = format(new Date(e.startTime), "dd/MM/yyyy");
            return `
              <tr>
                <td>${e.lessonNumber}</td>
                <td>${date}</td>
                <td>${formatIndianTime(e.startTime)} - ${formatIndianTime(e.endTime)}</td>
                <td>${e.pickupLocation}</td>
              </tr>
            `;
          })
          .join("");
          
        const scheduledTable = events
          .filter(e => !e.isCancellation)
          .map(e => {
            const date = format(new Date(e.startTime), "dd/MM/yyyy");
            return `
              <tr>
                <td>${e.lessonNumber}</td>
                <td>${date}</td>
                <td>${formatIndianTime(e.startTime)} - ${formatIndianTime(e.endTime)}</td>
                <td>${e.pickupLocation}</td>
                <td>${e.isReschedule ? "Rescheduled" : "New"}</td>
              </tr>
            `;
          })
          .join("");
        
        // Create learner email content
        learnerEmailContent = `
          <html>
            <body>
              <h2>Your Driving Lessons Schedule</h2>
              <p>Hello ${learnerName},</p>
              
              ${hasCancellations ? `
                <h3>Cancelled Lessons:</h3>
                <table border="1" cellpadding="5" style="border-collapse: collapse;">
                  <tr>
                    <th>Lesson</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Pickup Location</th>
                  </tr>
                  ${cancellationsTable}
                </table>
                <br>
              ` : ''}
              
              ${scheduledTable ? `
                <h3>${hasCancellations ? 'Updated' : ''} Lesson Schedule:</h3>
                <table border="1" cellpadding="5" style="border-collapse: collapse;">
                  <tr>
                    <th>Lesson</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Pickup Location</th>
                    <th>Status</th>
                  </tr>
                  ${scheduledTable}
                </table>
              ` : ''}
              
              <p>Your instructor for these lessons is ${instructorName}.</p>
              <p>Please find the calendar invitations attached to this email. Each lesson has its own calendar invitation that will automatically add to your calendar when accepted.</p>
              <p>Thank you for choosing InLane!</p>
            </body>
          </html>
        `;
        
        // Create instructor email content
        instructorEmailContent = `
          <html>
            <body>
              <h2>Driving Lessons Schedule</h2>
              <p>Hello ${instructorName},</p>
              
              ${hasCancellations ? `
                <h3>Cancelled Lessons:</h3>
                <table border="1" cellpadding="5" style="border-collapse: collapse;">
                  <tr>
                    <th>Lesson</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Pickup Location</th>
                  </tr>
                  ${cancellationsTable}
                </table>
                <br>
              ` : ''}
              
              ${scheduledTable ? `
                <h3>${hasCancellations ? 'Updated' : ''} Lesson Schedule:</h3>
                <table border="1" cellpadding="5" style="border-collapse: collapse;">
                  <tr>
                    <th>Lesson</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Pickup Location</th>
                    <th>Status</th>
                  </tr>
                  ${scheduledTable}
                </table>
              ` : ''}
              
              <p>Your student for these lessons is ${learnerName}.</p>
              <p>Please find the calendar invitations attached to this email. Each lesson has its own calendar invitation that will automatically add to your calendar when accepted.</p>
              <p>Thank you for being part of InLane!</p>
            </body>
          </html>
        `;
      } else {
        // Use the existing single-event logic if not a multi-event
        const event = events[0];
        const formattedDate = format(new Date(event.startTime), "dd/MM/yyyy");
        const formattedStartTime = formatIndianTime(event.startTime);
        const formattedEndTime = formatIndianTime(event.endTime);
        
        if (event.isCancellation) {
          // Cancellation email content
          emailSubject = `Driving Lesson ${event.lessonNumber} Cancelled`;
          learnerEmailContent = `
            <html>
              <body>
                <h2>Your Driving Lesson has been Cancelled</h2>
                <p>Hello ${learnerName},</p>
                <p>Your driving lesson number ${event.lessonNumber} that was scheduled for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime} has been cancelled.</p>
                <p>Please find attached a calendar update that will remove this appointment from your calendar.</p>
                <p>A new schedule will be sent to you shortly.</p>
                <p>Thank you for choosing InLane!</p>
              </body>
            </html>
          `;

          instructorEmailContent = `
            <html>
              <body>
                <h2>Driving Lesson Cancelled</h2>
                <p>Hello ${instructorName},</p>
                <p>The driving lesson number ${event.lessonNumber} that was scheduled for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime} with ${learnerName} has been cancelled.</p>
                <p>Please find attached a calendar update that will remove this appointment from your calendar.</p>
                <p>A new schedule will be sent to you shortly.</p>
                <p>Thank you for being part of InLane!</p>
              </body>
            </html>
          `;
        } else if (event.isReschedule) {
          // Reschedule email content
          emailSubject = `Driving Lesson ${event.lessonNumber} Rescheduled`;
          learnerEmailContent = `
            <html>
              <body>
                <h2>Your Driving Lesson has been Rescheduled</h2>
                <p>Hello ${learnerName},</p>
                <p>Your driving lesson number ${event.lessonNumber} has been rescheduled to ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.</p>
                <p><strong>Instructor:</strong> ${instructorName}</p>
                <p><strong>Pickup Location:</strong> ${event.pickupLocation}</p>
                <p>Please find attached a calendar invitation that will automatically add to your calendar when accepted.</p>
                <p>Thank you for choosing InLane!</p>
              </body>
            </html>
          `;

          instructorEmailContent = `
            <html>
              <body>
                <h2>Driving Lesson Rescheduled</h2>
                <p>Hello ${instructorName},</p>
                <p>The driving lesson number ${event.lessonNumber} with ${learnerName} has been rescheduled to ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.</p>
                <p><strong>Student:</strong> ${learnerName}</p>
                <p><strong>Pickup Location:</strong> ${event.pickupLocation}</p>
                <p>Please find attached a calendar invitation that will automatically add to your calendar when accepted.</p>
                <p>Thank you for being part of InLane!</p>
              </body>
            </html>
          `;
        } else {
          // Regular new schedule email content
          emailSubject = `Driving Lesson ${event.lessonNumber} Scheduled`;
          learnerEmailContent = `
            <html>
              <body>
                <h2>Your Driving Lesson is Scheduled</h2>
                <p>Hello ${learnerName},</p>
                <p>Your driving lesson number ${event.lessonNumber} has been scheduled for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.</p>
                <p><strong>Instructor:</strong> ${instructorName}</p>
                <p><strong>Pickup Location:</strong> ${event.pickupLocation}</p>
                <p>Please find attached a calendar invitation that will automatically add to your calendar when accepted.</p>
                <p>Thank you for choosing InLane!</p>
              </body>
            </html>
          `;

          instructorEmailContent = `
            <html>
              <body>
                <h2>New Driving Lesson Scheduled</h2>
                <p>Hello ${instructorName},</p>
                <p>You have a driving lesson number ${event.lessonNumber} scheduled for ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.</p>
                <p><strong>Student:</strong> ${learnerName}</p>
                <p><strong>Pickup Location:</strong> ${event.pickupLocation}</p>
                <p>Please find attached a calendar invitation that will automatically add to your calendar when accepted.</p>
                <p>Thank you for being part of InLane!</p>
              </body>
            </html>
          `;
        }
      }

      const encoder = new TextEncoder();

      function toBase64(buffer: Uint8Array): string {
        return btoa(String.fromCharCode(...buffer));
      }

      // Send learner email
      const learnerClient = new SMTPClient(smtpConfig);
      try {
        const batchSize = 5;
        const learnerICSBatches = [];
        for (let i = 0; i < learnerICSArray.length; i += batchSize) {
          learnerICSBatches.push(learnerICSArray.slice(i, i + batchSize));
        }
        for (let i = 0; i < learnerICSBatches.length; i++) {
          const batchNumber = learnerICSBatches.length > 1 ? ` (${i+1}/${learnerICSBatches.length})` : '';
          
          const learnerEmailOptions = {
            from: smtpFrom,
            to: learnerEmail,
            subject: emailSubject + batchNumber,
            html: String(i === 0 ? learnerEmailContent : 
              `<p>This is a continuation email with additional calendar attachments. Please see the first email for complete details.</p>`),
            attachments: learnerICSBatches[i].map(ics => {
              // Same attachment code as before
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
          }
        };

        emailResults.learner = await sendEmailWithRetry(
          learnerClient,
          learnerEmailOptions,
        );
        console.log(`Sent ${isMultiEvent ? "multi-event" : "single-event"} schedule email to learner successfully`);
      } 
    }catch (learnerError) {
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
        try {
          await learnerClient.close();
        } catch (closeError) {
          console.warn("Error closing learner SMTP connection:", closeError);
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
          const batchNumber = instructorICSBatches.length > 1 ? ` (${i+1}/${instructorICSBatches.length})` : '';

          const instructorEmailOptions = {
            from: smtpFrom,
            to: instructorEmail,
            subject: emailSubject + batchNumber,
            html: String(i === 0 ? instructorEmailContent : 
              `<p>This is a continuation email with additional calendar attachments. Please see the first email for complete details.</p>`),
            attachments: instructorICSBatches[i].map(ics => {
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
            }
          };

          emailResults.instructor = await sendEmailWithRetry(
            instructorClient,
            instructorEmailOptions,
          );
          console.log(`Sent ${isMultiEvent ? "multi-event" : "single-event"} schedule email to instructor successfully`);
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
            errors: emailResults.errors
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
        events.forEach(event => {
          if (!event.isCancellation && event.uid) {
            uidMap[event.lessonNumber] = event.uid;
          }
        });
        response['uidMap'] = uidMap;
      } else if (events.length === 1 && events[0].uid) {
        // For single event, return the single UID
        response['uid'] = events[0].uid;
      }

      return new Response(
        JSON.stringify(response),
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