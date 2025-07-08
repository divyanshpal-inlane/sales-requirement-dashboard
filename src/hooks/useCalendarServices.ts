import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { CalendarEvent, Schedule } from "@/types/schedule";

export const useCalendarServices = () => {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const { toast } = useToast();

  const fetchInstructorCalendar = async (
    instructorId: string,
  ): Promise<CalendarEvent[]> => {
    try {
      const { data: instructorData, error: instructorError } = await supabase
        .from("Instructor")
        .select("google_calendar_id, email")
        .eq("id_instructor", instructorId)
        .single();

      if (instructorError || !instructorData?.google_calendar_id) {
        console.error(
          "Error fetching instructor calendar ID:",
          instructorError,
        );
        return [];
      }

      const { data, error } = await supabase.functions.invoke(
        "fetch-calendar-events",
        {
          body: {
            calendarId: instructorData.google_calendar_id,
            timeMin: new Date().toISOString(),
            timeMax: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            maxResults: 20,
          },
        },
      );

      if (error) {
        console.error("Error fetching calendar events:", error);
        return [];
      }

      return data?.events || [];
    } catch (error) {
      console.error("Error fetching instructor calendar:", error);
      return [];
    }
  };

  const handleViewCalendar = async (schedule: Schedule) => {
    setLoadingCalendar(true);
    try {
      const events = await fetchInstructorCalendar(schedule.instructor_id);
      setCalendarEvents(events);
      setIsCalendarModalOpen(true);
    } catch (error) {
      console.error("Error fetching calendar:", error);
      toast({
        title: "Error",
        description: "Failed to fetch instructor's calendar.",
        variant: "destructive",
      });
    } finally {
      setLoadingCalendar(false);
    }
  };

  return {
    calendarEvents,
    isCalendarModalOpen,
    setIsCalendarModalOpen,
    loadingCalendar,
    handleViewCalendar,
  };
};
