import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabaseClient";
import { useMutationRescheduleRequest } from "@/queries/learner";
import {
  useSchedulePreferences,
  useUpdatePreference,
} from "@/queries/preferences";
import { Database } from "@/types/database.types";
import {
  DAYS_OF_WEEK,
  TIME_SLOT_LABELS,
  TIME_SLOTS,
  TimeSlot,
} from "@/types/schedule";

interface PreferenceSelectorProps {
  learnerId: string;
  lessons: string[];
  type: string;
}

function PreferenceSelector({
  learnerId,
  lessons,
  type,
}: PreferenceSelectorProps) {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false); // New state to track the entire save process

  // Fetch existing preferences
  const { data: existingPreferences, isLoading } =
    useSchedulePreferences(learnerId);

  // Update preferences mutation
  const { mutate: updatePreference, isPending } = useUpdatePreference();
  const { mutate: rescheduleRequest, isPending: isRescheduleRequestPending } =
    useMutationRescheduleRequest();
  const navigate = useNavigate();

  // Initialize selected slots from existing preferences
  useEffect(() => {
    if (existingPreferences) {
      const slots = new Set<string>();
      existingPreferences.forEach((pref) => {
        slots.add(`${pref.day_of_week}-${pref.time_slot}`);
      });
      setSelectedSlots(slots);
    }
  }, [existingPreferences]);

  const handleSlotToggle = (dayOfWeek: number, timeSlot: TimeSlot) => {
    const key = `${dayOfWeek}-${timeSlot}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const sendAdminEmail = async (subject: string, message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-admin-email",
        {
          body: { subject, message },
        },
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error sending admin email:", error);
      throw error;
    }
  };

  // Add this at the component level
  const [learnerName, setLearnerName] = useState<string>("");

  // Add this useEffect to fetch the learner name when the component mounts
  useEffect(() => {
    const fetchLearnerName = async () => {
      try {
        const { data, error } = await supabase
          .from("Learner")
          .select("name")
          .eq("id", learnerId)
          .single();

        if (error) throw error;
        if (data) setLearnerName(data.name);
      } catch (error) {
        console.error("Error fetching learner name:", error);
      }
    };

    fetchLearnerName();
  }, [learnerId]);

  const handleSubmit = async () => {
    if (isSaving) return; // Prevent multiple submissions

    try {
      setIsSaving(true); // Set saving state to true at the beginning

      // Convert selected slots to preferences format
      const preferences = Array.from(selectedSlots).map((key) => {
        const slot = key.split("-");
        const dayOfWeek = slot[0];
        const timeSlot = `${slot[1]}-${slot[2]}`;
        return {
          day: parseInt(dayOfWeek),
          timeSlot: timeSlot as TimeSlot,
        };
      });

      // Update preferences
      updatePreference(
        {
          learnerId,
          preferences,
        },
        {
          onSuccess: () => {
            const requestType = type === "lesson10" ? "lesson10" : type;

            // Navigate with delay to home after preferences are updated
            navigate("/loading", { state: { next: "/home" } });
            // navigate("/home");

            // Continue with email and message operations in the background
            if (type === "lesson10" || type === "new") {
              if (type === "lesson10") {
                supabase.functions
                  .invoke("send-message", {
                    body: {
                      message_type: "THANKS_FOR_AVAILABILITY",
                      learner_id: learnerId,
                    },
                  })
                  .catch((err) => console.error("Error sending message:", err));

                sendAdminEmail(
                  "New 10th Lesson Scheduling Request",
                  `${learnerName} has submitted availability for their 10th lesson scheduling.`,
                ).catch((err) =>
                  console.error("Error sending admin email:", err),
                );
              } else if (type === "new") {
                supabase.functions
                  .invoke("send-message", {
                    body: {
                      message_type: "THANKS_FOR_AVAILABILITY",
                      learner_id: learnerId,
                    },
                  })
                  .catch((err) => console.error("Error sending message:", err));

                sendAdminEmail(
                  "New Lesson Scheduling Request",
                  `${learnerName} has submitted their availability for lesson scheduling.`,
                ).catch((err) =>
                  console.error("Error sending admin email:", err),
                );
              }

              // Create reschedule request for all types (including demo/custom)
              // Virtual lessons (for demo/custom courses) start with "virtual-"
              // Filter them out since they're not valid UUIDs, use empty array for demo/custom
              const realLessonIds = lessons.filter(
                (id) => !id.startsWith("virtual-"),
              );

              // Always create reschedule request - admin will handle demo/custom cases
              // by checking the learner's enrollment type
              rescheduleRequest(
                {
                  learnerId,
                  lessonIds: realLessonIds, // Empty array for demo/custom is OK
                  type: requestType,
                },
                {
                  onError: (error) => {
                    console.error("Error with reschedule request:", error);
                  },
                },
              );
            } else {
              supabase.functions
                .invoke("send-message", {
                  body: {
                    message_type: "WEBAPP_RESCHEDULE_REQUEST",
                    learner_id: learnerId,
                  },
                })
                .catch((err) => console.error("Error sending message:", err));

              sendAdminEmail(
                "New Reschedule Request",
                `${learnerName} has requested to reschedule lesson.`,
              ).catch((err) =>
                console.error("Error sending admin email:", err),
              );
            }
          },
          onError: (error) => {
            console.error("Error updating preferences:", error);
            setIsSaving(false);
          },
        },
      );
    } catch (error) {
      console.error("Error saving preferences:", error);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <Card className="flex-1 border-none shadow-none">
        <CardContent className="relative h-full px-0 pt-4">
          {type !== "new" ? (
            <>
              You have the following preferences set for scheduling time.
              <br />
              You can modify the slot preferences if required and they will be
              used for scheduling.
            </>
          ) : (
            ""
          )}
          <div className="grid grid-cols-[120px,1fr]">
            {/* Fixed time slots column */}
            <div className="relative z-10 bg-white">
              <div className="h-8" /> {/* Space for day headers */}
              <div className="mt-10 space-y-3">
                {TIME_SLOTS.map((slot) => (
                  <div key={slot} className="h-24 pr-4 text-right font-medium">
                    {TIME_SLOT_LABELS[slot]}
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable days */}
            <div className="relative overflow-hidden pr-8">
              <ScrollArea className="h-full w-full">
                <div className="min-w-[700px]">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-6">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className="text-sm font-medium">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Time slot buttons */}
                  <div className="mt-4 space-y-3">
                    {TIME_SLOTS.map((slot) => (
                      <div key={slot} className="grid grid-cols-7 gap-6">
                        {DAYS_OF_WEEK.map((_, index) => {
                          const isSelected = selectedSlots.has(
                            `${index}-${slot}`,
                          );
                          return (
                            <Button
                              key={`${index}-${slot}`}
                              variant={isSelected ? "default" : "outline"}
                              className={`h-24 rounded-lg border-2 ${
                                isSelected
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                              onClick={() => handleSlotToggle(index, slot)}
                              disabled={isSaving} // Disable during saving
                            >
                              {isSelected ? "✓" : ""}
                            </Button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              {/* Fade effect */}
              <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white to-transparent" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pb-16">
        <Button
          onClick={handleSubmit}
          disabled={isPending || isRescheduleRequestPending || isSaving} // Disable during any async operation
          className="w-full"
        >
          {isPending || isRescheduleRequestPending || isSaving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}

export default PreferenceSelector;
