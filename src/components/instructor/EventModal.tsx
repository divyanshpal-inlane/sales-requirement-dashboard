import { format } from "date-fns";
import { BookOpen, Calendar, ExternalLinkIcon, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EventModalProps {
  open: boolean;
  event: any;
  onClose: () => void;
}

const EventModal = ({ open, event, onClose }: EventModalProps) => {
  const formatEventTime = (date: any) => {
    if (!date) return "";
    const dateObj = new Date(date.dateTime || date.date || date);
    return format(dateObj, "h:mm a");
  };

  const formatEventDate = (date: any) => {
    if (!date) return "";
    const dateObj = new Date(date.dateTime || date.date || date);
    return format(dateObj, "EEEE, MMMM d, yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-orange-600" />
            {event?.summary || event?.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {event && (
              <div className="mt-2 flex flex-col gap-1">
                <p className="font-medium">{formatEventDate(event.start)}</p>
                <p>
                  {formatEventTime(event.start)} - {formatEventTime(event.end)}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        {event && (
          <div className="flex flex-col gap-4 py-2">
            {event.description && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4" />
                  Description
                </h4>
                <p className="pl-6 text-sm text-gray-700">
                  {event.description}
                </p>
              </div>
            )}

            {event.location && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ExternalLinkIcon className="h-4 w-4" />
                  Location
                </h4>
                <p className="pl-6 text-sm text-gray-700">{event.location}</p>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Attendees
                </h4>
                <ul className="space-y-1 pl-6 text-sm text-gray-700">
                  {event.attendees.map((attendee: any, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                      {attendee.email}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {event.creator && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
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
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              View in Google Calendar
            </a>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
