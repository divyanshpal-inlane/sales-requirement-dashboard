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

/**
 * Configuration class for time slot settings and derived scheduling constants.
 * This class ensures type safety and easy import/reuse across the project.
 */
export class SlotConfig {
  // --- Core Time Slot Definitions ---

  /**
   * The number of time slots available within a single hour (e.g., 2 for half-hour slots).
   */
  public static readonly numSlotsPerHour: number = 2;

  /**
   * The starting hour of the active day (using a 24-hour clock, e.g., 5 for 5 AM).
   */
  public static readonly startHourOfDay: number = 5;

  /**
   * The ending hour of the active day (using a 24-hour clock, e.g., 23 for 11 PM).
   */
  public static readonly endHourOfDay: number = 23;

  // --- Derived Calculations ---

  /**
   * The total number of hours in the active day range (endHourOfDay - startHourOfDay).
   * (e.g., 23 - 5 = 18 hours).
   */
  public static readonly numHoursPerDay: number =
    SlotConfig.endHourOfDay - SlotConfig.startHourOfDay;

  /**
   * The total number of time slots available in the active day range.
   * Uses Math.ceil to ensure any partial final hour is counted as a full slot.
   */
  public static readonly numSlotsPerDay: number = Math.ceil(
    SlotConfig.numSlotsPerHour * SlotConfig.numHoursPerDay,
  );

  /**
   * The duration of a single time slot in minutes (60 / numSlotsPerHour).
   * (e.g., 60 / 2 = 30 minutes).
   */
  public static readonly numMinutesPerSlot: number =
    60 / SlotConfig.numSlotsPerHour;
}

export const TIME_SLOTS: TimeSlot[] = [
  "5-6",
  "6-9",
  "9-12",
  "12-15",
  "15-18",
  "18-21",
  "21-23",
];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  "5-6": "5 AM - 6 AM",
  "6-9": "6 AM - 9 AM",
  "9-12": "9 AM - 12 PM",
  "12-15": "12 PM - 3 PM",
  "15-18": "3 PM - 6 PM",
  "18-21": "6 PM - 9 PM",
  "21-23": "9 PM - 11 PM",
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
