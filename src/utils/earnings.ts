import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

/**
 * Shared earnings logic for the instructor Earnings screens and the admin
 * Instructor Earnings tooling.
 *
 * Earnings are COMPUTED, not stored: a period's earnings =
 *   (completed classes in the period × the effective per-class rate)
 *   + any manual adjustments whose effective_date falls in the period.
 *
 * Display weeks start on Monday. The payout period is Saturday–Friday (the
 * window a Monday payout covers), matching the PRD.
 */

const DISPLAY_WEEK_STARTS_ON = 1; // Monday
const PAYOUT_WEEK_STARTS_ON = 6; // Saturday → Sat..Fri window

export interface PeriodRange {
  /** inclusive yyyy-MM-dd */
  start: string;
  /** inclusive yyyy-MM-dd */
  end: string;
}

export interface EarningPeriods {
  today: PeriodRange;
  thisWeek: PeriodRange;
  lastWeek: PeriodRange;
  thisMonth: PeriodRange;
  lastMonth: PeriodRange;
  payoutPeriod: PeriodRange;
}

export type PeriodKey = keyof EarningPeriods;

export interface PeriodTotals {
  classes: number;
  earnings: number;
}

export interface AdjustmentRow {
  amount: number;
  type: string;
  effective_date: string;
}

const fmt = (d: Date): string => format(d, "yyyy-MM-dd");

const range = (start: Date, end: Date): PeriodRange => ({
  start: fmt(start),
  end: fmt(end),
});

/** All date windows the earnings screens need, derived from `now`. */
export function getEarningPeriods(now: Date = new Date()): EarningPeriods {
  const lastWeekRef = subWeeks(now, 1);
  const lastMonthRef = subMonths(now, 1);
  return {
    today: range(startOfDay(now), endOfDay(now)),
    thisWeek: range(
      startOfWeek(now, { weekStartsOn: DISPLAY_WEEK_STARTS_ON }),
      endOfWeek(now, { weekStartsOn: DISPLAY_WEEK_STARTS_ON }),
    ),
    lastWeek: range(
      startOfWeek(lastWeekRef, { weekStartsOn: DISPLAY_WEEK_STARTS_ON }),
      endOfWeek(lastWeekRef, { weekStartsOn: DISPLAY_WEEK_STARTS_ON }),
    ),
    thisMonth: range(startOfMonth(now), endOfMonth(now)),
    lastMonth: range(startOfMonth(lastMonthRef), endOfMonth(lastMonthRef)),
    payoutPeriod: range(
      startOfWeek(now, { weekStartsOn: PAYOUT_WEEK_STARTS_ON }),
      endOfWeek(now, { weekStartsOn: PAYOUT_WEEK_STARTS_ON }),
    ),
  };
}

/** Earliest date we need to fetch to cover every window above. */
export function earliestPeriodStart(periods: EarningPeriods): string {
  return [
    periods.lastMonth.start,
    periods.lastWeek.start,
    periods.payoutPeriod.start,
    periods.thisMonth.start,
  ].sort()[0];
}

const inRange = (dateStr: string, r: PeriodRange): boolean =>
  dateStr >= r.start && dateStr <= r.end;

/** Count yyyy-MM-dd date strings that fall inside a range (inclusive). */
export function countInRange(dates: string[], r: PeriodRange): number {
  return dates.reduce((n, d) => (d && inRange(d, r) ? n + 1 : n), 0);
}

/** Sum adjustment amounts inside a range, optionally filtered by type. */
export function sumAdjustments(
  adjustments: AdjustmentRow[],
  r: PeriodRange,
  types?: string[],
): number {
  return adjustments.reduce((sum, a) => {
    if (!inRange(a.effective_date, r)) return sum;
    if (types && !types.includes(a.type)) return sum;
    return sum + Number(a.amount || 0);
  }, 0);
}

/** Earnings for a period = classes × rate + adjustments in the period. */
export function computeTotals(
  completedDates: string[],
  adjustments: AdjustmentRow[],
  r: PeriodRange,
  rate: number,
): PeriodTotals {
  const classes = countInRange(completedDates, r);
  const earnings = classes * rate + sumAdjustments(adjustments, r);
  return { classes, earnings };
}

export function effectiveRate(
  settingsRate: number | null | undefined,
  defaultRate: number,
): number {
  return settingsRate != null ? Number(settingsRate) : Number(defaultRate);
}

export function effectiveTarget(
  settingsTarget: number | null | undefined,
  defaultTarget: number,
): number {
  return settingsTarget != null
    ? Number(settingsTarget)
    : Number(defaultTarget);
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Next calendar date (yyyy-MM-dd) that lands on `payoutDay` (e.g. "Monday"). */
export function nextPayoutDate(
  payoutDay: string,
  now: Date = new Date(),
): string {
  const target = WEEKDAY_INDEX[(payoutDay || "monday").toLowerCase()] ?? 1;
  let cursor = addDays(startOfDay(now), 1); // strictly after today
  for (let i = 0; i < 7; i++) {
    if (cursor.getDay() === target) break;
    cursor = addDays(cursor, 1);
  }
  return fmt(cursor);
}

/** Format a rupee amount, e.g. 8450 → "₹8,450". */
export function formatINR(amount: number): string {
  return `₹${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;
}
