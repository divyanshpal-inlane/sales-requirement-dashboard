import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { supabase } from "@/lib/supabaseClient";

// The onboarding motivation string that flags car-buying intent
// (src/routes/onboard/aadhar.tsx → CAR_OPTION).
export const CAR_MOTIVATION = "Finally buy my own car";

export interface CarLead {
  id: string;
  name: string | null;
  phone: string | null;
  area: string | null;
  pickupLocation: string | null;
  drivingMotivation: string | null;
  carPurchaseTimeline: string | null; // onboarding "when will you buy"
  carIntentPlanning: string | null; // instructor "planning to buy?"
  carIntentType: string | null;
  carIntentCondition: string | null;
  carIntentTimeframe: string | null;
  carIntentUpdatedAt: string | null;
}

const isLead = (r: CarLead) =>
  r.drivingMotivation === CAR_MOTIVATION ||
  r.carIntentPlanning === "Yes" ||
  !!(r.carPurchaseTimeline && r.carPurchaseTimeline.trim() !== "");

// All learners who have shown car-buying intent — at onboarding
// (driving_motivation / car_purchase_timeline) OR via instructor feedback
// (car_intent_planning = 'Yes'). The server `.or()` narrows; a client-side
// `isLead` guard keeps the result exact (onboarding stores "" for non-buyers).
export function useCarLeads() {
  return useQuery({
    queryKey: ["car_leads"],
    queryFn: async (): Promise<CarLead[]> => {
      const { data, error } = await supabase
        .from("Learner")
        .select(
          "id, name, phone, area, pick_up_location, driving_motivation, car_purchase_timeline, car_intent_planning, car_intent_type, car_intent_condition, car_intent_timeframe, car_intent_updated_at",
        )
        .or(
          `driving_motivation.eq.${CAR_MOTIVATION},car_intent_planning.eq.Yes,car_purchase_timeline.neq.`,
        );
      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>)
        .map((r) => ({
          id: String(r.id),
          name: (r.name as string) ?? null,
          phone: (r.phone as string) ?? null,
          area: (r.area as string) ?? null,
          pickupLocation: (r.pick_up_location as string) ?? null,
          drivingMotivation: (r.driving_motivation as string) ?? null,
          carPurchaseTimeline: (r.car_purchase_timeline as string) ?? null,
          carIntentPlanning: (r.car_intent_planning as string) ?? null,
          carIntentType: (r.car_intent_type as string) ?? null,
          carIntentCondition: (r.car_intent_condition as string) ?? null,
          carIntentTimeframe: (r.car_intent_timeframe as string) ?? null,
          carIntentUpdatedAt: (r.car_intent_updated_at as string) ?? null,
        }))
        .filter(isLead);
    },
  });
}

export function carLeadsToCSV(rows: CarLead[]): string {
  const headers = [
    "Name",
    "Phone",
    "Area",
    "Pickup Location",
    "Motivation",
    "Purchase Timeline (onboarding)",
    "Planning to Buy",
    "Car Type",
    "Condition",
    "Buy Timeframe",
    "Intent Updated",
  ];
  const escape = (val: string | null | undefined) => {
    if (val == null) return "";
    const s = String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.name,
        r.phone,
        r.area,
        r.pickupLocation,
        r.drivingMotivation,
        r.carPurchaseTimeline,
        r.carIntentPlanning,
        r.carIntentType,
        r.carIntentCondition,
        r.carIntentTimeframe,
        r.carIntentUpdatedAt
          ? format(new Date(r.carIntentUpdatedAt), "yyyy-MM-dd")
          : "",
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}
