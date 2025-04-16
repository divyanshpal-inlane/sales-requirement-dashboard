import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";
import { ArrowLeft, Check, ChevronsUpDown, PlusCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/lib/supabaseClient";

// Define a type for the instructor data that comes from the database
interface Unavailability {
  booked_date?: string;
  booked_start_time?: string;
  booked_end_time?: string;
  all_day?: boolean;
  day_of_week?: string;
  start_date?: string;
  end_date?: string;
  range_all_day?: boolean;
  range_start_time?: string;
  range_end_time?: string;
}
interface InstructorFromDB {
  id_instructor: string;
  name: string;
  phone: string;
  areas: string[];
  car_license: string | null;
  car_make: string | null;
  car_mode: string | null;
  car_number: string | null;
  created_at: string;
  DL_number: string | null;
  email: string | null;
  [key: string]: unknown; // Allow other properties with unknown type
  address: string | null;
  latitude: number | null; // Added for storing coordinates
  longitude: number | null; // Added for storing coordinates
  experience: number | null;
  radius: number | null;
  car_fuel_type: "petrol" | "diesel" | "ev" | "cng" | "lpg" | null;
  unavailability: Unavailability[];
}

interface InstructorData {
  id_instructor?: string;
  name: string;
  phone: string;
  email: string;
  DL_number: string;
  car_make: string;
  car_mode: string;
  experience: number;
  car_number: string;
  areas: string[];
  address: string;
  latitude: number | null; // Added for storing coordinates
  longitude: number | null; // Added for storing coordinates
  radius: number;
  car_fuel_type: "petrol" | "diesel" | "ev" | "cng" | "lpg" | null;
  unavailability: Unavailability[];
}

interface ServiceableArea {
  id: string;
  name: string;
  postal_code?: string;
}

const initialInstructorData: InstructorData = {
  name: "",
  phone: "",
  email: "",
  DL_number: "",
  car_make: "",
  car_mode: "",
  experience: 0,
  car_number: "",
  areas: [],
  address: "",
  latitude: null,
  longitude: null,
  radius: 0,
  car_fuel_type: null,
  unavailability: [],
};

// Google Maps Autocomplete Component
// Update the AddressAutocomplete component
const AddressAutocomplete = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>(value);

  // Update internal state when prop value changes
  useEffect(() => {
    setSelectedAddress(value);
  }, [value]);

  useEffect(() => {
    // Check if the script is already loading or loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    );

    if (!window.google?.maps?.places && !existingScript) {
      const googleMapScript = document.createElement("script");
      googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      googleMapScript.async = true;
      googleMapScript.defer = true;

      googleMapScript.onload = () => {
        setIsScriptLoaded(true);
      };

      document.head.appendChild(googleMapScript);
    } else if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!inputRef.current || !isScriptLoaded || !window.google?.maps?.places)
      return;

    try {
      // Clear previous instance if it exists
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      // Create new autocomplete instance with specific options
      const options: google.maps.places.AutocompleteOptions = {
        componentRestrictions: { country: "IN" },
        fields: ["address_components", "formatted_address", "geometry"],
      };

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options,
      );

      // Add place_changed listener
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.formatted_address || !place.geometry?.location) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        // Update internal state first
        setSelectedAddress(place.formatted_address);

        // Then call the parent's onChange
        onChange(place.formatted_address, lat, lng);
      });
    } catch (error) {
      console.error("Error initializing Google Places Autocomplete:", error);
    }
  }, [isScriptLoaded, onChange]);

  // Add CSS to ensure the dropdown is visible and clickable
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .pac-container {
        z-index: 10000 !important; 
        pointer-events: auto !important;
      }
      .pac-item {
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSelectedAddress(newValue);
    // Only update parent state when user is typing manually
    // (not when autocomplete is filling the field)
    onChange(newValue, null, null);
  };

  // Ensure the input value reflects the selected address
  useEffect(() => {
    if (inputRef.current && selectedAddress !== inputRef.current.value) {
      inputRef.current.value = selectedAddress;
    }
  }, [selectedAddress]);

  return (
    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        value={selectedAddress}
        onChange={handleInputChange}
        placeholder="Enter address"
        className="w-full"
        autoComplete="off"
        // Prevent clicks from propagating to parent elements
        onClick={(e) => e.stopPropagation()}
      />
      {!isScriptLoaded && (
        <div className="mt-1 text-sm text-gray-500">
          Loading address autocomplete...
        </div>
      )}
    </div>
  );
};

export default function InstructorsManagement() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [instructorData, setInstructorData] = useState<InstructorData>(
    initialInstructorData,
  );
  const [newArea, setNewArea] = useState<string>("");
  const [areaSearchQuery, setAreaSearchQuery] = useState<string>("");
  const [isAddingCustomArea, setIsAddingCustomArea] = useState<boolean>(false);
  const [openScheduleDialogId, setOpenScheduleDialogId] = useState<
    string | null
  >(null); // Track which instructor's schedule dialog is open
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddingUnavailability, setIsAddingUnavailability] = useState(false);
  const [unavailabilityType, setUnavailabilityType] = useState<
    "single" | "recurring" | "range"
  >("single");
  const [unavailabilityData, setUnavailabilityData] = useState<
    Partial<Unavailability>
  >({});

  // Fetch all servicable areas for suggestions
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

  // Filtered areas based on search query
  const filteredAreas =
    serviceableAreas?.filter((area) =>
      area.name.toLowerCase().includes(areaSearchQuery.toLowerCase()),
    ) || [];

  // Handle selecting an area from the dropdown
  const handleSelectArea = (area: ServiceableArea) => {
    if (!instructorData.areas.includes(area.name)) {
      setInstructorData({
        ...instructorData,
        areas: [...instructorData.areas, area.name],
      });
    } else {
      toast({
        title: "Area already exists",
        description: "This area is already added",
        variant: "destructive",
      });
    }
    setAreaSearchQuery("");
  };

  // Handle adding a custom area that's not in the suggestions
  const handleAddCustomArea = () => {
    if (!areaSearchQuery.trim()) return;

    // Check if area already exists in instructor's areas
    if (instructorData.areas.includes(areaSearchQuery.trim())) {
      toast({
        title: "Area already exists",
        description: "This area is already added to the instructor",
        variant: "destructive",
      });
      return;
    }

    // Add to instructor's areas in local state only
    setInstructorData({
      ...instructorData,
      areas: [...instructorData.areas, areaSearchQuery.trim()],
    });

    setAreaSearchQuery("");
    setIsAddingCustomArea(false);
  };

  const handleCarFuelChange = (
    value: "petrol" | "diesel" | "ev" | "cng" | "lpg" | null,
  ) => {
    if (value === "ev") {
      setInstructorData({
        ...instructorData,
        car_fuel_type: value,
        car_make: "Automatic",
      });
    } else {
      setInstructorData({ ...instructorData, car_fuel_type: value });
    }
  };

  // Handle address change with coordinates
  // Handle address change with coordinates
  const handleAddressChange = useCallback(
    (address: string, lat: number | null, lng: number | null) => {
      console.log("Address changed:", address, lat, lng); // Add this for debugging

      setInstructorData((prevData) => ({
        ...prevData,
        address,
        latitude: lat,
        longitude: lng,
      }));
    },
    [], // No dependencies to avoid recreating this function
  );

  // Fetch all instructors along with their schedules
  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select(
          `
          *,
          schedules:Schedule (
            id,
            date,
            start_time,
            end_time,
            learner:learner_id ( name )
          )
        `,
        )
        .order("name");

      if (error) throw error;
      return data as (InstructorFromDB & { schedules: Schedule[] })[];
    },
  });

  // Add or update an instructor
  const mutation = useMutation({
    mutationFn: async (data: InstructorData) => {
      // First, check for any new areas that need to be added to Serviceable_Areas table
      const newAreas = [];
      for (const area of data.areas) {
        const { data: existingArea } = await supabase
          .from("Serviceable_Areas")
          .select("id, name")
          .ilike("name", area)
          .maybeSingle();

        if (!existingArea) {
          newAreas.push(area);
        }
      }

      // Add any new areas to the Serviceable_Areas table
      if (newAreas.length > 0) {
        const areasToInsert = newAreas.map((area) => ({ name: area }));
        await supabase.from("Serviceable_Areas").insert(areasToInsert);
      }

      // Now proceed with instructor update/insert
      if (formMode === "add") {
        const { data: newInstructor, error } = await supabase
          .from("Instructor")
          .insert([
            {
              name: data.name,
              phone: data.phone,
              email: data.email,
              DL_number: data.DL_number,
              car_make: data.car_make,
              car_mode: data.car_mode,
              experience: data.experience,
              car_number: data.car_number,
              areas: data.areas,
              address: data.address,
              latitude: data.latitude,
              longitude: data.longitude,
              radius: data.radius,
              car_fuel_type: data.car_fuel_type,
              unavailability: data.unavailability,
            },
          ])
          .select();

        if (error) throw error;
        return newInstructor;
      } else {
        if (!data.id_instructor) {
          throw new Error("Instructor ID is missing");
        }

        const { data: updatedInstructor, error } = await supabase
          .from("Instructor")
          .update({
            name: data.name,
            phone: data.phone,
            email: data.email,
            DL_number: data.DL_number,
            car_make: data.car_make,
            car_mode: data.car_mode,
            experience: data.experience,
            car_number: data.car_number,
            areas: data.areas,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            radius: data.radius,
            car_fuel_type: data.car_fuel_type,
            unavailability: data.unavailability,
          })
          .eq("id_instructor", data.id_instructor)
          .select();

        if (error) throw error;
        return updatedInstructor;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      queryClient.invalidateQueries({ queryKey: ["serviceable-areas"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: formMode === "add" ? "Instructor Added" : "Instructor Updated",
        description:
          formMode === "add"
            ? "New instructor has been added successfully"
            : "Instructor details have been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!instructorData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!instructorData.phone.trim()) {
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    if (instructorData.areas.length === 0) {
      toast({
        title: "Error",
        description: "At least one area is required",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(instructorData);
  };

  const handleEditInstructor = (instructor: InstructorFromDB) => {
    setFormMode("edit");
    setInstructorData({
      id_instructor: instructor.id_instructor,
      name: instructor.name,
      phone: instructor.phone,
      email: instructor.email || "",
      DL_number: instructor.DL_number || "",
      car_make: instructor.car_make || "",
      car_mode: instructor.car_mode || "",
      experience: instructor.experience || 0,
      car_number: instructor.car_number || "",
      areas: instructor.areas || [],
      address: instructor.address || "",
      latitude: instructor.latitude || null,
      longitude: instructor.longitude || null,
      radius: instructor.radius || 0,
      car_fuel_type: instructor.car_fuel_type as
        | "petrol"
        | "diesel"
        | "ev"
        | "cng"
        | "lpg"
        | null,
      unavailability: instructor.unavailability || [],
    });
    setIsDialogOpen(true);
  };

  const handleAddNewInstructor = () => {
    setFormMode("add");
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setInstructorData(initialInstructorData);
    setNewArea("");
    setAreaSearchQuery("");
    setIsAddingCustomArea(false);
  };

  const handleRemoveArea = (areaToRemove: string) => {
    setInstructorData({
      ...instructorData,
      areas: instructorData.areas.filter((area) => area !== areaToRemove),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomArea();
    }
  };

  const handleOpenScheduleDialog = (id: string) => {
    setOpenScheduleDialogId(id); // Set the ID of the instructor whose dialog is open
  };

  const handleCloseScheduleDialog = () => {
    setOpenScheduleDialogId(null); // Close the dialog
  };

  return (
    <div
      className="container mx-auto min-h-screen bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin")}
          className="h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Instructor Management</h1>
        <Button onClick={handleAddNewInstructor}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Instructor
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {instructors?.map((instructor) => (
            <Card
              key={instructor.id_instructor}
              className="flex h-full flex-col overflow-hidden rounded-lg shadow-lg"
            >
              <CardHeader className="bg-primary p-4 text-white">
                <CardTitle className="text-lg font-bold">
                  {instructor.name}
                </CardTitle>
                <p className="text-sm">
                  {instructor.email || "No email provided"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Phone:
                    </span>
                    <p>{instructor.phone}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Address:
                    </span>
                    <p>{instructor.address || "No address provided"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Radius:
                    </span>
                    <p>
                      {instructor.radius
                        ? `${instructor.radius} km`
                        : "No radius provided"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      DL Number:
                    </span>
                    <p>{instructor.DL_number || "Not provided"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Car Details:
                    </span>
                    <p>
                      {instructor.car_make || "N/A"} -{" "}
                      {instructor.car_mode || "N/A"} (
                      {instructor.car_number || "N/A"})
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Experience:
                    </span>
                    <p>{instructor.experience || "Not provided"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Areas:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {instructor.areas?.map((area: string) => (
                        <span
                          key={area}
                          className="inline-block rounded bg-muted px-2 py-1 text-xs"
                        >
                          {area}
                        </span>
                      )) || "No areas assigned"}
                    </div>
                  </div>
                </div>
              </CardContent>
              {/* View Schedule Button */}
              <div className="mt-auto flex flex-col gap-2 p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    handleOpenScheduleDialog(instructor.id_instructor)
                  }
                >
                  View Schedule
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleEditInstructor(instructor)}
                >
                  Edit Details
                </Button>
              </div>

              {/* Schedule Dialog */}
              {openScheduleDialogId === instructor.id_instructor && (
                <Dialog open={true} onOpenChange={handleCloseScheduleDialog}>
                  <DialogContent className="sm:max-w-[1200px]">
                    <DialogHeader>
                      <DialogTitle>
                        {instructor.name}'s Weekly Schedule
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <WeeklyScheduleView
                        schedules={instructor.schedules}
                        unavailability={instructor.unavailability || []}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={handleCloseScheduleDialog}
                      >
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Instructor Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          // Only close if explicitly set to false
          if (!open) {
            setIsDialogOpen(false);
          }
        }}
      >
        <DialogContent
          className="scrollbar-none h-[calc(100vh-50px)] max-h-[80vh] overflow-y-auto sm:max-w-[500px]"
          style={{ scrollbarWidth: "none" }}
          // Prevent clicks inside from closing the dialog
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (
              target.closest(".pac-container") ||
              target.closest(".pac-item")
            ) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {formMode === "add"
                ? "Add New Instructor"
                : "Edit Instructor Details"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={instructorData.name}
                  onChange={(e) =>
                    setInstructorData({
                      ...instructorData,
                      name: e.target.value,
                    })
                  }
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  value={instructorData.phone}
                  onChange={(e) =>
                    setInstructorData({
                      ...instructorData,
                      phone: e.target.value,
                    })
                  }
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <div className="col-span-3">
                  <AddressAutocomplete
                    value={instructorData.address}
                    onChange={handleAddressChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="radius" className="text-right">
                  Radius (km)
                </Label>
                <Input
                  id="radius"
                  type="number"
                  value={instructorData.radius}
                  onChange={(e) =>
                    setInstructorData({
                      ...instructorData,
                      radius: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  value={instructorData.email}
                  onChange={(e) =>
                    setInstructorData({
                      ...instructorData,
                      email: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="DL_number" className="text-right">
                  DL Number
                </Label>
                <Input
                  id="DL_number"
                  value={instructorData.DL_number}
                  onChange={(e) =>
                    setInstructorData({
                      ...instructorData,
                      DL_number: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="car_fuel" className="text-right">
                  Car Fuel
                </Label>
                <Select
                  value={instructorData.car_fuel_type || undefined}
                  onValueChange={(value) =>
                    handleCarFuelChange(
                      value as
                        | "petrol"
                        | "diesel"
                        | "ev"
                        | "cng"
                        | "lpg"
                        | null,
                    )
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Car Fuel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="ev">EV</SelectItem>
                    <SelectItem value="cng">CNG</SelectItem>
                    <SelectItem value="lpg">LPG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="car_make" className="text-right">
                  Car Make
                </Label>
                <Select
                  value={instructorData.car_make || ""}
                  onValueChange={(value) =>
                    setInstructorData({ ...instructorData, car_make: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Car Make" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Automatic">Automatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="car_mode" className="text-right">
                  Car Model
                </Label>
                <Input
                  id="car_mode"
                  value={instructorData.car_mode}
                  onChange={(e) =>
                    setInstructorData({
                      ...instructorData,
                      car_mode: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="experience" className="text-right">
                  Experience
                </Label>
                <Input
                  id="experience"
                  type="number"
                  value={instructorData.experience}
                  onChange={(e) =>
                    setInstructorData({
                      ...instructorData,
                      experience: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="car_number" className="text-right">
                  Car Number
                </Label>
                <Input
                  id="car_number"
                  value={instructorData.car_number}
                  onChange={(e) =>
                    setInstructorData({
                      ...instructorData,
                      car_number: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Label className="pt-2 text-right">Areas</Label>
                <div className="col-span-3">
                  {/* Area search dropdown */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {areaSearchQuery || "Search areas..."}
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
                      ) : filteredAreas.length > 0 ? (
                        <div
                          className="max-h-60 overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          {filteredAreas.map((area) => (
                            <div
                              key={area.id}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-primary/10"
                              onClick={() => handleSelectArea(area)}
                            >
                              <span>{area.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center">
                          {areaSearchQuery ? (
                            <div className="px-4 py-2">
                              <p className="mb-2 text-sm">
                                No matching areas found.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddCustomArea()}
                                className="w-full"
                              >
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

                  <div className="mt-2 flex flex-wrap gap-2">
                    {instructorData.areas.map((area) => (
                      <div
                        key={area}
                        className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                      >
                        {area}
                        <button
                          type="button"
                          onClick={() => handleRemoveArea(area)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {instructorData.areas.length === 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No areas added. Please add at least one area.
                    </p>
                  )}
                </div>
              </div>
              {/* Add this inside the form's grid of inputs */}
              <div className="grid grid-cols-4 gap-4">
                <Label className="pt-2 text-right">Unavailability</Label>
                <div className="col-span-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingUnavailability(true)}
                  >
                    Add Unavailability Period
                  </Button>

                  {instructorData.unavailability.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {instructorData.unavailability.map((period, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded bg-muted p-2 text-sm"
                        >
                          <div>
                            {period.all_day && period.booked_date && (
                              <span>All day on {period.booked_date}</span>
                            )}
                            {period.day_of_week && period.all_day && (
                              <span>All day every {period.day_of_week}</span>
                            )}
                            {period.day_of_week && !period.all_day && (
                              <span>
                                Every {period.day_of_week}:{" "}
                                {period.booked_start_time} -{" "}
                                {period.booked_end_time}
                              </span>
                            )}
                            {!period.all_day &&
                              !period.day_of_week &&
                              period.booked_date && (
                                <span>
                                  {period.booked_date}:{" "}
                                  {period.booked_start_time} -{" "}
                                  {period.booked_end_time}
                                </span>
                              )}
                            {period.start_date &&
                              period.end_date &&
                              period.range_all_day && (
                                <span>
                                  All day from {period.start_date} to{" "}
                                  {period.end_date}
                                </span>
                              )}
                            {period.start_date &&
                              period.end_date &&
                              !period.range_all_day && (
                                <span>
                                  {period.start_date} to {period.end_date}:{" "}
                                  {period.range_start_time} -{" "}
                                  {period.range_end_time}
                                </span>
                              )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedUnavailability = [
                                ...instructorData.unavailability,
                              ];
                              updatedUnavailability.splice(index, 1);
                              setInstructorData({
                                ...instructorData,
                                unavailability: updatedUnavailability,
                              });
                            }}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Saving..."
                  : formMode === "add"
                    ? "Add Instructor"
                    : "Update Instructor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Add this outside the main Dialog but inside the component */}
      <Dialog
        open={isAddingUnavailability}
        onOpenChange={setIsAddingUnavailability}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Unavailability Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={unavailabilityType}
                onValueChange={(value) =>
                  setUnavailabilityType(
                    value as "single" | "recurring" | "range",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Day</SelectItem>
                  <SelectItem value="recurring">Weekly Recurring</SelectItem>
                  <SelectItem value="range">Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {unavailabilityType === "single" && (
              <>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={unavailabilityData.booked_date || ""}
                    onChange={(e) =>
                      setUnavailabilityData({
                        ...unavailabilityData,
                        booked_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="all-day"
                      checked={!!unavailabilityData.all_day}
                      onChange={(e) =>
                        setUnavailabilityData({
                          ...unavailabilityData,
                          all_day: e.target.checked,
                        })
                      }
                    />
                    <Label htmlFor="all-day">All Day</Label>
                  </div>
                </div>
                {!unavailabilityData.all_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={unavailabilityData.booked_start_time || ""}
                        onChange={(e) =>
                          setUnavailabilityData({
                            ...unavailabilityData,
                            booked_start_time: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={unavailabilityData.booked_end_time || ""}
                        onChange={(e) =>
                          setUnavailabilityData({
                            ...unavailabilityData,
                            booked_end_time: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {unavailabilityType === "recurring" && (
              <>
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={unavailabilityData.day_of_week || ""}
                    onValueChange={(value) =>
                      setUnavailabilityData({
                        ...unavailabilityData,
                        day_of_week: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="tuesday">Tuesday</SelectItem>
                      <SelectItem value="wednesday">Wednesday</SelectItem>
                      <SelectItem value="thursday">Thursday</SelectItem>
                      <SelectItem value="friday">Friday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="recurring-all-day"
                      checked={!!unavailabilityData.all_day}
                      onChange={(e) =>
                        setUnavailabilityData({
                          ...unavailabilityData,
                          all_day: e.target.checked,
                        })
                      }
                    />
                    <Label htmlFor="recurring-all-day">All Day</Label>
                  </div>
                </div>
                {!unavailabilityData.all_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={unavailabilityData.booked_start_time || ""}
                        onChange={(e) =>
                          setUnavailabilityData({
                            ...unavailabilityData,
                            booked_start_time: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={unavailabilityData.booked_end_time || ""}
                        onChange={(e) =>
                          setUnavailabilityData({
                            ...unavailabilityData,
                            booked_end_time: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {unavailabilityType === "range" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={unavailabilityData.start_date || ""}
                      onChange={(e) =>
                        setUnavailabilityData({
                          ...unavailabilityData,
                          start_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={unavailabilityData.end_date || ""}
                      onChange={(e) =>
                        setUnavailabilityData({
                          ...unavailabilityData,
                          end_date: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="range-all-day"
                      checked={!!unavailabilityData.range_all_day}
                      onChange={(e) =>
                        setUnavailabilityData({
                          ...unavailabilityData,
                          range_all_day: e.target.checked,
                        })
                      }
                    />
                    <Label htmlFor="range-all-day">All Day</Label>
                  </div>
                </div>
                {!unavailabilityData.range_all_day && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={unavailabilityData.range_start_time || ""}
                        onChange={(e) =>
                          setUnavailabilityData({
                            ...unavailabilityData,
                            range_start_time: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={unavailabilityData.range_end_time || ""}
                        onChange={(e) =>
                          setUnavailabilityData({
                            ...unavailabilityData,
                            range_end_time: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddingUnavailability(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setInstructorData({
                  ...instructorData,
                  unavailability: [
                    ...instructorData.unavailability,
                    unavailabilityData,
                  ],
                });
                setUnavailabilityData({});
                setIsAddingUnavailability(false);
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WeeklyScheduleView({
  schedules,
  unavailability,
}: {
  schedules: Schedule[];
  unavailability: Unavailability[];
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date()),
  );

  const handleWeekChange = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "next" ? addDays(prev, 7) : addDays(prev, -7),
    );
  };

  // Helper function to check if a time slot is unavailable
  // Helper function to check if a time slot is unavailable
  const isTimeSlotUnavailable = (day: Date, hour: number, minute: number) => {
    const currentTime = new Date(day);
    currentTime.setHours(hour, minute);
    const dayOfWeek = format(day, "EEEE").toLowerCase();
    const formattedDate = format(day, "yyyy-MM-dd");

    return unavailability.some((u) => {
      // Case 1: Single day, all day
      if (u.booked_date && u.all_day) {
        return formattedDate === u.booked_date;
      }

      // Case 2: Single day, specific time slot
      if (
        u.booked_date &&
        u.booked_start_time &&
        u.booked_end_time &&
        !u.all_day
      ) {
        const unavailableStart = new Date(
          `${u.booked_date}T${u.booked_start_time}`,
        );
        const unavailableEnd = new Date(
          `${u.booked_date}T${u.booked_end_time}`,
        );
        return (
          formattedDate === u.booked_date &&
          currentTime >= unavailableStart &&
          currentTime < unavailableEnd
        );
      }

      // Case 3a: Weekly recurring on specific day of week (all day)
      if (u.day_of_week && u.all_day) {
        return u.day_of_week === dayOfWeek;
      }

      // Case 3b: Weekly recurring on specific day of week (specific time)
      if (
        u.day_of_week &&
        u.booked_start_time &&
        u.booked_end_time &&
        !u.all_day
      ) {
        if (u.day_of_week === dayOfWeek) {
          const [startHour, startMinute] = u.booked_start_time
            .split(":")
            .map(Number);
          const [endHour, endMinute] = u.booked_end_time.split(":").map(Number);

          const unavailableStart = new Date(day);
          unavailableStart.setHours(startHour, startMinute);

          const unavailableEnd = new Date(day);
          unavailableEnd.setHours(endHour, endMinute);

          return (
            currentTime >= unavailableStart && currentTime < unavailableEnd
          );
        }
      }

      // Case 4a: Date range (all day)
      if (u.start_date && u.end_date && u.range_all_day) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59); // Set to end of day
        return currentTime >= rangeStart && currentTime <= rangeEnd;
      }

      // Case 4b: Date range (specific time)
      if (
        u.start_date &&
        u.end_date &&
        !u.range_all_day &&
        u.range_start_time &&
        u.range_end_time
      ) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59); // Set to end of day

        if (currentTime >= rangeStart && currentTime <= rangeEnd) {
          // Check if current time falls within the specified time range
          const [startHour, startMinute] = u.range_start_time
            .split(":")
            .map(Number);
          const [endHour, endMinute] = u.range_end_time.split(":").map(Number);

          const todayStart = new Date(day);
          todayStart.setHours(startHour, startMinute);

          const todayEnd = new Date(day);
          todayEnd.setHours(endHour, endMinute);

          return currentTime >= todayStart && currentTime < todayEnd;
        }
      }

      return false;
    });
  };

  return (
    <div>
      {/* Week Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => handleWeekChange("prev")}>
          Previous Week
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentWeekStart, "MMM d")} -{" "}
          {format(endOfWeek(currentWeekStart), "MMM d, yyyy")}
        </h3>
        <Button variant="outline" onClick={() => handleWeekChange("next")}>
          Next Week
        </Button>
      </div>

      {/* Weekly Schedule Table */}
      <div
        className="scrollbar-none h-[calc(100vh-50px)] max-h-96 overflow-x-auto overflow-y-auto p-4"
        style={{ scrollbarWidth: "none" }}
      >
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="border border-gray-200 p-2">Time</th>
              {Array.from({ length: 7 }).map((_, index) => {
                const day = addDays(currentWeekStart, index);
                return (
                  <th key={index} className="border border-gray-200 p-2">
                    {format(day, "EEE")}
                    <div className="text-xs">{format(day, "MMM d")}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 32 }).map((_, timeIndex) => {
              const hour = Math.floor(timeIndex / 2) + 6; // Start from 6 AM
              const minute = timeIndex % 2 === 0 ? 0 : 30; // Alternate between 0 and 30 minutes
              return (
                <tr key={timeIndex}>
                  <td className="border border-gray-200 p-2 text-center">
                    {format(new Date().setHours(hour, minute), "h:mm a")}
                  </td>
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const day = addDays(currentWeekStart, dayIndex);

                    // Find the schedule for the current day and time
                    const schedule = schedules.find((s) => {
                      const scheduleStart = new Date(
                        `${s.date}T${s.start_time}`,
                      );
                      const scheduleEnd = new Date(`${s.date}T${s.end_time}`);
                      const currentTime = new Date(day);
                      currentTime.setHours(hour, minute);

                      return (
                        isSameDay(scheduleStart, day) &&
                        currentTime >= scheduleStart &&
                        currentTime < scheduleEnd
                      );
                    });

                    // Check if time slot is unavailable
                    const unavailable = isTimeSlotUnavailable(
                      day,
                      hour,
                      minute,
                    );

                    return (
                      <td
                        key={dayIndex}
                        className={`border border-gray-200 p-2 text-center ${
                          schedule
                            ? "bg-primary text-white"
                            : unavailable
                              ? "bg-gray-400 text-red-800"
                              : ""
                        }`}
                      >
                        {schedule
                          ? `${schedule.learner?.name || "Booked"}`
                          : unavailable
                            ? ""
                            : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end space-x-4">
        <div className="flex items-center">
          <div className="mr-2 h-4 w-4 bg-primary"></div>
          <span className="text-sm">Booked</span>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-4 w-4 bg-gray-400"></div>
          <span className="text-sm">Unavailable</span>
        </div>
      </div>
    </div>
  );
}
