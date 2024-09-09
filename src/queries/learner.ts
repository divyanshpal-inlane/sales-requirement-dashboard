import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/context/auth-context";

export function useLearner(phone: string | null | undefined) {
  return useQuery({
    queryKey: ["learner", phone],
    queryFn: async () => {
      const { data: Learner, error } = await supabase
        .from("Learner")
        .select("*");

      console.log(Learner, error, "Learner data");
      if (error) throw new Error("Supabase error");
      return Learner;
    },
    enabled: !!phone,
  });
}
