/**
 * ICS Calendar File Parser
 * Parses .ics files exported from Google Calendar, Apple Calendar, Outlook, etc.
 */

export interface ParsedCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  recurrence?: string;
  status?: string;
}

interface ICSComponent {
  type: string;
  properties: Record<string, string>;
}

/**
 * Parse an ICS file content and extract calendar events
 */
export function parseICSFile(icsContent: string): ParsedCalendarEvent[] {
  const events: ParsedCalendarEvent[] = [];
  const lines = unfoldLines(icsContent);

  let currentEvent: ICSComponent | null = null;
  let inEvent = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = { type: "VEVENT", properties: {} };
    } else if (trimmedLine === "END:VEVENT" && currentEvent) {
      inEvent = false;
      const parsedEvent = convertToCalendarEvent(currentEvent);
      if (parsedEvent) {
        events.push(parsedEvent);
      }
      currentEvent = null;
    } else if (inEvent && currentEvent) {
      const { key, value } = parseProperty(trimmedLine);
      if (key && value) {
        currentEvent.properties[key] = value;
      }
    }
  }

  // Sort events by start date
  events.sort((a, b) => {
    const aDate = a.start.dateTime || a.start.date || "";
    const bDate = b.start.dateTime || b.start.date || "";
    return aDate.localeCompare(bDate);
  });

  return events;
}

/**
 * Unfold long lines that are split with CRLF + whitespace
 */
function unfoldLines(content: string): string[] {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Unfold lines (RFC 5545: lines can be split with newline + space/tab)
  const unfolded = normalized.replace(/\n[ \t]/g, "");

  return unfolded.split("\n");
}

/**
 * Parse a single ICS property line
 */
function parseProperty(line: string): { key: string; value: string } {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return { key: "", value: "" };
  }

  let key = line.substring(0, colonIndex);
  const value = line.substring(colonIndex + 1);

  // Handle properties with parameters (e.g., DTSTART;TZID=America/New_York:20230101T090000)
  const semicolonIndex = key.indexOf(";");
  if (semicolonIndex !== -1) {
    key = key.substring(0, semicolonIndex);
  }

  return { key: key.toUpperCase(), value };
}

/**
 * Convert ICS component to our calendar event format
 */
function convertToCalendarEvent(
  component: ICSComponent,
): ParsedCalendarEvent | null {
  const props = component.properties;

  // Must have at least a start date
  if (!props.DTSTART) {
    return null;
  }

  const id =
    props.UID ||
    `event-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const summary = unescapeICSText(props.SUMMARY || "(No Title)");
  const description = props.DESCRIPTION
    ? unescapeICSText(props.DESCRIPTION)
    : undefined;
  const location = props.LOCATION ? unescapeICSText(props.LOCATION) : undefined;

  const start = parseDateTime(props.DTSTART);
  const end = props.DTEND ? parseDateTime(props.DTEND) : { ...start }; // If no end, use start

  const status = props.STATUS?.toLowerCase();

  return {
    id,
    summary,
    description,
    location,
    start,
    end,
    status,
  };
}

/**
 * Parse ICS date/time format to ISO format
 * Handles: 20230101 (date), 20230101T090000 (local), 20230101T090000Z (UTC)
 */
function parseDateTime(icsDateTime: string): {
  dateTime?: string;
  date?: string;
} {
  // Remove any TZID prefix that might have been included
  const dateStr = icsDateTime.trim();

  // All-day event (YYYYMMDD format, 8 chars)
  if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return { date: `${year}-${month}-${day}` };
  }

  // Date-time format (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
  const match = dateStr.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/,
  );
  if (match) {
    const [, year, month, day, hour, minute, second, isUtc] = match;
    const isoDate = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

    if (isUtc) {
      return { dateTime: `${isoDate}Z` };
    } else {
      // Local time - treat as local timezone
      return { dateTime: isoDate };
    }
  }

  // Fallback: try to parse as-is
  return { dateTime: dateStr };
}

/**
 * Unescape ICS text values
 */
function unescapeICSText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Read and parse an ICS file from a File object
 */
export async function parseICSFromFile(
  file: File,
): Promise<ParsedCalendarEvent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const events = parseICSFile(content);
        resolve(events);
      } catch (error) {
        reject(new Error("Failed to parse calendar file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: ParsedCalendarEvent[],
  startDate: Date,
  endDate: Date,
): ParsedCalendarEvent[] {
  return events.filter((event) => {
    const eventDateStr = event.start.dateTime || event.start.date;
    if (!eventDateStr) return false;

    const eventDate = new Date(eventDateStr);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(
  events: ParsedCalendarEvent[],
  date: Date,
): ParsedCalendarEvent[] {
  const dateStr = date.toISOString().split("T")[0];

  return events.filter((event) => {
    const eventDateStr = event.start.dateTime || event.start.date;
    if (!eventDateStr) return false;

    const eventDate = eventDateStr.split("T")[0];
    return eventDate === dateStr;
  });
}
