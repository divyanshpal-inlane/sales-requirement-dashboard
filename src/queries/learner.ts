import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { SelectedSlot } from "@/components/lesson/schedule";
import { supabase, useAuth } from "@/context/auth-context";
import { Database } from "@/types/database.types";

export function useLearner(phone: string | null | undefined) {
  return useQuery({
    queryKey: ["learner", phone],
    queryFn: async () => {
      if (!phone) throw new Error("phone is required");
      const { data: Learner, error } = await supabase
        .from("Learner")
        .select()
        .eq("phone", phone);

      console.log(Learner, error, "Learner data");
      if (error) throw new Error("Supabase error");
      return Learner;
    },
    // staleTime: Infinity,
    enabled: !!phone,
  });
}

export function useSetLLTestDate() {
  return useMutation({
    mutationFn: async ({
      phone,
      testDate,
    }: {
      phone: string | null | undefined;
      testDate: Date | null | undefined;
    }) => {
      const { data, error } = await supabase
        .from("Learner")
        .update({ LL_test_date: testDate })
        .eq("phone", phone);
      if (error) throw new Error("Supabase error");
      return data;
    },
  });
}

export function useSetLLResult() {
  return useMutation({
    mutationFn: async ({
      phone,
      LL_result,
    }: {
      phone: string | null | undefined;
      LL_result: boolean | null | undefined;
    }) => {
      console.log("Phone:", phone);
      console.log("LL_result:", LL_result);

      const { data, error } = await supabase
        .from("Learner")
        .update({ LL_result: LL_result })
        .eq("phone", phone)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error("Supabase error");
      }
    },
  });
}

type PartialLearner = Omit<
  Partial<Database["public"]["Tables"]["Learner"]["Row"]>,
  "phone"
>;

export function useLearnerUpdate() {
  const queryClient = useQueryClient();
  const mutate = useMutation({
    mutationFn: async ({
      data,
      phone,
    }: {
      data: PartialLearner;
      phone: string;
    }) => {
      const { error } = await supabase
        .from("Learner")
        .update(data)
        .eq("phone", phone);
      if (error) throw new Error(error.message);
      return null;
    },
    onSuccess: (_, { phone }) => {
      queryClient.invalidateQueries({
        queryKey: ["learner", phone],
      });
    },
  });
  return mutate;
}

export function useSchedule() {
  return useQuery({
    queryKey: ["schedule", "2024-09-11"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Schedule")
        .select("*")
        .gte("date", "2024-09-11")
        .lte("date", "2024-09-20");
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useUploadLLMutation() {
  return useMutation({
    mutationFn: async ({ file, phone }: { file: File; phone: string }) => {
      const { data, error } = await supabase.storage
        .from("LL")
        .upload(`${phone}/${file.name}`, file, {
          cacheControl: "3600",
          upsert: true,
        });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useSlotMutation() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ newSlots }: { newSlots: SelectedSlot[] }) => {
      const { data, error } = await supabase.from("Schedule").upsert(
        newSlots.map((slot) =>
          slot.slots
            .map((timeSlot) => ({
              learner_id: "30fde0da-377d-47da-9b09-e608db215349",
              start_time: timeSlot.start,
              date: format(slot.date, "yyyy-MM-dd"),
            }))
            .flatMap()
        ),
      );
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
