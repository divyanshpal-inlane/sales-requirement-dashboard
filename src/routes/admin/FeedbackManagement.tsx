import { format } from "date-fns";
import { ArrowLeft, Loader2, MessageSquare, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminFeedbackRow,
  FeedbackCheckpoint,
  useAdminLearnerFeedbackList,
} from "@/queries/learnerFeedback";

const Stars = ({ value }: { value: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`h-4 w-4 ${
          n <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ))}
    <span className="ml-1 text-xs text-muted-foreground">({value}/5)</span>
  </div>
);

const checkpointLabel = (cp: FeedbackCheckpoint) =>
  cp === "mid" ? "Midway (50%)" : "Final (100%)";

const checkpointColor = (cp: FeedbackCheckpoint) =>
  cp === "mid" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800";

const FeedbackCard = ({ row }: { row: AdminFeedbackRow }) => {
  const learnerName = row.Learner?.name ?? "Unknown learner";
  const courseName = row.enrollment?.Courses?.name ?? "Unknown course";
  const totalLessons = row.enrollment?.Courses?.total_lessons ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{learnerName}</CardTitle>
            <CardDescription className="mt-1">
              {courseName}
              {totalLessons ? ` · ${totalLessons} lessons` : ""}
              {row.Learner?.phone ? ` · ${row.Learner.phone}` : ""}
            </CardDescription>
          </div>
          <Badge className={checkpointColor(row.checkpoint)}>
            {checkpointLabel(row.checkpoint)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Overall</div>
            <Stars value={row.overall_rating} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Instructor</div>
            <Stars value={row.instructor_rating} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Course</div>
            <Stars value={row.course_rating} />
          </div>
        </div>

        {row.comment && (
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Comment
            </div>
            <p className="text-gray-700">{row.comment}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Submitted {format(new Date(row.created_at), "dd MMM yyyy, hh:mm a")}
        </div>
      </CardContent>
    </Card>
  );
};

export default function FeedbackManagement() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminLearnerFeedbackList();
  const [search, setSearch] = useState("");
  const [checkpointFilter, setCheckpointFilter] = useState<
    "all" | FeedbackCheckpoint
  >("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.filter((row) => {
      if (checkpointFilter !== "all" && row.checkpoint !== checkpointFilter) {
        return false;
      }
      if (!term) return true;
      const haystack = [
        row.Learner?.name,
        row.Learner?.phone,
        row.enrollment?.Courses?.name,
        row.comment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [data, search, checkpointFilter]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, mid: 0, final: 0, avgOverall: 0 };
    const total = data.length;
    const mid = data.filter((r) => r.checkpoint === "mid").length;
    const final = data.filter((r) => r.checkpoint === "final").length;
    const avgOverall =
      total === 0
        ? 0
        : data.reduce((sum, r) => sum + r.overall_rating, 0) / total;
    return { total, mid, final, avgOverall };
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Course Feedback</h1>
            <p className="text-sm text-muted-foreground">
              Learner feedback at midway and course completion checkpoints
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Midway</div>
              <div className="text-2xl font-semibold">{stats.mid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Final</div>
              <div className="text-2xl font-semibold">{stats.final}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Avg overall</div>
              <div className="text-2xl font-semibold">
                {stats.avgOverall.toFixed(1)} / 5
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by learner, phone, course, comment"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={checkpointFilter}
            onValueChange={(v) =>
              setCheckpointFilter(v as "all" | FeedbackCheckpoint)
            }
          >
            <SelectTrigger className="md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All checkpoints</SelectItem>
              <SelectItem value="mid">Midway (50%)</SelectItem>
              <SelectItem value="final">Final (100%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="py-8 text-center text-red-600">
              Failed to load feedback: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No feedback yet.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filtered.map((row) => (
            <FeedbackCard key={row.id} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}
