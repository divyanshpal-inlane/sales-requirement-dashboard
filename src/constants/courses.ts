const COURSES = ["BEGINNER"] as const;

export const COURSES_DATA: Record<
  (typeof COURSES)[number],
  { id: string; hours: number; label: string }
> = {
  BEGINNER: {
    id: "e129f667-0510-4f07-9847-edb58356dc74",
    label: "Beginner course",
    hours: 10,
  },
};

export const AREAS = [
  "Indiranagar",
  "Koramangala",
  "HSR Layout",
  "BTM Layout",
] as const;
