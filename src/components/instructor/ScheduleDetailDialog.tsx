import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, User, ExternalLinkIcon, PhoneOutgoing } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleDetailDialogProps {
  open: boolean;
  schedule: any;
  learner: any;
  onClose: () => void;
}

const ScheduleDetailDialog = ({
  open,
  schedule,
  learner,
  onClose
}: ScheduleDetailDialogProps) => {

  function formatTimeRange(start_time: string, end_time: string): string {
    const formatTime = (time: string): string => {
      const [hours, minutes] = time.split(":");
      let period = "AM";
      let hourNum = parseInt(hours, 10);

      if (hourNum >= 12) {
        period = "PM";
        if (hourNum > 12) {
          hourNum -= 12;
        }
      }

      if (hourNum === 0) {
        hourNum = 12;
      }

      return `${hourNum}:${minutes} ${period}`;
    };

    const formattedStartTime = formatTime(start_time);
    const formattedEndTime = formatTime(end_time);

    return `${formattedStartTime} to ${formattedEndTime}`;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Calendar className="w-5 h-5 text-purple-600" />
            Schedule Details
          </DialogTitle>
          <DialogDescription>
            {learner?.name} - Lesson {schedule?.lesson_id}
          </DialogDescription>
        </DialogHeader>
        {schedule && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <h4 className="flex gap-2 items-center mb-2 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                Date & Time
              </h4>
              <div className="pl-6 space-y-1">
                <p className="text-sm text-gray-700">
                  {new Date(schedule.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-700">
                  {formatTimeRange(
                    schedule.start_time,
                    schedule.end_time
                  )}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="flex gap-2 items-center mb-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Status
              </h4>
              <div className="pl-6">
                <span className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                    schedule.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'}
                `}>
                  {schedule.status?.toUpperCase()}
                </span>
              </div>
            </div>

            {learner && (
              <div>
                <h4 className="flex gap-2 items-center mb-2 text-sm font-medium">
                  <User className="w-4 h-4" />
                  Learner Details
                </h4>
                <div className="pl-6 space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-medium text-gray-500">Name:</span>
                    <span className="text-sm text-gray-700">{learner.name}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-medium text-gray-500">Phone:</span>
                    <span className="text-sm text-gray-700">{learner.phone}</span>
                    <a 
                      href={`tel:+91${learner.phone}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <PhoneOutgoing className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-sm font-medium text-gray-500">Pickup:</span>
                    <a
                      href={`https://www.google.com/maps?q=${learner.address_lat},${learner.address_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-1 items-center text-sm text-blue-600 underline hover:text-blue-800"
                    >
                      {learner.pick_up_location}
                      <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleDetailDialog;
