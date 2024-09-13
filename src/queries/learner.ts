import { useMutation, useQuery } from "@tanstack/react-query";

import { supabase } from "@/context/auth-context";

export function useLearner(phone: string | null | undefined) {
  return useQuery({
    queryKey: ["learner", phone],
    queryFn: async () => {
      const { data: Learner, error } = await supabase
        .from("Learner")
        .select()
        .eq("phone", phone);
      if (error) throw new Error("Supabase error");
      return Learner;
    },
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

      return data;
    },
  });
}
