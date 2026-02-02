import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function MapWithRoute({
  origin,
  destination,
  apiKey,
  instructorName,
}) {
  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (
      !origin ||
      !destination ||
      !origin.lat ||
      !origin.lng ||
      !destination.lat ||
      !destination.lng
    ) {
      setIsLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey,
      libraries: ["places"],
    });

    let map;
    setIsLoading(true);

    loader
      .load()
      .then(() => {
        map = new window.google.maps.Map(mapRef.current, {
          center: origin,
          zoom: 12,
        });

        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: false,
          draggable: false,
        });
        directionsRenderer.setMap(map);
        directionsRendererRef.current = directionsRenderer;

        directionsService.route(
          {
            origin: new window.google.maps.LatLng(origin.lat, origin.lng),
            destination: new window.google.maps.LatLng(
              destination.lat,
              destination.lng,
            ),
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === "OK") {
              directionsRenderer.setDirections(result);
              // Extract distance and duration
              const leg = result.routes[0].legs[0];
              setDistance(leg.distance.text);
              setDuration(leg.duration.text);
              setIsLoading(false);
            } else {
              console.error("Directions request failed:", status);
              setIsLoading(false);
            }
          },
        );
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
        setIsLoading(false);
      });

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [origin, destination, apiKey]);

  if (!origin || !destination) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">
            Select an instructor to view route and distance
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <h4 className="mb-2 font-medium">
            Route to {instructorName || "Instructor"}
          </h4>
          <div className="flex gap-4 text-sm">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Calculating route...</span>
              </div>
            ) : (
              <>
                {distance && (
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700"
                  >
                    Distance: {distance}
                  </Badge>
                )}
                {duration && (
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700"
                  >
                    Duration: {duration}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
        <div
          ref={mapRef}
          style={{ height: "400px", width: "100%" }}
          className="rounded-lg border"
        />
        {/* Optionally, add UI to show distance and duration */}
        {!isLoading && (distance || duration) && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">
                  Total Distance:
                </span>
                <div className="text-lg font-semibold text-blue-600">
                  {distance}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">
                  Estimated Time:
                </span>
                <div className="text-lg font-semibold text-green-600">
                  {duration}
                </div>
              </div>
            </div>
            <div>A is the learner Location</div>
            <div>B is the Instructor Location</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
