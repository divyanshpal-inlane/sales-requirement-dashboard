import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabaseClient";

export function useMaskedCall() {
  const [isCallLoading, setIsCallLoading] = useState(false);

  const initiateCall = async (fromPhone: string, toPhone: string) => {
    if (!fromPhone || !toPhone) {
      toast.error("Phone numbers not available");
      return;
    }

    setIsCallLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("masked-call", {
        body: { from: fromPhone, to: toPhone },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Connecting your call... You'll receive a call shortly.");
      } else {
        throw new Error(data?.error || "Failed to connect call");
      }
    } catch {
      toast.error(
        "Could not connect the call. Please try again or contact support.",
      );
    } finally {
      setIsCallLoading(false);
    }
  };

  return { initiateCall, isCallLoading };
}
