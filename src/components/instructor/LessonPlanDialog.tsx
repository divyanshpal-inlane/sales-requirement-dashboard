import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { LessonPlan } from "@/components/lesson/plan";

interface LessonPlanDialogProps {
  open: boolean;
  lesson: any;
  learner: any;
  onClose: () => void;
}

const LessonPlanDialog = ({
  open,
  lesson,
  learner,
  onClose,
}: LessonPlanDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-600" />
            Lesson Plan
          </DialogTitle>
          <DialogDescription>
            Detailed lesson plan for {learner?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="h-full overflow-auto">
          {lesson && learner && (
            <LessonPlan
              lesson={lesson}
              learner={learner}
              nextLessonId={null}
              prevLessonId={null}
            />
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LessonPlanDialog;
