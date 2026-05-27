export type UtilizationBucket =
  | "off"
  | "low"
  | "medium"
  | "high"
  | "full"
  | "overbooked";

export interface UtilizationStyle {
  bucket: UtilizationBucket;
  bg: string;
  text: string;
  border: string;
  label: string;
}

const STYLES: Record<UtilizationBucket, Omit<UtilizationStyle, "bucket">> = {
  off: {
    bg: "bg-gray-200",
    text: "text-gray-600",
    border: "border-gray-300",
    label: "Off-duty",
  },
  low: {
    bg: "bg-emerald-200",
    text: "text-emerald-900",
    border: "border-emerald-300",
    label: "< 25% booked",
  },
  medium: {
    bg: "bg-lime-200",
    text: "text-lime-900",
    border: "border-lime-300",
    label: "25–50% booked",
  },
  high: {
    bg: "bg-amber-200",
    text: "text-amber-900",
    border: "border-amber-400",
    label: "50–75% booked",
  },
  full: {
    bg: "bg-red-300",
    text: "text-red-900",
    border: "border-red-400",
    label: "75–100% booked",
  },
  overbooked: {
    bg: "bg-purple-300",
    text: "text-purple-900",
    border: "border-purple-500",
    label: "Overbooked",
  },
};

export function utilizationStyle(
  bookedHours: number,
  capacityHours: number,
  conflictCount = 0,
): UtilizationStyle {
  if (conflictCount > 0) {
    return { bucket: "overbooked", ...STYLES.overbooked };
  }
  if (capacityHours <= 0) {
    return { bucket: "off", ...STYLES.off };
  }
  const ratio = bookedHours / capacityHours;
  let bucket: UtilizationBucket;
  if (ratio >= 1) bucket = "full";
  else if (ratio >= 0.75) bucket = "full";
  else if (ratio >= 0.5) bucket = "high";
  else if (ratio >= 0.25) bucket = "medium";
  else bucket = "low";
  return { bucket, ...STYLES[bucket] };
}

export const UTILIZATION_LEGEND: UtilizationStyle[] = (
  ["low", "medium", "high", "full", "off", "overbooked"] as UtilizationBucket[]
).map((bucket) => ({ bucket, ...STYLES[bucket] }));
