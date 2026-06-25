import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Check, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentAdmin } from "@/queries/adminPermissions";
import {
  NoShowCase,
  useFlagInstructorNoShow,
  useNoShowCases,
  usePotentialInstructorNoShows,
  useResolveNoShow,
} from "@/queries/noShow";

const PARTY_STYLE: Record<string, string> = {
  learner: "border-blue-200 bg-blue-50 text-blue-700",
  instructor: "border-purple-200 bg-purple-50 text-purple-700",
};
const STATUS_STYLE: Record<string, string> = {
  open: "border-amber-200 bg-amber-100 text-amber-800",
  resolved: "border-emerald-200 bg-emerald-100 text-emerald-800",
  dismissed: "border-gray-200 bg-gray-100 text-gray-600",
};

const fmtWhen = (c: NoShowCase) =>
  c.date
    ? `${format(new Date(c.date), "EEE d MMM")} · ${c.startTime?.slice(0, 5) ?? ""}–${c.endTime?.slice(0, 5) ?? ""}`
    : "—";

function ReportedCases() {
  const { data: cases, isLoading } = useNoShowCases();
  const resolve = useResolveNoShow();
  const { data: admin } = useCurrentAdmin();
  const { toast } = useToast();

  const act = async (id: string, status: "resolved" | "dismissed") => {
    try {
      await resolve.mutateAsync({ id, status, resolverName: admin?.name ?? "Admin" });
      toast({ title: status === "resolved" ? "Marked resolved" : "Dismissed" });
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (!cases || cases.length === 0)
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No no-show cases reported.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-2">
      {cases.map((c) => (
        <Card key={c.id}>
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-[10px] capitalize ${PARTY_STYLE[c.no_show_party]}`}>
                  {c.no_show_party} no-show
                </Badge>
                <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_STYLE[c.status]}`}>
                  {c.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{fmtWhen(c)}</span>
              </div>
              <div className="mt-1 text-sm">
                <span className="font-medium">{c.learnerName ?? "Learner"}</span>
                {c.instructorName ? <span className="text-muted-foreground"> · {c.instructorName}</span> : ""}
                {c.lessonNumber != null && (
                  <span className="text-muted-foreground"> · Lesson {c.lessonNumber}</span>
                )}
              </div>
              {c.note && <p className="mt-0.5 text-xs text-muted-foreground">“{c.note}”</p>}
              {c.resolution && (
                <p className="mt-0.5 text-xs text-emerald-700">Resolution: {c.resolution}</p>
              )}
            </div>
            {c.status === "open" && (
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" className="h-8" disabled={resolve.isPending} onClick={() => act(c.id, "resolved")}>
                  <Check className="mr-1 h-3 w-3" /> Resolve
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" disabled={resolve.isPending} onClick={() => act(c.id, "dismissed")}>
                  <X className="mr-1 h-3 w-3" /> Dismiss
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PotentialInstructorNoShows() {
  const { data: rows, isLoading } = usePotentialInstructorNoShows();
  const flag = useFlagInstructorNoShow();
  const { toast } = useToast();

  const doFlag = async (scheduleId: number) => {
    try {
      await flag.mutateAsync({ scheduleId, note: "Lesson never started (no OTP)" });
      toast({ title: "Flagged as instructor no-show" });
    } catch (e) {
      toast({
        title: "Couldn't flag",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (!rows || rows.length === 0)
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No suspected instructor no-shows.
        </CardContent>
      </Card>
    );

  return (
    <>
      <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
        <AlertTriangle className="h-3 w-3 text-amber-500" />
        Past booked lessons that never started (no OTP). Confirm to log as an instructor no-show.
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.scheduleId}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 text-sm">
                <div className="font-medium">{r.instructorName ?? "Instructor"}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(r.date), "EEE d MMM")} · {r.startTime?.slice(0, 5)}–{r.endTime?.slice(0, 5)} ·{" "}
                  {r.learnerName ?? "Learner"}
                  {r.lessonNumber != null ? ` · Lesson ${r.lessonNumber}` : ""}
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 border-purple-200 text-purple-700 hover:bg-purple-50" disabled={flag.isPending} onClick={() => doFlag(r.scheduleId)}>
                Flag no-show
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function NoShowManagement() {
  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">No-show Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage learner & instructor no-show cases.
            </p>
          </div>
        </div>

        <Tabs defaultValue="reported">
          <TabsList>
            <TabsTrigger value="reported">Reported cases</TabsTrigger>
            <TabsTrigger value="potential">Potential instructor no-shows</TabsTrigger>
          </TabsList>
          <TabsContent value="reported" className="mt-4">
            <ReportedCases />
          </TabsContent>
          <TabsContent value="potential" className="mt-4">
            <PotentialInstructorNoShows />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
