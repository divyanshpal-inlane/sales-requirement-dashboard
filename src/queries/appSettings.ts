import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";

export type PaymentGatewayMode = "icici" | "razorpay" | "both";

interface AppSetting {
  id: string;
  key: string;
  value: PaymentGatewayMode;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function usePaymentGatewayMode() {
  return useQuery({
    queryKey: ["appSettings", "payment_gateway_mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "payment_gateway_mode")
        .single();

      if (error) {
        console.error("Error fetching payment gateway mode:", error);
        // Default to 'both' if setting doesn't exist
        return "both" as PaymentGatewayMode;
      }

      return (data?.value as PaymentGatewayMode) || "both";
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useUpdatePaymentGatewayMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: PaymentGatewayMode) => {
      const { data, error } = await supabase
        .from("app_settings")
        .update({
          value: mode,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "payment_gateway_mode")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appSettings", "payment_gateway_mode"],
      });
    },
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["appSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("key");

      if (error) throw error;
      return data as AppSetting[];
    },
  });
}
