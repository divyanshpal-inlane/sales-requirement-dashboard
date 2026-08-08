/**
 * Go-Auth Pilot Users
 *
 * Phone numbers (last 10 digits, no country code) whose authentication
 * is handled by the Go backend service instead of Supabase directly.
 *
 * Add more 10-digit phone numbers to this list as you onboard additional
 * internal / pilot users to the Go service.
 *
 * The `go_auth_enabled` feature flag must ALSO be true for these users
 * to be routed to the Go service; this list acts as an additional
 * per-user gate on top of the global flag.
 */
export const GO_AUTH_USERS: ReadonlySet<string> = new Set([
  "7006342430",
]);

/**
 * Returns true if the given phone number (any format) should use the
 * Go backend for authentication.
 *
 * Normalises the input to the last 10 digits before checking the list,
 * so callers don't need to pre-process the phone.
 */
export function isGoAuthUser(phone: string): boolean {
  const last10 = phone.replace(/\D/g, "").slice(-10);
  return GO_AUTH_USERS.has(last10);
}
