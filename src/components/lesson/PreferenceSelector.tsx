import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import { supabase } from "@/lib/supabaseClient";

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

  // Fetch existing preferences
  const { data: existingPreferences, isLoading } =
    useSchedulePreferences(learnerId);

  // Update preferences mutation
  const { mutate: updatePreference, isPending } = useUpdatePreference();
  const { mutate: rescheduleRequest, isPending: isRescheduleRequestPending } =
    useMutationRescheduleRequest();
  const navigate = useNavigate();

  // Initialize selected slots from existing data
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
        // // Ensure only one slot is selected for lesson 10
        // if (type === "lesson10" && next.size >= 1) {
        //   return prev;
        // }
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
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
          if (type === "lesson10" || type === "new") {
            rescheduleRequest(
              {
                learnerId,
                lessonIds: lessons,
                type: requestType,
              },
              {
                onSuccess: () => {
                  navigate("/home");
                },
              },
            );
          } else {
            supabase.functions.invoke("send-message", {
              body: {
                message_type: "WEBAPP_RESCHEDULE_REQUEST",
                learner_id: learnerId,
              },
            });
            navigate("/home");
          }
        },
      },
    );
    // supabase.functions.invoke("send-message", {
    //   body: {
    //     message_type: "THANKS_FOR_AVAILABILITY",
    //     learner_id: learnerId,
    //   },
    // });
  };

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <Card className="flex-1 border-none shadow-none">
        <CardContent className="relative h-full px-0 pt-4">
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
                          const isSelected = selectedSlots.has(`${index}-${slot}`);
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
          disabled={isPending || isRescheduleRequestPending}
          className="w-full"
        >
          {isPending || isRescheduleRequestPending ? (
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
