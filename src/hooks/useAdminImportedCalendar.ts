import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";
import {
  filterEventsByDateRange,
  ParsedCalendarEvent,
} from "@/utils/icsParser";

interface UseAdminImportedCalendarOptions {
  instructorId: string | undefined;
}

interface UseAdminImportedCalendarReturn {
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
 * Hook to manage imported calendar events for instructors (Admin version)
 * Uses instructor ID instead of phone for admin panel usage
 * Stores and retrieves events from the Instructor table
 */
export function useAdminImportedCalendar({
  instructorId,
}: UseAdminImportedCalendarOptions): UseAdminImportedCalendarReturn {
  const [calendarEvents, setCalendarEvents] = useState<ParsedCalendarEvent[]>(
    [],
  );
  const [hasImportedCalendar, setHasImportedCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load events from database on mount
  const loadEvents = useCallback(async () => {
    if (!instructorId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("Instructor")
        .select("*")
        .eq("id_instructor", instructorId)
        .single();

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
  }, [instructorId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Import new events (replaces existing)
  const importEvents = useCallback(
    async (events: ParsedCalendarEvent[]) => {
      if (!instructorId) {
        setError("No instructor ID found");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from("Instructor")
          .update({
            imported_calendar_events: events,
            imported_calendar_updated_at: new Date().toISOString(),
          } as any)
          .eq("id_instructor", instructorId);

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
    [instructorId],
  );

  // Clear all imported events
  const clearEvents = useCallback(async () => {
    if (!instructorId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("Instructor")
        .update({
          imported_calendar_events: [],
          imported_calendar_updated_at: null,
        } as any)
        .eq("id_instructor", instructorId);

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
  }, [instructorId]);

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

export default useAdminImportedCalendar;
