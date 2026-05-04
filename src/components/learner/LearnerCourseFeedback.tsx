import { Star } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useLearner } from "@/queries/learner";
import {
  PendingFeedback,
  useLearnerPendingFeedback,
  useSubmitLearnerFeedback,
} from "@/queries/learnerFeedback";

interface Props {
  pending: PendingFeedback;
}

// Self-contained mount point. Drop this anywhere in the learner-protected
// tree (we mount it in MainLayout so it works on /home, /schedule, /prep,
// /help) and it'll fetch the learner + pending checkpoints itself, then
// render the modal when there's something to show. Mid takes priority over
// final — if both are due, mid is asked first.
export function LearnerCourseFeedbackPrompt() {
  const { data: learner } = useLearner();
  const { data: pending } = useLearnerPendingFeedback(learner?.id);
  const active =
    pending?.find((p) => p.checkpoint === "mid") ??
    pending?.find((p) => p.checkpoint === "final") ??
    null;
  if (!active) return null;
  return <LearnerCourseFeedback pending={active} />;
}

const StarRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm font-medium">{label}</span>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={`h-6 w-6 ${
              n <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  </div>
);

export default function LearnerCourseFeedback({ pending }: Props) {
  const { toast } = useToast();
  const submit = useSubmitLearnerFeedback();
  const [overall, setOverall] = useState(0);
  const [instructor, setInstructor] = useState(0);
  const [course, setCourse] = useState(0);
  const [comment, setComment] = useState("");

  const isMid = pending.checkpoint === "mid";
  const title = isMid
    ? "How are your lessons going so far?"
    : "Tell us about your experience";
  const description = isMid
    ? `You've completed ${pending.completedHours} of ${pending.totalLessons} lessons. Your feedback helps us improve.`
    : `You've completed your ${pending.courseName ?? "course"}. We'd love to hear how it went.`;

  const isValid = overall > 0 && instructor > 0 && course > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      await submit.mutateAsync({
        enrollmentId: pending.enrollmentId,
        learnerId: pending.learnerId,
        checkpoint: pending.checkpoint,
        overallRating: overall,
        instructorRating: instructor,
        courseRating: course,
        comment,
      });
      toast({
        title: "Thanks for your feedback!",
        description: "We've shared this with the team.",
      });
    } catch (err) {
      toast({
        title: "Could not submit feedback",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Non-dismissable: no onOpenChange wired so the learner has to submit before
  // they can use the rest of the app.
  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <StarRow
            label="Overall experience"
            value={overall}
            onChange={setOverall}
          />
          <StarRow
            label="Instructor"
            value={instructor}
            onChange={setInstructor}
          />
          <StarRow label="Course content" value={course} onChange={setCourse} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="lcf-comment">
              Anything else? (optional)
            </label>
            <Textarea
              id="lcf-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share any thoughts about your lessons or instructor"
              maxLength={1024}
              rows={3}
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || submit.isPending}
          className="w-full"
        >
          {submit.isPending ? "Submitting…" : "Submit feedback"}
        </Button>
        {!isValid && (
          <p className="text-center text-xs text-muted-foreground">
            Please rate all three categories to submit.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
