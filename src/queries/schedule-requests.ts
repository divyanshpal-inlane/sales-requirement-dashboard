import { useMutation } from "@tanstack/react-query";

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
