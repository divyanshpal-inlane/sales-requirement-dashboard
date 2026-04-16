import { format } from "date-fns";
import { ExternalLinkIcon, IdCardIcon, Phone, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMaskedCall } from "@/hooks/useMaskedCall";
import { useLearner } from "@/queries/learner";
import { Database } from "@/types/database.types";

interface SessionDetailsProps {
  schedule: Database["public"]["Tables"]["Schedule"]["Row"];
  instructor: Database["public"]["Tables"]["Instructor"]["Row"];
  lessonNumber: number;
  lessonEndNumber?: number | null;
  lessonLabel?: string;
}

export function SessionDetails({
  schedule,
  instructor,
  lessonNumber,
  lessonEndNumber,
  lessonLabel,
}: SessionDetailsProps) {
  const { data } = useLearner();
  const { initiateCall, isCallLoading } = useMaskedCall();
  const pickupLocation = data?.pick_up_location;
  const lat = data?.address_lat;
  const lng = data?.address_lng;
  return (
    <Card className="mb-6 text-start">
      <CardHeader>
        <CardTitle>
          <div className="flex flex-row items-center justify-center gap-3">
            <IdCardIcon />
            <p className="font-medium">
              {lessonLabel ||
                `Lesson ${lessonNumber}${lessonEndNumber ? ` & ${lessonEndNumber}` : ""}`}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Lesson Number</p>
            <p className="text-sm font-medium">{lessonNumber}</p>
          </div> */}
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Date</p>
            <p className="text-sm font-medium">
              {format(new Date(schedule.date), "EEE, do MMM")}
            </p>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Time</p>
            <p className="text-sm font-medium">
              {format(new Date(`2000-01-01T${schedule.start_time}`), "h:mm aa")}{" "}
              - {format(new Date(`2000-01-01T${schedule.end_time}`), "h:mm aa")}
            </p>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Instructor Name</p>
            <p className="text-sm font-medium">{instructor.name}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-light">Call Instructor</p>
            <Button
              size="sm"
              variant="outline"
              disabled={isCallLoading}
              onClick={() =>
                initiateCall(data?.phone ?? "", instructor.phone ?? "")
              }
              className="flex w-fit items-center gap-1.5 text-sm font-medium"
            >
              {isCallLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Phone size={14} />
              )}
              {isCallLoading ? "Connecting..." : "Call Now"}
            </Button>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Car Model</p>
            <p className="text-sm font-medium">{instructor.car_make}</p>
          </div>
          <div className="flex flex-col gap-0">
            <p className="text-sm font-light">Car Number</p>
            <p className="text-sm font-medium">{instructor.car_number}</p>
          </div>

          <div className="col-span-2 flex flex-col gap-0">
            <p className="text-sm font-light">Pick Up Location</p>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 truncate text-sm underline hover:text-blue-800"
            >
              <span className="truncate">
                {pickupLocation || "View on Google Maps"}
              </span>
              <ExternalLinkIcon className="h-4 w-4 shrink-0" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
