import { FLYOVER_LESSON_CONTENT } from "@/constants/content/flyover";
import { LESSON_CONTENT, LessonContent } from "@/constants/Lesson";

const COURSES = [
  "e129f667-0510-4f07-9847-edb58356dc74",
  "f60e5fdb-787a-4b40-844d-4e66416a6c8f",
] as const;

export const COURSES_DATA: Record<
  string,
  {
    id: string;
    key: string;
    label: string;
    hours: number;
    lessonsData: LessonContent;
  }
> = {
  "e129f667-0510-4f07-9847-edb58356dc74": {
    id: "e129f667-0510-4f07-9847-edb58356dc74",
    key: "BEGINNER",
    label: "Beginner course",
    hours: 10,
    lessonsData: LESSON_CONTENT,
  },
  "f60e5fdb-787a-4b40-844d-4e66416a6c8f": {
    id: "f60e5fdb-787a-4b40-844d-4e66416a6c8f",
    key: "MANUAL_FLYOVER_COURSE",
    label: "Tower Control",
    hours: 2,
    lessonsData: FLYOVER_LESSON_CONTENT,
  },
};

export const AREAS = [
  "Indiranagar",
  "HSR Layout",
  "Electronic City",
  "Marathalli",
  "JP Nagar",
  "Whitefield",
  "Bommanahalli",
  "KR Puram",
  "Mahadevpura",
  "Hoodi",
  "Ramamurthy Nagar",
  "TC Palya",
] as const;
