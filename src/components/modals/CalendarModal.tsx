import { format } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarEvent } from "@/types/schedule";

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarEvents: CalendarEvent[];
}

export const CalendarModal = ({
  open,
  onOpenChange,
  calendarEvents,
}: CalendarModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Instructor's Schedule
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {calendarEvents.length > 0 ? (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {calendarEvents.map((event, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-blue-600">
                          {event.summary}
                        </h4>
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {format(
                              new Date(event.start.dateTime),
                              "MMM dd, yyyy 'at' h:mm a",
                            )}{" "}
                            -{format(new Date(event.end.dateTime), "h:mm a")}
                          </div>
                          {event.location && (
                            <div className="mt-1 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-gray-500">
              No upcoming events found for this instructor.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
