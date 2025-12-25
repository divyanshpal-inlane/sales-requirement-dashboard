import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMinutes, addHours, endOfWeek, format, isSameDay, startOfWeek, parseISO, startOfDay, parse, subWeeks, addWeeks, differenceInMinutes, subDays } from "date-fns";
import { ArrowLeft, Calendar, CalendarIcon, Check, ChevronsUpDown, Clock, Copy, Plus, PlusCircle, Trash2, X, Info, Badge, Search, ChevronLeft, Loader2, AlertCircle, User, Phone, MapPin, ExternalLink, ChevronRight, ChevronsLeft, ChevronsRight,  } from "lucide-react";
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Schedule } from "./schedules";
import { SearchInstructorScheduleInfo } from "@/components/admin/InstructorScheduleInfo"
import { SlotConfig } from "@/types/schedule";
import { describe } from "node:test";
import { checkInstructorAvailability } from "@/queries/instructor";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

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
const AddressAutocomplete = memo(({
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
});

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
  const [openSearchScheduleDialogId, setOpenSearchScheduleDialogId] = useState<
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

  // instructor search bar
  const [searchTerm, setSearchTerm] = useState("");

  // Add tentative schedule info
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
  // const { data: instructors, isLoading } = useQuery({
  //   queryKey: ["instructors"],
  //   queryFn: async () => {
  //     const { data, error } = await supabase
  //       .from("Instructor")
  //       .select(
  //         `
  //         *,
  //         schedules:Schedule (
  //           id,
  //           date,
  //           start_time,
  //           end_time,
  //           learner:learner_id ( name )
  //         )
  //       `,
  //       )
  //       .order("name");

  //     if (error) throw error;
  //     return data as (InstructorFromDB & { schedules: Schedule[] })[];
  //   },
  // });

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
            isTentative,
            tentative_details,
            learner:learner_id ( name, phone, pick_up_location, address_lat, address_lng),
            lesson:lesson_id (number)
          )
        `,
          { // This is the options object, placed outside the string
            count: "exact",
            head: false,
            foreignTableJoins: "schedules(left)",
          }
        )
        .order("name");

      if (error) throw error;
      return data as (InstructorFromDB & { schedules: Schedule[] })[];
    },
  });

  // Memoized to avoid re-rendering full calender when filling calender events input fields 
  const memoizedInstructors = useMemo(() => instructors, [instructors]);

  const filteredInstructors = useMemo(() => {
    if (!memoizedInstructors) return [];
    
    const query = searchTerm.toLowerCase();
    
    return memoizedInstructors.filter((instructor) => {
      const nameMatch = instructor.name?.toLowerCase().includes(query);
      const phoneMatch = instructor.phone?.toLowerCase().includes(query);
      const carMatch = (instructor.car_mode + instructor.car_number).toLowerCase().includes(query);
      const areaMatch = instructor.areas?.some(area => area.toLowerCase().includes(query));

      return nameMatch || phoneMatch || carMatch || areaMatch;
    });
  }, [searchTerm, memoizedInstructors]);

  // Fixes mutation refresh lag
  // Define a stable function to update the schedule cache
  const updateScheduleCache = useCallback((instructorId: string, updatedSchedule: Schedule) => {
    queryClient.setQueryData(['instructors'], (oldInstructors: (InstructorFromDB & { schedules: Schedule[] })[] | undefined) => {
        if (!oldInstructors) return oldInstructors;

        return oldInstructors.map(instructor => {
            if (instructor.id_instructor !== instructorId) {
                return instructor;
            }

            // Update the schedules array for the matching instructor: replace or add
            const newSchedules = instructor.schedules.some(sch => sch.id === updatedSchedule.id)
                ? instructor.schedules.map(sch => 
                      sch.id === updatedSchedule.id ? updatedSchedule : sch
                  )
                : [...instructor.schedules, updatedSchedule]; // Add if new

            return { ...instructor, schedules: newSchedules };
        });
    });
  }, [queryClient]);

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

    // --- Email Validation Check ---
    const isValidEmail = (email) => {
      // Regex to check for a basic email structure (e.g., user@domain.com)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };
    if (instructorData.email && !isValidEmail(instructorData.email)) {
      toast({
        title: "Error",
        description: "Invalid email address.",
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

    if (instructorData.phone.length != 10) {
        toast({
          title: "Error",
          description: "Invalid phone number",
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

    if (!instructorData.latitude || !instructorData.longitude) {
      toast({
        title: "Error",
        description: "Enter a valid address from the search bar",
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
    console.log("Open schedule fo id`", id);
    navigate(id);
    // setOpenScheduleDialogId(id); // Set the ID of the instructor whose dialog is open
  };

  const handleCloseScheduleDialog = () => {
    setOpenScheduleDialogId(null); // Close the dialog
  };

  const handleOpenSearchScheduleDialog = (id: string) => {
    console.log("Search for events of id", id);
    setOpenSearchScheduleDialogId(id); // Set the ID of the instructor whose dialog is open
  };

  const handleCloseSearchScheduleDialog = () => {
    setOpenSearchScheduleDialogId(null); // Close the dialog
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search instructors by name, phone, car, or area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent">
            <ChevronsUpDown> </ChevronsUpDown>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredInstructors?.map((instructor) => (
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
                  onClick={() =>
                    handleOpenSearchScheduleDialog(instructor.id_instructor)
                  }
                >
                  Search Schedule
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
                  <DialogContent className="sm:max-w-[1200px] p-4">
                      <DialogHeader className="p-0 mb-0">
                          <DialogTitle className="text-base font-semibold p-0">
                              {instructor.name}'s Weekly Schedule
                          </DialogTitle>
                      </DialogHeader>
                      <div className="mt-1">
                          <WeeklyScheduleView
                              instructor_id={instructor.id_instructor}
                              instructorName={instructor.name}
                              // Pass schedules and unavailability to the schedule view
                              schedules={instructor.schedules}
                              unavailability={instructor.unavailability || []}
                          />
                      </div>
                    {/* <DialogFooter className="pt-0 p-0 mt-2 flex justify-end">  */}
                      {/* Reduced vertical padding (p-0, pt-0) and kept small top margin (mt-2) */}
                      {/* <Button
                        variant="outline"
                        size="xs" 
                        className="h-6 px-2 py-0 text-xs" // Explicitly set height, horizontal padding, zero vertical padding, and smallest text size
                        onClick={handleCloseScheduleDialog}
                      >
                        Close
                      </Button> */}
                    {/* </DialogFooter> */}
                  </DialogContent>
                </Dialog>
              )}
              {/* Search schedule dialog */}
              { openSearchScheduleDialogId === instructor.id_instructor && (
                <Dialog key={instructor.id_instructor} open={true} onOpenChange={handleCloseSearchScheduleDialog}>
                <DialogContent className="sm:max-w-[1200px]">
                    <DialogHeader>
                      <DialogTitle>
                        Search {instructor.name}'s Schedule
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      {/* {instructor.id_instructor} */}
                      <SearchInstructorScheduleInfo
                        instructorId={instructor.id_instructor}
                        openFlag={!!openSearchScheduleDialogId}
                        closeAction={() => setOpenSearchScheduleDialogId(null)}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={handleCloseSearchScheduleDialog}
                      >
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>  
                  
                  
                  
                </Dialog>

              )

              }
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
                    // Add static key to avoid re-rendering from top level DOM
                    key="tentative-schedule-address"
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
                  min={0}
                  className="col-span-3"
                  onWheel={(e) => e.currentTarget.blur()}
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
                  min={0}
                  className="col-span-3"
                  onWheel={(e) => e.currentTarget.blur()}
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
                <Label className="pt-2 text-right">Servicable Areas</Label>
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
  instructor_id,
  schedules,
  unavailability,
}: {
  schedules: any[];
  unavailability: Unavailability[];
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date()),
  );
  const [isTentativeDialogOpen, setIsTentativeDialogOpen] = useState(false);
  const [isTentativeCopyDialogOpen, setIsTentativeCopyDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [instructorId, setInstructorId] = useState(instructor_id);
  const [searchQuery, setSearchQuery] = useState("");
  const [tentativeSchedule, setTentativeSchedule] = useState<any>({
    id: "",
    date: "",
    start_time: "",
    end_time: "",
    enabled: true,
    isTentative: true,
    tentative_details: {
      name: "",
      phone: "",
      paid_info: "",
      pickup_location: "",
      description: "",
      leadName: "",
      address: "",
      latitude: "",
      longitude: "",
    },
  });
  // const [tentativeSchedule, setTentativeSchedule] = useState<any>(null);
  const [tentativeScheduleCopy, setTentativeScheduleCopy] = useState<any>({
    id: "",
    date: "",
    start_time: "",
    end_time: "",
    enabled: true,
    isTentative: true,
    tentative_details: {
      name: "",
      phone: "",
      paid_info: "",
      pickup_location: "",
      description: "",
      leadName: "",
      address: "",
      latitude: "",
      longitude: "",
    },
  });
  const MIN_DAYS = 1;
  const DEFAULT_DAYS = 7;
  const MAX_DAYS = 30; 
  const [numDaysPerView, setNumDaysPerView] = useState(DEFAULT_DAYS);
  const isZoomedOut = numDaysPerView > 14;
  const isVeryZoomedOut = numDaysPerView > 21;

  // State for Hover Highlighting
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredTimeIndex, setHoveredTimeIndex] = useState<number | null>(null);
  const TIME_FORMAT = "HH:mm";
  const DATE_FORMAT = "yyyy-MM-dd";
  const WEEKDAY_NAMES = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const columnWidthPercentage = 100 / numDaysPerView;


  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 2. For the Edit Tentative Schedule Dialog
  const memoizedTentativeAddressValue = useMemo(
    () => tentativeSchedule.tentative_details.pickup_location,
    [tentativeSchedule.tentative_details.pickup_location],
  );

  // Helper to change the number of days displayed (Zoom)
  const handleZoom = (direction: '+' | '-') => {
    setNumDaysPerView(prevNumDays => {
        if (direction === '+') {
            // Zoom out (more days), capped at MAX_DAYS (30)
            return Math.min(MAX_DAYS, prevNumDays + 1);
        } else if (direction === '-') {
            // Zoom in (fewer days), capped at MIN_DAYS (7)
            return Math.max(MIN_DAYS, prevNumDays - 1);
        }
        return prevNumDays;
    });
  };

  // console.log("Initial state of tentative schedule and isTentativeDialogOpen", tentativeSchedule, isTentativeDialogOpen);
  const setScheduleHelper = (schedule) => {
    console.log("Helper setting tentative details as", schedule.tentative_details);
    setTentativeSchedule({
      date: schedule.date,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      enabled: schedule.enabled,
      isTentative: schedule.isTentative,
      instructor_id: instructorId,
      tentative_details:
      {
            name: schedule?.tentative_details?.name || "",
            phone: schedule?.tentative_details?.phone || "",
            paid_info: schedule?.tentative_details?.phone || "",
            pickup_location: schedule?.tentative_details?.pickup_location || "",
            description: schedule?.tentative_details?.description || "",
      }
    });
  };

  const initialTentativeSchedule = {
        id: "",
        date: "",
        start_time: "",
        end_time: "",
        enabled: true,
        isTentative: true,
        learner_id: "",
        instructor_id: instructorId,
        tentative_details: {
          name: "",
          phone: "",
          paid_info: "",
          pickup_location: "",
          description: "",
          address: "",
          latitude: "",
          longitude: "",
        },
  }
  const resetTentativeForm = () => {
    setTentativeSchedule(initialTentativeSchedule);
  };

  const resetTentativeCopyForm = () => {
    const initialTentativeCopySchedule = {
          id: "",
          date: "",
          start_time: "",
          end_time: "",
          enabled: true,
          isTentative: true,
          learner_id: "",
          instructor_id: instructorId,
          tentative_details: {
            name: "",
            phone: "",
            paid_info: "",
            pickup_location: "",
            description: "",
            address: "",
            latitude: "",
            longitude: "",
          },
    }
    setTentativeScheduleCopy(initialTentativeCopySchedule);
  };

  // Add or update a tentative schedule
  const tentativeScheduleMutation = useMutation({
    mutationFn: async (data: Schedule) => {
      // Now proceed with tentative schedule update/insert
      // console.log("tentativeSch at mutation", tentativeSchedule);
      if (formMode === "add") {
        const { data: newTentativeSchedule, error } = await supabase
          .from("Schedule")
          .insert([
            {
              date: tentativeSchedule.date,
              start_time: tentativeSchedule.start_time,
              end_time: tentativeSchedule.end_time,
              enabled: tentativeSchedule.enabled,
              isTentative: tentativeSchedule.isTentative,
              instructor_id: instructorId,
              tentative_details: {
                name: tentativeSchedule.tentative_details.name,
                phone: tentativeSchedule.tentative_details.phone,
                paid_info: tentativeSchedule.tentative_details.paid_info,
                pickup_location: tentativeSchedule.tentative_details.pickup_location,
                latitude: tentativeSchedule.tentative_details.latitude,
                longitude: tentativeSchedule.tentative_details.longitude,
                description: tentativeSchedule.tentative_details.description,
                leadName: tentativeSchedule.tentative_details.leadName,
              }
            },
          ])
          .select();

        if (error) throw error;
        return newTentativeSchedule;
      } else {
        if (!data.id) {
          throw new Error("Schedule ID missing for added schedule");
        }

        const { data: updatedTentativeSchedule, error } = await supabase
          .from("Schedule")
          .update({
              date: tentativeSchedule.date,
              start_time: tentativeSchedule.start_time,
              end_time: tentativeSchedule.end_time,
              enabled: tentativeSchedule.enabled,
              isTentative: tentativeSchedule.isTentative,
              instructor_id: instructorId,
              tentative_details: {
                name: tentativeSchedule.tentative_details.name,
                phone: tentativeSchedule.tentative_details.phone,
                paid_info: tentativeSchedule.tentative_details.paid_info,
                pickup_location: tentativeSchedule.tentative_details.pickup_location,
                latitude: tentativeSchedule.tentative_details.latitude,
                longitude: tentativeSchedule.tentative_details.longitude,
                description: tentativeSchedule.tentative_details.description,
                leadName: tentativeSchedule.tentative_details.leadName,
              }
          })
          .eq("id", tentativeSchedule.id)
          .select();

        if (error) throw error;
        return updatedTentativeSchedule;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      setIsTentativeDialogOpen(false);
      resetTentativeForm();
      toast({
        title: formMode === "add" ? "Tentative Schedule Added" : "Schedule Updated",
        description:
          formMode === "add"
            ? "New tentative schedule has been added successfully"
            : "Tentative schedule details have been updated successfully",
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
  const handleWeekChange = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "next" ? addDays(prev, numDaysPerView) : addDays(prev, -numDaysPerView),
    );
  };

  const validateTentativeForm = (formDataSchedule):boolean => {
    console.log("Validating", formDataSchedule);
    // Validate form
    if (!formDataSchedule.date || !formDataSchedule.date instanceof Date && !isNaN(date.getTime())) {
      toast({
        title: "Error",
        description: "Cannot retrieve date info",
        variant: "destructive",
      });
      return false;
    }

    if (!formDataSchedule.start_time.trim()) {
      toast({
        title: "Error",
        description: "Cannot retreive start time",
        variant: "destructive",
      });
      return false;
    }

    if (!formDataSchedule.end_time.trim()) {
      toast({
        title: "Error",
        description: "Cannot retreive end time",
        variant: "destructive",
      });
      return false;
    }
    if (formDataSchedule.tentative_details.name.length === 0) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return false;
    }

    if (formDataSchedule.tentative_details.phone.length === 0) {
      toast({
        title: "Error",
        description: "Customer phone is required",
        variant: "destructive",
      });
      return false;
    }
    if (formDataSchedule.tentative_details.paid_info.length === 0) {
      toast({
        title: "Error",
        description: "Paid/Unpaid information is required",
        variant: "destructive",
      });
      return false;
    }

    if (formDataSchedule.tentative_details.pickup_location.length === 0) {
      toast({
        title: "Error",
        description: "Customer pickup location is required",
        variant: "destructive",
      });
      return false;
    }
    if (formDataSchedule.tentative_details.description.length > 1024) {
      toast({
        title: "Error",
        description: "Description length exceeded (1024 characters)",
        variant: "destructive",
      });
      return false;
    }
    if (formDataSchedule.tentative_details.leadName.length === 0) {
      toast({
        title: "Error",
        description: "Lead name is required",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }
  const handleTentativeSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tentativeSchedule) {
      console.error("Tentative schedule is null");
      return;
    }

    if (!validateTentativeForm(tentativeSchedule)) return;
    
    tentativeScheduleMutation.mutate(tentativeSchedule);
  };

  const handleTentativeCopySave = (e: React.FormEvent) => {
    e.preventDefault();
    // alert("Saving copy data");
    if (!tentativeScheduleCopy) {
        console.error("Tentative schedule copy is null");
        return;
      }

    if (!validateTentativeForm(tentativeScheduleCopy)) {
      console.error("Copy form validation failed", tentativeScheduleCopy);
      return;
    }
      
    copyTentativeMutation.mutate(tentativeScheduleCopy);
    // tentativeScheduleMutation.mutate(tentativeScheduleCopy);

  };

  
  const handlePaidInfoChange = (
    value: "Unpaid" | "Half Paid" | "Full paid" | null,
  ) => {
    setTentativeSchedule({
      ...tentativeSchedule,
      // Correctly update the nested 'tentative_details' object
      tentative_details: {
        ...tentativeSchedule.tentative_details,
        paid_info: value,
      },
    });
  };

    // Handle address change with coordinates - Tentative Schedule
  const handleAddressChangeTentative = useCallback(
    (address: string, lat: number | null, lng: number | null) => {
      console.log("Address changed:", address, lat, lng); // Add this for debugging
      // Use the functional update form of setTentativeSchedule
      setTentativeSchedule((prevSchedule) => ({
        ...prevSchedule,
        tentative_details: {
          ...prevSchedule.tentative_details, // Use prevSchedule here
          pickup_location: address,
          latitude: lat,
          longitude: lng,
        },
      }));
      // if (!lat || !lng) {console.log("Either lat or lng was null", lat, lng);
      // console.log('%c[] -> tentativeSchedule : ', 'color: #50952e', tentativeSchedule.tentative_details);
      // }

    },
    [], // No dependencies to avoid recreating this function
  );

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

  const formatDateForInput = (date: string | Date): string => {
    if (!date) {
      return '';
    }

    // Convert the input (which might be a Date object or string) into a Date object.
    const dateObj = new Date(date);

    // Check if the date conversion resulted in an invalid date
    if (isNaN(dateObj.getTime())) {
      console.error("Invalid date passed to formatter:", date);
      return '';
    }

    // The .toISOString() method returns a string like "2025-09-30T07:30:00.000Z".
    // We take the first 10 characters to get the required "YYYY-MM-DD" format.
    // NOTE: This will treat the date as a UTC date, which is standard practice 
    // for date inputs unless specific local-time handling is needed.
    return dateObj.toISOString().substring(0, 10);
  };

  const handleOccupiedSlotClick = (schedule: Schedule) => {
    toast({
      title: "Booked",
      // description: `This slot is booked for ${schedule?.learner?.name || "a learner"}.`,
      description: `The slot is booked.`,
    });
    console.log("Occupied schedule details:", schedule);
  }
  const handleTentativeSlotClick = (schedule, day, hour, minute) => {
    // alert("The slot is not available for booking.");
    console.log("Tentative slot clicked:", { tentativeSchedule, day, hour, minute });
    
    if (tentativeSchedule?.tentative_details.length > 0) {
      // existing schedule
      setFormMode("edit");
      // setTentativeSchedule(schedule); // Not working
      // console.log("Tentative schedule of slot and formMode ", schedule, tentativeSchedule, formMode);
    } else {
      const tentativeStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
      const tentativeEnd = addMinutes(tentativeStart, 60);
      setTentativeSchedule({
        ...tentativeSchedule,
        date: tentativeStart, // Use the new date object
        start_time: `${String(tentativeStart.getHours()).padStart(2, "0")}:${String(tentativeStart.getMinutes()).padStart(2, "0")}`,
        end_time: `${String(tentativeEnd.getHours()).padStart(2, "0")}:${String(tentativeEnd.getMinutes()).padStart(2, "0")}`,
      });
      setFormMode("add");
    }
    setIsTentativeDialogOpen(true);
  }

  // Clear the form when closed
  useEffect(() => {
    if (!isTentativeDialogOpen) {
      resetTentativeForm();
    }
  }, [isTentativeDialogOpen]);


  const deleteTentativeMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
      .from("Schedule")
      .delete()
      .eq("id", Number(scheduleId));
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // This will automatically refetch the schedules list after a successful delete
      // queryClient.invalidateQueries({
      //   queryKey: ["Schedule", instructorId],
      // });
      // Reqire the following as the above does not refresh the modal
      queryClient.invalidateQueries({ queryKey: ["instructors"] });

      toast({
        title: "Success",
        description: "Tentative schedule deleted.",
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


  const handleDeleteTentative = (scheduleId: string) => {
    if (!scheduleId) {
      toast({
        title: "Error",
        description: "Schedule ID is missing",
        variant: "destructive",
      });
      return;
    }
    deleteTentativeMutation.mutate(scheduleId);

  }


  const copyTentativeMutation = useMutation({
    mutationFn: async (copyData: Schedule) => {
      // console.log("Mutation Copying data", copyData);
      // console.log("Current instructorId:", instructorId);
      const { data: copiedData, error } = await supabase
      .from("Schedule")
      .insert([
        {
          date: tentativeScheduleCopy.date,
          start_time: tentativeScheduleCopy.start_time,
          end_time: tentativeScheduleCopy.end_time,
          enabled: true,
          isTentative: true,
          instructor_id: instructorId,
          tentative_details: {
            name: tentativeScheduleCopy.tentative_details.name,
            phone: tentativeScheduleCopy.tentative_details.phone,
            paid_info: tentativeScheduleCopy.tentative_details.paid_info,
            pickup_location: tentativeScheduleCopy.tentative_details.pickup_location,
            latitude: tentativeScheduleCopy.tentative_details.latitude,
            longitude: tentativeScheduleCopy.tentative_details.longitude,
            description: tentativeScheduleCopy.tentative_details.description,
            leadName: tentativeScheduleCopy.tentative_details.leadName,
          }
        },
      ])
      .select();

      if (error) throw error;
      return copiedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      setIsTentativeCopyDialogOpen(false);
      resetTentativeCopyForm();
      toast({
        title: "Tentative Schedule Copied",
        description: "New tentative schedule has been copied successfully"
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


  const handleCopyTentative = (scheduleToCopy) => {
    console.log("CopyTentative Arguments are ", scheduleToCopy);

    if (!scheduleToCopy) {
      toast({
        title: "Error",
        description: "Schedule, date or time missing",
        variant: "destructive",
      });
      return;
    }

    setTentativeScheduleCopy(scheduleToCopy);
    // set ID to null 
    setTentativeScheduleCopy({
      ...scheduleToCopy, 
      id: "", 
    });

    console.log("Tentative schedule state set", tentativeScheduleCopy);
  }

  const calculateEndTime = (startTimeString) => {
    const TIME_FORMAT = 'HH:mm'; 
    // 1. Create a base Date object for today.
    const today = new Date();
    
    // 2. Create the full date string: YYYY/MM/DD + HH:MM from the input.
    //    This ensures new Date() parses the time correctly for today.
    const dateString = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()} ${startTimeString}`;
    
    // 3. Parse the full string into a Date object.
    const startDate = new Date(dateString);

    // 4. Calculate the new date/time by adding 1 hour.
    const newDate = addHours(startDate, 1);
    
    // 5. Format the result back into the required string format ('HH:mm').
    return format(newDate, TIME_FORMAT);
  };

  const handleTimeChange = (e) => {
    const { name, value, type, checked } = e.target;
      console.log("", name, value, type, checked, "name", e.target.name);
      setTentativeScheduleCopy((prev) => {
        const updatedData = {
          ...prev,
          [name]: value,
        };

      // Auto-calculate end_time when start_time changes
      if (name === "tentative_copy_start_time") {
          updatedData.end_time = calculateEndTime(value);
          console.log(
            "handleTimeChange: end_time calculated as ",
            updatedData.end_time,
          );
      }

      return updatedData;
    });
  };

  // for logging copy steps
  useEffect(() => {
    console.log("useEffect: Tentative schedule copy state set:", tentativeScheduleCopy);
  }, [tentativeScheduleCopy]);

  const filteredSchedules = (searchQuery === "") ? schedules : schedules.filter((schedule) => {
      
      // console.log("Filtering schedule:", schedule, "with searchQuery:", searchQuery);
      let nameMatch = false;
      let phoneMatch = false;
      if (!schedule?.isTentative) {
        nameMatch = schedule?.learner?.name?.toLowerCase()
                      .includes(searchQuery.toLowerCase());
        phoneMatch = schedule?.learner?.phone?.toLowerCase()
                      .includes(searchQuery.toLowerCase());
        return nameMatch || phoneMatch;
      } else {
        const tentativeDetails = schedule.tentative_details || {};
        // console.log("Filtering tentativeDetails:", tentativeDetails);
        nameMatch = tentativeDetails?.name?.toLowerCase()
                      .includes(searchQuery.toLowerCase())
                    || tentativeDetails?.leadName?.toLowerCase()
                      .includes(searchQuery.toLowerCase());
        phoneMatch = tentativeDetails?.phone?.toLowerCase()
                      .includes(searchQuery.toLowerCase());
        let descriptionMatch = tentativeDetails?.description?.toLowerCase()
                      .includes(searchQuery.toLowerCase());
        return nameMatch || phoneMatch || descriptionMatch;
      }
      return false;
  });

  // console.log("Filtered schedules based on searchQuery:", filteredSchedules);


// Assume necessary imports (format, endOfWeek, addDays, isSameDay, Input, Button, Copy, Trash2, Select, etc.) are present
// Assuming Tailwind CSS classes are available.

return (
  <div className="flex flex-col">
    <div className="mb-4 flex items-center justify-between">
      {/* LEFT SIDE: Navigation, Date Range, and Zoom Controls */}
        <div className="flex items-center space-x-2">
          {/* Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentWeekStart(addDays(currentWeekStart, -numDaysPerView))
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentWeekStart(addDays(currentWeekStart, numDaysPerView))
            }
          >
            Next
          </Button>
          
          {/* Date Range */}
          <span className="text-sm font-medium whitespace-nowrap">
            {format(currentWeekStart, "MMM dd")} -{" "}
            {format(
              addDays(currentWeekStart, numDaysPerView - 1),
              "MMM dd, yyyy",
            )}
          </span>
          
          {/* Separator */}
          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Zoom Controls: '-' <numDays> '+' */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom('-')} 
            disabled={numDaysPerView === MIN_DAYS}
            className="p-1 h-7 w-7" // Smaller button size
          >
            -
          </Button>
          <span className="text-sm font-medium whitespace-nowrap">
            {numDaysPerView} days
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoom('+')} 
            disabled={numDaysPerView === MAX_DAYS}
            className="p-1 h-7 w-7" // Smaller button size
          >
            +
          </Button>
        </div>

        {/* RIGHT SIDE: Search Input */}
        <Input
          type="search"
          placeholder="Search by name, sales lead, or description"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="h-8 w-64 px-3 py-1 text-sm"
        />
      </div>


<div
  className="scrollbar-none h-[calc(100vh-50px)] max-h-96 overflow-x-auto overflow-y-auto p-4"
  style={{ scrollbarWidth: "none" }}
>
  <table className="w-full border-collapse border border-gray-200">
    <thead className="sticky top-0 bg-white shadow-md z-10">
<tr>
              {/* Fixed width for Time column */}
              <th className="sticky left-0 z-20 w-14 border border-gray-200 bg-white p-0.5 py-0.5 text-xs">
                Time
              </th>
              {Array.from({ length: numDaysPerView }).map((_, index) => {
                const day = addDays(currentWeekStart, index);
                const isToday = isSameDay(day, new Date());
                // Dynamic width for day columns
                return (
                  <th
                    key={index}
                    className={`border border-gray-200 p-0.5 py-0.5 text-xs ${isToday ? "bg-blue-100 font-bold" : ""} ${index === hoveredDayIndex ? 'bg-gray-800 text-white' : ''}`}
                    style={{ width: `${columnWidthPercentage}%` }} // Dynamic width
                  >
                    {format(day, "EE")}{" "}
                    <div className="text-[0.6rem] font-normal">
                      {format(day, "MMM d")}
                    </div>
                  </th>
                );
              })}
            </tr>
    </thead>
    <tbody className="overflow-y-auto">
      {Array.from({ length: SlotConfig.numSlotsPerDay }).map((_, timeIndex) => {
        const hour =
          Math.floor(timeIndex / SlotConfig.numSlotsPerHour) +
          SlotConfig.startHourOfDay;
        const minute =
          (SlotConfig.numMinutesPerSlot * (timeIndex % SlotConfig.numSlotsPerHour)) % 60;
        return (
          <tr key={timeIndex}>
            {/* Time Label - Fixed width */}
<td
              className={`sticky left-0 z-10 flex h-full w-14 items-center 
              justify-center select-none border border-gray-200 bg-white p-0 
              text-[0.6rem] ${timeIndex === hoveredTimeIndex 
                ? 'bg-gray-800 text-white font-bold' 
                : ''}`}
            >
              {format(
                new Date(0, 0, 0, hour, minute),
                TIME_FORMAT,
              )}
            </td>

            {Array.from({ length: numDaysPerView }).map((_, dayIndex) => {
              const day = addDays(currentWeekStart, dayIndex);

              const schedule = filteredSchedules.find((s) => {
                const scheduleStart = new Date(`${s.date}T${s.start_time}`);
                const scheduleEnd = new Date(`${s.date}T${s.end_time}`);
                const currentTime = new Date(day);
                currentTime.setHours(hour, minute);
                return (
                  isSameDay(scheduleStart, day) &&
                  currentTime >= scheduleStart &&
                  currentTime < scheduleEnd
                );
              });
              const unavailable = isTimeSlotUnavailable(day, hour, minute);

              let isOverdueOngoing = false;
          
          if (schedule && schedule.status != "completed") {
            // 1. Get the Schedule End Time as a Date Object (includes the correct day)
            const scheduleEndTime = new Date(day);
            const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
            scheduleEndTime.setHours(endHour, endMinute, 0, 0);

            // 2. Define the real current time (Assuming 'nowTime' variable is available)
            // If 'nowTime' is NOT available globally, define it here:
            const realCurrentTime = new Date(); 

            // 3. Check for the condition: Ongoing AND End time has passed the real current time
            isOverdueOngoing = scheduleEndTime.getTime() <= realCurrentTime.getTime();
          }

          // Determine base styling for the <td> wrapper
                      const tdClasses = `
                          border border-gray-200 p-0
                          ${isSameDay(day, new Date()) ? "bg-blue-50" : ""}
                      `;

                      // Determine full styling for the inner <div>
                      let divClasses = `h-full w-full flex flex-col items-start justify-center relative p-1 text-xs overflow-hidden`;

                      if (schedule) {
                          divClasses += ` cursor-pointer`;
                          if (schedule.isTentative) {
                              // Tentative Schedule (Orange)
                              if (isOverdueOngoing) {
                                  divClasses += ` bg-orange-200 text-black`; // Overdue tentative
                              } else {
                                  divClasses += ` bg-orange-500 text-white`; // Normal tentative
                              }
                          } else {
                              // Confirmed Schedule (Green)
                              divClasses += ` bg-green-500 text-white`;
                          }
                      } else if (unavailable) {
                          // Unavailable Slot (Darker Slate Gray)
                          divClasses += ` bg-slate-700 text-white cursor-not-allowed`;
                      } else {
                          // Empty Slot (Hover effect)
                          divClasses += ` hover:bg-gray-100 cursor-pointer`;
                      }

              return (
                <td
                  key={dayIndex}
                  className={tdClasses}
                  style={{ width: `${columnWidthPercentage}%`, height: '40px' }} // Dynamic width and Fixed slot size
                  // Mouse Event Handlers for Highlighting
                  onMouseEnter={() => {
                    setHoveredDayIndex(dayIndex);
                    setHoveredTimeIndex(timeIndex);
                  }}
                  onMouseLeave={() => {
                    setHoveredDayIndex(null);
                    setHoveredTimeIndex(null);
                  }}
                >
                  <div
                    className={`
                      w-full h-full relative group flex flex-col justify-between items-center
                      ${
                        schedule
                          ? schedule.isTentative
                            ? "bg-orange-300 text-black"
                            : isOverdueOngoing
                              ? "bg-yellow-200 text-black"
                              : "bg-green-500 text-white" // Default confirmed color
                          : unavailable
                            ? "bg-gray-300 text-red-800"
                            : ""
                      } ${schedule ? "cursor-pointer" : ""}
                    `}
                      onClick={() => {
                          setIsTentativeDialogOpen(false);
                          if (schedule && !schedule.isTentative) {
                            handleOccupiedSlotClick(schedule);
                          } else {
                            // if (unavailable) {
                            //   toast({
                            //     title: "Error",
                            //     description: "Not available instructor",
                            //     variant: "destructive",
                            //   });
                            //   return;
                            // }
                            // if (schedule) setScheduleHelper(schedule);
                            if (schedule && schedule.isTentative) {
                              // handleViewTentativeSlotClick();
                              console.log("Setting tentative schedule", schedule);
                              console.log("Now tentative schedule", tentativeSchedule);
                            }
                            const dateParam = format(day, "yyyy-MM-dd");
                            const timeParam = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                            
                            // Ensure 'instructorId'
                            navigate(`/admin/tentative-add/${instructorId}/${dateParam}/${timeParam}`);
                            
                            // can be enabled when navigation fails
                            // handleTentativeSlotClick(schedule, day, hour, minute);
                          }
                        } }
                        >
                        
                        {/* onClick={() => {
                          setIsTentativeDialogOpen(false);
                          if (schedule && !schedule.isTentative) {
                            handleOccupiedSlotClick(schedule);
                          } else if (!schedule && unavailable) {
                            toast({
                              title: "Error",
                              description: "Not available instructor",
                              variant: "destructive",
                            });
                          } else if (schedule && schedule.isTentative) {
                            handleTentativeSlotClick(schedule, day, hour, minute);
                          }
                        }}
                      > */}
                            {/* Primary Slot Content (Always Visible) */}
                            {schedule ? (
                              <div className="flex w-full flex-col flex-grow items-start justify-center overflow-hidden leading-tight">
                                {schedule.isTentative ? (
                                  // Tentative Details - Conditional Display Logic
                                  <>
                                    {/* Line 1: Name */}
                                    <div className={`select-none text-[0.6rem] font-medium truncate w-full ${isOverdueOngoing ? 'text-black' : 'text-white'}`}>
                                      {schedule.tentative_details?.name || "Tentative"}
                                    </div>
                                    
                                    {/* Line 2: Description (Only if not too zoomed out) */}
                                    {!isZoomedOut && (
                                        <div className={`select-none text-[0.5rem] font-normal truncate w-full ${isOverdueOngoing ? 'text-black' : 'text-white'}`}>
                                            {schedule.tentative_details?.description || "No Description"} 
                                        </div>
                                    )}

                                    {/* Line 3: Paid Info and Map Link (Paid Info removed if very zoomed out) */}
                                    <div className={`select-none text-[0.5rem] font-normal truncate w-full ${isOverdueOngoing ? 'text-black' : 'text-white'} flex items-center justify-between`}>
                                      {!isVeryZoomedOut && (
                                          <span>{schedule.tentative_details?.paid_info || "Unpaid"}</span>
                                      )}
                                      
                                      {/* Map Link/N/A */}
                                      <span className={`text-[0.5rem] font-normal ${isOverdueOngoing ? 'text-black' : 'text-white'} ml-auto`}>
                                        {(schedule.tentative_details?.latitude && schedule.tentative_details?.longitude) ? (
                                          <a 
                                            href={`https://maps.google.com/?q=$$${schedule.tentative_details.latitude},${schedule.tentative_details.longitude}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={`hover:text-blue-200 ${isOverdueOngoing ? 'text-black' : 'text-white'} underline`}
                                            onClick={(e) => e.stopPropagation()} 
                                          >
                                            Map
                                          </a>
                                        ) : (
                                          "N/A"
                                        )}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  // Confirmed Details - Conditional Display Logic
                                  <>
                                    {/* Line 1: Name */}
                                    <div className="select-none text-[0.6rem] font-medium truncate w-full text-white">
                                     {schedule.learner?.name || "Booked"} ({schedule?.lesson?.number })
                                    </div>
                                    
                                    {/* Line 2: Status and Map Link (Status removed if very zoomed out) */}
                                    <div className="select-none text-[0.5rem] font-normal truncate w-full text-white flex items-center justify-between">
                                      {!isVeryZoomedOut && (
                                          <span>{schedule.status || "Booked"}</span>
                                      )}

                                      {/* Map Link/N/A */}
                                      <span className="text-[0.5rem] font-normal text-white ml-auto">
                                        {(schedule.learner?.address_lat && schedule.learner?.address_lng) ? (
                                          <a 
                                            href={`https://maps.google.com/?q=$$${schedule.learner.address_lat},${schedule.learner.address_lng}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-white hover:text-blue-200 underline"
                                            onClick={(e) => e.stopPropagation()} 
                                          >
                                            Map
                                          </a>
                                        ) : (
                                          "N/A"
                                        )}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : unavailable ? (
                              // Unavailable Slot - Show prominent X
                              <div className="flex items-center justify-center h-full w-full">
                                <X size={12} className="select-none" />
                              </div>
                            ) : (
                              // Empty Slot
                              <div className="flex items-center justify-center h-full w-full">
                                {/* Keep empty */}
                              </div>
                            )}

                            {/* Action Buttons (Bottom - Only for Tentative Slots) - Removed if very zoomed out to save space */}
                            {schedule && schedule.isTentative && !isVeryZoomedOut && (
                              <div className="mt-1 flex w-full items-center justify-around">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  // Change button text/icon color to white for visibility on orange-500
                                  className={`h-3 p-0 text-[0.5rem] ${isOverdueOngoing ? 'text-black' : 'text-white'} hover:bg-orange-200/50`}
                                  title="Copy"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setTentativeScheduleCopy({
                                      ...initialTentativeSchedule,
                                      ...schedule,
                                      tentative_details:
                                        schedule.tentative_details,
                                    });
                                    setIsTentativeCopyDialogOpen(true);
                                  }}
                                >
                                  <Copy size={8} />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className={`h-3 p-0 text-[0.5rem] ${isOverdueOngoing ? 'text-black' : 'text-red-300'} hover:bg-orange-200/50`} // Use a lighter red for contrast on orange-500
                                  title="Delete"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleDeleteTentative(schedule.id);
                                  }}
                                >
                                  <Trash2 className="h-2 w-2" />
                                </Button>
                              </div>
                            )}

                    {/* --- 2. THE HOVER TOOLTIP (Full Info - Unchanged) --- */}
                    {schedule && (
                      <div className="absolute hidden group-hover:block z-50 top-0 left-full ml-1 w-64 bg-white border border-gray-300 shadow-xl rounded-md p-3 text-left text-black">
                        {/* NOTE: Removed buttons from this section as they are now in the main view */}

                        {schedule.isTentative ? (
                          <div className="flex flex-col gap-1">
                            <div className="font-bold text-xs border-b pb-1 mb-1">
                              Tentative Booking
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold">Name:</span>{" "}
                              {schedule.tentative_details?.name || "N/A"}
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold">Phone:</span>{" "}
                              {schedule.tentative_details?.phone || "N/A"}
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold">Desc:</span>{" "}
                              {schedule.tentative_details?.description || "N/A"}
                            </div>

                            {/* Map Link */}
                            {schedule.tentative_details?.latitude &&
                            schedule.tentative_details?.longitude ? (
                              <a
                                href={`http://maps.google.com?q=${schedule.tentative_details.latitude},${schedule.tentative_details.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline mt-1 block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open in Maps
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">
                                No Map Data
                              </span>
                            )}
                          </div>
                        ) : (
                          /* Occupied/Learner Details Hover View */
                          <div className="flex flex-col gap-1">
                            <div className="font-bold text-xs border-b pb-1 mb-1 text-green-700">
                              Confirmed Booking
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold">Learner:</span>{" "}
                              {schedule.learner?.name || "N/A"}
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold">Phone:</span>{" "}
                              {schedule.learner?.phone || "N/A"}
                            </div>

                            {/* Map Link */}
                            {schedule.learner?.address_lat &&
                            schedule.learner?.address_lng ? (
                              <a
                                href={`http://maps.google.com?q=${schedule.learner.address_lat},${schedule.learner.address_lng}`}

                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline mt-1 block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open in Maps
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">
                                No Map Data
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  </table>
</div>

{/* Legend - Reduced Text Size from 'text-sm' to 'text-xs' */}
<div className="mt-4 flex items-center justify-end space-x-4">
  <div className="flex items-center">
    <div className="mr-2 h-4 w-4 bg-green-500"></div>
    <span className="text-xs">Booked (Confirmed)</span>
  </div>
  <div className="flex items-center">
    <div className="mr-2 h-4 w-4 bg-yellow-200"></div>
    <span className="text-xs">Not completed on Schedule</span>
  </div>
  <div className="flex items-center">
    <div className="mr-2 h-4 w-4 bg-orange-300"></div>
    <span className="text-xs">Tentative</span>
  </div>
  <div className="flex items-center">
    <div className="mr-2 h-4 w-4 bg-gray-300"></div>
    <span className="text-xs">Unavailable</span>
  </div>
</div>

    {/* Add/Edit Tentative Schedule Dialog - No size changes requested, keeping original code for context */}
    <Dialog
      open={isTentativeDialogOpen}
      onOpenChange={(open) => {
        // Only close if explicitly set to false
        if (!open) {
          setIsTentativeDialogOpen(false);
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
        {/* The close button is rendered *inside* DialogContent. 
           You would need to modify the DialogContent component definition 
           to change its size. */}
        <DialogHeader>
          <DialogTitle>
            {formMode === "add"
              ? "Add Tentative Schedule"
              : "Edit Tentative Schedule Details"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleTentativeSave}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tentative_details-name" className="text-right">
                Name<span className="text-red-500">*</span>
              </Label>
              <Input
                id="tentative_details-name"
                value={tentativeSchedule.tentative_details.name}
                onChange={(e) =>
                  setTentativeSchedule({
                    ...tentativeSchedule,
                    // Correctly update the nested 'tentative_details' object
                    tentative_details: {
                      ...tentativeSchedule.tentative_details,
                      name: e.target.value,
                    },
                  })
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tentative_details-phone" className="text-right">
                Phone<span className="text-red-500">*</span>
              </Label>
              <Input
                id="tentative_details-phone"
                value={tentativeSchedule.tentative_details.phone}
                onChange={(e) =>
                  setTentativeSchedule({
                    ...tentativeSchedule,
                    // Correctly update the nested 'tentative_details' object
                    tentative_details: {
                      ...tentativeSchedule.tentative_details,
                      phone: e.target.value,
                    },
                  })
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tentative_details-description" className="text-right">
                Description<span className="text-red-500">*</span>
              </Label>
              <Input
                id="tentative_details-description"
                value={tentativeSchedule.tentative_details.description}
                onChange={(e) =>
                  setTentativeSchedule({
                    ...tentativeSchedule,
                    // Correctly update the nested 'tentative_details' object
                    tentative_details: {
                      ...tentativeSchedule.tentative_details,
                      description: e.target.value,
                    },
                  })
                }
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tentative_details-paid_info" className="text-right">
                Paid information
              </Label>
              <Select
                value={tentativeSchedule.tentative_details.paid_info || undefined}
                onValueChange={(value) =>
                  handlePaidInfoChange(
                    value as
                      | "Unpaid"
                      | "Half paid"
                      | "Full paid"
                      | null,
                  )
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Paid info" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Half paid">Half Paid</SelectItem>
                  <SelectItem value="Full paid">Full Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tentative_details-address" className="text-right">
              Address
            </Label>
            <div className="col-span-3">
              <TentativeAddressInput
                memoizedTentativeAddressValue={memoizedTentativeAddressValue}
                handleAddressChangeTentative={handleAddressChangeTentative}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tentative_details-leadName" className="text-right">
              Lead Name<span className="text-red-500">*</span>
            </Label>
            <Input
              id="tentative_details-leadName"
              value={tentativeSchedule.tentative_details.leadName}
              onChange={(e) =>
                setTentativeSchedule({
                  ...tentativeSchedule,
                  // Correctly update the nested 'tentative_details' object
                  tentative_details: {
                    ...tentativeSchedule.tentative_details,
                    leadName: e.target.value,
                  },
                })
              }
              className="col-span-3"
              required
            />
          </div>
          {/* Inactive Date Fields filled automatically */}
          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <label htmlFor="tentative_details-date" className="text-right font-medium">
              Date
            </label>
            <input
              id="tentative_details-date"
              type="date"
              defaultValue={formatDateForInput(tentativeSchedule.date)}
              className="col-span-3 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed focus:outline-none"
              readOnly
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <label htmlFor="start_time" className="text-right font-medium">
              Start Time
            </label>
            <input
              id="start_time"
              type="text"
              value={tentativeSchedule.start_time}
              className="col-span-3 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed focus:outline-none"
              readOnly
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="end_time" className="text-right font-medium">
              End Time
            </label>
            <input
              id="end_time"
              type="text"
              value={tentativeSchedule.end_time}
              className="col-span-3 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed focus:outline-none"
              readOnly
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTentativeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={tentativeScheduleMutation.isPending}>
              {tentativeScheduleMutation.isPending
                ? "Saving..."
                : formMode === "add"
                  ? "Add Tentative Schedule"
                  : "Update Tentative Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>


    {/* Copy Tentative Schedule Dialog - No size changes requested, keeping original code for context */}
    <Dialog
      open={isTentativeCopyDialogOpen}
      onOpenChange={(open) => {
        // Only close if explicitly set to false
        if (!open) {
          setIsTentativeCopyDialogOpen(false);
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
        {/* The close button is rendered *inside* DialogContent. 
           You would need to modify the DialogContent component definition 
           to change its size. */}
        <DialogHeader>
          <DialogTitle>
            Copy Tentative Schedule
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleTentativeCopySave}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tentative_copy_details-name" className="text-right">
                Name<span className="text-red-500">*</span>
              </Label>
              <Input
                id="tentative_copy_details-name"
                value={tentativeScheduleCopy.tentative_details.name}
                disabled={true}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tentative_copy_details-phone" className="text-right">
                Phone<span className="text-red-500">*</span>
              </Label>
              <Input
                id="tentative_copy_details-phone"
                value={tentativeScheduleCopy.tentative_details.phone}
                disabled={true}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tentative_copy_details-description" className="text-right">
                Description<span className="text-red-500">*</span>
              </Label>
              <Input
                id="tentative_copy_details-description"
                value={tentativeScheduleCopy.tentative_details.description}
                disabled={false}
                onChange={ (e) => {
                setTentativeScheduleCopy((prev) => ({
                  ...prev,
                  tentative_details: {
                    ...tentativeScheduleCopy.tentative_details,
                    description: e.target.value,
                  },
                }));
              }}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tentative_copy_details-paid_info" className="text-right">
                Paid information
              </Label>
              <Select
                value={tentativeScheduleCopy.tentative_details.paid_info || undefined}
                disabled={true}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Paid info" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Half paid">Half Paid</SelectItem>
                  <SelectItem value="Full paid">Full Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tentative_copy_details-address" className="text-right">
              Address
            </Label>
            <Input
              id="tentative_copy_details-address"
              value={tentativeScheduleCopy.tentative_details.pickup_location}
              disabled={true}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tentative_copy_details-leadName" className="text-right">
              Lead Name<span className="text-red-500">*</span>
            </Label>
            <Input
              id="tentative_copy_details-leadName"
              value={tentativeScheduleCopy.tentative_details.leadName}
              disabled={true}
              className="col-span-3"
              required
            />
          </div>
          {/* Active Date Fields filled for copy*/}
          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <label htmlFor="tentative_copy_details-date" className="text-right font-medium">
              Date
            </label>
            <input
              id="tentative_copy_details-date"
              type="date"
              // value={formatDateForInput(tentativeScheduleCopy.date)}
              value={tentativeScheduleCopy.date}
              onChange={ (e) => {
                setTentativeScheduleCopy((prev) => ({
                  ...prev,
                  date: e.target.value,
                }));
              }}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <label htmlFor="tentative_copy_start_time" className="text-right font-medium">
              Start Time
            </label>
            <input
              id="tentative_copy_start_time"
              type="text"
              value={tentativeScheduleCopy.start_time}
              // onChange={handleTimeChange} // can be tied to end_time
              onChange={(e) => {
                setTentativeScheduleCopy((prev) => ({
                  ...prev,
                  start_time: e.target.value,
                }));
              }}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="tentative_copy_end_time" className="text-right font-medium">
              End Time
            </label>
            <input
              id="tentative_copy_end_time"
              type="text"
              value={tentativeScheduleCopy.end_time}
              onChange={(e) => {
                setTentativeScheduleCopy((prev) => ({
                  ...prev,
                  end_time: e.target.value,
                }));
              }}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTentativeCopyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={copyTentativeMutation.isPending}>
              {copyTentativeMutation.isPending
                ? "Saving..."
                : "Copy Tentative Schedule"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
);
}

const TentativeAddressInput = memo(({ 
  memoizedTentativeAddressValue, 
  handleAddressChangeTentative 
}) => {
  console.log("TentativeAddressInput start");
  return (
    <AddressAutocomplete
      value={memoizedTentativeAddressValue}
      onChange={handleAddressChangeTentative}
    />
  );
});

// 1. Destructure the params from the function arguments (props)
export const AddTentativeSchedule = ({ 
    instructorId: propInstructorId, 
    date: propDate, 
    startTime: propStartTime 
}: { 
    instructorId?: string, 
    date?: string, 
    startTime?: string 
} = {}) => {
    
    const testMode = false;
    const navigate = useNavigate();
    const { toast } = useToast();
    
    // 2. Get params from the URL
    const { instructorId: urlInstructorId, date: urlDate, startTime: urlStartTime } = useParams();

    // 3. Use URL params first, fallback to prop params if URL is undefined
    const instructorId = urlInstructorId ?? propInstructorId;
    const date = urlDate ?? propDate;
    const startTime = urlStartTime ?? propStartTime;

    const { data: courses } = useQuery({
        queryKey: ["courses"],
        queryFn: async () => {
            const { data, error } = await supabase.from("Courses").select("*");
            if (error) throw error;
            return data;
        }
    });

    const [isAddingBulk, setIsAddingBulk] = useState(false);
    const [bulkType, setBulkType] = useState("single");
    const [repeatCount, setRepeatCount] = useState(1);
    const [addLessonNumber, setAddLessonNumber] = useState(false);
    
    const defaultDate = date || format(new Date(), "yyyy-MM-dd");
    const defaultStart = startTime || "09:00";
    const defaultEnd = startTime 
        ? format(addHours(parseISO(`2024-01-01T${startTime}`), 1), "HH:mm") 
        : "10:00";

    const [newSlotDate, setNewSlotDate] = useState(defaultDate);
    const [newSlotTimes, setNewSlotTimes] = useState({ start: defaultStart, end: defaultEnd });

    const [slots, setSlots] = useState([{
        date: defaultDate,
        start_time: defaultStart,
        end_time: defaultEnd,
        description: "" 
    }]);

    const [tentativeDetails, setTentativeDetails] = useState({
        name: "",
        phone: "",
        paid_info: "Unpaid",
        pickup_location: "",
        leadName: "", 
        address: "",
        course_id: "none",
        lat: null as number | null,
        lng: null as number | null,
    });

    const [availabilityMap, setAvailabilityMap] = useState<Record<string, any>>({});

    useEffect(() => {
        const validateAllSlots = async () => {
            if (!instructorId || slots.length === 0) return;

            try {
                // 1. Local Duplicate Check (Identify slots with identical Date + Start Time)
                const seenSlots = new Set();
                const localDuplicates: Record<string, boolean> = {};
                
                slots.forEach((s, index) => {
                    const key = `${s.date}-${s.start_time}`;
                    if (seenSlots.has(key)) {
                        localDuplicates[index] = true; // Mark this specific index as a duplicate
                    }
                    seenSlots.add(key);
                });

                if (testMode) {
                    const mockMap: Record<string, any> = {};
                    slots.forEach((s, i) => {
                        const key = `${s.date}-${s.start_time}`;
                        mockMap[key] = localDuplicates[i] 
                            ? { available: false, reason: "Duplicate Slot in List" }
                            : { available: true, reason: "" };
                    });
                    setAvailabilityMap(mockMap);
                } else {
                    // 2. Fetch Instructor Conflicts from DB
                    const result = await checkInstructorAvailability(slots, instructorId);
                    
                    // 3. Merge Results: Local duplicates take priority over DB status
                    const mergedResult: Record<string, any> = { ...result };
                    slots.forEach((s, i) => {
                        if (localDuplicates[i]) {
                            const key = `${s.date}-${s.start_time}`;
                            mergedResult[key] = { 
                                available: false, 
                                reason: "Duplicate Slot: Already added to this list" 
                            };
                        }
                    });
                    
                    setAvailabilityMap(mergedResult);
                }
            } catch (err) {
                console.error("Availability Check Failed:", err);
            }
        };

        validateAllSlots();
    }, [slots, instructorId, testMode]);

    const stats = useMemo(() => {
        const total = slots.length;
        const blocked = slots.filter(s => {
            const status = availabilityMap[`${s.date}-${s.start_time}`];
            return status?.available === false;
        }).length;
        return { total, blocked };
    }, [slots, availabilityMap]);

    const getValidationErrors = () => {
        const errors = [];
        const cleanPhone = tentativeDetails.phone.replace(/\D/g, "");
        if (!tentativeDetails.name.trim()) errors.push("Name is required");
        if (cleanPhone.length !== 10) errors.push("Phone must be 10 digits");
        if (!tentativeDetails.leadName.trim()) errors.push("Sales Lead is required");
        if (stats.blocked > 0) errors.push("Remove blocked slots");
        return errors;
    };

    const validationErrors = getValidationErrors();
    const isFormValid = validationErrors.length === 0;

    const handleStartTimeChange = (newStart: string) => {
        const startParsed = parseISO(`2024-01-01T${newStart}`);
        setNewSlotTimes({ start: newStart, end: format(addHours(startParsed, 1), "HH:mm") });
    };

    const handleApplyBulkSchedules = () => {
        const baseDateObj = parseISO(newSlotDate);
        let newSlotsList = [...slots];
        const count = bulkType === "single" ? 1 : repeatCount;

        // Start loop from 0 for "single", but if bulk, 
        // we ensure sDate/sStart increments based on the loop index.
        for (let i = 0; i < count; i++) {
            let sDate = newSlotDate;
            let sStart = newSlotTimes.start;
            let sEnd = newSlotTimes.end;

            if (bulkType === "daily") {
                // Change: i + 1 to start from the NEXT day
                sDate = format(addDays(baseDateObj, i + 1), "yyyy-MM-dd");
            } else if (bulkType === "hourly") {
                const bStart = parseISO(`${newSlotDate}T${newSlotTimes.start}`);
                const bEnd = parseISO(`${newSlotDate}T${newSlotTimes.end}`);
                // Change: i + 1 to start from the NEXT hour
                sStart = format(addHours(bStart, i + 1), "HH:mm");
                sEnd = format(addHours(bEnd, i + 1), "HH:mm");
            }

            newSlotsList.push({ date: sDate, start_time: sStart, end_time: sEnd, description: "" });
        }
        setSlots(newSlotsList);
        setIsAddingBulk(false);
    };

    const getCourseName = useCallback(() => {
        if (tentativeDetails.course_id === "none") return "";
        if (tentativeDetails.course_id === "topup") return "Topup";
        return courses?.find(c => c.id.toString() === tentativeDetails.course_id)?.name || "";
    }, [tentativeDetails.course_id, courses]);

    useEffect(() => {
        const baseName = getCourseName();
        setSlots(prev => prev.map((slot, idx) => {
            const lessonLabel = `Lesson ${idx + 1}`;
            let autoPart = "";
            if (baseName && addLessonNumber) autoPart = `${baseName} - ${lessonLabel}`;
            else if (baseName) autoPart = baseName;
            else if (addLessonNumber) autoPart = lessonLabel;

            const isAuto = !slot.description || slot.description.includes("Lesson") || (baseName && slot.description.includes(baseName));
            return isAuto ? { ...slot, description: autoPart } : slot;
        }));
    }, [tentativeDetails.course_id, addLessonNumber, slots.length, getCourseName]);

    const AddTentativeScheduleMutation = useMutation({
        mutationFn: async () => {
            const schedulesToInsert = slots.map((slot) => ({
                date: slot.date,
                start_time: slot.start_time,
                end_time: slot.end_time,
                instructor_id: instructorId,
                isTentative: true,
                course_id: (tentativeDetails.course_id === "none" || tentativeDetails.course_id === "topup") ? null : parseInt(tentativeDetails.course_id),
                tentative_details: { 
                    ...tentativeDetails, 
                    description: slot.description 
                }
            }));
            const { error } = await supabase.from("Schedule").insert(schedulesToInsert);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Success", description: "Tentative schedules added", variant: "success" });
            navigate('/admin/instructors/' + instructorId);
        }
    });

    return (
        <TooltipProvider>
            <div className="p-6 max-w-4xl mx-auto bg-background shadow-xl rounded-xl border border-border">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-2xl font-bold">Add Tentative Schedules</h1>
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/instructors/' + instructorId)}>✕</Button>
                </div>

                <div className="space-y-6">
                    {/* Input Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Name*</Label><Input value={tentativeDetails.name} onChange={(e) => setTentativeDetails({...tentativeDetails, name: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Phone Number*</Label><Input value={tentativeDetails.phone} onChange={(e) => setTentativeDetails({...tentativeDetails, phone: e.target.value})} maxLength={10} /></div>
                        <div className="space-y-2"><Label>Sales lead name*</Label><Input value={tentativeDetails.leadName} onChange={(e) => setTentativeDetails({...tentativeDetails, leadName: e.target.value})} /></div>
                        <div className="space-y-2">
                            <Label>Payment Status</Label>
                            <Select value={tentativeDetails.paid_info} onValueChange={(v) => setTentativeDetails({...tentativeDetails, paid_info: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Unpaid">Unpaid</SelectItem><SelectItem value="Half paid">Half paid</SelectItem><SelectItem value="Full paid">Full paid</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Address / Pickup Location</Label>
                        <AddressAutocomplete 
                            value={tentativeDetails.address} 
                            onChange={(addr, lat, lng) => setTentativeDetails({
                                ...tentativeDetails, 
                                address: addr, 
                                pickup_location: addr, 
                                lat, 
                                lng
                            })} 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Course Selection</Label>
                            <Select value={tentativeDetails.course_id} onValueChange={(v) => setTentativeDetails({...tentativeDetails, course_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {courses?.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                    <SelectItem value="topup">Topup</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 pb-3">
                            <Checkbox id="lesson-number" checked={addLessonNumber} onCheckedChange={(v) => setAddLessonNumber(!!v)} />
                            <Label htmlFor="lesson-number">Add Lesson number</Label>
                        </div>
                    </div>

                    {/* Preview Table */}
                    <div className="pt-6 border-t border-dashed">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Label className="text-sm font-bold">Scheduled Slots Preview</Label>
                                <div className="flex items-center gap-2 text-xs font-medium px-2 py-1 bg-muted rounded-full">
                                    <span>Total: {stats.total}</span>
                                    {stats.blocked > 0 && <span className="text-destructive font-bold border-l pl-2 border-border">Blocked: {stats.blocked}</span>}
                                </div>
                            </div>
                            <Button type="button" onClick={() => setIsAddingBulk(true)} size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add schedules</Button>
                        </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slots.map((slot, idx) => {
                    const status = availabilityMap[`${slot.date}-${slot.start_time}`];
                    const isUnavail = status?.available === false;

                    return (
                        <div key={idx} className={`p-3 rounded-lg border flex flex-col gap-2 ${
                            isUnavail ? 'border-destructive bg-destructive/5' : 'border-primary/20 bg-primary/5'
                        }`}>
                            <div className="flex justify-between items-center text-xs font-bold">
                                <div className={isUnavail ? 'text-destructive' : 'text-primary'}>
                                    {format(parseISO(slot.date), "MMM do")} | {slot.start_time} - {slot.end_time}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSlots(slots.filter((_, i) => i !== idx))} className="h-6 w-6">
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>

                            <div className="relative">
                                <Input 
                                    className="h-8 text-[11px] bg-background/50 pr-8" 
                                    value={slot.description}
                                    onChange={(e) => {
                                        const updated = [...slots];
                                        updated[idx].description = e.target.value;
                                        setSlots(updated);
                                    }}
                                />
                                {isUnavail && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-destructive">
                                        <Tooltip>
                                            <TooltipTrigger asChild><Info className="h-4 w-4" /></TooltipTrigger>
                                            <TooltipContent>
                                                <p>{status.reason || "Slot Conflict"}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col items-end gap-3 pt-6 border-t">
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => navigate('/admin/instructors/' + instructorId)}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={() => AddTentativeScheduleMutation.mutate()} 
                                disabled={AddTentativeScheduleMutation.isPending} 
                                className="px-8 font-bold"
                            >
                                Confirm Tentative Schedules
                            </Button>
                        </div>

                        {/* Inline Error List instead of Tooltip */}
                        {!isFormValid && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg w-full md:max-w-md">
                                <p className="text-xs font-bold mb-1">Check the following:</p>
                                <ul className="text-[11px] list-disc list-inside space-y-0.5">
                                    {validationErrors.map((e, i) => (
                                        <li key={i}>{e}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bulk Dialog remains the same */}
                <Dialog open={isAddingBulk} onOpenChange={setIsAddingBulk}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Bulk Add Schedules</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Bulk Action</Label>
                                <Select value={bulkType} onValueChange={setBulkType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">Single Schedule</SelectItem>
                                        <SelectItem value="daily">Bulk Daily</SelectItem>
                                        <SelectItem value="hourly">Bulk Hourly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Date</Label><Input type="date" value={newSlotDate} onChange={(e) => setNewSlotDate(e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Start Time</Label><Input type="time" value={newSlotTimes.start} onChange={(e) => handleStartTimeChange(e.target.value)} /></div>
                                <div className="space-y-2"><Label>End Time</Label><Input type="time" value={newSlotTimes.end} onChange={(e) => setNewSlotTimes({...newSlotTimes, end: e.target.value})} /></div>
                            </div>
                            {bulkType !== "single" && (
                                <div className="space-y-2"><Label>Number of copies</Label><Input type="number" value={repeatCount} onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)} min="1" max="15" /></div>
                            )}
                        </div>
                        <DialogFooter><Button className="w-full" onClick={handleApplyBulkSchedules}>Add to Preview</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
};

  function isTimeUnavailable(
    unavailability: any[] | null | undefined,
    day: Date,
    hour: number,
    minute: number,
  ): boolean {
    if (
      !unavailability ||
      !Array.isArray(unavailability) ||
      unavailability.length === 0
    ) {
      return false;
    }

    const currentTime = new Date(day);
    currentTime.setHours(hour, minute);
    const dayOfWeek = format(day, "EEEE").toLowerCase();
    const formattedDate = format(day, "yyyy-MM-dd");

    return unavailability.some((u) => {
      if (u.booked_date && u.all_day) {
        return formattedDate === u.booked_date;
      }

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

      if (u.day_of_week && u.all_day) {
        return u.day_of_week === dayOfWeek;
      }

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

      if (u.start_date && u.end_date && u.range_all_day) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59);
        return currentTime >= rangeStart && currentTime <= rangeEnd;
      }

      if (
        u.start_date &&
        u.end_date &&
        !u.range_all_day &&
        u.range_start_time &&
        u.range_end_time
      ) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59);

        if (currentTime >= rangeStart && currentTime <= rangeEnd) {
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

      if (
        u.start_date &&
        u.end_date &&
        !u.range_all_day &&
        !u.range_start_time
      ) {
        const rangeStart = new Date(u.start_date);
        const rangeEnd = new Date(u.end_date);
        rangeEnd.setHours(23, 59, 59);
        return currentTime >= rangeStart && currentTime <= rangeEnd;
      }

      return false;
    });
  }
  

export const InstructorSchedulePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredHour, setHoveredHour] = useState(null);

  const PALETTE = {
    SUCCESS: "#00CE84",
    PURPLE_LIGHT: "#B28FFF",
    PURPLE_DARK: "#6257FF",
    MINT: "#00FF91",
    ORANGE: "#FFC229",
    CYAN: "#6BECFF",
    BLOCK: "#475569" 
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const handlePrevWeek = () => setCurrentDate(prev => subDays(prev, 7));
  const handleNextWeek = () => setCurrentDate(prev => addDays(prev, 7));
  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const weekDates = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(currentDate, i)), 
  [currentDate]);



  const [isAddingSession, setIsAddingSession] = useState(false);

  // Direction logic: Top half (until noon) slides from bottom, Bottom half slides from top
  const isTopHalf = selectedSlot ? parseInt(selectedSlot.hour) < 12 : true;

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = SlotConfig.startHourOfDay; i < SlotConfig.endHourOfDay; i++) {
      const date = parse(i.toString(), 'H', new Date());
      slots.push({
        hour24: i.toString().padStart(2, '0'),
        display: format(date, "h a")
      });
    }
    return slots;
  }, []);

  const { data: instructor, isLoading } = useQuery({
    queryKey: ["instructor-full", id, format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select(`
          *, 
          schedules:Schedule (
            *, 
            learner:learner_id (
              name, phone, pick_up_location, address_lat, address_lng
            ), 
            lesson:lesson_id (number)
          )
        `)
        .eq("id_instructor", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId) => {
      await supabase.from("Schedule").delete().eq("id", sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["instructor-full"]);
      if (selectedSlot) setSelectedSlot(null);
    },
  });

  const updatePaidInfoMutation = useMutation({
    mutationFn: async ({ sessionId, paidInfo }) => {
      const { error } = await supabase
        .from("Schedule")
        .update({ paid_info: paidInfo }) // Ensure this column exists in your DB
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["instructor-full"]);
    },
  });

  const filteredSchedules = useMemo(() => {
    if (!instructor?.schedules) return [];
    const q = searchQuery.toLowerCase();
    return instructor.schedules.filter(s => {
      const name = (s.isTentative ? s.tentative_details?.name : s.learner?.name) || "";
      const phone = (s.isTentative ? s.tentative_details?.phone : s.learner?.phone) || "";
      return !searchQuery.trim() || name.toLowerCase().includes(q) || phone.includes(q);
    });
  }, [instructor, searchQuery]);

  const formatTimeStr = (time) => time ? time.slice(0, 5) : "";

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="flex flex-col h-screen max-h-screen bg-white overflow-hidden font-sans">
    <header className="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-white z-[100] shadow-sm">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/instructors')} className="rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
          {/* Week Back */}
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={handlePrevWeek}>
            <ChevronsLeft className="w-4 h-4 text-slate-600" />
          </Button>
          {/* Day Back */}
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={handlePrevDay}>
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </Button>

          <Button variant="ghost" size="sm" className="px-3 text-[10px] font-bold uppercase tracking-tight" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>

          {/* Day Forward */}
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={handleNextDay}>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Button>
          {/* Week Forward */}
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={handleNextWeek}>
            <ChevronsRight className="w-4 h-4 text-slate-600" />
          </Button>
        </div>

        <h1 className="text-xs font-bold text-slate-500 uppercase tracking-tight ml-2">
          {format(weekDates[0], "MMM d")} - {format(weekDates[6], "MMM d, yyyy")}
        </h1>
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          placeholder="Search name or phone..." 
          className="w-full pl-9 h-8 bg-slate-50 border-none text-xs rounded-md focus:ring-1 focus:ring-slate-200 outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR (1/4 Width) */}
        <aside className="w-1/4 border-r bg-slate-50/50 relative flex flex-col z-40 overflow-hidden shadow-xl">
          <AnimatePresence mode="wait">
            {!selectedSlot ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select a slot to view sessions</p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ y: isTopHalf ? "100%" : "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: isTopHalf ? "100%" : "-100%", opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden bg-white"
              >
                <div className="px-6 py-5 border-b flex justify-between items-center shrink-0 bg-slate-50/80">
                  <div>
                    <h2 className="text-sm font-bold text-black">{format(selectedSlot.date, "EEEE, MMM d")}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hour: {selectedSlot.hour}:00</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedSlot(null)} className="h-8 w-8 rounded-full"><X className="w-4 h-4" /></Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  <Button 
                    variant="outline" 
                    className="w-full h-10 text-[10px] font-bold uppercase border-dashed border-2 border-slate-200 text-slate-400 hover:border-black hover:text-black mb-2"
                    onClick={() => setIsAddingSession(true)}
                  >
                    <Plus className="w-3 h-3 mr-2" /> Add Session
                  </Button>

{selectedSlot.schedules.map((session) => {
  const details = session.tentative_details || {};
  const isTentative = session.isTentative;
  
  // Logic to show N/A for empty values
  const displayValue = (val: any) => (val && val !== "" ? val : "N/A");
  const paidStatus = isTentative ? (details.paid_info || "Unpaid") : "Unpaid";

  return (
    <div key={session.id} className={cn(
      "p-4 rounded-xl border flex flex-col gap-3 shadow-sm transition-all", 
      isTentative ? "bg-amber-50/30 border-amber-200" : "bg-indigo-50/30 border-indigo-200"
    )}>
      {/* HEADER: Name & Lead */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="font-bold text-sm text-slate-900">
            {isTentative ? displayValue(details.name) : displayValue(session.learner?.name)}
            {!isTentative && session.lesson?.number && (
              <span className="ml-1 text-indigo-400">#{session.lesson.number}</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
            Lead: {isTentative ? displayValue(details.leadName) : "N/A"}
          </span>
        </div>
        
        {/* Static Status Badge */}
        <div className={cn(
          "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
          paidStatus === "Full paid" ? "bg-emerald-100 border-emerald-200 text-emerald-700" :
          paidStatus === "Half paid" ? "bg-sky-100 border-sky-200 text-sky-700" :
          "bg-slate-100 border-slate-200 text-slate-600"
        )}>
          {paidStatus}
        </div>
      </div>

      {/* FULL PICKUP LOCATION & QUERY LINK */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2 text-[11px] text-slate-700 bg-white/60 p-2 rounded-lg border border-slate-100">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 w-full">
            <span className="font-medium leading-normal">
              {isTentative ? displayValue(details.pickup_location) : displayValue(session.learner?.pick_up_location)}
            </span>
            {/* Maps Link with ?q=lat,lng */}
            {isTentative && details.lat && details.lng ? (
              <a 
                href={`https://www.google.com/maps?q=${details.lat},${details.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1 uppercase"
              >
                Open in Maps <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
               <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">No Map Link (N/A)</span>
            )}
          </div>
        </div>
      </div>

      {/* FULL DESCRIPTION */}
      <div className="text-[11px] text-slate-600 bg-slate-100/50 p-2.5 rounded-lg border-l-4 border-slate-300">
        <p className="font-bold text-[9px] uppercase text-slate-400 mb-1">Description</p>
        <span className="italic leading-relaxed">
          {isTentative ? (details.description ? `"${details.description}"` : "N/A") : "N/A"}
        </span>
      </div>

      {/* FOOTER: Time */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-600">
        <Clock className="w-3.5 h-3.5 text-slate-400" /> 
        {formatTimeStr(session.start_time)} - {formatTimeStr(session.end_time)}
      </div>
    </div>
  );
})}
                </div>

                {/* ADD OVERLAY (Within Sidebar) */}
                <AnimatePresence>
                  {isAddingSession && (
                    <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="absolute inset-0 bg-white z-50 flex flex-col">
                      <div className="px-6 py-4 border-b flex justify-between items-center bg-black text-white">
                        <span className="text-xs font-bold uppercase">Add Session</span>
                        <Button variant="ghost" size="icon" onClick={() => setIsAddingSession(false)} className="text-white hover:bg-white/20"><X className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6"><AddTentativeSchedule instructorId={id} date={format(selectedSlot.date, "yyyy-MM-dd")} startTime={`${selectedSlot.hour}:00`} /></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* CALENDAR (3/4 Width) */}
        <div className="flex-1 flex flex-row overflow-hidden bg-white">
          {/* TIME AXIS */}
          <div className="w-14 flex flex-col bg-slate-50 border-r shrink-0 z-20">
            <div className="h-10 border-b bg-white" />
            <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${timeSlots.length}, 1fr)` }}>
              {timeSlots.map((slot, idx) => (
                <div key={slot.hour24} className={cn("flex items-start justify-end pr-2 pt-1 border-b border-slate-100 transition-colors", hoveredHour === idx ? "bg-slate-200/50" : "")}>
                  <span className="text-[9px] font-bold uppercase text-slate-400">{slot.display}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
            {/* GRID HEADERS */}
            <div className="grid grid-cols-7 border-b bg-white sticky top-0 shrink-0 z-30">
              {weekDates.map((date, idx) => (
                <div key={date.toString()} className={cn("h-10 flex flex-col items-center justify-center border-r last:border-0 transition-colors", hoveredDay === idx ? "bg-slate-100" : "bg-white")}>
                  <span className="text-[8px] font-bold uppercase text-slate-400">{format(date, "EEE")}</span>
                  <span className={cn("text-[10px] font-black", format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? "text-[#6257FF]" : "text-slate-700")}>{format(date, "d")}</span>
                </div>
              ))}
            </div>

            {/* GRID CELLS */}
            <div className="flex-1 grid grid-cols-7 relative min-h-0" style={{ gridTemplateRows: `repeat(${timeSlots.length}, 1fr)` }}>
              {timeSlots.map((slot, rowIdx) => (
                <Fragment key={slot.hour24}>
                  {weekDates.map((date, colIdx) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const slotSchedules = filteredSchedules.filter(s => s.date === dateStr && s.start_time.split(':')[0] === slot.hour24);
                    const isTopUnavailable = isTimeUnavailable(instructor?.unavailability, date, parseInt(slot.hour24), 0);
                    const isBottomUnavailable = isTimeUnavailable(instructor?.unavailability, date, parseInt(slot.hour24), 30);

                    return (
                      <div 
                        key={`${dateStr}-${slot.hour24}`}
                        className={cn(
                          "border-r border-b border-slate-50 relative group cursor-pointer transition-colors", 
                          (hoveredDay === colIdx || hoveredHour === rowIdx) ? "bg-slate-50/50" : "",
                          selectedSlot?.date === date && selectedSlot?.hour === slot.hour24 ? "bg-indigo-50/30" : ""
                        )}
                        onMouseEnter={() => { setHoveredDay(colIdx); setHoveredHour(rowIdx); }}
                        onMouseLeave={() => { setHoveredDay(null); setHoveredHour(null); }}
                        onClick={() => { setSelectedSlot({ date, hour: slot.hour24, schedules: slotSchedules }); setIsAddingSession(false); }}
                      >
                        {isTopUnavailable && <div className="absolute top-0 left-0 w-full h-1/2 z-0 opacity-10" style={{ backgroundColor: PALETTE.BLOCK }} />}
                        {isBottomUnavailable && <div className="absolute bottom-0 left-0 w-full h-1/2 z-0 opacity-10" style={{ backgroundColor: PALETTE.BLOCK }} />}
                        <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-slate-100 pointer-events-none z-0" />

                        <div className="absolute inset-0 p-0.5 z-20 overflow-visible pointer-events-none">
                          {slotSchedules.map((session, idx) => {
                            const startMin = parseInt(session.start_time.split(':')[1]);
                            const duration = differenceInMinutes(parse(session.end_time, 'HH:mm:ss', new Date()), parse(session.start_time, 'HH:mm:ss', new Date())) || 60;
                            return (
                              <div 
                                key={session.id}
                                className={cn(
                                  "absolute rounded-sm shadow-md border-l-2 p-1 flex flex-col pointer-events-auto transition-all", 
                                  session.isTentative ? "bg-amber-400 border-amber-600 text-amber-950" : "bg-indigo-500 border-indigo-700 text-white"
                                )}
                                style={{ left: `${idx * 10}%`, width: '90%', top: `${(startMin / 60) * 100}%`, height: `${(duration / 60) * 100}%`, zIndex: 50 + idx, minHeight: '24px' }}
                              >
                                <div className="font-bold text-[8px] truncate leading-none mb-0.5">
                                  {session.isTentative ? session.tentative_details?.name : session.learner?.name}
                                  {!session.isTentative && session.lesson?.number && <span> ({session.lesson.number})</span>}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-90 text-[7px] font-medium">
                                  <Clock className="w-1.5 h-1.5" /> {formatTimeStr(session.start_time)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}