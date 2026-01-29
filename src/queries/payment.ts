import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";

export const useLatestPayment = (learnerId?: string) => {
  return useQuery({
    queryKey: ["payment", learnerId],
    queryFn: async () => {
      if (!learnerId) return null;
      const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("payment_type", "course")
        .eq("learner_id", learnerId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !data) throw error;
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!learnerId,
    staleTime: Infinity,
  });
};

export const usePaymentsByLearner = (learnerId?: string) => {
  return useQuery({
    queryKey: ["payments", learnerId],
    queryFn: async () => {
      if (!learnerId) return [];
      const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("learner_id", learnerId)
        .order("created_at", { ascending: false });

      if (error || !data) throw error;
      return data.length > 0 ? data : null;
    },
    enabled: !!learnerId,
    staleTime: 0, // Always refetch to get latest payment status
  });
};

export const usePaymentById = (paymentId?: string) => {
  return useQuery({
    queryKey: ["payment", paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      const { data, error } = await supabase
        .from("payment")
        .select(
          `
          *,
          Learner (
            id,
            phone,
            email
          )
          `,
        )
        .eq("id", paymentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!paymentId,
  });
};

export const useCourses = () => {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Courses")
        .select("*")
        .eq("enabled", true)
        .order("code", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};
