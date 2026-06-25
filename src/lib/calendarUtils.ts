import { v4 as uuidv4 } from "uuid";

import { supabase } from "@/lib/supabaseClient";

export function downloadICSFile(icsContent: string, filename = "invite.ics") {
  const blob = new Blob([icsContent], { type: "text" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// Modify the sendMultiEventCalendarInvite function to explicitly handle cancellations:

export async function sendMultiEventCalendarInvite(
  learnerEmail: string,
  primaryInstructorEmail: string, // This will be used as a fallback
  events: Array<{
    startTime: Date;
    endTime: Date;
    lessonNumber: number;
    pickupLocation: string;
    uid?: string;
    sequence?: number;
    isCancellation?: boolean;
    instructorName?: string;
    instructorPhone?: string;
    instructorEmail?: string;
    instructorId?: string;
  }>,
  defaultInstructorName: string,
  learnerName: string,
  learnerPhone: string, // Add learnerPhone parameter
  emailType?: string,
  learnerId?: string, // Add learnerId parameter
): Promise<Record<number, string>> {
  try {
    // Count cancellation and new events
    const cancellationEvents = events.filter((e) => e.isCancellation);
    const newEvents = events.filter((e) => !e.isCancellation);

    console.log(
      `Processing ${events.length} events: ${cancellationEvents.length} cancellations and ${newEvents.length} new events`,
    );

    // Map to store UIDs by lesson number
    const uidMap: Record<number, string> = {};

    // Group events by instructor email to send separate emails to each instructor
    const eventsByInstructor = new Map<string, Array<(typeof events)[0]>>();

    // First, assign each event to the correct instructor group
    for (const event of events) {
      const instructorEmail = event.instructorEmail || primaryInstructorEmail;

      if (!eventsByInstructor.has(instructorEmail)) {
        eventsByInstructor.set(instructorEmail, []);
      }

      eventsByInstructor.get(instructorEmail)?.push(event);

      // Generate or store UID for this event
      const uid = event.uid || uuidv4();
      if (!event.isCancellation) {
        uidMap[event.lessonNumber] = uid;
      }
    }

    // Now process each instructor's events separately
    for (const [
      instructorEmail,
      instructorEvents,
    ] of eventsByInstructor.entries()) {
      const instructorCancellations = instructorEvents.filter(
        (e) => e.isCancellation,
      );
      const instructorNewEvents = instructorEvents.filter(
        (e) => !e.isCancellation,
      );

      // Get the instructor name for the first event (should be the same for all events for this instructor)
      const instructorName =
        instructorEvents[0]?.instructorName || defaultInstructorName;

      console.log(
        `Processing ${instructorEvents.length} events for instructor ${instructorName} (${instructorEmail})`,
      );

      // Generate ICS files for this instructor's events
      const learnerICSArray = [];
      const instructorICSArray = [];

      for (const event of instructorEvents) {
        // Create the correct lesson-specific subject and description
        const summary = event.isCancellation
          ? `Driving Lesson ${event.lessonNumber} - ${learnerName} (CANCELLED)`
          : `Driving Lesson ${event.lessonNumber} - ${learnerName}`;

        // Enhanced description with instructor details and app link.
        // The learner's copy omits the instructor's phone number (learners use
        // the in-app masked call instead); the instructor's own copy keeps it.
        const buildDescription = (includeInstructorPhone: boolean) => {
          const prefix = event.isCancellation
            ? `CANCELLED: Driving lesson ${event.lessonNumber} with InLane.`
            : `Driving lesson ${event.lessonNumber} with InLane.`;
          const instructorPhoneLine = includeInstructorPhone
            ? `\nPhone: ${event.instructorPhone || "Contact InLane for details"}`
            : "";
          return `${prefix}\n\nPickup location: ${event.pickupLocation}\n\nInstructor: ${event.instructorName || instructorName}${instructorPhoneLine}\n\nLearner: ${learnerName}\nPhone: ${learnerPhone || "Contact InLane for details"}\n\nView your schedule: https://inlane-web-app.vercel.app/login`;
        };
        const description = buildDescription(false); // learner copy
        const instructorDescription = buildDescription(true); // instructor copy

        // Use existing UID or the one we generated
        const uid = event.uid || uidMap[event.lessonNumber] || uuidv4();

        const learnerICS = generateICSFile(
          event.startTime,
          event.endTime,
          summary,
          description,
          event.pickupLocation,
          import.meta.env.VITE_SMTP_FROM,
          learnerEmail, // Main recipient
          instructorEmail, // secondary recipient
          "team@inlane.in", // Add team's email as BCC here
          uid,
          event.isCancellation,
          event.sequence || 0,
        );

        const instructorICS = generateICSFile(
          event.startTime,
          event.endTime,
          summary,
          instructorDescription,
          event.pickupLocation,
          import.meta.env.VITE_SMTP_FROM,
          instructorEmail,
          learnerEmail, // Secondary recipient
          "team@inlane.in", // Add team's email as BCC here
          uid,
          event.isCancellation,
          event.sequence || 0,
        );

        learnerICSArray.push({
          content: learnerICS,
          filename: `lesson_${event.lessonNumber}${event.isCancellation ? "_cancel" : ""}.ics`,
          lessonNumber: event.lessonNumber,
        });

        instructorICSArray.push({
          content: instructorICS,
          filename: `lesson_${event.lessonNumber}${event.isCancellation ? "_cancel" : ""}.ics`,
          lessonNumber: event.lessonNumber,
        });
      }

      // If we have cancellation events for this instructor, send them first
      if (instructorCancellations.length > 0) {
        console.log(
          `Sending ${instructorCancellations.length} cancellation events to instructor ${instructorName}`,
        );

        // Filter only cancellation events for this instructor
        const cancellationLearnerICS = learnerICSArray.filter((ics) =>
          instructorCancellations.some(
            (e) => e.lessonNumber === ics.lessonNumber,
          ),
        );

        const cancellationInstructorICS = instructorICSArray.filter((ics) =>
          instructorCancellations.some(
            (e) => e.lessonNumber === ics.lessonNumber,
          ),
        );

        try {
          const { data, error } = await supabase.functions.invoke(
            "send-schedule-emails",
            {
              body: {
                learnerEmail,
                instructorEmail,
                learnerICSArray: cancellationLearnerICS,
                instructorICSArray: cancellationInstructorICS,
                isMultiEvent: true,
                events: instructorCancellations.map((e) => ({
                  lessonNumber: e.lessonNumber,
                  startTime: e.startTime.toISOString(),
                  endTime: e.endTime.toISOString(),
                  pickupLocation: e.pickupLocation,
                  uid: e.uid || uidMap[e.lessonNumber],
                  isCancellation: true,
                  sequence: e.sequence || 0,
                })),
                instructorName,
                learnerName,
                learnerPhone, // Pass learnerPhone here
                emailType: "cancellation",
                batchInfo: " (Cancellations)",
                // Include all events for complete information

                allEvents: instructorEvents.map((e) => ({
                  lessonNumber: e.lessonNumber,
                  startTime: e.startTime.toISOString(),
                  endTime: e.endTime.toISOString(),
                  pickupLocation: e.pickupLocation,
                  isCancellation: e.isCancellation || false,
                  instructorName: e.instructorName || instructorName,
                  instructorPhone:
                    e.instructorPhone || "Contact InLane for details",
                })),
                learnerId: learnerId,
              },
            },
          );

          if (error) {
            console.error(
              `Error sending cancellation emails to instructor ${instructorName}:`,
              error,
            );
          } else {
            console.log(
              `Successfully sent cancellation emails to instructor ${instructorName}`,
            );
          }
        } catch (error) {
          console.error(
            `Exception sending cancellation emails to instructor ${instructorName}:`,
            error,
          );
        }
      }

      // Now send new events for this instructor if we have any
      if (instructorNewEvents.length > 0) {
        console.log(
          `Sending ${instructorNewEvents.length} new events to instructor ${instructorName}`,
        );

        // Filter only new events for this instructor
        const newLearnerICS = learnerICSArray.filter((ics) =>
          instructorNewEvents.some((e) => e.lessonNumber === ics.lessonNumber),
        );

        const newInstructorICS = instructorICSArray.filter((ics) =>
          instructorNewEvents.some((e) => e.lessonNumber === ics.lessonNumber),
        );

        // Send emails with multi-event calendar attachments
        // Make sure to batch them in groups of 5 max, as there are problems with gcal
        // The batches are already done on edge function, so not required here
        const batchSize = 10;

        // Split the ICS arrays into batches of 5
        const learnerICSBatches = [];
        const instructorICSBatches = [];
        const eventBatches = [];

        for (let i = 0; i < newLearnerICS.length; i += batchSize) {
          learnerICSBatches.push(newLearnerICS.slice(i, i + batchSize));
          instructorICSBatches.push(newInstructorICS.slice(i, i + batchSize));
          eventBatches.push(instructorNewEvents.slice(i, i + batchSize));
        }

        // Send each batch as a separate email
        for (let i = 0; i < learnerICSBatches.length; i++) {
          const batchNumber =
            learnerICSBatches.length > 1
              ? ` (${i + 1}/${learnerICSBatches.length})`
              : "";

          try {
            const { data, error } = await supabase.functions.invoke(
              "send-schedule-emails",
              {
                body: {
                  learnerEmail,
                  instructorEmail,
                  learnerICSArray: newLearnerICS,
                  instructorICSArray: newInstructorICS,
                  isMultiEvent: true,
                  events: eventBatches[i].map((e) => ({
                    lessonNumber: e.lessonNumber,
                    startTime: e.startTime.toISOString(),
                    endTime: e.endTime.toISOString(),
                    pickupLocation: e.pickupLocation,
                    uid: e.uid || uidMap[e.lessonNumber],
                    isCancellation: false,
                    sequence: e.sequence || 0,
                  })),
                  instructorName,
                  learnerName,
                  learnerPhone, // Pass learnerPhone here
                  emailType: "new",
                  batchInfo: batchNumber,
                  // Include all events for complete information
                  allEvents: instructorEvents.map((e) => ({
                    lessonNumber: e.lessonNumber,
                    startTime: e.startTime.toISOString(),
                    endTime: e.endTime.toISOString(),
                    pickupLocation: e.pickupLocation,
                    isCancellation: e.isCancellation || false,
                    instructorName: e.instructorName || instructorName,
                    instructorPhone:
                      e.instructorPhone || "Contact InLane for details",
                  })),
                  learnerId: learnerId,
                },
              },
            );

            if (error) {
              console.error(
                `Error sending new events batch ${i + 1} to instructor ${instructorName}:`,
                error,
              );
            } else {
              console.log(
                `Successfully sent new events batch ${i + 1} to instructor ${instructorName}`,
              );
            }
          } catch (error) {
            console.error(
              `Exception sending new events batch ${i + 1} to instructor ${instructorName}:`,
              error,
            );
          }
        }
      }
    }

    // Also send a complete schedule to the learner with all events from all instructors
    // [Code for sending complete schedule to learner would go here]

    return uidMap;
  } catch (error) {
    console.error("Error in sendMultiEventCalendarInvite:", error);
    throw error;
  }
}

// Update the generateICSFile function to include sequence number

export function generateICSFile(
  startTime: Date,
  endTime: Date,
  summary: string,
  description: string,
  location: string,
  organizerEmail: string,
  attendeeEmail1: string,
  attendeeEmail2: string,
  bccEmail: string,
  uid?: string,
  isCancellation: boolean = false,
  sequence: number = 0,
): string {
  // Format dates according to iCalendar spec (UTC format)
  const now = formatDateForICS(new Date());
  const start = formatDateForICS(startTime);
  const end = formatDateForICS(endTime);
  const eventUid = uid || uuidv4();

  // Escape special characters in text fields
  const escapedSummary = escapeICSText(summary);
  const escapedDescription = escapeICSText(description);
  const escapedLocation = escapeICSText(location);

  // Build the ICS content with proper line endings
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//InLane//Driving Lesson//EN",
      "CALSCALE:GREGORIAN",
      isCancellation ? "METHOD:CANCEL" : "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `DTSTAMP:${now}`,
      `UID:${eventUid}`,
      `ORGANIZER;CN=InLane:mailto:${organizerEmail}`,
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=CHAIR;PARTSTAT=ACCEPTED;CN=InLane:mailto:${organizerEmail}`,
      // Main attendee
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendeeEmail1}:mailto:${attendeeEmail1}`,
      // Secondary attendee
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendeeEmail2}:mailto:${attendeeEmail2}`,
      // BCC not required on attendees list
      // `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${bccEmail}:mailto:${bccEmail}`,
      `SUMMARY:${escapedSummary}`,
      `DESCRIPTION:${escapedDescription}`,
      `LOCATION:${escapedLocation}`,
      isCancellation ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
      `SEQUENCE:${sequence}`, // Use the provided sequence number
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}
// Helper function to format dates correctly for ICS
function formatDateForICS(date: Date): string {
  // Returns YYYYMMDDTHHMMSSZ  (UTC)
  return date.toISOString().replace(/[-:.]/g, "").slice(0, -4) + "Z";
}

// Helper function to escape special characters in ICS text fields
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}
