import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLearnerUpdate } from "@/queries/learner";

const MOTIVATION_OPTIONS = [
  { emoji: "🚗", label: "Finally buy my own car" },
  { emoji: "👨‍👩‍👧", label: "Take my family out for a drive" },
  { emoji: "🙅", label: "No more autos & cabs" },
];

const TIMELINE_OPTIONS = [
  "Within 1 month",
  "1 month to 6 months",
  "Sometime later / still deciding",
];

// Route stays /onboard/aadhar; this screen now captures car-commerce intent
// instead of the Aadhaar state (licence info is filled by admin).
export default function ExcitementQuestions() {
  const [motivation, setMotivation] = useState<string>("");
  const [timeline, setTimeline] = useState<string>("");
  const { mutate, isPending } = useLearnerUpdate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleContinueClick = useCallback(() => {
    if (!motivation || !timeline) {
      alert("Please answer both questions");
      return;
    }
    mutate(
      {
        driving_motivation: motivation,
        car_purchase_timeline: timeline,
        onboarding_completed: true,
      },
      {
        onSuccess: async () => {
          await queryClient.refetchQueries({ queryKey: ["learner"] });
          localStorage.setItem("onboardingDone", "true");
          navigate("/home");
        },
      },
    );
  }, [mutate, navigate, motivation, timeline, queryClient]);

  return (
    <div className="flex h-full w-full flex-col rounded-md">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            onClick={() => navigate("/onboard/birthday")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            2/2
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-2 text-2xl font-semibold">
            After you learn to drive
          </h1>
          <p className="text">Tell us what you&apos;re most excited about</p>
        </div>
      </div>

      <div className="scrollbar-hide flex-1 space-y-8 overflow-y-auto bg-white p-6">
        <div className="space-y-3">
          <h3 className="text-lg font-medium">
            What&apos;s the first thing you&apos;ll do when you learn driving?
          </h3>
          <div className="flex flex-col gap-3">
            {MOTIVATION_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setMotivation(option.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                  motivation === option.label
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:bg-gray-50",
                )}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-medium">
            When do you see yourself getting one?
          </h3>
          <div className="flex flex-col gap-3">
            {TIMELINE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTimeline(option)}
                className={cn(
                  "flex w-full items-center rounded-xl border-2 p-4 text-left font-medium transition-colors",
                  timeline === option
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:bg-gray-50",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t bg-white p-4">
        <Button
          onClick={handleContinueClick}
          className="w-full"
          disabled={isPending || !motivation || !timeline}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
