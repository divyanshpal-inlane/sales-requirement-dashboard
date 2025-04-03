import { Map, MapEvent, useMapsLibrary } from "@vis.gl/react-google-maps";
import { ArrowLeft, MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS } from "@/constants/courses";
import { useLearnerUpdate } from "@/queries/learner";

const mapContainerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "0.5rem",
  position: "relative",
} as const;

const markerStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -100%)",
  zIndex: 1,
  pointerEvents: "none",
} as const;

const defaultCenter = {
  lat: 17.385044,
  lng: 78.486671,
};

export default function ScheduleDetails() {
  const { mutate: updateLearner } = useLearnerUpdate();
  const [address, setAddress] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [addressLat, setAddressLat] = useState<number>();
  const [addressLng, setAddressLng] = useState<number>();

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const places = useMapsLibrary("places");

  // Initialize Autocomplete when the component mounts
  useEffect(() => {
    if (!inputRef.current || !places || autocompleteRef.current) return;
    autocompleteRef.current = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "IN" },
      fields: ["address_components", "formatted_address", "geometry"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.formatted_address || !place.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setAddressLat(lat);
      setAddressLng(lng);
      setAddress(place.formatted_address);

      const postcodeComponent = place.address_components?.find((component) =>
        component.types.includes("postal_code"),
      );
      if (postcodeComponent) {
        setPinCode(postcodeComponent.long_name);
      }
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [places]);

  const onCameraChanged = useCallback((ev: MapEvent) => {
    const center = ev.map.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();
    setAddressLat(lat);
    setAddressLng(lng);

    // Reverse geocode to get address
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { location: { lat: lat, lng: lng } },
      (results, status) => {
        if (status === "OK" && results?.[0]) {
          setAddress(results[0].formatted_address);
          const postcodeComponent = results[0].address_components?.find(
            (component) => component.types.includes("postal_code"),
          );
          if (postcodeComponent) {
            setPinCode(postcodeComponent.long_name);
          }
        }
      },
    );
  }, []);

  const onContinue = useCallback(() => {
    updateLearner(
      {
        pincode: pinCode,
        pick_up_location: address,
        area,
        address_lat: addressLat,
        address_lng: addressLng,
      },
      {
        onSuccess: () => {
          navigate("/createSchedule/onboardingQuestions");
        },
      },
    );
  }, [address, navigate, pinCode, updateLearner, area, addressLat, addressLng]);

  return (
    <div className="flex h-full w-full flex-col rounded-md overflow-y-auto scrollbar-hide">
      <div className="flex flex-col rounded-b-[40px] bg-primary">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <span className="text-lg font-semibold text-primary-foreground">
            1/4
          </span>
        </div>
        <div className="relative z-10 rounded-b-[40px] bg-primary p-6 text-primary-foreground">
          <h1 className="mb-1 text-xl font-semibold">Pick-up location</h1>
          <p className="">Our instructor&apos;s will meet you here</p>
        </div>
      </div>
      <div className="mt-8 flex w-full flex-col items-center gap-10 bg-white p-6">
        <div className="w-full space-y-4">
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="areaSelect">Select Area</Label>
            <Select value={area} onValueChange={(val) => setArea(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an area" />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="input1">Address</Label>
            <Input
              id="input1"
              type="text"
              placeholder="Start typing your address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              ref={inputRef}
            />
          </div>
          <div className="flex w-full flex-col gap-1">
            <Label htmlFor="input2">Pin code</Label>
            <Input
              id="input2"
              type="text"
              placeholder="500001"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
            />
          </div>
          {addressLat && addressLng && (
            <div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
              <Map
                defaultZoom={17}
                defaultCenter={{ lat: addressLat, lng: addressLng }}
                center={{ lat: addressLat, lng: addressLng }}
                gestureHandling="greedy"
                disableDefaultUI={false}
                style={mapContainerStyle}
                onCameraChanged={(e) => {
                  setAddressLat(e.detail.center.lat);
                  setAddressLng(e.detail.center.lng);
                }}
                onDragend={onCameraChanged}
              />
              <div style={markerStyle}>
                <MapPin
                  className="h-8 w-8 text-black"
                  strokeWidth={1}
                  fill="hsl(var(--primary))"
                />
              </div>
            </div>
          )}
        </div>
        <Button className="w-full" onClick={() => onContinue()}>
          Continue
        </Button>
      </div>
    </div>
  );
}
