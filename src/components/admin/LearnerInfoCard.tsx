import { format } from "date-fns";
import {
  BookOpen,
  Calendar,
  Car,
  Clock,
  Info,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { TIME_SLOT_LABELS } from "@/types/schedule";

export interface LearnerInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
  area: string;
  pincode?: string;
  signed_up?: string;
  created_at?: string;
  address_lat?: number;
  address_lng?: number;
  preferred_start_date?: string;
  preferred_completion_days?: number;
  prefers_two_hour_classes?: boolean;
  pick_up_location?: string; // Added pickup address field
}

interface SchedulePreference {
  day_of_week: number;
  time_slot: string;
}

interface LearnerSchedule {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  instructor_id: string;
  lesson_id: string;
  course_id: string;
  status: string;
  instructor_name?: string;
  lesson_number?: number;
  course_name?: string;
}

interface CourseInfo {
  id: string;
  name: string;
  total_lessons: number;
}

interface LearnerInfoDialogProps {
  learner: LearnerInfo;
  open: boolean;
  onClose: () => void;
}

export const LearnerInfoDialog = ({
  learner,
  open,
  onClose,
}: LearnerInfoDialogProps) => {
  const [schedulePreferences, setSchedulePreferences] = useState<
    SchedulePreference[]
  >([]);
  const [currentSchedules, setCurrentSchedules] = useState<LearnerSchedule[]>(
    [],
  );
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);

  useEffect(() => {
    const fetchSchedulePreferences = async () => {
      if (!learner.id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("schedule_preferences")
          .select("day_of_week, time_slot")
          .eq("learner_id", learner.id);

        if (error) throw error;
        setSchedulePreferences(data || []);
      } catch (error) {
        console.error("Error fetching schedule preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCurrentSchedules = async () => {
      if (!learner.id) return;
  
      setIsLoadingSchedules(true);
      try {
        // First, get the enrollment information for this learner
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("enrollment")
          .select("course_id, status")
          .eq("learner_id", learner.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1);
  
        if (enrollmentError) throw enrollmentError;
        
        // If we have an active enrollment, use that course_id
        const courseId = enrollmentData && enrollmentData.length > 0 
          ? enrollmentData[0].course_id 
          : null;
  
        if (courseId) {
          // Fetch course information including total lessons
          setIsLoadingCourse(true);
          const { data: courseDetailData, error: courseDetailError } = await supabase
            .from("Courses")
            .select("id, name, total_lessons")
            .eq("id", courseId)
            .single();
            
          if (!courseDetailError && courseDetailData) {
            setCourseInfo(courseDetailData);
          }
          setIsLoadingCourse(false);
        }
  
        // Fetch schedules for this learner
        const { data: scheduleData, error: scheduleError } = await supabase
          .from("Schedule")
          .select(
            `
            id, 
            date, 
            start_time, 
            end_time, 
            instructor_id, 
            lesson_id, 
            course_id,
            status
          `,
          )
          .eq("learner_id", learner.id)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });
  
        if (scheduleError) throw scheduleError;
  
        if (scheduleData && scheduleData.length > 0) {
          // Fetch instructor names
          const instructorIds = [
            ...new Set(scheduleData.map((s) => s.instructor_id)),
          ];
          const { data: instructorData, error: instructorError } =
            await supabase
              .from("Instructor")
              .select("id_instructor, name")
              .in("id_instructor", instructorIds);
  
          if (instructorError) throw instructorError;
  
          // Fetch course names
          const courseIds = [...new Set(scheduleData.map((s) => s.course_id))];
          const { data: courseData, error: courseError } = await supabase
            .from("Courses")
            .select("id, name")
            .in("id", courseIds);
  
          if (courseError) throw courseError;
  
          // Fetch lesson numbers
          const lessonIds = [...new Set(scheduleData.map((s) => s.lesson_id))];
          const { data: lessonData, error: lessonError } = await supabase
            .from("Lesson")
            .select("id, number, course_id")
            .in("id", lessonIds);
  
          if (lessonError) throw lessonError;
  
          // Combine all data
          const enrichedSchedules = scheduleData.map((schedule) => {
            const instructor = instructorData?.find(
              (i) => i.id_instructor === schedule.instructor_id,
            );
            const course = courseData?.find((c) => c.id === schedule.course_id);
            const lesson = lessonData?.find((l) => l.id === schedule.lesson_id);
  
            return {
              ...schedule,
              instructor_name: instructor?.name || "Unknown",
              course_name: course?.name || "Unknown Course",
              lesson_number: lesson?.number || 0,
            };
          });
  
          setCurrentSchedules(enrichedSchedules);
        } else {
          setCurrentSchedules([]);
        }
      } catch (error) {
        console.error("Error fetching current schedules:", error);
      } finally {
        setIsLoadingSchedules(false);
      }
    };
  
    fetchSchedulePreferences();
    fetchCurrentSchedules();
  }, [learner.id]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const getDayName = (dayNumber: number) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[dayNumber];
  };

  const getTimeSlotLabel = (timeSlot: string) => {
    return TIME_SLOT_LABELS[timeSlot] || timeSlot;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified";
    return format(new Date(dateString), "PPP");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case "booked":
        return <Badge className="bg-blue-500 text-white">Booked</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500 text-white">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>;
    }
  };

  // Group schedule preferences by day
  const groupedPreferences = schedulePreferences.reduce(
    (acc, pref) => {
      if (!acc[pref.day_of_week]) {
        acc[pref.day_of_week] = [];
      }
      acc[pref.day_of_week].push(pref.time_slot);
      return acc;
    },
    {} as Record<number, string[]>,
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold text-primary">Customer Details</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div
          className="mt-4 overflow-y-auto pr-2"
          style={{ maxHeight: "calc(80vh - 80px)" }}
        >
          <div className="mb-6 flex items-start gap-6">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {getInitials(learner.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{learner.name}</h2>
              <p className="mt-1 text-gray-500">
                Customer since{" "}
                {formatDate(learner.created_at || learner.signed_up)}
              </p>
              
              {courseInfo && (
                <div className="mt-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div className="rounded-md bg-primary/10 px-3 py-1">
                    <span className="font-medium text-primary">{courseInfo.name}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      ({courseInfo.total_lessons} lessons total)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-lg bg-gray-50 p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="mb-4 text-lg font-semibold text-primary border-b pb-2">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-gray-700">{learner.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-gray-700">{learner.email || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Address Area</p>
                      <p className="text-gray-700">
                        {learner.area}
                        {learner.pincode ? `, ${learner.pincode}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 ml-8">
                    
                    <div>
                      <p className="font-medium">Pickup Address</p>
                      <p className="text-gray-700">
                        {learner.pick_up_location || "Same as address area"}
                      </p>
                      {learner.address_lat && learner.address_lng && (
                        <a
                          href={`https://maps.google.com/?q=${learner.address_lat},${learner.address_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-sm text-primary hover:underline"
                        >
                          View on map
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="mb-4 text-lg font-semibold text-primary border-b pb-2">
                  Class Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Preferred Start Date</p>
                      <p className="text-gray-700">{formatDate(learner.preferred_start_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Preferred Duration</p>
                      <p className="text-gray-700">
                        {learner.preferred_completion_days || "Not specified"}{" "}
                        days
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">2-hour Classes</p>
                      <p className="text-gray-700">
                        {learner.prefers_two_hour_classes ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="mb-4 text-lg font-semibold text-primary border-b pb-2">Current Schedule</h3>
                {isLoadingSchedules ? (
                  <div className="flex items-center justify-center p-6">
                                        <div className="border-3 h-6 w-6 animate-spin rounded-full border-primary border-t-transparent"></div>
                  </div>
                ) : currentSchedules.length === 0 ? (
                  <div className="rounded-md bg-gray-100 p-4 text-gray-500">
                    No schedules found for this learner
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentSchedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="rounded-md bg-white p-3 shadow-sm hover:shadow transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                Lesson {schedule.lesson_number} -{" "}
                                
                              </h4>
                              {getStatusBadge(schedule.status || "booked")}
                            </div>
                            <p className="mt-1 text-sm">
                              <span className="font-medium">{formatDate(schedule.date)}</span> •{" "}
                              <span className="text-primary">{schedule.start_time.substring(0, 5)} to{" "}
                              {schedule.end_time.substring(0, 5)}</span>
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              <span className="font-medium">Instructor:</span> {schedule.instructor_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg bg-gray-50 p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="mb-4 text-lg font-semibold text-primary border-b pb-2">
                  Schedule Preferences
                </h3>
                {isLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <div className="border-3 h-6 w-6 animate-spin rounded-full border-primary border-t-transparent"></div>
                  </div>
                ) : Object.keys(groupedPreferences).length === 0 ? (
                  <div className="rounded-md bg-gray-100 p-4 text-gray-500">
                    No schedule preferences found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groupedPreferences).map(
                      ([dayNum, timeSlots]) => (
                        <div
                          key={dayNum}
                          className="rounded-md bg-white p-3 shadow-sm hover:shadow transition-shadow"
                        >
                          <h4 className="font-medium text-primary">
                            {getDayName(parseInt(dayNum))}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {timeSlots.map((slot, idx) => (
                              <span
                                key={idx}
                                className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                              >
                                {getTimeSlotLabel(slot)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
              
              {courseInfo && (
                <div className="rounded-lg bg-gray-50 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="mb-4 text-lg font-semibold text-primary border-b pb-2">
                    Course Progress
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{courseInfo.name}</p>
                        <p className="text-sm text-gray-600">
                          {courseInfo.total_lessons} lessons total
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {currentSchedules.filter(s => s.status === 'completed').length} / {courseInfo.total_lessons} lessons
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ 
                            width: `${(currentSchedules.filter(s => s.status === 'completed').length / courseInfo.total_lessons) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between rounded-md bg-primary/5 p-3">
                      <div>
                        <p className="text-sm font-medium">Next Lesson</p>
                        {currentSchedules.find(s => s.status !== 'completed') ? (
                          <p className="text-sm text-gray-600">
                            Lesson {currentSchedules.find(s => s.status !== 'completed')?.lesson_number} on {
                              formatDate(currentSchedules.find(s => s.status !== 'completed')?.date)
                            }
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">No upcoming lessons</p>
                        )}
                      </div>
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Simple card component for list views
export const LearnerInfoCard = ({
  learner,
  compact = false,
  onClick,
}: {
  learner: LearnerInfo;
  compact?: boolean;
  onClick?: (learner: LearnerInfo) => void;
}) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const handleClick = () => {
    if (onClick) {
      onClick(learner);
    }
  };

  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 transition-all hover:border-primary/30 hover:bg-gray-50 hover:shadow-sm ${compact ? "py-2" : "p-4"}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <Avatar className={compact ? "h-8 w-8" : "h-10 w-10"}>
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(learner.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{learner.name}</div>
          <div className="truncate text-sm text-muted-foreground">
            {learner.area}
          </div>
        </div>
      </div>
    </div>
  );
};

