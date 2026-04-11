import { Loader2, MapPin, Navigation, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calculateDuration,
  calculateTotalDistance,
} from "@/lib/geoUtils";
import { supabase } from "@/lib/supabaseClient";
import { googleMapsLoader } from "@/utils/googleMaps";

interface TrackingPoint {
  id: string;
  schedule_id: number;
  latitude: number;
  longitude: number;
  captured_at: string;
  type: string;
}

interface LessonRouteMapProps {
  scheduleId: number;
  open: boolean;
  onClose: () => void;
  lessonLabel?: string;
}

export default function LessonRouteMap({
  scheduleId,
  open,
  onClose,
  lessonLabel,
}: LessonRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const { data: trackingPoints, isLoading } = useQuery<TrackingPoint[]>({
    queryKey: ["lesson-tracking", scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_tracking" as any)
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("captured_at", { ascending: true });
      if (error) throw error;
      return data as unknown as TrackingPoint[];
    },
    enabled: open && !!scheduleId,
  });

  const totalDistance =
    trackingPoints && trackingPoints.length >= 2
      ? calculateTotalDistance(trackingPoints)
      : 0;
  const totalDuration =
    trackingPoints && trackingPoints.length >= 2
      ? calculateDuration(trackingPoints)
      : 0;
  const startPoint = trackingPoints?.find((p) => p.type === "start");
  const endPoint = trackingPoints
    ?.slice()
    .reverse()
    .find((p) => p.type === "end");

  useEffect(() => {
    if (!open || !mapRef.current || !trackingPoints || trackingPoints.length === 0)
      return;

    const initMap = async () => {
      const google = await googleMapsLoader.load();
      const bounds = new google.maps.LatLngBounds();

      const map = new google.maps.Map(mapRef.current!, {
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
      });

      // Draw polyline
      const path = trackingPoints.map((p) => ({
        lat: Number(p.latitude),
        lng: Number(p.longitude),
      }));

      path.forEach((p) => bounds.extend(p));

      new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#4285F4",
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map,
      });

      // Start marker (green)
      if (path.length > 0) {
        new google.maps.Marker({
          position: path[0],
          map,
          label: { text: "S", color: "white", fontWeight: "bold" },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#34A853",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
          },
          title: "Lesson Start",
        });
      }

      // End marker (red)
      if (path.length > 1) {
        new google.maps.Marker({
          position: path[path.length - 1],
          map,
          label: { text: "E", color: "white", fontWeight: "bold" },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#EA4335",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
          },
          title: "Lesson End",
        });
      }

      // Tracking point markers (small blue dots)
      trackingPoints
        .filter((p) => p.type === "tracking")
        .forEach((p) => {
          new google.maps.Marker({
            position: { lat: Number(p.latitude), lng: Number(p.longitude) },
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 4,
              fillColor: "#4285F4",
              fillOpacity: 0.6,
              strokeColor: "white",
              strokeWeight: 1,
            },
          });
        });

      map.fitBounds(bounds, 50);
      setMapInstance(map);
    };

    initMap();
  }, [open, trackingPoints]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Lesson Route {lessonLabel ? `— ${lessonLabel}` : ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !trackingPoints || trackingPoints.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p>No GPS data available for this lesson</p>
            <p className="mt-1 text-xs text-gray-400">
              GPS tracking captures location when the instructor has the app
              open during the lesson
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stats */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="gap-1 border-blue-200 bg-blue-50 text-blue-700"
              >
                <Navigation className="h-3 w-3" />
                {totalDistance.toFixed(2)} km
              </Badge>
              <Badge
                variant="outline"
                className="gap-1 border-green-200 bg-green-50 text-green-700"
              >
                <Timer className="h-3 w-3" />
                {Math.round(totalDuration)} min
              </Badge>
              <Badge
                variant="outline"
                className="gap-1 border-gray-200 bg-gray-50 text-gray-600"
              >
                <MapPin className="h-3 w-3" />
                {trackingPoints.length} GPS points
              </Badge>
              {trackingPoints.length === 2 &&
                startPoint &&
                endPoint && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-700"
                  >
                    Start + End only (limited data)
                  </Badge>
                )}
            </div>

            {/* Timestamps */}
            {startPoint && (
              <div className="flex gap-4 text-xs text-gray-500">
                <span>
                  Started:{" "}
                  {new Date(startPoint.captured_at).toLocaleString()}
                </span>
                {endPoint && (
                  <span>
                    Ended:{" "}
                    {new Date(endPoint.captured_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Map */}
            <div
              ref={mapRef}
              className="h-[400px] w-full rounded-lg border"
            />

            {/* Legend */}
            <div className="flex gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-[#34A853]" />
                Start
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-[#EA4335]" />
                End
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-[#4285F4]" />
                Tracking point
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
