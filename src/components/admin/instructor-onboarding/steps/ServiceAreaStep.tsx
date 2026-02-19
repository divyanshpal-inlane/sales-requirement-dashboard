import { useQuery } from "@tanstack/react-query";
import { Map, Marker, useMapsLibrary } from "@vis.gl/react-google-maps";
import { ChevronsUpDown, PlusCircle, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

import { ServiceableArea, StepProps } from "../types";

// Address Autocomplete Component
const AddressAutocomplete = memo(
  ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (address: string, lat: number | null, lng: number | null) => void;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(
      null,
    );
    const [internalValue, setInternalValue] = useState(value);

    // Load Places library using the proper hook
    const placesLib = useMapsLibrary("places");

    useEffect(() => {
      setInternalValue(value);
    }, [value]);

    useEffect(() => {
      if (!inputRef.current || !placesLib) return;

      // Create autocomplete instance
      autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "IN" },
        fields: ["formatted_address", "geometry"],
      });

      const listener = autocompleteRef.current.addListener(
        "place_changed",
        () => {
          const place = autocompleteRef.current?.getPlace();

          if (place?.geometry?.location) {
            const addr = place.formatted_address || "";
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            setInternalValue(addr);
            onChange(addr, lat, lng);
          }
        },
      );

      return () => {
        if (listener) google.maps.event.removeListener(listener);
      };
    }, [placesLib, onChange]);

    const handleManualTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInternalValue(val);
      onChange(val, null, null);
    };

    return (
      <Input
        ref={inputRef}
        value={internalValue}
        onChange={handleManualTyping}
        placeholder="Search address..."
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      />
    );
  },
);

AddressAutocomplete.displayName = "AddressAutocomplete";

export function ServiceAreaStep({ data, updateData }: StepProps) {
  const { toast } = useToast();
  const [areaSearchQuery, setAreaSearchQuery] = useState("");
  const [isAddingCustomArea, setIsAddingCustomArea] = useState(false);
  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);

  // Fetch serviceable areas
  const { data: serviceableAreas, isLoading: areasLoading } = useQuery({
    queryKey: ["serviceable-areas"],
    queryFn: async () => {
      const { data: areas, error } = await supabase
        .from("Serviceable_Areas")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return areas as ServiceableArea[];
    },
  });

  // Filter areas based on search
  const filteredAreas =
    serviceableAreas?.filter((area) =>
      area.name.toLowerCase().includes(areaSearchQuery.toLowerCase()),
    ) || [];

  // Handle address change with coordinates
  const handleAddressChange = useCallback(
    (address: string, lat: number | null, lng: number | null) => {
      updateData({ address, latitude: lat, longitude: lng });
    },
    [updateData],
  );

  // Handle selecting an area
  const handleSelectArea = (area: ServiceableArea) => {
    if (!data.areas.includes(area.name)) {
      updateData({ areas: [...data.areas, area.name] });
    } else {
      toast({
        title: "Area already exists",
        description: "This area is already added",
        variant: "destructive",
      });
    }
    setAreaSearchQuery("");
  };

  // Handle adding custom area
  const handleAddCustomArea = () => {
    if (!areaSearchQuery.trim()) return;

    if (data.areas.includes(areaSearchQuery.trim())) {
      toast({
        title: "Area already exists",
        description: "This area is already added",
        variant: "destructive",
      });
      return;
    }

    updateData({ areas: [...data.areas, areaSearchQuery.trim()] });
    setAreaSearchQuery("");
    setIsAddingCustomArea(false);
  };

  // Remove area
  const handleRemoveArea = (areaToRemove: string) => {
    updateData({ areas: data.areas.filter((a) => a !== areaToRemove) });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Service Area</h2>
        <p className="text-muted-foreground">
          Set the instructor's service location and coverage areas
        </p>
      </div>

      <div className="space-y-4">
        {/* Address */}
        <div className="space-y-2">
          <Label>
            Base Address <span className="text-red-500">*</span>
          </Label>
          <AddressAutocomplete
            value={data.address}
            onChange={handleAddressChange}
          />
          {data.address && !data.latitude && (
            <p className="text-sm text-amber-600">
              Please select an address from the dropdown
            </p>
          )}
        </div>

        {/* Map */}
        {data.latitude && data.longitude && (
          <div className="h-[200px] overflow-hidden rounded-lg border">
            <Map
              defaultCenter={{ lat: data.latitude, lng: data.longitude }}
              center={{ lat: data.latitude, lng: data.longitude }}
              defaultZoom={14}
              gestureHandling="greedy"
              disableDefaultUI
            >
              <Marker position={{ lat: data.latitude, lng: data.longitude }} />
            </Map>
          </div>
        )}

        {/* Radius */}
        <div className="space-y-2">
          <Label htmlFor="radius">
            Service Radius (km) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="radius"
            type="number"
            min={1}
            max={50}
            placeholder="Enter service radius"
            value={data.radius || ""}
            onChange={(e) =>
              updateData({ radius: parseInt(e.target.value) || 0 })
            }
          />
        </div>

        {/* Serviceable Areas */}
        <div className="space-y-2">
          <Label>
            Serviceable Areas <span className="text-red-500">*</span>
          </Label>

          <Popover open={areaPopoverOpen} onOpenChange={setAreaPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {data.areas.length > 0
                  ? `${data.areas.length} area(s) selected`
                  : "Select areas..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-2" align="start">
              <div className="space-y-2">
                <Input
                  placeholder="Search or add area..."
                  value={areaSearchQuery}
                  onChange={(e) => setAreaSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && areaSearchQuery.trim()) {
                      e.preventDefault();
                      handleAddCustomArea();
                    }
                  }}
                />

                <ScrollArea className="h-[200px]">
                  {areasLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Loading areas...
                    </div>
                  ) : filteredAreas.length > 0 ? (
                    <div className="space-y-1">
                      {filteredAreas.map((area) => (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => handleSelectArea(area)}
                          className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                        >
                          {area.name}
                        </button>
                      ))}
                    </div>
                  ) : areaSearchQuery ? (
                    <div className="p-2">
                      <p className="mb-2 text-sm text-muted-foreground">
                        No matching areas found
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomArea}
                        className="w-full"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add "{areaSearchQuery}"
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      Type to search or add new area
                    </div>
                  )}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* Selected Areas */}
          {data.areas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {data.areas.map((area) => (
                <Badge
                  key={area}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {area}
                  <button
                    type="button"
                    onClick={() => handleRemoveArea(area)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
