import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Calendar, BookOpen, ExternalLinkIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface EventModalProps {
  open: boolean;
  event: any;
  onClose: () => void;
}

const EventModal = ({ open, event, onClose }: EventModalProps) => {
  const formatEventTime = (date: any) => {
    if (!date) return '';
    const dateObj = new Date(date.dateTime || date.date || date);
    return format(dateObj, "h:mm a");
  };

  const formatEventDate = (date: any) => {
    if (!date) return '';
    const dateObj = new Date(date.dateTime || date.date || date);
    return format(dateObj, "EEEE, MMMM d, yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center text-xl">
            <Calendar className="w-5 h-5 text-orange-600" />
            {event?.summary || event?.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {event && (
              <div className="flex flex-col gap-1 mt-2">
                <p className="font-medium">
                  {formatEventDate(event.start)}
                </p>
                <p>
                  {formatEventTime(event.start)} -{" "}
                  {formatEventTime(event.end)}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        {event && (
          <div className="flex flex-col gap-4 py-2">
            {event.description && (
              <div>
                <h4 className="flex gap-2 items-center mb-2 text-sm font-medium">
                  <BookOpen className="w-4 h-4" />
                  Description
                </h4>
                <p className="pl-6 text-sm text-gray-700">
                  {event.description}
                </p>
              </div>
            )}

            {event.location && (
              <div>
                <h4 className="flex gap-2 items-center mb-2 text-sm font-medium">
                  <ExternalLinkIcon className="w-4 h-4" />
                  Location
                </h4>
                <p className="pl-6 text-sm text-gray-700">
                  {event.location}
                </p>
              </div>
            )}

            {event.attendees &&
              event.attendees.length > 0 && (
                <div>
                  <h4 className="flex gap-2 items-center mb-2 text-sm font-medium">
                    <User className="w-4 h-4" />
                    Attendees
                  </h4>
                  <ul className="pl-6 space-y-1 text-sm text-gray-700">
                    {event.attendees.map((attendee: any, index: number) => (
                      <li key={index} className="flex gap-2 items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        {attendee.email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {event.creator && (
              <div>
                <h4 className="flex gap-2 items-center mb-2 text-sm font-medium">
                  <User className="w-4 h-4" />
                  Organizer
                </h4>
                <p className="pl-6 text-sm text-gray-700">
                  {event.creator.email}
                </p>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          {event?.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <ExternalLinkIcon className="mr-2 w-4 h-4" />
              View in Google Calendar
            </a>
          )}
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

export default EventModal;
