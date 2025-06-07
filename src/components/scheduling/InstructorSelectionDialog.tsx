import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import MapWithRoute from "@/components/mapWithRoute";
import { useInstructorLocation } from "@/hooks/useInstructorLocation";

interface InstructorSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: Date | null;
  availableInstructors: Array<{
    id_instructor: string;
    name: string;
    latitude: number;
    longitude: number;
    areas: string[];
    distance: number | null;
  }>;
  learnerDetail: {
    id: string;
    address_lat: number;
    address_lng: number;
    area: string;
    name: string;
  } | null;
  onInstructorSelect: (instructorId: string) => void;
}

function InstructorCard({ instructor, selectedSlot, learnerDetail, onSelect }) {
  const { data: dynamicLocation, isLoading } = useInstructorLocation(
    instructor.id_instructor, 
    selectedSlot
  );
  
  const instructorLocation = dynamicLocation || { 
    lat: instructor.latitude, 
    lng: instructor.longitude 
  };
  const locationSource = dynamicLocation ? "previous_booking" : "default";

  if (!learnerDetail?.address_lat || !learnerDetail?.address_lng) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-red-600">
          Learner location data missing
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-[2fr_1fr] gap-6">
          {/* Map Section */}
          <div className="min-h-[300px]">
            {isLoading ? (
              <div className="flex justify-center items-center h-full bg-gray-50 rounded-lg border">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading route...</span>
              </div>
            ) : (
              <MapWithRoute
                origin={{
                  lat: learnerDetail.address_lat,
                  lng: learnerDetail.address_lng,
                }}
                destination={instructorLocation}
                apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                instructorName={instructor.name}
              />
            )}
          </div>

          {/* Instructor Info & Selection */}
          <div className="flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">{instructor.name}</h3>
              
              <Badge variant={locationSource === "default" ? "secondary" : "outline"}>
                {locationSource === "default" ? "📍 At Office" : "🚗 From Previous Lesson"}
              </Badge>

              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Areas Covered:</strong></p>
                <div className="flex flex-wrap gap-1">
                  {instructor.areas.map((area) => (
                    <Badge
                      key={area}
                      variant={area.toLowerCase() === learnerDetail.area?.toLowerCase() ? "default" : "outline"}
                      className="text-xs"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
                {instructor.distance && (
                  <p className="pt-2">
                    <strong>Distance:</strong> {instructor.distance.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>

            <Button 
              onClick={onSelect}
              className="mt-4 w-full"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Select Instructor"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InstructorSelectionDialog({
  isOpen,
  onClose,
  selectedSlot,
  availableInstructors,
  learnerDetail,
  onInstructorSelect
}: InstructorSelectionDialogProps) {
  
  // Safety check - don't render if learnerDetail is invalid
  if (!learnerDetail?.address_lat || !learnerDetail?.address_lng) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Select Instructor for {selectedSlot?.toLocaleString()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {availableInstructors.map((instructor) => (
            <InstructorCard
              key={instructor.id_instructor}
              instructor={instructor}
              selectedSlot={selectedSlot}
              learnerDetail={learnerDetail}
              onSelect={() => onInstructorSelect(instructor.id_instructor)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
