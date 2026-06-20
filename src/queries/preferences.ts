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
      // Get learners who need scheduling - only fetch needed columns
      const { data: learners, error: learnersError } = await supabase
        .from("reschedule_requests")
        .select(
          `id, learner_id, type, status, lesson_ids, amount, created_at,
          Learner(id, name, phone, email, area, pick_up_location, address_lat, address_lng,
            preferred_start_date, preferred_completion_days, prefers_two_hour_classes,
            two_hour_days, DL_test_date, pincode, signed_up, created_at)`,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (learnersError) throw learnersError;
      if (!learners) return [];

      // Filter out learners who already have schedules created
      // This prevents already-scheduled learners from appearing in the "New Schedules" tab
      // BUT: Do NOT filter out reschedule/lesson10 requests - those are for learners who already have schedules!
      if (learners.length === 0) return [];

      const learnerIds = learners
        .map((r) => r.learner_id)
        .filter((id): id is string => !!id);

      if (learnerIds.length === 0) return [];

      // Check which learners already have schedules
      const { data: existingSchedules, error: scheduleError } = await supabase
        .from("Schedule")
        .select("learner_id")
        .in("learner_id", learnerIds)
        .neq("status", "paused"); // Exclude paused schedules

      if (scheduleError) {
        console.error("Error checking existing schedules:", scheduleError);
        // If query fails, return all pending requests to be safe
        return learners;
      }

      // Get unique learner IDs that already have schedules
      const scheduledLearnerIds = new Set(
        (existingSchedules || []).map((s) => s.learner_id),
      );

      // Filter out learners who already have schedules, BUT keep reschedule and lesson10 requests
      // Reschedule requests are specifically for learners who already have schedules they want to reschedule
      const filteredLearners = learners.filter((request) => {
        const isRescheduleOrLesson10 =
          request.type === "reschedule" || request.type === "lesson10";
        
        // If it's a reschedule/lesson10 request, always include it
        if (isRescheduleOrLesson10) return true;
        
        // For new requests, exclude learners who already have schedules
        return !scheduledLearnerIds.has(request.learner_id);
      });

      return filteredLearners;
    },
    staleTime: 30 * 1000,
  });
}

// Fetches latest enrollment.progress.type per learner so the admin queue can
// sub-categorize "new" scheduling requests into course / demo / topup.
export function useEnrollmentTypesByLearner(learnerIds: string[]) {
  return useQuery({
    queryKey: ["enrollment-types-by-learner", [...learnerIds].sort()],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment")
        .select("learner_id, course_id, progress, created_at")
        .in("learner_id", learnerIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const latestByLearner = new Map<
        string,
        { type: string | null; hours: number | null }
      >();
      for (const e of data || []) {
        if (latestByLearner.has(e.learner_id)) continue;
        const progress = e.progress as
          | { type?: string; total_hours?: number }
          | null
          | undefined;
        latestByLearner.set(e.learner_id, {
          type: progress?.type ?? (e.course_id ? "course" : null),
          hours: progress?.total_hours ?? null,
        });
      }
      return latestByLearner;
    },
    staleTime: 30 * 1000,
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
