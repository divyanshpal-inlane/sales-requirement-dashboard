import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { Database } from "@/types/database.types";
import { TimeSlot } from "@/types/schedule";

export function useSchedulePreferences(learnerId?: string) {
  return useQuery({
    queryKey: ["schedulePreferences", learnerId],
    queryFn: async () => {
      if (!learnerId) return [];

      const { data, error } = await supabase
        .from("schedule_preferences")
        .select("*")
        .eq("learner_id", learnerId);

      if (error) throw error;

      return data;
    },
    enabled: !!learnerId,
  });
}

export function useUpdatePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      learnerId,
      preferences,
    }: {
      learnerId: string;
      preferences: {
        day: number;
        timeSlot: TimeSlot;
      }[];
    }) => {
      // First delete existing preferences
      const { error: deleteError } = await supabase
        .from("schedule_preferences")
        .delete()
        .eq("learner_id", learnerId);

      if (deleteError) throw deleteError;

      // Transform preferences to match the database schema
      const dbPreferences = preferences.map((pref) => ({
        learner_id: learnerId,
        day_of_week: pref.day,
        time_slot: pref.timeSlot,
      }));

      // Then insert new preferences
      const { data, error } = await supabase
        .from("schedule_preferences")
        .insert(dbPreferences);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["schedulePreferences", variables.learnerId],
      });
    },
  });
}

export function useSchedulingRequests() {
  return useQuery({
    queryKey: ["scheduling-requests"],
    queryFn: async () => {
      // Get learners who need scheduling
      const { data: learners, error: learnersError } = await supabase
        .from("reschedule_requests")
        .select("*, Learner(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (learnersError) throw learnersError;
      if (!learners) return [];
      return learners;
    },
  });
}

export function useLearnerSchedulePreferences(learnerId: string | undefined) {
  return useQuery({
    queryKey: ["learnerSchedulePreferences", learnerId],
    queryFn: learnerId
      ? async () => {
          const { data, error } = await supabase
            .from("schedule_preferences")
            .select("*")
            .eq("learner_id", learnerId);

          if (error) throw error;
          return data;
        }
      : skipToken,
  });
}

export function useLearnerRescheduleRequests(learnerId: string | undefined) {
  return useQuery({
    queryKey: ["learnerRescheduleRequests", learnerId],
    queryFn: learnerId
      ? async () => {
          const { data, error } = await supabase
            .from("reschedule_requests")
            .select("*")
            .eq("learner_id", learnerId)
            .eq("status", "pending");

          if (error) throw error;
          return data;
        }
      : skipToken,
  });
}

export type SchedulingRequests = Exclude<
  Awaited<ReturnType<typeof useSchedulingRequests>>["data"],
  null | undefined
>;

type Preference = Database["public"]["Tables"]["schedule_preferences"]["Row"];

export function usePreferences(learnerId: string) {
  return useQuery({
    queryKey: ["preferences", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_preferences")
        .select("*")
        .eq("learner_id", learnerId);

      if (error) throw error;
      return data as Preference[];
    },
  });
}
