import { useEffect } from "react";
import { MapPin, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DistanceInfo } from "@/types/schedule";

interface LocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distanceInfo: DistanceInfo | null;
}

const MapComponent = ({ distanceInfo }: { distanceInfo: DistanceInfo }) => {
  useEffect(() => {
    if (!window.google || !distanceInfo) return;

    const map = new window.google.maps.Map(document.getElementById('distance-map'), {
      zoom: 12,
      center: {
        lat: (distanceInfo.instructorLocation.latitude + distanceInfo.learnerLocation.latitude) / 2,
        lng: (distanceInfo.instructorLocation.longitude + distanceInfo.learnerLocation.longitude) / 2
      }
    });

    // Instructor marker
    new window.google.maps.Marker({
      position: {
        lat: distanceInfo.instructorLocation.latitude,
        lng: distanceInfo.instructorLocation.longitude
      },
      map: map,
      title: 'Instructor Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
            <circle cx="15" cy="15" r="12" fill="#007bff" stroke="white" stroke-width="2"/>
            <text x="15" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">I</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(30, 30)
      }
    });

    // Learner marker
    new window.google.maps.Marker({
      position: {
        lat: distanceInfo.learnerLocation.latitude,
        lng: distanceInfo.learnerLocation.longitude
      },
      map: map,
      title: 'Learner Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
            <circle cx="15" cy="15" r="12" fill="#28a745" stroke="white" stroke-width="2"/>
            <text x="15" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">L</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(30, 30)
      }
    });

    // Draw route line
    new window.google.maps.Polyline({
      path: [
        { lat: distanceInfo.instructorLocation.latitude, lng: distanceInfo.instructorLocation.longitude },
        { lat: distanceInfo.learnerLocation.latitude, lng: distanceInfo.learnerLocation.longitude }
      ],
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2,
      map: map
    });

  }, [distanceInfo]);

  return <div id="distance-map" style={{ height: '400px', width: '100%' }} />;
};

export const LocationModal = ({ open, onOpenChange, distanceInfo }: LocationModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <MapPin className="w-5 h-5" />
            Distance & Location Information
          </DialogTitle>
        </DialogHeader>
        {distanceInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distance Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>Distance:</strong> {distanceInfo.distance.toFixed(2)} km
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      <strong>Estimated Travel Time:</strong> {Math.floor(distanceInfo.duration / 60)}h {distanceInfo.duration % 60}min
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Locations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong className="text-blue-600">Instructor:</strong>
                    <p className="text-sm text-gray-600">{distanceInfo.instructorLocation.address}</p>
                  </div>
                  <div>
                    <strong className="text-green-600">Learner:</strong>
                    <p className="text-sm text-gray-600">{distanceInfo.learnerLocation.address}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="overflow-hidden rounded-lg border">
              <MapComponent distanceInfo={distanceInfo} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
