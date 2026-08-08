// Phone-number identity helpers.
//
// Instructors/learners may have their phone stored in any of several formats
// (+91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX, with stray spaces or
// dashes), and the value in their auth JWT often differs in format from the
// value in the table. The stable identity is the last 10 digits.
//
// IMPORTANT: this mirrors the Postgres RLS helper current_instructor_ids()
// (supabase/migrations/20260620_add_leave_noshow_support.sql), which compares
//   right(regexp_replace(phone, '\D', '', 'g'), 10)
// on both the row and auth.jwt()->>'phone'. Keeping the client lookup in sync
// with that normalisation is what prevents "found in the UI but rejected by
// RLS" (and vice-versa) mismatches when writing rows.

/** Strip everything except digits. */
export function phoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** The last 10 digits — the canonical phone identity we match on. */
export function lastTenDigits(value: string | null | undefined): string {
  return phoneDigits(value).slice(-10);
}

/** True when two numbers refer to the same line (last-10-digit match). */
export function samePhone(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const x = lastTenDigits(a);
  return x.length === 10 && x === lastTenDigits(b);
}

/**
 * PostgREST `ilike` pattern that matches any stored phone ending in the same
 * last 10 digits — used to narrow the row set server-side before confirming
 * the match with samePhone(). Returns null when the input has fewer than 10
 * digits (nothing sensible to match on).
 */
export function lastTenLikePattern(
  value: string | null | undefined,
): string | null {
  const digits = lastTenDigits(value);
  return digits.length === 10 ? `%${digits}` : null;
}
