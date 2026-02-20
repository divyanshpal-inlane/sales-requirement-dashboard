import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  Calendar,
  Check,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import { StepProps } from "../types";

export function CalendarImportStep({ data, updateData }: StepProps) {
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
    updateData({ importedCalendarEvents: parsedEvents });
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

  const handleClearEvents = () => {
    updateData({ importedCalendarEvents: [] });
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

  // Group imported events by date
  const importedGroupedEvents = data.importedCalendarEvents.reduce(
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
  const importedSortedDateKeys = Object.keys(importedGroupedEvents).sort();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Calendar Import</h2>
        <p className="text-sm text-muted-foreground">
          Import existing calendar events to avoid scheduling conflicts
          (optional)
        </p>
      </div>

      {/* Instructions */}
      <div className="space-y-2 rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          How to export your calendar:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Google Calendar:</strong> Settings &rarr; Import & Export
            &rarr; Export
          </li>
          <li>
            <strong>Apple Calendar:</strong> File &rarr; Export &rarr; Export...
          </li>
          <li>
            <strong>Outlook:</strong> Calendar &rarr; Share &rarr; Get Link
            &rarr; ICS
          </li>
        </ul>
      </div>

      {/* Import Status */}
      {data.importedCalendarEvents.length > 0 && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">
                {data.importedCalendarEvents.length} event(s) imported
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearEvents}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>

          {/* Show imported events preview */}
          <div className="mt-3 max-h-40 overflow-y-auto">
            <div className="space-y-2">
              {importedSortedDateKeys.slice(0, 5).map((dateKey) => (
                <div key={dateKey} className="text-sm">
                  <span className="font-medium text-green-700">
                    {importedGroupedEvents[dateKey][0] &&
                      formatEventDate(importedGroupedEvents[dateKey][0])}
                    :
                  </span>
                  <span className="ml-2 text-green-600">
                    {importedGroupedEvents[dateKey]
                      .slice(0, 2)
                      .map((e) => e.summary)
                      .join(", ")}
                    {importedGroupedEvents[dateKey].length > 2 &&
                      ` +${importedGroupedEvents[dateKey].length - 2} more`}
                  </span>
                </div>
              ))}
              {importedSortedDateKeys.length > 5 && (
                <p className="text-sm text-green-600">
                  +{importedSortedDateKeys.length - 5} more days...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Import Button */}
      <div>
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
              Parsing calendar file...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {data.importedCalendarEvents.length > 0
                ? "Import New Calendar File"
                : "Import Calendar (.ics)"}
            </>
          )}
        </Button>
      </div>

      {/* Skip message */}
      <p className="text-center text-sm text-muted-foreground">
        This step is optional. You can skip it and import calendar later.
      </p>

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
    </div>
  );
}
