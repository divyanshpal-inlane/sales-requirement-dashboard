import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Schedule } from "@/types/schedule";

export const useScheduleData = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("schedules").select(`
          *,
          instructor:instructor_id (
            id_instructor,
            name,
            address_lat,
            address_lng,
            address,
            google_calendar_id,
            email
          ),
          learner:learner_id (
            id,
            name,
            address_lat,
            address_lng,
            pick_up_location
          )
        `);

      if (error) throw error;

      const formattedSchedules =
        data?.map((schedule) => ({
          ...schedule,
          instructor_name: schedule.instructor?.name,
          learner_name: schedule.learner?.name,
        })) || [];

      setSchedules(formattedSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Error",
        description: "Failed to fetch schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    schedules,
    loading,
    fetchSchedules,
  };
};
