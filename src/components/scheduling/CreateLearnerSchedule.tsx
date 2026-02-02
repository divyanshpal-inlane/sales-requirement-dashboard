import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import InstructorSelectionDialog from "./InstructorSelectionDialog";

// Your existing component imports...

export default function CreateLearnerSchedule({
  learnerId,
}: {
  learnerId: string;
}) {
  // Your existing state...
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [availableInstructors, setAvailableInstructors] = useState([]);

  // CRITICAL: Fetch learner details with proper error handling
  const {
    data: learnerDetail,
    isLoading: learnerLoading,
    error: learnerError,
  } = useQuery({
    queryKey: ["learner-detail", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select("id, location, areas, name")
        .eq("id", learnerId)
        .single();

      if (error) throw error;

      // Validate location data
      if (!data.location?.lat || !data.location?.lng) {
        throw new Error("Learner location is incomplete");
      }

      return data;
    },
    enabled: !!learnerId,
    retry: 1,
  });

  // Your existing instructor fetching query...
  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("instructors")
        .select("id, name, default_location, service_areas, service_radius")
        .eq("active", true);
      return data || [];
    },
  });

  // Handle slot click - the main integration point
  const handleSlotClick = async (slotTime: Date) => {
    // SAFETY CHECK: Ensure learnerDetail is valid
    if (!learnerDetail) {
      toast.error("Learner details not loaded");
      return;
    }

    if (!learnerDetail.location?.lat || !learnerDetail.location?.lng) {
      toast.error("Learner location is required to book lessons");
      return;
    }

    // Filter instructors by service area and availability
    const filteredInstructors = instructors.filter((instructor) => {
      // Check if instructor serves learner's area
      const servesArea = instructor.service_areas?.some((area) =>
        learnerDetail.areas?.includes(area),
      );

      // Add distance check if needed
      // const distance = calculateDistance(learnerDetail.location, instructor.default_location);
      // const withinRadius = distance <= instructor.service_radius;

      return servesArea; // && withinRadius;
    });

    if (filteredInstructors.length === 0) {
      toast.error("No instructors available for your area at this time");
      return;
    }

    setSelectedSlot(slotTime);
    setAvailableInstructors(filteredInstructors);
    setIsDialogOpen(true);
  };

  // Handle instructor selection
  const handleInstructorSelect = async (
    instructorId: string,
    slotTime: Date,
  ) => {
    try {
      // Your existing schedule creation logic here
      await createSchedule({
        learner_id: learnerId,
        instructor_id: instructorId,
        start_time: slotTime,
        duration: 60, // minutes
        // ... other fields
      });

      toast.success("Lesson scheduled successfully!");
      setIsDialogOpen(false);
      setSelectedSlot(null);

      // Refresh your schedule data
      // queryClient.invalidateQueries(["schedules"]);
    } catch (error) {
      console.error("Scheduling error:", error);
      toast.error("Failed to schedule lesson");
    }
  };

  // Loading and error states
  if (learnerLoading) {
    return (
      <div className="flex justify-center p-8">Loading learner details...</div>
    );
  }

  if (learnerError || !learnerDetail) {
    return (
      <div className="p-8 text-center text-red-600">
        Error: {learnerError?.message || "Failed to load learner details"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Your existing schedule grid component */}
      <ScheduleGrid
        onSlotClick={handleSlotClick}
        // ... other props
      />

      {/* Instructor Selection Dialog */}
      <InstructorSelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedSlot={selectedSlot}
        availableInstructors={availableInstructors}
        learnerDetail={learnerDetail}
        onInstructorSelect={handleInstructorSelect}
      />
    </div>
  );
}
