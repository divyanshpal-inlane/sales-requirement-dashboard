// Three-way instructor status (PRD: Instructor Management Filters).
// "on_break" is informational — the instructor stays bookable; only
// "inactive" removes them from scheduling pickers via the `enabled` flag,
// which the admin UI keeps in sync with this status.
export type InstructorStatus = "active" | "on_break" | "inactive";

export const INSTRUCTOR_STATUSES: {
  value: InstructorStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}[] = [
  {
    value: "active",
    label: "Active",
    badgeClass: "bg-green-100 text-green-700",
    dotClass: "bg-green-500",
  },
  {
    value: "on_break",
    label: "On Break",
    badgeClass: "bg-yellow-100 text-yellow-700",
    dotClass: "bg-yellow-400",
  },
  {
    value: "inactive",
    label: "Inactive",
    badgeClass: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
  },
];

export const instructorStatusMeta = (status: InstructorStatus) =>
  INSTRUCTOR_STATUSES.find((s) => s.value === status) ?? INSTRUCTOR_STATUSES[0];

// Resolve a status from an Instructor record, tolerating rows created before
// the status column existed (fall back to the enabled boolean).
export const resolveInstructorStatus = (record: {
  status?: string | null;
  enabled?: boolean | null;
}): InstructorStatus => {
  if (
    record.status === "active" ||
    record.status === "on_break" ||
    record.status === "inactive"
  ) {
    return record.status;
  }
  return record.enabled === false ? "inactive" : "active";
};

// Only "inactive" is removed from the booking pool.
export const instructorStatusToEnabled = (status: InstructorStatus) =>
  status !== "inactive";
