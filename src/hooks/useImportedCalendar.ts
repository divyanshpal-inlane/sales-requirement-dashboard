import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";
import {
  filterEventsByDateRange,
  ParsedCalendarEvent,
} from "@/utils/icsParser";

interface UseImportedCalendarOptions {
  instructorPhone: string | null | undefined;
}

interface UseImportedCalendarReturn {
  calendarEvents: ParsedCalendarEvent[];
  hasImportedCalendar: boolean;
  importedEventsCount: number;
  isLoading: boolean;
  error: string | null;
  importEvents: (events: ParsedCalendarEvent[]) => Promise<void>;
  clearEvents: () => Promise<void>;
  getEventsForRange: (start: Date, end: Date) => ParsedCalendarEvent[];
  refreshEvents: () => Promise<void>;
}

/**
 * Hook to manage imported calendar events for instructors
 * Stores and retrieves events from the Instructor table
 */
export function useImportedCalendar({
  instructorPhone,
}: UseImportedCalendarOptions): UseImportedCalendarReturn {
  const [calendarEvents, setCalendarEvents] = useState<ParsedCalendarEvent[]>(
    [],
  );
  const [hasImportedCalendar, setHasImportedCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load events from database on mount
  const loadEvents = useCallback(async () => {
    if (!instructorPhone) return;

    setIsLoading(true);
    setError(null);

    try {
      // Normalize phone - try multiple formats to match Instructor table
      const digits = instructorPhone.replace(/\D/g, "");
      const phoneVariants = [
        instructorPhone,
        digits,
        digits.replace(/^91/, ""),
        `+91${digits.replace(/^91/, "")}`,
      ];

      // Use type assertion since column may not be in TypeScript types yet
      const { data: results, error: fetchError } = await supabase
        .from("Instructor")
        .select("*")
        .in("phone", phoneVariants);

      const data = results?.[0] ?? null;

      if (fetchError) {
        console.error("Error loading calendar events:", fetchError);
        setError("Failed to load calendar events");
        return;
      }

      // Access the column dynamically to handle TypeScript not knowing about it yet
      const events = (data as any)?.imported_calendar_events || [];
      setCalendarEvents(events);
      setHasImportedCalendar(events.length > 0);
    } catch (err) {
      console.error("Error loading calendar events:", err);
      setError("Failed to load calendar events");
    } finally {
      setIsLoading(false);
    }
  }, [instructorPhone]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Import new events (replaces existing)
  const importEvents = useCallback(
    async (events: ParsedCalendarEvent[]) => {
      if (!instructorPhone) {
        setError("No instructor phone found");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Normalize phone - try multiple formats to match Instructor table
        const digits = instructorPhone.replace(/\D/g, "");
        const phoneVariants = [
          instructorPhone,
          digits,
          digits.replace(/^91/, ""),
          `+91${digits.replace(/^91/, "")}`,
        ];

        // Use type assertion since column may not be in TypeScript types yet
        const { error: updateError } = await supabase
          .from("Instructor")
          .update({
            imported_calendar_events: events,
            imported_calendar_updated_at: new Date().toISOString(),
          } as any)
          .in("phone", phoneVariants);

        if (updateError) {
          console.error("Error saving calendar events:", updateError);
          setError("Failed to save calendar events");
          return;
        }

        setCalendarEvents(events);
        setHasImportedCalendar(events.length > 0);
      } catch (err) {
        console.error("Error saving calendar events:", err);
        setError("Failed to save calendar events");
      } finally {
        setIsLoading(false);
      }
    },
    [instructorPhone],
  );

  // Clear all imported events
  const clearEvents = useCallback(async () => {
    if (!instructorPhone) return;

    setIsLoading(true);
    setError(null);

    try {
      // Normalize phone - try multiple formats to match Instructor table
      const digits = instructorPhone.replace(/\D/g, "");
      const phoneVariants = [
        instructorPhone,
        digits,
        digits.replace(/^91/, ""),
        `+91${digits.replace(/^91/, "")}`,
      ];

      // Use type assertion since column may not be in TypeScript types yet
      const { error: updateError } = await supabase
        .from("Instructor")
        .update({
          imported_calendar_events: [],
          imported_calendar_updated_at: null,
        } as any)
        .in("phone", phoneVariants);

      if (updateError) {
        console.error("Error clearing calendar events:", updateError);
        setError("Failed to clear calendar events");
        return;
      }

      setCalendarEvents([]);
      setHasImportedCalendar(false);
    } catch (err) {
      console.error("Error clearing calendar events:", err);
      setError("Failed to clear calendar events");
    } finally {
      setIsLoading(false);
    }
  }, [instructorPhone]);

  // Get events filtered by date range
  const getEventsForRange = useCallback(
    (start: Date, end: Date): ParsedCalendarEvent[] => {
      return filterEventsByDateRange(calendarEvents, start, end);
    },
    [calendarEvents],
  );

  // Refresh events from database
  const refreshEvents = useCallback(async () => {
    await loadEvents();
  }, [loadEvents]);

  return {
    calendarEvents,
    hasImportedCalendar,
    importedEventsCount: calendarEvents.length,
    isLoading,
    error,
    importEvents,
    clearEvents,
    getEventsForRange,
    refreshEvents,
  };
}

export default useImportedCalendar;
