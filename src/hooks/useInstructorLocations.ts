import { useQuery } from "@tanstack/react-query";
import { subHours } from "date-fns";

import { supabase } from "@/lib/supabaseClient";

interface LocationData {
  lat: number;
  lng: number;
}

async function fetchInstructorDynamicLocation(
  instructorId: string,
  slotTime: Date,
): Promise<LocationData | null> {
  const nHours = 12;
  const nHourBefore = subHours(slotTime, nHours);

  const { data: previousBooking } = await supabase
    .from("Schedule")
    .select("learner_location")
    .eq("instructor_id", instructorId)
    .gte("start_time", nHourBefore.toISOString())
    .lt("start_time", slotTime.toISOString())
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  return previousBooking?.learner_location || null;
}

export function useInstructorLocation(
  instructorId: string,
  slotTime: Date | null,
) {
  return useQuery({
    queryKey: ["instructor-location", instructorId, slotTime?.toISOString()],
    queryFn: () => fetchInstructorDynamicLocation(instructorId, slotTime!),
    enabled: !!instructorId && !!slotTime,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Export the function for batch usage
export { fetchInstructorDynamicLocation };
