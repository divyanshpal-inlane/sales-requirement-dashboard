import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface LatLng {
  lat: number;
  lng: number;
}

interface MapWithRouteProps {
  origin: LatLng | null;
  destination: LatLng | null;
  apiKey: string;
  instructorName: string;
  locationSource: "default" | "previous_booking";
}

export default function MapWithRoute({
  origin,
  destination,
  apiKey,
  instructorName,
  locationSource,
}: MapWithRouteProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(
    null,
  );
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination) {
      setIsLoading(false);
      setMapError("Location data incomplete");
      return;
    }

    const loader = new Loader({
      apiKey,
      libraries: ["places", "geometry"],
      version: "weekly",
    });

    let map: google.maps.Map;
    let directionsService: google.maps.DirectionsService;

    loader
      .load()
      .then(() => {
        map = new window.google.maps.Map(mapRef.current!, {
          center: origin,
          zoom: 12,
          disableDefaultUI: true,
        });

        // Create markers
        const learnerMarker = new google.maps.Marker({
          position: origin,
          map,
          title: "Learner Location",
          label: "A",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
          },
        });

        const instructorMarker = new google.maps.Marker({
          position: destination,
          map,
          title: `${instructorName}'s ${locationSource === "default" ? "Office" : "Current Location"}`,
          label: "B",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: locationSource === "default" ? "#34A853" : "#FBBC05",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
          },
        });

        // Initialize directions
        directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: true,
        });
        directionsRenderer.setMap(map);
        directionsRendererRef.current = directionsRenderer;

        // Calculate route
        directionsService.route(
          {
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
              departureTime: new Date(),
              trafficModel: google.maps.TrafficModel.BEST_GUESS,
            },
          },
          (result, status) => {
            if (status === "OK") {
              directionsRenderer.setDirections(result);
              const leg = result.routes[0].legs[0];
              setDistance(leg.distance?.text || "");
              setDuration(leg.duration?.text || "");
              setIsLoading(false);
              setMapError(null);

              // Adjust map bounds
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(origin);
              bounds.extend(destination);
              map.fitBounds(bounds);
            } else {
              console.error("Directions request failed:", status);
              setMapError("Route calculation failed");
              setIsLoading(false);
            }
          },
        );
      })
      .catch((error) => {
        console.error("Google Maps loading error:", error);
        setMapError("Failed to load maps");
        setIsLoading(false);
      });

    return () => {
      directionsRendererRef.current?.setMap(null);
    };
  }, [origin, destination, apiKey, locationSource]);

  if (mapError) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-red-600">
          {mapError}
        </CardContent>
      </Card>
    );
  }

  if (!origin || !destination) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-gray-500">
          Select an instructor to view route details
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <h4 className="mb-2 font-medium">
            Route to {instructorName}
            <Badge variant="outline" className="ml-2">
              {locationSource === "default" ? "From Office" : "In Transit"}
            </Badge>
          </h4>
          <div className="flex items-center gap-4 text-sm">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Spinner className="h-4 w-4" />
                Calculating best route...
              </div>
            ) : (
              <>
                <Badge className="bg-blue-100 text-blue-800">
                  Distance: {distance}
                </Badge>
                <Badge className="bg-green-100 text-green-800">
                  Duration: {duration}
                </Badge>
              </>
            )}
          </div>
        </div>
        <div
          ref={mapRef}
          style={{ height: "400px", width: "100%" }}
          className="rounded-lg border bg-muted"
        />
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <span>Learner Location (A)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span>
              {locationSource === "default"
                ? "Instructor Office (B)"
                : "Instructor Current Location (B)"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
