import { useState } from "react";

import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { DistanceInfo, LocationData, Schedule } from "@/types/schedule";
import { calculateDistance, estimateTravelTime } from "@/utils/locationUtils";

export const useLocationServices = () => {
  const [distanceInfo, setDistanceInfo] = useState<DistanceInfo | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [loadingDistance, setLoadingDistance] = useState(false);
  const { toast } = useToast();

  const fetchInstructorLocation = async (
    instructorId: string,
  ): Promise<LocationData | null> => {
    try {
      const { data, error } = await supabase
        .from("Instructor")
        .select("address_lat, address_lng, address")
        .eq("id_instructor", instructorId)
        .single();

      if (error || !data?.address_lat || !data?.address_lng) {
        return null;
      }

      return {
        latitude: parseFloat(data.address_lat),
        longitude: parseFloat(data.address_lng),
        address: data.address || "Address not available",
      };
    } catch (error) {
      console.error("Error fetching instructor location:", error);
      return null;
    }
  };

  const fetchLearnerLocation = async (
    learnerId: string,
  ): Promise<LocationData | null> => {
    try {
      const { data, error } = await supabase
        .from("Learner")
        .select("address_lat, address_lng, pick_up_location")
        .eq("id", learnerId)
        .single();

      if (error || !data?.address_lat || !data?.address_lng) {
        return null;
      }

      return {
        latitude: parseFloat(data.address_lat),
        longitude: parseFloat(data.address_lng),
        address: data.pick_up_location || "Address not available",
      };
    } catch (error) {
      console.error("Error fetching learner location:", error);
      return null;
    }
  };

  const handleCalculateDistance = async (schedule: Schedule) => {
    setLoadingDistance(true);
    try {
      const instructorLocation = await fetchInstructorLocation(
        schedule.instructor_id,
      );
      const learnerLocation = await fetchLearnerLocation(schedule.learner_id);

      if (!instructorLocation || !learnerLocation) {
        toast({
          title: "Error",
          description:
            "Unable to fetch location data for distance calculation.",
          variant: "destructive",
        });
        return;
      }

      const distance = calculateDistance(
        instructorLocation.latitude,
        instructorLocation.longitude,
        learnerLocation.latitude,
        learnerLocation.longitude,
      );

      const travelTime = estimateTravelTime(distance);

      setDistanceInfo({
        distance,
        duration: travelTime.totalMinutes,
        instructorLocation,
        learnerLocation,
      });

      setIsLocationModalOpen(true);
    } catch (error) {
      console.error("Error calculating distance:", error);
      toast({
        title: "Error",
        description: "Failed to calculate distance.",
        variant: "destructive",
      });
    } finally {
      setLoadingDistance(false);
    }
  };

  return {
    distanceInfo,
    isLocationModalOpen,
    setIsLocationModalOpen,
    loadingDistance,
    handleCalculateDistance,
  };
};
