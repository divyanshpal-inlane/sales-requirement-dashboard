import {
  BookOpen,
  Calendar,
  Car,
  Check,
  ClipboardCheck,
  FileText,
  MapPin,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { StepInfo } from "./types";

const STEPS: StepInfo[] = [
  { id: 1, title: "Basic Info", icon: User },
  { id: 2, title: "Documents", icon: FileText },
  { id: 3, title: "Vehicle", icon: Car },
  { id: 4, title: "Service Area", icon: MapPin },
  { id: 5, title: "Availability", icon: Calendar },
  { id: 6, title: "Contract", icon: BookOpen },
  { id: 7, title: "Review", icon: ClipboardCheck },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = onStepClick && currentStep > step.id;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted
                      ? "cursor-pointer border-green-500 bg-green-500 text-white hover:bg-green-600"
                      : isCurrent
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300 bg-gray-100 text-gray-400",
                    !isClickable && "cursor-default",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </button>
                <span
                  className={cn(
                    "mt-1 whitespace-nowrap text-center text-xs",
                    isCurrent ? "font-medium text-primary" : "text-gray-500",
                  )}
                >
                  {step.title}
                </span>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1",
                    currentStep > step.id ? "bg-green-500" : "bg-gray-300",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { STEPS };
