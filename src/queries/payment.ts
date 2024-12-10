import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/database.types";

type Course = Database["public"]["Tables"]["Courses"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payment"]["Row"];
type LearnerRow = Database["public"]["Tables"]["Learner"]["Row"];

export const useLatestPayment = (learnerId?: string) => {
  return useQuery<PaymentRow | null>({
    queryKey: ["payment", learnerId],
    queryFn: async () => {
      if (!learnerId) return null;
      const { data, error } = await supabase
        .from("payment")
        .select("*")
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
  return useQuery<PaymentRow[]>({
    queryKey: ["payments", learnerId],
    queryFn: async () => {
      if (!learnerId) return [];
      const { data, error } = await supabase
        .from("payment")
        .select("*")
        .eq("learner_id", learnerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!learnerId,
  });
};

interface PaymentWithLearner extends PaymentRow {
  Learner: Pick<LearnerRow, "id" | "phone" | "email">;
}

export const usePaymentById = (paymentId?: string) => {
  return useQuery<PaymentWithLearner | null>({
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
      return data as PaymentWithLearner;
    },
    enabled: !!paymentId,
  });
};

export const useCourses = () => {
  return useQuery<Course[]>({
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
