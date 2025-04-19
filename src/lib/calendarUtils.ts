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

export function generateICSFile(
  startTime: Date,
  endTime: Date,
  summary: string,
  description: string,
  location: string,
  organizerEmail: string,
  attendeeEmail: string,
  uid?: string,
  isCancellation: boolean = false
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
  return [
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
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendeeEmail}:mailto:${attendeeEmail}`,
    `SUMMARY:${escapedSummary}`,
    `DESCRIPTION:${escapedDescription}`,
    `LOCATION:${escapedLocation}`,
    isCancellation ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    isCancellation ? "SEQUENCE:1" : "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n") + "\r\n";
}



// New function to generate cancellation ICS
export function generateCancellationICS(
  uid: string,
  startTime: Date,
  endTime: Date,
  summary: string,
  description: string,
  location: string,
  organizerEmail: string,
  attendeeEmail: string,
): string {
  // Format dates according to iCalendar spec (UTC format)
  const now = formatDateForICS(new Date());
  const start = formatDateForICS(startTime);
  const end = formatDateForICS(endTime);

  // Escape special characters in text fields
  const escapedSummary = escapeICSText(summary);
  const escapedDescription = escapeICSText(description);
  const escapedLocation = escapeICSText(location);

  // Build the ICS content with proper line endings and METHOD:CANCEL
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InLane//Driving Lesson//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:CANCEL",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DTSTAMP:${now}`,
    `UID:${uid}`,
    `ORGANIZER;CN=InLane:mailto:${organizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendeeEmail}:mailto:${attendeeEmail}`,
    `SUMMARY:${escapedSummary}`,
    `DESCRIPTION:${escapedDescription} (CANCELLED)`,
    `LOCATION:${escapedLocation}`,
    "STATUS:CANCELLED",
    "SEQUENCE:1",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n") + "\r\n";
}

// Helper function to format dates correctly for ICS
function formatDateForICS(date: Date): string {
  return date.toISOString().replace(/[-:.]/g, "").slice(0, -4) + "Z";
}

// Helper function to escape special characters in ICS text fields
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Updated function to send calendar invites with UID handling
export async function sendCalendarInvite(
  learnerEmail: string,
  instructorEmail: string,
  startTime: Date,
  endTime: Date,
  lessonNumber: number,
  pickupLocation: string,
  instructorName: string,
  learnerName: string,
  existingUid?: string,
  isCancellation?: boolean
): Promise<string> {
  try {
    // Create the correct lesson-specific subject and description
    const summary = isCancellation 
      ? `Driving Lesson ${lessonNumber} (CANCELLED)` 
      : `Driving Lesson ${lessonNumber}`;
    
    const description = isCancellation
      ? `CANCELLED: Driving lesson ${lessonNumber} with InLane. Pickup location: ${pickupLocation}`
      : `Driving lesson ${lessonNumber} with InLane. Pickup location: ${pickupLocation}`;
    
    const correctedEndTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    
    // Use existing UID or generate a new one
    const uid = existingUid || uuidv4();

    // Generate ICS files
    const learnerICS = generateICSFile(
      startTime,
      correctedEndTime,
      summary,
      description,
      pickupLocation,
      "f20220757@goa.bits-pilani.ac.in",
      learnerEmail,
      uid,
      isCancellation
    );

    const instructorICS = generateICSFile(
      startTime,
      correctedEndTime,
      summary,
      description,
      pickupLocation,
      "f20220757@goa.bits-pilani.ac.in",
      instructorEmail,
      uid,
      isCancellation
    );

    // Send the calendar invites via your backend
    const { data, error } = await supabase.functions.invoke(
      "send-schedule-emails",
      {
        body: {
          learnerEmail,
          instructorEmail,
          learnerICS,
          instructorICS,
          lessonNumber: lessonNumber.toString(),
          startTime: startTime.toISOString(),
          endTime: correctedEndTime.toISOString(),
          pickupLocation,
          instructorName,
          learnerName,
          isCancellation: !!isCancellation,
          uid: uid
        },
      },
    );

    if (error) {
      throw error;
    }
    
    // Return the UID so it can be stored
    return uid;
  } catch (error) {
    console.error("Error sending calendar invites:", error);
    // Return the existing UID or a new one even if there's an error
    return existingUid || uuidv4();
  }
}

// Updated function to send cancellation emails
export async function sendCalendarCancellation(
  learnerEmail: string,
  instructorEmail: string,
  startTime: Date,
  endTime: Date,
  lessonNumber: number,
  pickupLocation: string,
  instructorName: string,
  learnerName: string,
  uid: string
): Promise<void> {
  if (!uid) {
    console.error("Cannot send cancellation without a valid UID");
    return;
  }

  try {
    // Create the correct lesson-specific subject and description
    const summary = `Driving Lesson ${lessonNumber} (CANCELLED)`;
    const description = `CANCELLED: Driving lesson ${lessonNumber} with InLane. Pickup location: ${pickupLocation}`;
    
    // Generate cancellation ICS for learner
    const learnerICS = generateICSFile(
      startTime,
      endTime,
      summary,
      description,
      pickupLocation,
      "f20220757@goa.bits-pilani.ac.in",
      learnerEmail,
      uid,
      true // Set isCancellation to true
    );

    // Generate cancellation ICS for instructor
    const instructorICS = generateICSFile(
      startTime,
      endTime,
      summary,
      description,
      pickupLocation,
      "f20220757@goa.bits-pilani.ac.in",
      instructorEmail,
      uid,
      true // Set isCancellation to true
    );

    // Send the cancellation emails via your backend
    const { data, error } = await supabase.functions.invoke(
      "send-schedule-emails",
      {
        body: {
          learnerEmail,
          instructorEmail,
          learnerICS,
          instructorICS,
          lessonNumber: lessonNumber.toString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          pickupLocation,
          instructorName,
          learnerName,
          isCancellation: true, // Flag to indicate this is a cancellation
          uid: uid
        },
      },
    );

    if (error) {
      console.error("Error sending cancellation emails:", error);
      throw error;
    }

    console.log("Cancellation emails sent successfully");
  } catch (error) {
    console.error("Error sending cancellation emails:", error);
    throw error;
  }
}


