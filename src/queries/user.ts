import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      if (!user) throw new Error("No user found");

      const { data: profile, error: profileError } = await supabase
        .from("Instructor")
        .select("*")
        .eq("id_instructor", user.id)
        .single();

      if (profileError) throw profileError;

      return {
        ...profile,
        phone: profile.phone,
      };
    },
  });
}
