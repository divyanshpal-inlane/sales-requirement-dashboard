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

// Modified ICS generation function
export function generateICSFile(
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
  const uid = uuidv4();

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
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DTSTAMP:${now}`,
    `UID:${uid}`,
    `ORGANIZER;CN=InLane:mailto:${organizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendeeEmail}:mailto:${attendeeEmail}`,
    `SUMMARY:${escapedSummary}`,
    `DESCRIPTION:${escapedDescription}`,
    `LOCATION:${escapedLocation}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
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

export async function sendCalendarInvite(
  learnerEmail: string,
  instructorEmail: string,
  startTime: Date,
  endTime: Date,
  lessonNumber: number,
  pickupLocation: string,
  instructorName: string,
  learnerName: string,
): Promise<void> {
  try {
    // Create the correct lesson-specific subject and description
    const summary = `Driving Lesson ${lessonNumber}`;
    const description = `Driving lesson ${lessonNumber} with InLane. Pickup location: ${pickupLocation}`;
    const correctedEndTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Generate ICS for learner with the correct lesson number
    const learnerICS = generateICSFile(
      startTime,
      correctedEndTime,
      summary,
      description,
      pickupLocation,
      "f20220757@goa.bits-pilani.ac.in",
      learnerEmail,
    );

    // Generate ICS for instructor with the correct lesson number
    const instructorICS = generateICSFile(
      startTime,
      correctedEndTime,
      summary,
      description,
      pickupLocation,
      "f20220757@goa.bits-pilani.ac.in",
      instructorEmail,
    );
    
    // downloadICSFile(instructorICS, `lesson-${lessonNumber}-instructor.ics`);

    // Send the calendar invites via your backend
    const { data, error } = await supabase.functions.invoke(
      "send-schedule-emails",
      {
        body: {
          learnerEmail,
          instructorEmail,
          learnerICS,
          instructorICS,
          lessonNumber: lessonNumber.toString(), // Explicitly convert to string to ensure correct handling
          startTime: startTime.toISOString(),
          endTime: correctedEndTime.toISOString(),
          pickupLocation,
          instructorName,
          learnerName,
        },
      },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error sending calendar invites:", error);
  }
}