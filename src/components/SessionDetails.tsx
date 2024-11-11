import { format } from "date-fns";
import { IdCardIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/types/database.types";

interface SessionDetailsProps {
  schedule: Database["public"]["Tables"]["Schedule"]["Row"];
  instructor: Database["public"]["Tables"]["Instructor"]["Row"];
  lessonNumber: number;
}

export function SessionDetails({
  schedule,
  instructor,
  lessonNumber,
}: SessionDetailsProps) {
  return (
    <Card className="mb-6 text-start">
      <CardHeader>
        <CardTitle>
          <div className="flex flex-row items-center justify-center gap-3">
            <IdCardIcon />
            <p>Lesson Details</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Lesson Number</p>
            <p className="text-sm">{lessonNumber}</p>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Date, Time</p>
            <p className="text-sm">
              {format(new Date(schedule.date), "EEE, do MMM")}
              {", "}
              {format(
                new Date(`2000-01-01T${schedule.start_time}`),
                "h:mm aa",
              )}{" "}
              - {format(new Date(`2000-01-01T${schedule.end_time}`), "h:mm aa")}
            </p>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Instructor Name</p>
            <p className="text-sm">{instructor.name}</p>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Car Model</p>
            <p className="text-sm">{instructor.car_make}</p>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Car Number</p>
            <p className="text-sm">{instructor.car_number}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
