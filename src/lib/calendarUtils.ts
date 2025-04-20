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

// Updated function to send multiple events in separate ICS files in a single email
export async function sendMultiEventCalendarInvite(
  learnerEmail: string,
  instructorEmail: string,
  events: Array<{
    startTime: Date;
    endTime: Date;
    lessonNumber: number;
    pickupLocation: string;
    uid?: string;
    sequence?: number;
    isCancellation?: boolean;
  }>,
  instructorName: string,
  learnerName: string
): Promise<Record<number, string>> {
  try {
    // Prepare arrays to hold ICS files for each event
    const learnerICSArray = [];
    const instructorICSArray = [];
    const uidMap: Record<number, string> = {};
    
    // Generate individual ICS files for each event
    for (const event of events) {
      // Create the correct lesson-specific subject and description
      const summary = event.isCancellation 
        ? `Driving Lesson ${event.lessonNumber} (CANCELLED)` 
        : `Driving Lesson ${event.lessonNumber}`;
      
      const description = event.isCancellation
        ? `CANCELLED: Driving lesson ${event.lessonNumber} with InLane. Pickup location: ${event.pickupLocation}`
        : `Driving lesson ${event.lessonNumber} with InLane. Pickup location: ${event.pickupLocation}`;
      
      // Use existing UID or generate a new one
      const uid = event.uid || uuidv4();
      
      // Store the UID for later reference
      uidMap[event.lessonNumber] = uid;
      
      const learnerICS = generateICSFile(
        event.startTime,
        event.endTime,
        summary,
        description,
        event.pickupLocation,
        "f20220757@goa.bits-pilani.ac.in", // organizerEmail
        learnerEmail, // attendeeEmail
        uid,
        event.isCancellation
      );
      
      const instructorICS = generateICSFile(
        event.startTime,
        event.endTime,
        summary,
        description,
        event.pickupLocation,
        "f20220757@goa.bits-pilani.ac.in", // organizerEmail
        instructorEmail, // attendeeEmail
        uid,
        event.isCancellation
      );
      learnerICSArray.push({
        content: learnerICS,
        filename: `lesson_${event.lessonNumber}${event.isCancellation ? '_cancel' : '_new'}.ics`,
        lessonNumber: event.lessonNumber
      });
      
      // Similarly for instructor:
      instructorICSArray.push({
        content: instructorICS,
        filename: `lesson_${event.lessonNumber}${event.isCancellation ? '_cancel' : '_new'}.ics`,
        lessonNumber: event.lessonNumber
      });      }
      
      // Send emails with multi-event calendar attachments
      const { data, error } = await supabase.functions.invoke(
        "send-schedule-emails",
        {
          body: {
            learnerEmail,
            instructorEmail,
            learnerICSArray,
            instructorICSArray,
            isMultiEvent: true,
            separateFiles: true, // Flag to indicate multiple ICS files
            events: events.map(e => ({
              lessonNumber: e.lessonNumber,
              startTime: e.startTime.toISOString(),
              endTime: e.endTime.toISOString(),
              pickupLocation: e.pickupLocation,
              uid: uidMap[e.lessonNumber],
              isCancellation: e.isCancellation
            })),
            instructorName,
            learnerName
          },
        },
      );
      
      if (error) {
        console.error("Error sending multi-event calendar invites:", error);
        throw error;
      }
      
      return uidMap;
      } catch (error) {
        console.error("Error sending multi-event calendar invites:", error);
        throw error;
      }
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