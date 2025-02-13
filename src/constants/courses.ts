import { FLYOVER_LESSON_CONTENT } from "@/constants/content/flyover";
import { PARKING_LESSON_CONTENT } from "@/constants/content/parking";
import { PARKING_FLYOVER_LESSON_CONTENT } from "@/constants/content/parking-flyover";
import { SLOPES_LESSON_CONTENT } from "@/constants/content/slopes";
import { SLOPES_PARKING_LESSON_CONTENT } from "@/constants/content/slopes-parking";
import { TRAFFIC_LESSON_CONTENT } from "@/constants/content/traffic";
import { TRAFFIC_FLYOVER_LESSON_CONTENT } from "@/constants/content/traffic-flyover";
import { TRAFFIC_PARKING_LESSON_CONTENT } from "@/constants/content/traffic-parking";
import { TRAFFIC_PARKING_FLYOVER_LESSON_CONTENT } from "@/constants/content/traffic-parking-flyover";
import { LESSON_CONTENT, LessonContent } from "@/constants/Lesson";

const COURSES = [
  "e129f667-0510-4f07-9847-edb58356dc74",
  "f60e5fdb-787a-4b40-844d-4e66416a6c8f",
  "05a5f57f-c3e2-48ac-b29f-4299e30442eb",
  "0ce6680f-6e12-49d7-8cf9-4388e81d2e27",
  "abddddb8-3f54-41ea-a64b-5ba55988b12a",
  "cc5fb06a-419f-4766-a79b-221c81bf9826",
  "14552c29-e7e5-4e76-a350-1ae7d8ffc7f3",
  "b991363c-6791-411e-9cb8-6723e40d0a0a",
  "ddbbfbbf-2222-4742-947b-ccd4e25e7936",
  "7ff8818e-5b52-4030-bc2d-f54071e8ed7f",
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
  "05a5f57f-c3e2-48ac-b29f-4299e30442eb": {
    id: "05a5f57f-c3e2-48ac-b29f-4299e30442eb",
    key: "MANUAL_PARKING_FLYOVER_COURSE",
    label: "Parking + flyover",
    hours: 4,
    lessonsData: PARKING_FLYOVER_LESSON_CONTENT,
  },
  "0ce6680f-6e12-49d7-8cf9-4388e81d2e27": {
    id: "0ce6680f-6e12-49d7-8cf9-4388e81d2e27",
    key: "MANUAL_PARKING_COURSE",
    label: "Parking",
    hours: 2,
    lessonsData: PARKING_LESSON_CONTENT,
  },
  "abddddb8-3f54-41ea-a64b-5ba55988b12a": {
    id: "abddddb8-3f54-41ea-a64b-5ba55988b12a",
    key: "MANUAL_SLOPES_PARKING_COURSE",
    label: "Slopes + Parking",
    hours: 4,
    lessonsData: SLOPES_PARKING_LESSON_CONTENT,
  },
  "cc5fb06a-419f-4766-a79b-221c81bf9826": {
    id: "cc5fb06a-419f-4766-a79b-221c81bf9826",
    key: "MANUAL_SLOPES_COURSE",
    label: "Slopes",
    hours: 2,
    lessonsData: SLOPES_LESSON_CONTENT,
  },
  "14552c29-e7e5-4e76-a350-1ae7d8ffc7f3": {
    id: "14552c29-e7e5-4e76-a350-1ae7d8ffc7f3",
    key: "TRAFFIC_FLYOVER_COURSE",
    label: "Traffic + Flyover",
    hours: 6,
    lessonsData: TRAFFIC_FLYOVER_LESSON_CONTENT,
  },
  "b991363c-6791-411e-9cb8-6723e40d0a0a": {
    id: "b991363c-6791-411e-9cb8-6723e40d0a0a",
    key: "TRAFFIC_PARKING_FLYOVER_COURSE",
    label: "Traffic + Parking + Flyover",
    hours: 8,
    lessonsData: TRAFFIC_PARKING_FLYOVER_LESSON_CONTENT,
  },
  "ddbbfbbf-2222-4742-947b-ccd4e25e7936": {
    id: "ddbbfbbf-2222-4742-947b-ccd4e25e7936",
    key: "TRAFFIC_PARKING_COURSE",
    label: "Traffic + Parking",
    hours: 6,
    lessonsData: TRAFFIC_PARKING_LESSON_CONTENT,
  },
  "7ff8818e-5b52-4030-bc2d-f54071e8ed7f": {
    id: "7ff8818e-5b52-4030-bc2d-f54071e8ed7f",
    key: "TRAFFIC_COURSE",
    label: "Traffic",
    hours: 4,
    lessonsData: TRAFFIC_LESSON_CONTENT,
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
