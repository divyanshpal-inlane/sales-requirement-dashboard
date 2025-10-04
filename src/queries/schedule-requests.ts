import { useMutation, useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";

export function useMutationCreateRescheduleRequest() {
  return useMutation({
    mutationFn: async ({
      lessonIds,
      learnerId,
    }: {
      lessonIds: string[];
      learnerId: string;
    }) => {
      const { data: rescheduleRequest, error: rescheduleRequestError } =
        await supabase
          .from("reschedule_requests")
          .insert({
            learner_id: learnerId,
            lesson_ids: lessonIds,
            amount: 0,
            status: "pending",
            type: "new",
          })
          .select()
          .single();

      if (rescheduleRequestError) throw rescheduleRequestError;

      return rescheduleRequest;
    },
  });
}

export function useRescheduleLearnerLessonRequests(learnerId: string) {
  return useQuery({
    queryKey: ["reschedule_requests", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reschedule_requests")
        .select("id, status, lesson_ids") // lesson_ids is an array
        .eq("learner_id", learnerId)
        .eq("type", "reschedule")
        .eq("status", "pending");
        
      if (error) throw error;
      return data;
    },
    enabled: !!learnerId, // prevent from running until learnerId gets defined
  });
}
