import { useQuery } from "@tanstack/react-query";
import { Map, MapEvent, useMapsLibrary } from "@vis.gl/react-google-maps";
import { ArrowLeft, MapPin } from "lucide-react";
import { ChevronsUpDown, PlusCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { AREAS } from "@/constants/courses";
import { supabase } from "@/lib/supabaseClient";
import { useLearnerUpdate } from "@/queries/learner";

interface ServiceableArea {
  id: string;
  name: string;
  postal_code?: string;
}

// Add these queries at the top with other hooks

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
  const [newCustomArea, setNewCustomArea] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: serviceableAreas, isLoading: areasLoading } = useQuery({
    queryKey: ["serviceable-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Serviceable_Areas")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data as ServiceableArea[];
    },
  });

  // Add these states
  const [areaSearchQuery, setAreaSearchQuery] = useState<string>("");
  const [isAddingCustomArea, setIsAddingCustomArea] = useState<boolean>(false);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const places = useMapsLibrary("places");

  const [areaSearchEnable, setAreaSearchEnable] = useState<boolean>(false);
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

  // Handle adding a custom area that's not in the suggestions
  const handleAddCustomArea = () => {
    if (!areaSearchQuery.trim()) return;

    // Just set the area in local state
    setArea(areaSearchQuery.trim());

    // Track that this is a new custom area that needs to be saved later
    setNewCustomArea(areaSearchQuery.trim());

    // Clear the search query and close the custom area input
    setAreaSearchQuery("");
    setIsAddingCustomArea(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomArea();
    }
  };

  const onContinue = useCallback(async () => {
    if (!area) {
      toast({
        title: "Area is required",
        description: "Please select or add an area before continuing",
        variant: "destructive",
      });
      return;
    }

    // The user might add a random string instead of selecting an address
    if (address && (!addressLat || !addressLng)) {
      toast({
        title: "Pickup location required",
        description: "Please select a valid address or the nearest landmark from the search bar",
        variant: "destructive",
      });
      setAddress("");
      setPinCode("");
      return;
    }

    try {
      // If we have a new custom area, save it to Supabase first
      if (newCustomArea) {
        // Check if this area already exists in the Serviceable_Areas table
        const { data: existingArea } = await supabase
          .from("Serviceable_Areas")
          .select("id, name")
          .ilike("name", newCustomArea)
          .maybeSingle();

        if (!existingArea) {
          // If area doesn't exist, add it to Serviceable_Areas table
          await supabase
            .from("Serviceable_Areas")
            .insert({ name: newCustomArea });
        }

        // Clear the new custom area tracking
        setNewCustomArea(null);
      }

      // Now update the learner with all the data
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
          onError: (error) => {
            toast({
              title: "Error updating profile",
              description:
                error instanceof Error ? error.message : "An error occurred",
              variant: "destructive",
            });
          },
        },
      );
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  }, [
    address,
    navigate,
    pinCode,
    updateLearner,
    area,
    addressLat,
    addressLng,
    toast,
    newCustomArea,
  ]);

  return (
    <div className="scrollbar-hide flex h-full w-full flex-col overflow-y-auto rounded-md">
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
            <Popover open={areaSearchEnable} onOpenChange={setAreaSearchEnable}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {area || "Search areas..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <div className="p-2">
                  <Input
                    placeholder="Search areas..."
                    value={areaSearchQuery}
                    onChange={(e) => setAreaSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="mb-2"
                  />
                </div>

                {areasLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : serviceableAreas?.filter((a) =>
                    a.name
                      .toLowerCase()
                      .includes(areaSearchQuery.toLowerCase()),
                  ).length > 0 ? (
                  <div className="max-h-60 overflow-y-auto">
                    {serviceableAreas
                      ?.filter((a) =>
                        a.name
                          .toLowerCase()
                          .includes(areaSearchQuery.toLowerCase()),
                      )
                      .map((area) => (
                        <div
                          key={area.id}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-primary/10"
                          onClick={() => {
                            setArea(area.name);
                            setAreaSearchQuery("");
                            setAreaSearchEnable(false);
                          }}
                        >
                          <span>{area.name}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    {areaSearchQuery ? (
                      <div className="px-4 py-2">
                        <p className="mb-2 text-sm">No matching areas found.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddCustomArea()}
                          className="w-full"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add '{areaSearchQuery}' as new area
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Type to search areas
                      </p>
                    )}
                  </div>
                )}
              </PopoverContent>
            </Popover>
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
              placeholder="Select Address to get pin code"
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
        <Button
          className="w-full"
          onClick={() => onContinue()}
          disabled={!area || !address || !pinCode}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
