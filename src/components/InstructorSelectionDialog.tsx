import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/utils/supabase";
import { format } from "date-fns";
import MapWithRoute from "./mapWithRoute";

interface Instructor {
  id_instructor: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface InstructorSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSlotTime: Date;
  learnerLocation: Location;
  instructors: Instructor[];
  onConfirm: (instructorId: string) => void;
}

export default function InstructorSelectionDialog({
  open,
  onClose,
  selectedSlotTime,
  learnerLocation,
  instructors,
  onConfirm,
}: InstructorSelectionDialogProps) {
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [instructorLocation, setInstructorLocation] = useState<Location | null>(
    null,
  );

  // Fetch previous bookings for selected instructor
  useEffect(() => {
    const fetchInstructorLocation = async () => {
      if (!selectedInstructorId) return;

      try {
        const oneHourBefore = new Date(selectedSlotTime);
        oneHourBefore.setHours(oneHourBefore.getHours() - 1);

        const { data } = await supabase
          .from("Schedule")
          .select("*, Learner(address_lat, address_lng)")
          .eq("instructor_id", selectedInstructorId)
          .gte("end_time", format(oneHourBefore, "HH:mm:ss"))
          .lte("start_time", format(selectedSlotTime, "HH:mm:ss"))
          .limit(1);

        const previousLocation = data?.[0]?.Learner;
        if (previousLocation?.address_lat && previousLocation?.address_lng) {
          setInstructorLocation({
            lat: previousLocation.address_lat,
            lng: previousLocation.address_lng,
          });
        } else {
          const instructor = instructors.find(
            (i) => i.id_instructor === selectedInstructorId,
          );
          setInstructorLocation({
            lat: instructor?.latitude || 0,
            lng: instructor?.longitude || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching instructor location:", error);
      }
    };

    fetchInstructorLocation();
  }, [selectedInstructorId, selectedSlotTime]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Instructor with Route Info</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <Select
              value={selectedInstructorId}
              onValueChange={setSelectedInstructorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an instructor" />
              </SelectTrigger>
              <SelectContent>
                {instructors.map((instructor) => (
                  <SelectItem
                    key={instructor.id_instructor}
                    value={instructor.id_instructor}
                  >
                    <div className="flex items-center justify-between">
                      <span>{instructor.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedInstructorId && instructorLocation && (
              <MapWithRoute
                origin={learnerLocation}
                destination={instructorLocation}
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                instructorName={
                  instructors.find(
                    (i) => i.id_instructor === selectedInstructorId,
                  )?.name
                }
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(selectedInstructorId)}
            disabled={!selectedInstructorId}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
