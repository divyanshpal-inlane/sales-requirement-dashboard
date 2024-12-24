import { Database } from "@/types/database.types";

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TimeSlot = Database["public"]["Enums"]["time_slot"];

export interface SchedulePreference {
  id: string;
  learner_id: string;
  day_of_week: number;
  time_slot: TimeSlot;
  created_at: string;
  updated_at: string;
}

export const TIME_SLOTS: TimeSlot[] = [
  "6-9",
  "9-12",
  "12-15",
  "15-18",
  "18-21",
];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  "6-9": "6 AM - 9 AM",
  "9-12": "9 AM - 12 PM",
  "12-15": "12 PM - 3 PM",
  "15-18": "3 PM - 6 PM",
  "18-21": "6 PM - 9 PM",
};

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type Learner = Database["public"]["Tables"]["Learner"]["Row"];

export interface LearnerWithPreferences extends Learner {
  schedule_preferences: SchedulePreference[];
}
