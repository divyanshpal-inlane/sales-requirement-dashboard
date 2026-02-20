import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  Calendar,
  Check,
  Download,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ParsedCalendarEvent, parseICSFromFile } from "@/utils/icsParser";

interface CalendarImportProps {
  onImport: (events: ParsedCalendarEvent[]) => void;
  existingEventsCount?: number;
}

export function CalendarImport({
  onImport,
  existingEventsCount = 0,
}: CalendarImportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [parsedEvents, setParsedEvents] = useState<ParsedCalendarEvent[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".ics") && !file.name.endsWith(".ical")) {
      setError("Please select a valid calendar file (.ics or .ical)");
      return;
    }

    setIsLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const events = await parseICSFromFile(file);

      if (events.length === 0) {
        setError("No events found in the calendar file");
        setParsedEvents([]);
      } else {
        setParsedEvents(events);
        setIsDialogOpen(true);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse calendar file",
      );
      setParsedEvents([]);
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmImport = () => {
    onImport(parsedEvents);
    setIsDialogOpen(false);
    setParsedEvents([]);
    setFileName("");
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setParsedEvents([]);
    setFileName("");
    setError("");
  };

  const formatEventTime = (event: ParsedCalendarEvent): string => {
    if (event.start.dateTime) {
      try {
        const start = parseISO(event.start.dateTime);
        const end = event.end.dateTime ? parseISO(event.end.dateTime) : start;
        return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
      } catch {
        return "Time unavailable";
      }
    }
    return "All Day";
  };

  const formatEventDate = (event: ParsedCalendarEvent): string => {
    const dateStr = event.start.dateTime || event.start.date;
    if (!dateStr) return "";
    try {
      return format(parseISO(dateStr), "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  // Group events by date for preview
  const groupedEvents = parsedEvents.reduce(
    (acc, event) => {
      const dateStr = event.start.dateTime || event.start.date;
      if (!dateStr) return acc;

      const dateKey = dateStr.split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, ParsedCalendarEvent[]>,
  );

  const sortedDateKeys = Object.keys(groupedEvents).sort();

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Calendar Import
          </CardTitle>
          <CardDescription className="text-sm">
            Import your calendar events from Google Calendar, Apple Calendar, or
            Outlook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions */}
          <div className="space-y-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium">How to export your calendar:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>Google Calendar:</strong> Settings &rarr; Import &
                Export &rarr; Export
              </li>
              <li>
                <strong>Apple Calendar:</strong> File &rarr; Export &rarr;
                Export...
              </li>
              <li>
                <strong>Outlook:</strong> Calendar &rarr; Share &rarr; Get Link
                &rarr; ICS
              </li>
            </ul>
          </div>

          {/* Import Status */}
          {existingEventsCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              <span>{existingEventsCount} event(s) imported</span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Import Button */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics,.ical"
              onChange={handleFileSelect}
              className="hidden"
              id="calendar-file-input"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FileText className="mr-2 h-4 w-4 animate-pulse" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {existingEventsCount > 0
                    ? "Import New Calendar"
                    : "Import Calendar (.ics)"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Import Calendar Events
            </DialogTitle>
            <DialogDescription>
              Review the events found in{" "}
              <span className="font-medium">{fileName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Events Found</span>
              <Badge variant="secondary">{parsedEvents.length}</Badge>
            </div>

            <ScrollArea className="h-[300px] rounded-md border p-3">
              <div className="space-y-4">
                {sortedDateKeys.map((dateKey) => (
                  <div key={dateKey}>
                    <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                      {groupedEvents[dateKey][0] &&
                        formatEventDate(groupedEvents[dateKey][0])}
                    </h4>
                    <div className="space-y-2">
                      {groupedEvents[dateKey].map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 p-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {event.summary}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatEventTime(event)}
                            </p>
                            {event.location && (
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport}>
              <Check className="mr-2 h-4 w-4" />
              Import {parsedEvents.length} Events
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
