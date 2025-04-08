import { Loader } from "@googlemaps/js-api-loader";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  startOfWeek,
} from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { generateRandomOTP } from "@/lib/utils";
import { SchedulingRequests, usePreferences } from "@/queries/preferences";
import { Schedule } from "@/routes/admin/schedules";
import { TIME_SLOTS, TimeSlot } from "@/types/schedule";

interface TimeSlotState {
  isAvailable: boolean;
  isSelected: boolean;
  isPreferred: boolean;
  isCurrentSchedule: boolean;
  isLearnerSchedule: boolean;
  existingSchedule?: {
    slot_start_time: string;
    learner_name: string | null;
    learner_area: string | null;
    pickup_address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  availableInstructors: string[];
}

interface HourlySlot {
  timestamp: Date;
  timeSlot: TimeSlot | null;
  state: TimeSlotState;
}

type DaySchedule = HourlySlot[];

interface TimeSlotSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  slot: HourlySlot | null;
  date: Date | null;
  instructors: any[] | null;
  onConfirm: (instructorId: string) => void;
}
// Add interface for instructor with distance information
interface InstructorWithDistance {
  id_instructor: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
  areas: string[];
  distance: number | null;
  isWithinRadius: boolean;
}

// Function to calculate distance between two points using Haversine formula (as the crow flies)
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Function to fetch driving distance using Google Maps Distance Matrix API
export async function getDrivingDistanceViaSDK(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<number | null> {
  try {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY!,
      libraries: ["places"],
    });

    await loader.load();

    const origin = new google.maps.LatLng(originLat, originLng);
    const destination = new google.maps.LatLng(destLat, destLng);

    const service = new google.maps.DistanceMatrixService();

    return new Promise((resolve) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (
            status === "OK" &&
            response?.rows?.[0]?.elements?.[0]?.status === "OK"
          ) {
            const meters = response.rows[0].elements[0].distance.value;
            resolve(meters / 1000); // return distance in km
          } else {
            console.error("DistanceMatrix failed:", status, response);
            resolve(null);
          }
        },
      );
    });
  } catch (err) {
    console.error("Error loading Maps SDK or calculating distance:", err);
    return null;
  }
}

interface CreateScheduleProps {
  learnerId: string;
  learnerArea: string;
  request: SchedulingRequests[number];
  onScheduleCreate: (schedules: Schedule[], courseId: string) => void;
}

export default function CreateScheduleWithInstructor({
  learnerId,
  learnerArea,
  request,
  onScheduleCreate,
}: CreateScheduleProps) {
  const [selectedInstructorId, setSelectedInstructorId] = useState<
    string | null
  >(null);
  // Use state to track custom date range instead of week start
  const [currentRangeStart, setCurrentRangeStart] = useState(new Date());
  const [instructorsWithDistance, setInstructorsWithDistance] = useState<
    InstructorWithDistance[]
  >([]);
  const [isLoadingDistances, setIsLoadingDistances] = useState(false);

  // Fetch learner details to get pickup location coordinates
  const { data: learnerDetails } = useQuery({
    queryKey: ["learnerDetails", learnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Learner")
        .select("*")
        .eq("id", learnerId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch instructors for the learner's area
  const { data: instructors } = useQuery({
    queryKey: ["instructors", learnerArea],
    queryFn: async () => {
      const { data, error } = await supabase.from("Instructor").select("*");

      if (error) throw error;
      return data;
    },
  });

  // Calculate distances between learner and instructors
  useEffect(() => {
    const calculateDistances = async () => {
      if (
        !instructors ||
        !learnerDetails ||
        !learnerDetails.address_lat ||
        !learnerDetails.address_lng
      ) {
        return;
      }

      setIsLoadingDistances(true);

      const learnerLat = learnerDetails.address_lat;
      const learnerLng = learnerDetails.address_lng;

      const instructorsWithDistanceData: InstructorWithDistance[] = [];

      // Process instructors in batches to avoid rate limiting
      for (const instructor of instructors) {
        if (instructor.latitude && instructor.longitude) {
          // First calculate straight-line distance as a quick filter
          const straightLineDistance = calculateHaversineDistance(
            learnerLat,
            learnerLng,
            instructor.latitude,
            instructor.longitude,
          );

          // Only fetch driving distance if straight-line distance is within a reasonable range
          // (e.g., 1.5x the instructor's radius) to save API calls
          let drivingDistance: number | null = null;

          if (straightLineDistance <= (instructor.radius || 20) * 1.5) {
            try {
              drivingDistance = await getDrivingDistanceViaSDK(
                learnerLat,
                learnerLng,
                instructor.latitude,
                instructor.longitude,
              );
            } catch (error) {
              console.error("Error fetching driving distance:", error);
              // Fall back to straight-line distance if API fails
              drivingDistance = straightLineDistance;
            }
          } else {
            // Use straight-line distance if outside reasonable range
            drivingDistance = straightLineDistance;
          }

          instructorsWithDistanceData.push({
            ...instructor,
            distance: drivingDistance || straightLineDistance,
            isWithinRadius:
              (drivingDistance || straightLineDistance) <=
              (instructor.radius || 0),
          });
        } else {
          // If instructor doesn't have coordinates, add with null distance
          instructorsWithDistanceData.push({
            ...instructor,
            distance: null,
            isWithinRadius: false,
          });
        }
      }

      // Sort instructors: first by whether they're within radius, then by distance
      const sortedInstructors = instructorsWithDistanceData.sort((a, b) => {
        // First sort by whether they're within radius
        if (a.isWithinRadius && !b.isWithinRadius) return -1;
        if (!a.isWithinRadius && b.isWithinRadius) return 1;

        // Then sort by matching area
        const aMatchesArea = a.areas.some(
          (area) => area.toLowerCase() === learnerArea.toLowerCase(),
        );
        const bMatchesArea = b.areas.some(
          (area) => area.toLowerCase() === learnerArea.toLowerCase(),
        );
        if (aMatchesArea && !bMatchesArea) return -1;
        if (!aMatchesArea && bMatchesArea) return 1;

        // Then sort by distance
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      setInstructorsWithDistance(sortedInstructors);
      setIsLoadingDistances(false);
    };

    calculateDistances();
  }, [instructors, learnerDetails, learnerArea]);

  // Fetch the selected instructor's schedule
  const { data: instructorSchedule } = useQuery({
    queryKey: ["instructorSchedule", selectedInstructorId, currentRangeStart],
    queryFn: async () => {
      if (!selectedInstructorId) return [];
      const start = format(currentRangeStart, "yyyy-MM-dd");
      // Calculate end date (start date + 6 days)
      const end = format(addDays(currentRangeStart, 6), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("Schedule")
        .select("*")
        .eq("instructor_id", selectedInstructorId)
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedInstructorId,
  });

  // Case-insensitive matching for instructor locations
  const [matchingInstructors, otherInstructors] = useMemo(() => {
    if (!instructors) return [[], []];

    return instructors.reduce(
      ([matching, others], instructor) => {
        if (
          instructor.areas.some(
            (area: string) => area.toLowerCase() === learnerArea.toLowerCase(), // Case-insensitive comparison
          )
        ) {
          matching.push(instructor);
        } else {
          others.push(instructor);
        }
        return [matching, others];
      },
      [[], []],
    );
  }, [instructors, learnerArea]);

  // Modified to advance or go back by exactly 7 days (not tied to week concept)
  const handleDateRangeChange = (direction: "prev" | "next") => {
    setCurrentRangeStart((prev) =>
      direction === "next" ? addDays(prev, 7) : addDays(prev, -7),
    );
  };
  // Add this helper function before your return statement
  const isTimeSlotUnavailable = (day, hour, minute) => {
    if (!selectedInstructorId) return false;

    // Find the selected instructor
    const selectedInstructor = instructorsWithDistance.find(
      (instructor) => instructor.id_instructor === selectedInstructorId,
    );

    // If no instructor is selected or unavailability isn't defined, return false
    if (!selectedInstructor || !selectedInstructor.unavailability) return false;

    const unavailabilityData = selectedInstructor.unavailability;

    // Make sure unavailability is an array (it should be if stored as jsonb)
    const unavailability = Array.isArray(unavailabilityData)
      ? unavailabilityData
      : JSON.parse(unavailabilityData);

    const currentTime = new Date(day);
    currentTime.setHours(hour, minute);
    const dayOfWeek = format(day, "EEEE").toLowerCase();
    const formattedDate = format(day, "yyyy-MM-dd");

    return unavailability.some((u) => {
      // Case 1: Single day, all day
      if (u.booked_date && u.all_day) {
        return formattedDate === u.booked_date;
      }

      // Case 2: Single day, specific time slot
      if (
        u.booked_date &&
        u.booked_start_time &&
        u.booked_end_time &&
        !u.all_day
      ) {
        const unavailableStart = new Date(
          `${u.booked_date}T${u.booked_start_time}`,
        );
        const unavailableEnd = new Date(
          `${u.booked_date}T${u.booked_end_time}`,
        );
        return (
          formattedDate === u.booked_date &&
          currentTime >= unavailableStart &&
          currentTime < unavailableEnd
        );
      }

      // Case 3: Weekly recurring on specific day of week
      if (u.day_of_week && u.booked_start_time && u.booked_end_time) {
        if (u.day_of_week === dayOfWeek) {
          const [startHour, startMinute] = u.booked_start_time
            .split(":")
            .map(Number);
          const [endHour, endMinute] = u.booked_end_time.split(":").map(Number);

          const unavailableStart = new Date(day);
          unavailableStart.setHours(startHour, startMinute);

          const unavailableEnd = new Date(day);
          unavailableEnd.setHours(endHour, endMinute);

          return (
            currentTime >= unavailableStart && currentTime < unavailableEnd
          );
        }
      }

      // Case 4: Date range
      if (u.start_date && u.end_date) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59); // Set to end of day
        return currentTime >= rangeStart && currentTime <= rangeEnd;
      }

      return false;
    });
  };

  const [showInstructorDetails, setShowInstructorDetails] = useState(false);

  return (
    <div className="flex space-x-4">
      {/* Left Panel: Instructor's Schedule */}
      <div className="w-1/2">
        <Card className="mb-4">
          <CardContent>
            <h3 className="mb-4 mt-4 font-medium">Select Instructor</h3>
            <Select
              value={selectedInstructorId || ""}
              onValueChange={(value) => setSelectedInstructorId(value)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingDistances
                      ? "Calculating distances..."
                      : "Select an instructor"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {isLoadingDistances ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>Calculating distances...</span>
                  </div>
                ) : (
                  instructorsWithDistance.map((instructor) => (
                    <SelectItem
                      key={instructor.id_instructor}
                      value={instructor.id_instructor}
                      className="w-full"
                    >
                      <div className="relative flex w-full items-center">
                        {/* Name + badges container */}
                        <div className="flex items-center gap-2 pr-16">
                          <span className="truncate">{instructor.name}</span>

                          {instructor.areas.some(
                            (area) =>
                              area.toLowerCase() === learnerArea.toLowerCase(),
                          ) && (
                            <Badge
                              variant="outline"
                              className="border-blue-200 bg-blue-50 text-blue-700"
                            >
                              Matching Area
                            </Badge>
                          )}

                          {instructor.isWithinRadius && (
                            <Badge
                              variant="outline"
                              className="border-green-200 bg-green-50 text-green-700"
                            >
                              Matching Radius
                            </Badge>
                          )}
                        </div>

                        {/* Distance absolutely positioned to the right */}
                        {instructor.distance !== null && (
                          <div className="absolute left-96 text-xs text-gray-500">
                            {instructor.distance.toFixed(1)}km
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-4 mt-4 font-medium">Instructor's Schedule</h3>

            <div className="mb-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateRangeChange("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-medium">
                {format(currentRangeStart, "MMM d")} -{" "}
                {format(addDays(currentRangeStart, 6), "MMM d, yyyy")}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateRangeChange("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="table-fixed border-collapse border border-gray-200">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-24 border border-gray-200 bg-white p-2">
                      Time
                    </th>
                    {Array.from({ length: 7 }).map((_, index) => {
                      const day = addDays(currentRangeStart, index);
                      return (
                        <th
                          key={index}
                          className="min-w-24 border border-gray-200 p-2"
                        >
                          <div>{format(day, "EEE")}</div>
                          <div className="text-sm text-gray-500">
                            {format(day, "MMM d")}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 32 }).map((_, timeIndex) => {
                    const hour = Math.floor(timeIndex / 2) + 6; // Start from 6 AM
                    const minute = timeIndex % 2 === 0 ? 0 : 30; // Alternate between 0 and 30 minutes
                    return (
                      <tr key={timeIndex} className="h-10">
                        <td className="sticky left-0 z-10 border border-gray-200 bg-white px-2 py-0 text-center">
                          <span className="text-base">
                            {format(
                              new Date().setHours(hour, minute),
                              "h:mm a",
                            )}
                          </span>
                        </td>
                        {Array.from({ length: 7 }).map((_, dayIndex) => {
                          const day = addDays(currentRangeStart, dayIndex);

                          // Find the schedule for the current day and time
                          const schedule = instructorSchedule?.find((s) => {
                            const scheduleStart = new Date(
                              `${s.date}T${s.start_time}`,
                            );
                            const scheduleEnd = new Date(
                              `${s.date}T${s.end_time}`,
                            );
                            const currentTime = new Date(day);
                            currentTime.setHours(hour, minute);
                            return (
                              isSameDay(scheduleStart, day) &&
                              currentTime >= scheduleStart &&
                              currentTime < scheduleEnd
                            );
                          });
                          const unavailable = isTimeSlotUnavailable(
                            day,
                            hour,
                            minute,
                          );
                          // Determine if this cell is the start of a schedule
                          const isScheduleStart =
                            schedule &&
                            parseInt(schedule.start_time.split(":")[0]) ===
                              hour &&
                            parseInt(schedule.start_time.split(":")[1]) ===
                              minute;

                          return (
                            <td
                              key={dayIndex}
                              className={`h-12 max-h-12 border border-gray-200 px-2 py-0 text-center ${
                                schedule
                                  ? "bg-primary text-white"
                                  : unavailable
                                    ? "bg-red-200 text-red-800"
                                    : ""
                              }`}
                            >
                              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base">
                                {isScheduleStart
                                  ? `${schedule.start_time} - ${schedule.end_time}`
                                  : unavailable && !schedule
                                    ? "Unavailable"
                                    : ""}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Learner's Schedule Selection */}
      <div className="w-1/2">
        <Card className="mb-4">
          <CardContent>
            <div className="mb-[18px] mt-10">
              <Button
                variant="outline"
                className="flex w-full justify-between"
                onClick={() => setShowInstructorDetails(!showInstructorDetails)}
              >
                Instructor Details
                {showInstructorDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              {showInstructorDetails && selectedInstructorId && (
                <div className="mt-2 grid grid-cols-2 gap-1 rounded bg-gray-50 p-2">
                  <div>
                    <p className="mb-1 text-sm">
                      <span className="font-bold">Address:</span>
                      <span className="ml-2">
                        {
                          instructorsWithDistance.find(
                            (instructor) =>
                              instructor.id_instructor === selectedInstructorId,
                          )?.address
                        }
                      </span>
                    </p>
                  </div>
                  <div className="items-right ml-10 flex">
                    <p className="mb-1 text-sm">
                      <span className="font-bold">Radius:</span>
                      <span className="ml-2">
                        {
                          instructorsWithDistance.find(
                            (instructor) =>
                              instructor.id_instructor === selectedInstructorId,
                          )?.radius
                        }{" "}
                        km
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="mt-1 text-sm">
                      <span className="font-bold">Areas:</span>
                      <span className="ml-2">
                        {instructorsWithDistance
                          .find(
                            (instructor) =>
                              instructor.id_instructor === selectedInstructorId,
                          )
                          ?.areas.join(", ")}
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="mt-1 text-sm">
                      <span className="font-bold">Distance from learner:</span>
                      <span className="ml-2">
                        {instructorsWithDistance
                          .find(
                            (instructor) =>
                              instructor.id_instructor === selectedInstructorId,
                          )
                          ?.distance?.toFixed(1) || "Unknown"}{" "}
                        km
                      </span>
                      {instructorsWithDistance.find(
                        (instructor) =>
                          instructor.id_instructor === selectedInstructorId,
                      )?.isWithinRadius && (
                        <Badge className="ml-2 border-green-200 bg-green-50 text-green-700">
                          Within serviceable radius
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-4 mt-4 font-medium">Create learner Schedule</h3>
            <CreateSchedule
              learnerId={learnerId}
              learnerArea={learnerArea}
              request={request}
              onScheduleCreate={onScheduleCreate}
              defaultInstructorId={selectedInstructorId}
              currentRangeStart={currentRangeStart} // Pass the range start instead of week start
              onDateChange={(newDate) => setCurrentRangeStart(newDate)} // Add this prop to sync dates
              instructorsWithDistance={instructorsWithDistance} // Pass the instructors with distance info
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Update the CreateSchedule component to accept defaultInstructorId and instructorsWithDistance
function CreateSchedule({
  learnerId,
  learnerArea,
  request,
  onScheduleCreate,
  defaultInstructorId,
  currentRangeStart,
  onDateChange,
  instructorsWithDistance,
}: CreateScheduleProps & {
  defaultInstructorId: string | null;
  currentRangeStart: Date;
  onDateChange: (date: Date) => void;
  instructorsWithDistance: InstructorWithDistance[];
}) {
  const { data: preferences } = usePreferences(learnerId);
  const [startDate, setStartDate] = useState(currentRangeStart);
  const [selectedSlots, setSelectedSlots] = useState<
    Array<Omit<Schedule, "lessonId"> & { minutes: number; slotGroupId: string }>
  >([]);
  const [scheduleDetails, setScheduleDetails] = useState<
    TimeSlotState["existingSchedule"] | null
  >(null);

  // Dialog state for instructor selection
  const [selectionDialogOpen, setSelectionDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<HourlySlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<
    string | null
  >(defaultInstructorId);

  // Sync startDate with currentRangeStart from parent
  useEffect(() => {
    setStartDate(currentRangeStart);
  }, [currentRangeStart]);

  // Ensure the selected instructor is updated when defaultInstructorId changes
  useEffect(() => {
    setSelectedInstructorId(defaultInstructorId);
  }, [defaultInstructorId]);

  // Fetch instructors for the learner's area
  const { data: instructors } = useQuery({
    queryKey: ["instructors", learnerArea],
    queryFn: async () => {
      const { data, error } = await supabase.from("Instructor").select("*");

      if (error) throw error;
      return data;
    },
  });

  // Fetch lessons for the selected course
  const { data: allLessons } = useQuery({
    queryKey: ["lessons", request.lesson_ids],
    queryFn: async () => {
      const { data: lesson1, error: lesson1Error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("id", request.lesson_ids[0])
        .single();
      if (lesson1Error) throw lesson1Error;
      const courseId = lesson1.course_id;
      if (!courseId) throw new Error("Course ID not found");
      const { data, error } = await supabase
        .from("Lesson")
        .select("*")
        .eq("course_id", courseId)
        .order("number", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const lessons = allLessons?.filter((l) => request.lesson_ids.includes(l.id));

  const minLessonNumber =
    lessons && lessons.length > 0
      ? lessons.reduce(
          (min, lesson) => Math.min(min, lesson.number ?? 0),
          Infinity,
        )
      : 0;

  // Fetch existing schedules for the date range
  const { data: existingSchedules } = useQuery({
    queryKey: ["schedules", startDate],
    queryFn: async () => {
      const endDate = addDays(startDate, 9);
      const { data, error } = await supabase
        .from("Schedule")
        .select(
          "*, Learner(name, area, pick_up_location, address_lat, address_lng)",
        )
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (error) throw error;
      return data;
    },
  });

  const [schedulesToChange, laterScheduleOfLearnerToChange, otherSchedules] =
    useMemo(() => {
      if (!existingSchedules) return [[], [], []];

      const toChange = existingSchedules.filter(
        (s) =>
          request.lesson_ids.includes(s.lesson_id ?? "") &&
          s.learner_id === learnerId,
      );

      const laterScheduleOfLearnerToChange = existingSchedules.filter(
        (s) =>
          s.learner_id === learnerId &&
          s.lesson_id &&
          !request.lesson_ids.includes(s.lesson_id ?? "") &&
          allLessons?.find((l) => l.id === s.lesson_id)?.number >
            minLessonNumber,
      );

      const others = existingSchedules.filter(
        (s) => s.learner_id !== learnerId,
      );

      return [toChange, laterScheduleOfLearnerToChange, others];
    }, [
      existingSchedules,
      request.lesson_ids,
      learnerId,
      allLessons,
      minLessonNumber,
    ]);

  // Calculate hourly slots for each day
  const calculateDaySchedule = (date: Date): DaySchedule => {
    const daySchedule: DaySchedule = [];
    const dateStr = format(date, "yyyy-MM-dd");
    const isDayBlocked = schedulesToChange.some(
      (s) => format(new Date(s.date), "yyyy-MM-dd") === dateStr,
    );
    for (let hour = 6; hour < 21; hour++) {
      for (const minute of [0, 30]) {
        const timestamp = new Date(date);
        timestamp.setHours(hour, minute);

        // Find which time slot this time belongs to
        const timeSlot = TIME_SLOTS.find((slot) => {
          const [start, end] = slot.split("-");
          return parseInt(start) <= hour && parseInt(end) > hour;
        });

        if (!timeSlot) continue;

        // Get schedules for this time slot
        const slotSchedules =
          otherSchedules?.filter(
            (s) =>
              s.date === dateStr &&
              parseInt(s.start_time.split(":")[0]) === hour &&
              parseInt(s.start_time.split(":")[1] || "0") === minute,
          ) ?? [];

        // Get learner preferences for this slot
        const isPreferred = preferences?.some(
          (p) => p.day_of_week === date.getDay() && p.time_slot === timeSlot,
        );

        // Check if this slot is currently scheduled for rescheduling
        const isCurrentSchedule = schedulesToChange?.some(
          (s) =>
            s.date === dateStr &&
            parseInt(s.start_time.split(":")[0]) === hour &&
            parseInt(s.start_time.split(":")[1] || "0") === minute,
        );

        // Check if this slot has other schedules for the same learner
        const isLearnerSchedule = existingSchedules?.some(
          (s) =>
            s.date === dateStr &&
            parseInt(s.start_time.split(":")[0]) === hour &&
            parseInt(s.start_time.split(":")[1] || "0") === minute &&
            s.learner_id === learnerId &&
            !request.lesson_ids.includes(s.lesson_id ?? ""),
        );

        // Get available instructors for this slot
        // Filter to only include instructors within their service radius
        const availableInstructors =
          instructorsWithDistance
            ?.filter((instructor) => {
              return !slotSchedules.some(
                (s) => s.instructor_id === instructor.id_instructor,
              );
            })
            .map((i) => i.id_instructor) ?? [];

        const existingSchedule =
          !isLearnerSchedule &&
          !isCurrentSchedule &&
          availableInstructors.length === 0 &&
          slotSchedules.length > 0 &&
          slotSchedules[0].Learner
            ? {
                slot_start_time: slotSchedules[0].start_time,
                learner_name: slotSchedules[0].Learner.name,
                learner_area: slotSchedules[0].Learner.area,
                pickup_address: slotSchedules[0].Learner.pick_up_location,
                latitude: slotSchedules[0].Learner.address_lat,
                longitude: slotSchedules[0].Learner.address_lng,
              }
            : undefined;

        daySchedule.push({
          timestamp,
          timeSlot: timeSlot as TimeSlot | null,
          state: {
            isAvailable:
              availableInstructors.length > 0 &&
              !isLearnerSchedule &&
              !isDayBlocked,
            isSelected: selectedSlots.some(
              (s) =>
                format(s.date, "yyyy-MM-dd") === dateStr &&
                s.hour === hour &&
                s.minutes === minute,
            ),
            isPreferred: !!isPreferred,
            isCurrentSchedule,
            isLearnerSchedule,
            existingSchedule,
            availableInstructors,
          },
        });
      }
    }

    return daySchedule;
  };

  // Instructor selection dialog component
  const InstructorSelectionDialog = ({
    open,
    onClose,
    slot,
    date,
    instructorsWithDistance,
    otherSchedules,
    onConfirm,
  }: TimeSlotSelectionDialogProps & {
    instructorsWithDistance: InstructorWithDistance[];
  }) => {
    const [instructorId, setInstructorId] = useState<string>(
      selectedInstructorId || slot?.state.availableInstructors[0] || "",
    );

    const availableInstructorIds = slot?.state.availableInstructors || [];

    // Filter instructors to only those available for this slot and sort by distance
    const availableInstructors =
      instructorsWithDistance
        ?.filter((instructor) => {
          return (
            availableInstructorIds.includes(instructor.id_instructor) &&
            !otherSchedules.some(
              (s) =>
                s.instructor_id === instructor.id_instructor &&
                s.date === format(date, "yyyy-MM-dd") &&
                s.start_time === format(slot.timestamp, "HH:mm:00"),
            )
          );
        })
        .sort((a, b) => {
          // Sort by distance (null values last)
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        }) || [];

    const handleConfirm = () => {
      onConfirm(instructorId);
      onClose();
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Instructor</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              {date && slot
                ? `${format(date, "MMM d, yyyy")} at ${format(
                    slot.timestamp,
                    "h:mm a",
                  )}`
                : ""}
            </p>
            <Select value={instructorId} onValueChange={setInstructorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an instructor" />
              </SelectTrigger>
              <SelectContent>
                {availableInstructors.map((instructor) => (
                  <SelectItem
                    key={instructor.id_instructor}
                    value={instructor.id_instructor}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span>{instructor.name}</span>
                      {instructor.distance !== null && (
                        <span className="ml-2 text-xs text-gray-500">
                          {instructor.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const handleSlotClick = (date: Date, slot: HourlySlot) => {
    if (!slot.state.isAvailable || slot.state.isSelected) {
      // If slot is selected, unselect it and its paired slot
      if (slot.state.isSelected) {
        setSelectedSlots((prev) => {
          const hour = slot.timestamp.getHours();
          const minute = slot.timestamp.getMinutes();
          const dateStr = format(date, "yyyy-MM-dd");

          // Get the slotGroupId that this slot is part of
          const groupId = prev.find(
            (s) =>
              format(s.date, "yyyy-MM-dd") === dateStr &&
              s.hour === hour &&
              s.minutes === minute,
          )?.slotGroupId;

          // Remove all slots that have the same slotGroupId
          return prev.filter((s) => s.slotGroupId !== groupId);
        });
      }
      return;
    }

    // Check how many unique hourly slots are already selected
    const currentUniqueSlots = countUniqueHourlySlots(selectedSlots);
    const hour = slot.timestamp.getHours();
    const minute = slot.timestamp.getMinutes();
    const isStartSlot = minute === 0;

    if (currentUniqueSlots >= request.lesson_ids.length) {
      alert("Cannot select more slots than required.");
      return;
    }
    if (hour === 20 && minute === 30) {
      alert(
        "Cannot select this time slot. Lessons require a full hour, and this is only a half-hour slot.",
      );
      return;
    }

    // Open instructor selection dialog
    setSelectedSlot(slot);
    setSelectedDate(date);
    setSelectionDialogOpen(true);
  };

  // Handle instructor selection from dialog
  const handleInstructorSelect = (instructorId: string) => {
    if (!selectedSlot || !selectedDate) return;

    const hour = selectedSlot.timestamp.getHours();
    const minute = selectedSlot.timestamp.getMinutes();
    const isStartSlot = minute === 0;

    setSelectedSlots((prev) => {
      // When selecting, add both slots that make up the full hour
      if (isStartSlot) {
        // If selecting a XX:00 slot, also select the XX:30 slot
        // Mark them as the same slot group
        const slotGroupId = Date.now().toString(); // Unique ID for this hour selection
        return [
          ...prev,
          {
            date: selectedDate,
            hour,
            minutes: 0,
            instructorId,
            slotGroupId, // Add this to group related 30-min slots
          },
          {
            date: selectedDate,
            hour,
            minutes: 30,
            instructorId,
            slotGroupId, // Same group ID for the second 30 min slot
          },
        ];
      } else {
        // If selecting a XX:30 slot, also select the (XX+1):00 slot
        const slotGroupId = Date.now().toString();
        return [
          ...prev,
          {
            date: selectedDate,
            hour,
            minutes: 30,
            instructorId,
            slotGroupId,
          },
          {
            date: selectedDate,
            hour: hour + 1,
            minutes: 0,
            instructorId,
            slotGroupId,
          },
        ];
      }
    });
  };

  // Helper function to count unique hourly slots (treating pairs as one)
  const countUniqueHourlySlots = (
    slots: Array<
      Omit<Schedule, "lessonId"> & { minutes: number; slotGroupId?: string }
    >,
  ) => {
    // Count by unique slotGroupIds
    const uniqueGroups = new Set(
      slots.map((s) => s.slotGroupId).filter(Boolean),
    );
    return uniqueGroups.size;
  };

  const handleDateChange = (direction: "prev" | "next") => {
    if (direction === "prev" && isBefore(addDays(startDate, -6), new Date())) {
      return;
    }
    const newDate = addDays(startDate, direction === "next" ? 7 : -7);
    setStartDate(newDate);
    onDateChange(newDate); // Sync with parent component
  };

  const handleCreateSchedule = async () => {
    if (selectedSlots.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    if (!lessons || lessons.length < countUniqueHourlySlots(selectedSlots)) {
      alert("Not enough lessons available for the course");
      return;
    }

    if (!instructorsWithDistance || instructorsWithDistance.length === 0) {
      alert("No instructors available for this area");
      return;
    }

    // Get all existing schedules for the course (excluding ones being rescheduled)
    const existingCourseSchedules =
      existingSchedules?.filter(
        (s) =>
          s.learner_id === learnerId &&
          !request.lesson_ids.includes(s.lesson_id ?? "") &&
          allLessons?.some((l) => l.id === s.lesson_id),
      ) ?? [];

    // Get completed lessons to maintain their numbers
    const completedLessons = existingCourseSchedules.filter(
      (s) => new Date(s.date).setHours(s.hour) < new Date().getTime(),
    );

    // Group selected slots by their slotGroupId
    const selectedSlotGroups = groupBy(
      selectedSlots,
      (slot) => slot.slotGroupId || "",
    );

    // Convert each pair of 30-minute slots into a single hour entry
    // We'll use the first slot in each group as the starting point
    const newSlots = Object.values(selectedSlotGroups).map((group) => {
      // Sort the slots to ensure the earlier one comes first
      const sortedGroup = [...group].sort((a, b) => {
        const timeA = new Date(a.date).setHours(a.hour, a.minutes);
        const timeB = new Date(b.date).setHours(b.hour, b.minutes);
        return timeA - timeB;
      });

      // Use the first slot as the start time
      const firstSlot = sortedGroup[0];
      return {
        date: firstSlot.date,
        hour: firstSlot.hour,
        minutes: firstSlot.minutes,
        instructorId: firstSlot.instructorId,
        isNew: true as const,
      };
    });

    // Get upcoming slots
    const upcomingSlots = [
      // New selected slots (only one entry per hour)
      ...newSlots,

      // Existing upcoming schedules that aren't being changed
      ...existingCourseSchedules
        .filter(
          (s) =>
            new Date(s.date).setHours(parseInt(s.start_time.split(":")[0])) >=
            new Date().getTime(),
        )
        .map((schedule) => ({
          date: new Date(schedule.date),
          hour: parseInt(schedule.start_time.split(":")[0]),
          minutes: parseInt(schedule.start_time.split(":")[1] || "0"),
          instructorId: schedule.instructor_id ?? "",
          lessonId: schedule.lesson_id ?? "",
          isNew: false as const,
        })),
    ];

    // Sort upcoming slots chronologically
    const chronologicallySortedUpcomingSlots = upcomingSlots.sort((a, b) => {
      const timeA = new Date(a.date).setHours(a.hour, a.minutes);
      const timeB = new Date(b.date).setHours(b.hour, b.minutes);
      return timeA - timeB;
    });

    // Get all lessons for the course
    const courseLessons = allLessons
      ? [...allLessons].sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
      : [];

    // Find the next lesson number after completed lessons
    const maxCompletedLessonNumber = Math.max(
      ...completedLessons.map(
        (s) => courseLessons.find((l) => l.id === s.lesson_id)?.number ?? 0,
      ),
      0,
    );

    // Get available lessons for upcoming slots (lessons after the completed ones)
    const availableLessons = courseLessons.filter(
      (l) => (l.number ?? 0) > maxCompletedLessonNumber,
    );

    // Check if this is a 9+1 course type (learner doesn't have a driver's license)
    const { data: learner, error: learnerError } = await supabase
      .from("Learner")
      .select("*")
      .eq("id", learnerId)
      .single();

    if (learnerError) {
      console.error("Error fetching learner:", learnerError);
    }

    const isNinePlusOneCourse =
      learner?.has_a_DL === false && courseLessons.length === 10;

    // Create new schedule array with correctly assigned lesson numbers
    const schedulesWithIds = chronologicallySortedUpcomingSlots.map(
      (slot, index) => {
        if (!slot.isNew) {
          // This is an existing schedule that's not being changed
          return {
            date: slot.date,
            hour: slot.hour,
            minutes: slot.minutes,
            instructorId: slot.instructorId,
            lessonId: slot.lessonId,
            lessonNumber:
              courseLessons.find((l) => l.id === slot.lessonId)?.number ?? 0,
          };
        } else {
          // Check if this is a "9+1" course type and if lesson 10 is being rescheduled
          const isLesson10Slot =
            isNinePlusOneCourse &&
            request.lesson_ids.some(
              (id) => courseLessons.find((l) => l.id === id)?.number === 10,
            );

          if (isLesson10Slot) {
            // If this is lesson 10 in a 9+1 course, find and use lesson 10
            const lesson10 = availableLessons.find((l) => l.number === 10);
            return {
              date: slot.date,
              hour: slot.hour,
              minutes: slot.minutes,
              instructorId: slot.instructorId,
              lessonId: lesson10?.id ?? "",
              lessonNumber: 10,
            };
          } else {
            // For regular sequential scheduling, calculate the correct lesson number
            // This handles both 9+1 courses (lessons 1-9) and regular courses (lessons 1-10)
            const lessonIndex = index + maxCompletedLessonNumber;
            const lesson =
              availableLessons.find((l) => l.number === lessonIndex + 1) ||
              availableLessons[index];

            return {
              date: slot.date,
              hour: slot.hour,
              minutes: slot.minutes,
              instructorId: slot.instructorId,
              lessonId: lesson?.id ?? "",
              lessonNumber: lesson?.number ?? 0,
            };
          }
        }
      },
    );

    // Filter out only the schedules that need to be created/updated
    const schedulesToUpdate = schedulesWithIds.filter((schedule, index) => {
      const originalSlot = chronologicallySortedUpcomingSlots[index];
      // Include if it's a new slot or if the lesson number has changed
      return originalSlot.isNew || schedule.lessonId !== originalSlot.lessonId;
    });

    // Create final schedules array
    const finalSchedules = schedulesToUpdate
      .filter((schedule) => schedule.lessonId) // Only include schedules with valid lesson IDs
      .map((schedule) => {
        // Format the start_time correctly with hours and minutes
        const formattedHour = String(schedule.hour).padStart(2, "0");
        const formattedMinutes = String(schedule.minutes || 0).padStart(2, "0");
        const endHour =
          schedule.minutes === 30 ? schedule.hour + 1 : schedule.hour;
        const endMinutes = schedule.minutes === 30 ? "00" : "30";

        return {
          date: schedule.date,
          hour: schedule.hour,
          instructorId: schedule.instructorId,
          lessonId: schedule.lessonId,
          lessonNumber: schedule.lessonNumber,
          start_time: `${formattedHour}:${formattedMinutes}:00`,
          end_time: `${String(endHour).padStart(2, "0")}:${endMinutes}:00`,
          status: "booked",
          otp: generateRandomOTP(),
        };
      });

    onScheduleCreate(finalSchedules, courseLessons[0]?.course_id ?? "");
  };

  // Utility function to group array items by a key
  function groupBy<T>(array: T[], keyFn: (item: T) => string) {
    return array.reduce((result: Record<string, T[]>, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    }, {});
  }

  const getSlotColor = (slot: HourlySlot) => {
    if (!slot.timeSlot) return "bg-gray-50";

    const dateStr = format(slot.timestamp, "yyyy-MM-dd");
    const hour = slot.timestamp.getHours();
    const minutes = slot.timestamp.getMinutes();

    // Check if this slot or the adjacent slot (to make a full hour) is selected
    const isSelected =
      minutes === 0
        ? selectedSlots.some(
            (s) =>
              format(s.date, "yyyy-MM-dd") === dateStr &&
              s.hour === hour &&
              s.minutes === 0,
          )
        : selectedSlots.some(
            (s) =>
              format(s.date, "yyyy-MM-dd") === dateStr &&
              s.hour === hour &&
              s.minutes === 30,
          );

    // Check if this slot is part of a current schedule to be rescheduled
    const isCurrentSchedule = schedulesToChange?.some((s) => {
      const scheduleStartHour = parseInt(s.start_time.split(":")[0]);
      const scheduleStartMinute = parseInt(s.start_time.split(":")[1] || "0");
      const scheduleEndHour = parseInt(s.end_time.split(":")[0]);

      // Check if this slot falls within the scheduled time
      return (
        s.date === dateStr &&
        // Check if the current time is between the start and end times
        ((hour === scheduleStartHour && minutes >= scheduleStartMinute) ||
          (hour === scheduleEndHour &&
            minutes < parseInt(s.end_time.split(":")[1] || "0")) ||
          (hour > scheduleStartHour && hour < scheduleEndHour))
      );
    });

    // Check if this slot is part of another existing learner schedule
    const isLearnerSchedule = existingSchedules?.some((s) => {
      if (
        s.learner_id !== learnerId ||
        request.lesson_ids.includes(s.lesson_id ?? "")
      ) {
        return false;
      }

      const scheduleStartHour = parseInt(s.start_time.split(":")[0]);
      const scheduleStartMinute = parseInt(s.start_time.split(":")[1] || "0");
      const scheduleEndHour = parseInt(s.end_time.split(":")[0]);

      // Check if this slot falls within the scheduled time
      return (
        s.date === dateStr &&
        // Check if the current time is between the start and end times
        ((hour === scheduleStartHour && minutes >= scheduleStartMinute) ||
          (hour === scheduleEndHour &&
            minutes < parseInt(s.end_time.split(":")[1] || "0")) ||
          (hour > scheduleStartHour && hour < scheduleEndHour))
      );
    });

    // Check if this slot is unavailable due to other schedules
    const hasExistingSchedule =
      selectedInstructorId &&
      otherSchedules?.some(
        (s) =>
          s.instructor_id === selectedInstructorId &&
          s.date === dateStr &&
          // Check if the current time is between the start and end times
          ((hour === parseInt(s.start_time.split(":")[0]) &&
            minutes >= parseInt(s.start_time.split(":")[1] || "0")) ||
            (hour === parseInt(s.end_time.split(":")[0]) &&
              minutes < parseInt(s.end_time.split(":")[1] || "0")) ||
            (hour > parseInt(s.start_time.split(":")[0]) &&
              hour < parseInt(s.end_time.split(":")[0]))),
      );

    if (isSelected) return "bg-primary";
    if (isLearnerSchedule) return "bg-blue-200";
    if (isCurrentSchedule) return "bg-yellow-200";
    if (hasExistingSchedule) return "bg-gray-100";
    if (slot.state.isPreferred) return "bg-primary/30";
    return "bg-white";
  };

  // Format the time for display
  const formatTimeDisplay = (timestamp: Date) => {
    return format(timestamp, "h:mm a");
  };

  return (
    <div className="w-full space-y-4">
      {lessons && lessons.length > 0 && !request.type === "new" && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 font-medium">Lessons to Reschedule</h3>
            <div className="grid grid-cols-3 gap-4">
              {lessons
                .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
                .map((lesson) => (
                  <div key={lesson.id} className="rounded-lg border p-3">
                    <div className="font-medium">Lesson {lesson.number}</div>
                    {schedulesToChange?.find(
                      (s) => s.lesson_id === lesson.id,
                    ) && (
                      <div className="mt-1 text-xs text-yellow-600">
                        Currently scheduled for:{" "}
                        {format(
                          new Date(
                            schedulesToChange.find(
                              (s) => s.lesson_id === lesson.id,
                            )?.date ?? "",
                          ).setHours(
                            parseInt(
                              schedulesToChange
                                .find((s) => s.lesson_id === lesson.id)
                                ?.start_time.split(":")[0] ?? "0",
                            ),
                            0,
                          ),
                          "MMM d, h:mm a",
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDateChange("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium">
            {format(startDate, "MMM d")} -{" "}
            {format(addDays(startDate, 6), "MMM d, yyyy")}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleDateChange("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="relative">
        <div className="mt-4 flex space-x-4">
          {Array.from({ length: 7 }).map((_, index) => {
            const date = addDays(startDate, index);
            const daySchedule = calculateDaySchedule(date);
            return (
              <Card key={index} className="w-[120px] flex-shrink-0">
                <CardContent className="p-4">
                  <div className="mb-3 text-sm font-medium">
                    {format(date, "EEE, MMM d")}
                  </div>
                  <div className="space-y-2">
                    {daySchedule.map((slot, idx) => (
                      <button
                        key={idx}
                        className={`h-10 w-full rounded ${getSlotColor(slot)} hover:opacity-80 ${
                          !slot.timeSlot ? "cursor-default" : "cursor-pointer"
                        }`}
                        onClick={() => handleSlotClick(date, slot)}
                        title={
                          slot.timestamp
                            ? `${formatTimeDisplay(slot.timestamp)} ${
                                slot.state.existingSchedule
                                  ? `- Scheduled for ${slot.state.existingSchedule.learner_name}`
                                  : ""
                              }`
                            : undefined
                        }
                      >
                        {formatTimeDisplay(slot.timestamp)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-primary/30" />
            <span>Preferred</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-primary" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-yellow-200" />
            <span>Reschedule Requests</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-blue-200" />
            <span>Scheduled Lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-gray-100" />
            <span>Unavailable</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500"></div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-md flex text-gray-500">
          Selected: {selectedSlots.length / 2} of {request.lesson_ids.length}{" "}
          hours
        </div>
        <Button
          onClick={handleCreateSchedule}
          disabled={selectedSlots.length / 2 !== request.lesson_ids.length}
          className="whitespace-nowrap"
        >
          Create Schedule
        </Button>
      </div>

      <Dialog
        open={!!scheduleDetails}
        onOpenChange={() => setScheduleDetails(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
          </DialogHeader>
          {scheduleDetails && (
            <div className="space-y-4">
              <div>
                <div className="font-medium">
                  {scheduleDetails.learner_name}
                </div>
                <div className="text-sm text-gray-500">
                  {scheduleDetails.learner_area}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-1 h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm">
                    {scheduleDetails.pickup_address}
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${scheduleDetails.latitude},${scheduleDetails.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Render the instructor selection dialog */}
      <InstructorSelectionDialog
        open={selectionDialogOpen}
        onClose={() => setSelectionDialogOpen(false)}
        slot={selectedSlot}
        date={selectedDate}
        instructorsWithDistance={instructorsWithDistance}
        otherSchedules={otherSchedules}
        onConfirm={handleInstructorSelect}
      />
    </div>
  );
}

// Update the TimeSlotSelectionDialogProps interface
interface TimeSlotSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  slot: HourlySlot | null;
  date: Date | null;
  instructorsWithDistance: InstructorWithDistance[];
  otherSchedules: any[];
  onConfirm: (instructorId: string) => void;
}
