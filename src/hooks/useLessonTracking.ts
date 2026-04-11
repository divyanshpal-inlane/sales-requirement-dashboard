import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

type TrackingPointType = "start" | "tracking" | "end";

export function useLessonTracking() {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduleIdRef = useRef<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const capturePoint = useCallback(
    async (scheduleId: number, type: TrackingPointType) => {
      return new Promise<boolean>((resolve) => {
        if (!navigator.geolocation) {
          console.warn("Geolocation not supported");
          resolve(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await supabase.from("lesson_tracking" as any).insert({
                schedule_id: scheduleId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                type,
              } as any);
              resolve(true);
            } catch (err) {
              console.error("Failed to save tracking point:", err);
              resolve(false);
            }
          },
          (error) => {
            console.warn("Geolocation error:", error.message);
            if (error.code === error.PERMISSION_DENIED) {
              setPermissionDenied(true);
            }
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      });
    },
    [],
  );

  const startTracking = useCallback(
    (scheduleId: number) => {
      scheduleIdRef.current = scheduleId;
      setIsTracking(true);

      // Capture periodic points every 30 seconds
      intervalRef.current = setInterval(() => {
        if (scheduleIdRef.current) {
          capturePoint(scheduleIdRef.current, "tracking");
        }
      }, 30000);
    },
    [capturePoint],
  );

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    scheduleIdRef.current = null;
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    capturePoint,
    startTracking,
    stopTracking,
    isTracking,
    permissionDenied,
  };
}
