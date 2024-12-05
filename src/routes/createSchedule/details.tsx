import { useLoadScript } from "@react-google-maps/api";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react"; // Add this import
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
import { AREAS } from "@/constants/courses"; // Add this import
import { useLearnerUpdate } from "@/queries/learner";

const libraries = ["places"];

export default function ScheduleDetails() {
  const { mutate: updateLearner } = useLearnerUpdate();
  // Add state for address and pin code
  const [address, setAddress] = useState<string>("");
  const [pinCode, setPinCode] = useState<string>("");

  const [area, setArea] = useState<string>(""); // Add state for area
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);

  const navigate = useNavigate();

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries as ["places"],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        componentRestrictions: { country: "IN" },
        fields: ["address_components", "formatted_address", "geometry"],
      },
    );

    const listener = autocompleteRef.current.addListener(
      "place_changed",
      () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
          setAddress(place.formatted_address);

          if (place.geometry?.location) {
            setAddressLat(place.geometry.location.lat());
            setAddressLng(place.geometry.location.lng());
          }

          const postcodeComponent = place.address_components?.find(
            (component) => component.types.includes("postal_code"),
          );
          if (postcodeComponent) {
            setPinCode(postcodeComponent.long_name);
          }
        }
      },
    );

    // Cleanup listener when component unmounts
    return () => {
      google.maps.event.removeListener(listener);
      autocompleteRef.current = null;
    };
  }, [isLoaded]);

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
          navigate("/createSchedule/uploadLL");
        },
      },
    );
  }, [address, navigate, pinCode, updateLearner, area, addressLat, addressLng]);

  return (
    <div className="flex h-full w-full flex-col rounded-md">
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
            1/3
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
            <Select
              value={area} // Bind value to state
              onValueChange={(val) => setArea(val)} // Update state on change
            >
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
              value={pinCode} // Bind value to state
              onChange={(e) => setPinCode(e.target.value)} // Update state on change
            />
          </div>
        </div>
        <Button className="w-full" onClick={() => onContinue()}>
          Continue
        </Button>
      </div>
    </div>
  );
}
