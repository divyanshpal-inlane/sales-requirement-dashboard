import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import LessonRouteMap from "@/components/admin/LessonRouteMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateDuration, calculateTotalDistance } from "@/lib/geoUtils";
import { supabase } from "@/lib/supabaseClient";

interface TrackingPoint {
  schedule_id: number;
  latitude: number;
  longitude: number;
  captured_at: string;
}

interface InstructorAnalyticsProps {
  instructorId: string;
  instructorName: string;
  open: boolean;
  onClose: () => void;
}

export default function InstructorAnalytics({
  instructorId,
  instructorName,
  open,
  onClose,
}: InstructorAnalyticsProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [routeScheduleId, setRouteScheduleId] = useState<number | null>(null);
  const [routeLabel, setRouteLabel] = useState("");

  const { data: schedules, isLoading } = useQuery({
    queryKey: [
      "instructor-analytics",
      instructorId,
      dateFrom,
      dateTo,
      statusFilter,
    ],
    queryFn: async () => {
      let query = supabase
        .from("Schedule")
        .select(
          "id, date, start_time, end_time, status, started_at, ended_at, otp, otp_end, Learner(name), Lesson(number)",
        )
        .eq("instructor_id", instructorId)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false });

      if (dateFrom) query = query.gte("date", dateFrom);
      if (dateTo) query = query.lte("date", dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open && !!instructorId,
  });

  // Fetch tracking data for distance calculations
  const { data: allTracking } = useQuery<TrackingPoint[]>({
    queryKey: ["instructor-tracking-summary", instructorId, dateFrom, dateTo],
    queryFn: async () => {
      const scheduleIds = schedules?.map((s) => s.id) || [];
      if (scheduleIds.length === 0) return [];
      const { data, error } = await supabase
        .from("lesson_tracking" as any)
        .select("schedule_id, latitude, longitude, captured_at")
        .in("schedule_id", scheduleIds)
        .order("captured_at", { ascending: true });
      if (error) throw error;
      return data as unknown as TrackingPoint[];
    },
    enabled: !!schedules && schedules.length > 0,
  });

  // Group tracking by schedule_id
  const trackingBySchedule = new Map<number, TrackingPoint[]>();
  allTracking?.forEach((point) => {
    const existing = trackingBySchedule.get(point.schedule_id) || [];
    existing.push(point);
    trackingBySchedule.set(point.schedule_id, existing);
  });

  // Calculate stats
  const otpCompleted =
    schedules?.filter(
      (s) => s.status === "completed" && s.started_at && s.ended_at,
    ) || [];
  const manualCompleted =
    schedules?.filter(
      (s) => s.status === "completed" && (!s.started_at || !s.ended_at),
    ) || [];
  const totalCompleted = otpCompleted.length + manualCompleted.length;
  const otpRate =
    totalCompleted > 0
      ? Math.round((otpCompleted.length / totalCompleted) * 100)
      : 0;
  const penalties =
    schedules?.filter((s) => {
      const lessonEnd = new Date(`${s.date}T${s.end_time}`);
      const isPast = lessonEnd < new Date();
      if (!isPast) return false;
      if (s.status === "completed" && (!s.started_at || !s.ended_at))
        return true;
      if (s.status === "booked" || s.status === "ongoing") return true;
      return false;
    }) || [];

  // Total actual hours taught (from started_at to ended_at)
  const totalHoursTaught = otpCompleted.reduce((sum, s) => {
    if (!s.started_at || !s.ended_at) return sum;
    const diff =
      (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
      (1000 * 60 * 60);
    return sum + diff;
  }, 0);

  // Total distance
  const totalDistanceKm = Array.from(trackingBySchedule.values()).reduce(
    (sum, points) => {
      if (!points || points.length < 2) return sum;
      return sum + calculateTotalDistance(points);
    },
    0,
  );

  // Filtered schedules for table
  const filteredSchedules =
    statusFilter === "all"
      ? schedules
      : statusFilter === "otp"
        ? otpCompleted
        : statusFilter === "manual"
          ? manualCompleted
          : statusFilter === "penalty"
            ? penalties
            : schedules;

  const getStatusBadge = (schedule: any) => {
    if (
      schedule.status === "completed" &&
      schedule.started_at &&
      schedule.ended_at
    ) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          OTP Verified
        </Badge>
      );
    }
    if (schedule.status === "completed") {
      return (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
          Manual
        </Badge>
      );
    }
    if (schedule.status === "ongoing") {
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Ongoing
        </Badge>
      );
    }
    if (schedule.status === "booked") {
      return <Badge variant="outline">Booked</Badge>;
    }
    if (schedule.status === "paused") {
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          Paused
        </Badge>
      );
    }
    return <Badge variant="outline">{schedule.status}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analytics — {instructorName}</DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="otp">OTP Verified</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="penalty">Penalties</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-gray-400">Loading...</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-lg font-bold text-green-700">
                          {otpCompleted.length}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          OTP Verified
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="text-lg font-bold text-orange-700">
                          {manualCompleted.length}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Manual / Legacy
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                      <div>
                        <p className="text-lg font-bold text-indigo-700">
                          {otpRate}%
                        </p>
                        <p className="text-[10px] text-gray-500">OTP Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-lg font-bold text-purple-700">
                          {totalHoursTaught.toFixed(1)}h
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Hours Taught
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="flex items-center gap-2 p-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-semibold">
                        {schedules?.length || 0}
                      </p>
                      <p className="text-[10px] text-gray-500">Total Lessons</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-2 p-3">
                    <Navigation className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-semibold">
                        {totalDistanceKm.toFixed(1)} km
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Total Distance
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-2 p-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold">
                        {penalties.length}
                      </p>
                      <p className="text-[10px] text-gray-500">Penalties</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lesson Breakdown Table */}
              <div className="max-h-[40vh] overflow-y-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b text-left">
                      <th className="p-2">Date</th>
                      <th className="p-2">Lesson</th>
                      <th className="p-2">Learner</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Duration</th>
                      <th className="p-2">Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredSchedules || []).map((s) => {
                      const tracking = trackingBySchedule.get(s.id);
                      const distance =
                        tracking && tracking.length >= 2
                          ? calculateTotalDistance(tracking)
                          : null;
                      const actualDuration =
                        s.started_at && s.ended_at
                          ? Math.round(
                              (new Date(s.ended_at).getTime() -
                                new Date(s.started_at).getTime()) /
                                (1000 * 60),
                            )
                          : null;

                      return (
                        <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            {format(new Date(s.date), "dd MMM")}
                          </td>
                          <td className="p-2">
                            {(s.Lesson as any)?.number ?? "-"}
                          </td>
                          <td className="max-w-[100px] truncate p-2">
                            {(s.Learner as any)?.name ?? "-"}
                          </td>
                          <td className="p-2">
                            {s.start_time?.substring(0, 5)} -{" "}
                            {s.end_time?.substring(0, 5)}
                          </td>
                          <td className="p-2">{getStatusBadge(s)}</td>
                          <td className="p-2">
                            {actualDuration !== null
                              ? `${actualDuration}m`
                              : "-"}
                          </td>
                          <td className="p-2">
                            {s.started_at && s.ended_at ? (
                              <button
                                className="text-blue-600 underline hover:text-blue-800"
                                onClick={() => {
                                  setRouteScheduleId(s.id);
                                  setRouteLabel(
                                    `Lesson ${(s.Lesson as any)?.number ?? ""}`,
                                  );
                                }}
                              >
                                {distance !== null
                                  ? `${distance.toFixed(1)}km`
                                  : "View"}
                              </button>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {(!filteredSchedules || filteredSchedules.length === 0) && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-6 text-center text-gray-400"
                        >
                          No lessons found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <LessonRouteMap
        scheduleId={routeScheduleId ?? 0}
        open={routeScheduleId !== null}
        onClose={() => setRouteScheduleId(null)}
        lessonLabel={routeLabel}
      />
    </>
  );
}
