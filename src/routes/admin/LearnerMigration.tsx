import { useQuery } from "@tanstack/react-query";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { googleMapsLoader } from "@/utils/googleMaps";
import { addDays, format, isBefore, isSameDay, startOfDay } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileUp,
  Loader2,
  MapPin,
  PlusCircle,
  Trash2,
  User,
  UserCheck,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { sendMultiEventCalendarInvite } from "@/lib/calendarUtils";
import { supabase } from "@/lib/supabaseClient";
import { generateRandomOTP } from "@/lib/utils";

// Predefined courses with their IDs and durations
const PREDEFINED_COURSES = [
  {
    id: "e129f667-0510-4f07-9847-edb58356dc74",
    name: "Beginner Course",
    duration: 10,
  },
  { id: "f60e5fdb-787a-4b40-844d-4e66416a6c8f", name: "Flyover", duration: 2 },
  { id: "0ce6680f-6e12-49d7-8cf9-4388e81d2e27", name: "Parking", duration: 2 },
  { id: "cc5fb06a-419f-4766-a79b-221c81bf9826", name: "Slopes", duration: 2 },
  { id: "7ff8818e-5b52-4030-bc2d-f54071e8ed7f", name: "Traffic", duration: 4 },
  {
    id: "05a5f57f-c3e2-48ac-b29f-4299e30442eb",
    name: "Parking + Flyover",
    duration: 4,
  },
  {
    id: "abddddb8-3f54-41ea-a64b-5ba55988b12a",
    name: "Slopes + Parking",
    duration: 4,
  },
  {
    id: "ddbbfbbf-2222-4742-947b-ccd4e25e7936",
    name: "Traffic + Parking",
    duration: 6,
  },
  {
    id: "14552c29-e7e5-4e76-a350-1ae7d8ffc7f3",
    name: "Traffic + Flyover",
    duration: 6,
  },
  {
    id: "b991363c-6791-411e-9cb8-6723e40d0a0a",
    name: "Traffic + Parking + Flyover",
    duration: 8,
  },
];

// Skill modules for custom course
const SKILL_MODULES = [
  { id: "flyover", name: "Flyover", hours: 2 },
  { id: "parking", name: "Parking", hours: 2 },
  { id: "slopes", name: "Slopes", hours: 2 },
  { id: "traffic", name: "Traffic", hours: 4 },
];

type CourseType = "predefined" | "custom";

// Map styles
const mapContainerStyle = {
  width: "100%",
  height: "250px",
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

interface MigrationData {
  // Step 1: Basic Info
  name: string;
  phone: string;
  email: string;
  dob: string;
  area: string;
  pincode: string;
  pick_up_location: string;
  address_lat: number | null;
  address_lng: number | null;

  // Step 2: License Info
  has_a_DL: boolean;
  has_two_wheeler_license: boolean;
  address_change_required: boolean;
  LL_received: boolean;
  LL_received_date: string;
  LL_application_id: string;
  DL_id: string;
  DL_received: boolean;
  DL_received_date: string;

  // Step 3: Course & Payment Info
  courseType: CourseType;
  selectedCourseId: string;
  selectedModules: string[];
  totalLessons: number;
  completedLessons: string;
  totalAmount: string;
  amountPaid: string;
  paymentStatus: "pending" | "partial" | "completed";
  enrollmentStatus: "pending" | "active" | "completed";

  // Step 4: Schedule Setup (when completedLessons > 0)
  selectedInstructorId: string;
  scheduleEntries: ScheduleEntry[];

  // Additional Notes
  comments: string;
}

interface ScheduleEntry {
  lessonNumber: number;
  date: string;
  startTime: string;
}

interface Instructor {
  id_instructor: string;
  name: string;
  phone: string;
  email: string;
  is_active?: boolean;
}

interface ServiceableArea {
  id: string;
  name: string;
}

// Steps are dynamic based on whether schedule setup is needed
const getSteps = (showScheduleSetup: boolean) => {
  const baseSteps = [
    { id: 1, title: "Basic Info", icon: User },
    { id: 2, title: "License Info", icon: FileUp },
    { id: 3, title: "Course & Payment", icon: BookOpen },
  ];

  if (showScheduleSetup) {
    return [
      ...baseSteps,
      { id: 4, title: "Schedule Setup", icon: Calendar },
      { id: 5, title: "Review", icon: ClipboardCheck },
    ];
  }

  return [...baseSteps, { id: 4, title: "Review", icon: ClipboardCheck }];
};

// Available time slots for scheduling (5 AM to 10 PM, with 30-minute intervals)
const TIME_SLOTS = [
  { value: "05:00", label: "5:00 AM" },
  { value: "05:30", label: "5:30 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "06:30", label: "6:30 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "07:30", label: "7:30 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "08:30", label: "8:30 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "13:30", label: "1:30 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "14:30", label: "2:30 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "15:30", label: "3:30 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "16:30", label: "4:30 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "17:30", label: "5:30 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "18:30", label: "6:30 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "19:30", label: "7:30 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "20:30", label: "8:30 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "21:30", label: "9:30 PM" },
  { value: "22:00", label: "10:00 PM" },
];

// Address Autocomplete Component using shared Google Maps loader
function AddressAutocomplete({
  defaultValue,
  onChange,
  onPlaceSelect,
}: {
  defaultValue: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: {
    address: string;
    pincode: string;
    lat: number;
    lng: number;
  }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    let listener: google.maps.MapsEventListener | null = null;

    googleMapsLoader.load().then(() => {
      if (!inputRef.current || autocompleteRef.current) return;

      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: "IN" },
          fields: ["address_components", "formatted_address", "geometry"],
        },
      );

      listener = autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.formatted_address || !place.geometry?.location) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        const postcodeComponent = place.address_components?.find((component) =>
          component.types.includes("postal_code"),
        );

        onPlaceSelect({
          address: place.formatted_address,
          pincode: postcodeComponent?.long_name || "",
          lat,
          lng,
        });
      });
    });

    return () => {
      if (listener) google.maps.event.removeListener(listener);
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Start typing address..."
        defaultValue={defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}

// Main Migration Form Content Component
function MigrationFormContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);
  const [createdLearnerId, setCreatedLearnerId] = useState<string | null>(null);

  // Area search state
  const [areaSearchQuery, setAreaSearchQuery] = useState("");
  const [areaSearchOpen, setAreaSearchOpen] = useState(false);
  const [newCustomArea, setNewCustomArea] = useState<string | null>(null);

  // Fetch serviceable areas
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

  // Fetch instructors for schedule assignment
  const { data: instructors, isLoading: instructorsLoading } = useQuery({
    queryKey: ["instructors-for-migration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Instructor[];
    },
  });

  const [formData, setFormData] = useState<MigrationData>({
    // Step 1
    name: "",
    phone: "",
    email: "",
    dob: "",
    area: "",
    pincode: "",
    pick_up_location: "",
    address_lat: null,
    address_lng: null,

    // Step 2
    has_a_DL: false,
    has_two_wheeler_license: false,
    address_change_required: false,
    LL_received: false,
    LL_received_date: "",
    LL_application_id: "",
    DL_id: "",
    DL_received: false,
    DL_received_date: "",

    // Step 3
    courseType: "predefined",
    selectedCourseId: "",
    selectedModules: [],
    totalLessons: 0,
    completedLessons: "",
    totalAmount: "",
    amountPaid: "",
    paymentStatus: "pending",
    enrollmentStatus: "active",

    // Step 4: Schedule Setup
    selectedInstructorId: "",
    scheduleEntries: [],

    // Additional
    comments: "",
  });

  // Calculate total lessons based on course selection
  const totalLessons = useMemo(() => {
    if (formData.courseType === "predefined") {
      const course = PREDEFINED_COURSES.find(
        (c) => c.id === formData.selectedCourseId,
      );
      return course?.duration || 0;
    }
    if (formData.courseType === "custom") {
      return formData.selectedModules.reduce((total, moduleId) => {
        const module = SKILL_MODULES.find((m) => m.id === moduleId);
        return total + (module?.hours || 0);
      }, 0);
    }
    return 0;
  }, [
    formData.courseType,
    formData.selectedCourseId,
    formData.selectedModules,
  ]);

  // Get course name for display
  const courseName = useMemo(() => {
    if (formData.courseType === "predefined") {
      const course = PREDEFINED_COURSES.find(
        (c) => c.id === formData.selectedCourseId,
      );
      return course?.name || "";
    }
    if (formData.courseType === "custom") {
      const moduleNames = formData.selectedModules.map((id) => {
        const module = SKILL_MODULES.find((m) => m.id === id);
        return module?.name || "";
      });
      return moduleNames.length > 0
        ? `Custom: ${moduleNames.join(" + ")}`
        : "Custom Course";
    }
    return "";
  }, [
    formData.courseType,
    formData.selectedCourseId,
    formData.selectedModules,
  ]);

  // Determine if schedule setup step should be shown
  const completedLessonsNum = parseInt(formData.completedLessons) || 0;
  const showScheduleSetup =
    completedLessonsNum > 0 && totalLessons > completedLessonsNum;
  const remainingLessons = totalLessons - completedLessonsNum;

  // Get dynamic steps based on whether schedule setup is needed
  const STEPS = useMemo(() => getSteps(showScheduleSetup), [showScheduleSetup]);

  // Get the review step number (4 or 5 depending on schedule setup)
  const reviewStepNumber = showScheduleSetup ? 5 : 4;

  // Calendar week navigation state
  const [calendarStartDate, setCalendarStartDate] = useState<Date>(
    startOfDay(new Date()),
  );

  // Navigate calendar week
  const navigateCalendarWeek = (direction: "prev" | "next") => {
    setCalendarStartDate((prev) =>
      direction === "next" ? addDays(prev, 7) : addDays(prev, -7),
    );
  };

  // Get the 7 days to display in the calendar
  const calendarDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(calendarStartDate, i));
  }, [calendarStartDate]);

  // Check if a slot is selected
  const isSlotSelected = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return formData.scheduleEntries.some(
      (entry) => entry.date === dateStr && entry.startTime === time,
    );
  };

  // Get lesson number for a selected slot
  const getSlotLessonNumber = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const entry = formData.scheduleEntries.find(
      (entry) => entry.date === dateStr && entry.startTime === time,
    );
    return entry?.lessonNumber;
  };

  // Handle slot click - toggle selection
  const handleSlotClick = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const today = startOfDay(new Date());

    // Don't allow selecting past dates
    if (isBefore(date, today)) {
      toast({
        title: "Cannot select past dates",
        description: "Please select a future date for scheduling.",
        variant: "destructive",
      });
      return;
    }

    // Check if slot is already selected
    const existingIndex = formData.scheduleEntries.findIndex(
      (entry) => entry.date === dateStr && entry.startTime === time,
    );

    if (existingIndex >= 0) {
      // Deselect the slot - clear date and time but keep lesson number
      const entry = formData.scheduleEntries[existingIndex];
      const newEntries = formData.scheduleEntries.map((e) =>
        e.lessonNumber === entry.lessonNumber
          ? { ...e, date: "", startTime: "" }
          : e,
      );
      updateFormData({ scheduleEntries: newEntries });
    } else {
      // Find the first unscheduled lesson
      const unscheduledEntry = formData.scheduleEntries.find(
        (entry) => !entry.date || !entry.startTime,
      );

      if (!unscheduledEntry) {
        toast({
          title: "All lessons scheduled",
          description:
            "All remaining lessons have been scheduled. Click on a scheduled slot to remove it.",
          variant: "default",
        });
        return;
      }

      // Assign this slot to the first unscheduled lesson
      const newEntries = formData.scheduleEntries.map((entry) =>
        entry.lessonNumber === unscheduledEntry.lessonNumber
          ? { ...entry, date: dateStr, startTime: time }
          : entry,
      );
      updateFormData({ scheduleEntries: newEntries });
    }
  };

  // Clear all schedule selections
  const clearAllSchedules = () => {
    const clearedEntries = formData.scheduleEntries.map((entry) => ({
      ...entry,
      date: "",
      startTime: "",
    }));
    updateFormData({ scheduleEntries: clearedEntries });
  };

  // Count scheduled lessons
  const scheduledCount = formData.scheduleEntries.filter(
    (e) => e.date && e.startTime,
  ).length;

  const updateFormData = (updates: Partial<MigrationData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "has_a_DL") {
      updateFormData({
        has_a_DL: checked,
        has_two_wheeler_license: checked
          ? false
          : formData.has_two_wheeler_license,
      });
    } else if (name === "has_two_wheeler_license") {
      updateFormData({
        has_two_wheeler_license: checked,
        has_a_DL: checked ? false : formData.has_a_DL,
      });
    } else {
      updateFormData({
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const toggleModule = (moduleId: string) => {
    const newModules = formData.selectedModules.includes(moduleId)
      ? formData.selectedModules.filter((id) => id !== moduleId)
      : [...formData.selectedModules, moduleId];
    updateFormData({ selectedModules: newModules });
  };

  // Handle adding a custom area
  const handleAddCustomArea = () => {
    if (!areaSearchQuery.trim()) return;
    updateFormData({ area: areaSearchQuery.trim() });
    setNewCustomArea(areaSearchQuery.trim());
    setAreaSearchQuery("");
    setAreaSearchOpen(false);
  };

  // Handle place selection from autocomplete
  const handlePlaceSelect = useCallback(
    (place: { address: string; pincode: string; lat: number; lng: number }) => {
      setFormData((prev) => ({
        ...prev,
        pick_up_location: place.address,
        pincode: place.pincode,
        address_lat: place.lat,
        address_lng: place.lng,
      }));
    },
    [],
  );

  // Handle map drag to update location
  const onMapDragEnd = useCallback((ev: any) => {
    const center = ev.map.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();

    // Reverse geocode to get address and pincode
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const result = results[0];
        const postcodeComponent = result.address_components?.find((component) =>
          component.types.includes("postal_code"),
        );

        setFormData((prev) => ({
          ...prev,
          address_lat: lat,
          address_lng: lng,
          pick_up_location: result.formatted_address,
          pincode: postcodeComponent?.long_name || "",
        }));
      } else {
        // If geocoding fails, at least update coordinates
        setFormData((prev) => ({
          ...prev,
          address_lat: lat,
          address_lng: lng,
        }));
      }
    });
  }, []);

  // Validation for each step
  const validateStep = (step: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!formData.name.trim()) errors.push("Name is required");
        if (!formData.phone.trim()) errors.push("Phone is required");
        if (formData.phone && formData.phone.length !== 10)
          errors.push("Phone must be 10 digits");
        if (
          formData.email &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        )
          errors.push("Invalid email format");
        break;

      case 2:
        // License info is optional, no required validations
        break;

      case 3:
        if (
          formData.courseType === "predefined" &&
          !formData.selectedCourseId
        ) {
          errors.push("Please select a course");
        }
        if (
          formData.courseType === "custom" &&
          formData.selectedModules.length === 0
        ) {
          errors.push("Please select at least one module");
        }
        const completedNum = parseInt(formData.completedLessons) || 0;
        const totalAmountNum = parseInt(formData.totalAmount) || 0;
        const amountPaidNum = parseInt(formData.amountPaid) || 0;
        if (completedNum > totalLessons) {
          errors.push("Completed lessons cannot exceed total lessons");
        }
        if (amountPaidNum > totalAmountNum) {
          errors.push("Amount paid cannot exceed total amount");
        }
        break;

      case 4:
        // Schedule setup validation (only when showScheduleSetup is true)
        if (showScheduleSetup) {
          if (!formData.selectedInstructorId) {
            errors.push("Please select an instructor");
          }
          const incompleteEntries = formData.scheduleEntries.filter(
            (entry) => !entry.date || !entry.startTime,
          );
          if (incompleteEntries.length > 0) {
            errors.push(
              `Please fill in date and time for all ${remainingLessons} lessons`,
            );
          }
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  };

  const handleNext = () => {
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    // Update totalLessons when moving from step 3
    if (currentStep === 3) {
      updateFormData({ totalLessons });
      // Initialize schedule entries if moving to schedule setup
      if (showScheduleSetup) {
        const initialEntries: ScheduleEntry[] = [];
        for (let i = completedLessonsNum + 1; i <= totalLessons; i++) {
          initialEntries.push({
            lessonNumber: i,
            date: "",
            startTime: "",
          });
        }
        updateFormData({ scheduleEntries: initialEntries });
      }
    }

    const maxStep = showScheduleSetup ? 5 : 4;
    setCurrentStep((prev) => Math.min(prev + 1, maxStep));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Check if learner already exists
      const { data: existingLearner } = await supabase
        .from("Learner")
        .select("id")
        .eq("phone", formData.phone)
        .maybeSingle();

      if (existingLearner) {
        toast({
          title: "Error",
          description: "A learner with this phone number already exists",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // 2. If we have a new custom area, save it to Supabase first
      if (newCustomArea) {
        const { data: existingArea } = await supabase
          .from("Serviceable_Areas")
          .select("id, name")
          .ilike("name", newCustomArea)
          .maybeSingle();

        if (!existingArea) {
          await supabase
            .from("Serviceable_Areas")
            .insert({ name: newCustomArea });
        }
        setNewCustomArea(null);
      }

      // Parse string amounts to numbers for database
      const totalAmountNum = parseInt(formData.totalAmount) || 0;
      const amountPaidNum = parseInt(formData.amountPaid) || 0;
      const completedLessonsNumSubmit =
        parseInt(formData.completedLessons) || 0;

      // 3. Create Learner record
      // Determine LL status based on various conditions:
      // - If has_a_DL (4-wheeler DL), they MUST have LL (required in India)
      // - If completed any lessons, they must have LL
      // - Otherwise, use the form value
      const shouldHaveLL =
        formData.has_a_DL ||
        completedLessonsNumSubmit > 0 ||
        formData.LL_received;

      // When LL is received (or should be received), set all intermediate LL flow fields
      // This ensures the learner app doesn't get stuck in the LL flow
      const llReceivedDate = formData.LL_received_date || null;

      const learnerData: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        dob: formData.dob || null,
        area: formData.area || null,
        pincode: formData.pincode || null,
        pick_up_location: formData.pick_up_location || null,
        address_lat: formData.address_lat,
        address_lng: formData.address_lng,
        has_a_DL: formData.has_a_DL,
        has_two_wheeler_license: formData.has_two_wheeler_license,
        address_change_required: formData.address_change_required,
        // LL fields - set all required fields when LL is received
        LL_received: shouldHaveLL,
        LL_received_date: llReceivedDate,
        LL_application_id: formData.LL_application_id || null,
        // When LL is received, set intermediate flow fields to skip LL flow in learner app
        LL_team_appointment_booked: shouldHaveLL ? true : null,
        LL_application_approved: shouldHaveLL ? true : null,
        LL_test_date: shouldHaveLL ? llReceivedDate : null,
        LL_result: shouldHaveLL ? true : null,
        // DL fields
        DL_id: formData.DL_id || null,
        DL_received: formData.DL_received,
        DL_received_date: formData.DL_received_date || null,
        comments: formData.comments
          ? `[Migration] ${formData.comments}`
          : "[Migration] Migrated from paper records",
        onboarding_completed: true,
        enabled: true,
      };

      const { data: createdLearner, error: learnerError } = await supabase
        .from("Learner")
        .insert(learnerData)
        .select()
        .single();

      if (learnerError) throw learnerError;

      setCreatedLearnerId(createdLearner.id);

      // 4. Always create Payment record for migrated learners
      // This ensures the app recognizes them as enrolled
      const paymentData = {
        learner_id: createdLearner.id,
        amount: amountPaidNum > 0 ? amountPaidNum : totalAmountNum,
        payment_type: "course",
        status: "completed", // Mark as completed for migration
        email: formData.email || null,
        phone: formData.phone,
        installment_type:
          amountPaidNum > 0 && amountPaidNum < totalAmountNum
            ? "first_half"
            : "full",
        total_amount: totalAmountNum,
      };

      const { data: createdPayment, error: paymentError } = await supabase
        .from("payment")
        .insert(paymentData as any)
        .select()
        .single();

      if (paymentError) throw paymentError;
      const paymentId = createdPayment.id;

      // 5. Create Enrollment record
      const courseId =
        formData.courseType === "predefined" ? formData.selectedCourseId : null;

      // Half payment unlock: 10→8, 8→6, 6→4, 4→2, 2→1
      const halfPaymentUnlock =
        totalLessons <= 1 ? 1 : totalLessons === 2 ? 1 : totalLessons - 2;
      const unlockedCount =
        formData.paymentStatus === "completed"
          ? totalLessons
          : Math.max(Math.min(completedLessonsNumSubmit + 1, totalLessons), halfPaymentUnlock);

      const enrollmentData = {
        learner_id: createdLearner.id,
        course_id: courseId,
        payment_id: paymentId,
        status: "active", // Always active for migration
        amount: totalAmountNum,
        installment_mode:
          amountPaidNum < totalAmountNum ? "installment" : "full",
        installment1_amount: amountPaidNum,
        installment2_amount: totalAmountNum - amountPaidNum,
        payment_status:
          amountPaidNum >= totalAmountNum
            ? "completed"
            : amountPaidNum > 0
              ? "half_paid"
              : "pending",
        unlocked_lessons: Array.from(
          { length: unlockedCount },
          (_, i) => i + 1,
        ),
        progress: {
          type: formData.courseType === "custom" ? "custom" : "new",
          total_hours: totalLessons,
          completed_lessons: Array.from(
            { length: completedLessonsNumSubmit },
            (_, i) => i + 1,
          ),
          current_lesson:
            completedLessonsNumSubmit < totalLessons
              ? completedLessonsNumSubmit + 1
              : totalLessons,
        },
      };

      const { error: enrollmentError } = await supabase
        .from("enrollment")
        .insert(enrollmentData as any)
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      // 6. For predefined courses, fetch existing lessons (don't create new ones)
      // For custom courses, lessons are handled as "virtual" lessons (no DB records needed)
      let existingLessons: any[] = [];
      if (totalLessons > 0 && courseId) {
        // Fetch existing lessons for this predefined course
        const { data: fetchedLessons, error: lessonError } = await supabase
          .from("Lesson")
          .select("*")
          .eq("course_id", courseId)
          .order("number", { ascending: true });

        if (lessonError) throw lessonError;
        existingLessons = fetchedLessons || [];

        // 7. Create Schedule records if schedule entries are provided
        if (
          formData.scheduleEntries.length > 0 &&
          formData.selectedInstructorId
        ) {
          const selectedInstructor = instructors?.find(
            (i) => i.id_instructor === formData.selectedInstructorId,
          );

          const scheduleRecords = formData.scheduleEntries.map((entry) => {
            // Find the lesson ID for this lesson number from existing lessons
            const lesson = existingLessons?.find(
              (l: any) => l.number === entry.lessonNumber,
            );

            // Parse start time and calculate end time (1 hour later)
            const [hours, minutes] = entry.startTime.split(":").map(Number);
            const endHours = (hours + 1) % 24;
            const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

            return {
              learner_id: createdLearner.id,
              course_id: courseId,
              lesson_id: lesson?.id,
              instructor_id: formData.selectedInstructorId,
              date: entry.date,
              start_time: `${entry.startTime}:00`,
              end_time: endTime,
              enabled: true,
              otp: generateRandomOTP(),
              otp_end: generateRandomOTP(),
            };
          });

          const { data: createdSchedules, error: scheduleError } =
            await supabase
              .from("Schedule")
              .insert(scheduleRecords as any)
              .select();

          if (scheduleError) throw scheduleError;

          // 8. Send calendar invite emails if learner has email
          if (formData.email && createdSchedules && selectedInstructor) {
            try {
              const calendarEvents = createdSchedules.map((schedule: any) => {
                const startDateTime = new Date(
                  `${schedule.date}T${schedule.start_time}`,
                );
                const endDateTime = new Date(
                  `${schedule.date}T${schedule.end_time}`,
                );
                const entry = formData.scheduleEntries.find(
                  (e) => e.date === schedule.date,
                );

                return {
                  startTime: startDateTime,
                  endTime: endDateTime,
                  lessonNumber: entry?.lessonNumber || 0,
                  pickupLocation:
                    formData.pick_up_location || "To be confirmed",
                  instructorName: selectedInstructor.name,
                  instructorPhone: selectedInstructor.phone,
                  instructorEmail: selectedInstructor.email,
                  instructorId: selectedInstructor.id_instructor,
                };
              });

              await sendMultiEventCalendarInvite(
                formData.email,
                selectedInstructor.email,
                calendarEvents,
                selectedInstructor.name,
                formData.name,
                formData.phone,
                "new",
                createdLearner.id,
              );

              toast({
                title: "Calendar Invites Sent",
                description:
                  "Schedule details have been emailed to the learner.",
              });
            } catch (emailError) {
              console.error("Error sending calendar invites:", emailError);
              // Don't fail migration if email fails
              toast({
                title: "Note",
                description:
                  "Migration successful but calendar invite failed to send.",
                variant: "default",
              });
            }
          }
        }
      }

      setMigrationSuccess(true);
      toast({
        title: "Migration Successful",
        description: `${formData.name} has been migrated successfully!`,
      });
    } catch (error: any) {
      console.error("Migration error:", error);
      toast({
        title: "Migration Failed",
        description: error.message || "An error occurred during migration",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      dob: "",
      area: "",
      pincode: "",
      pick_up_location: "",
      address_lat: null,
      address_lng: null,
      has_a_DL: false,
      has_two_wheeler_license: false,
      address_change_required: false,
      LL_received: false,
      LL_received_date: "",
      LL_application_id: "",
      DL_id: "",
      DL_received: false,
      DL_received_date: "",
      courseType: "predefined",
      selectedCourseId: "",
      selectedModules: [],
      totalLessons: 0,
      completedLessons: "",
      totalAmount: "",
      amountPaid: "",
      paymentStatus: "pending",
      enrollmentStatus: "active",
      selectedInstructorId: "",
      scheduleEntries: [],
      comments: "",
    });
    setCurrentStep(1);
    setMigrationSuccess(false);
    setCreatedLearnerId(null);
    setAreaSearchQuery("");
    setNewCustomArea(null);
  };

  // Filter areas based on search
  const filteredAreas = useMemo(() => {
    if (!serviceableAreas) return [];
    if (!areaSearchQuery) return serviceableAreas;
    return serviceableAreas.filter((a) =>
      a.name.toLowerCase().includes(areaSearchQuery.toLowerCase()),
    );
  }, [serviceableAreas, areaSearchQuery]);

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10 digit phone number"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <Separator />

            {/* Area Selector with Search */}
            <div className="space-y-2">
              <Label>Area / Locality</Label>
              <Popover open={areaSearchOpen} onOpenChange={setAreaSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {formData.area || "Search and select area..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-2">
                    <Input
                      placeholder="Search areas..."
                      value={areaSearchQuery}
                      onChange={(e) => setAreaSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomArea();
                        }
                      }}
                      className="mb-2"
                    />
                  </div>

                  {areasLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredAreas.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto">
                      {filteredAreas.map((area) => (
                        <div
                          key={area.id}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm hover:bg-primary/10"
                          onClick={() => {
                            updateFormData({ area: area.name });
                            setAreaSearchQuery("");
                            setAreaSearchOpen(false);
                          }}
                        >
                          <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                          <span>{area.name}</span>
                          {formData.area === area.name && (
                            <Check className="ml-auto h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      {areaSearchQuery ? (
                        <div className="px-4 py-2">
                          <p className="mb-2 text-sm text-gray-500">
                            No matching areas found.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddCustomArea}
                            className="w-full"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add "{areaSearchQuery}" as new area
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

            {/* Address with Google Places Autocomplete */}
            <div className="space-y-2">
              <Label>Pick-up Location / Address</Label>
              <AddressAutocomplete
                defaultValue={formData.pick_up_location}
                onChange={(value) =>
                  updateFormData({ pick_up_location: value })
                }
                onPlaceSelect={handlePlaceSelect}
              />
              {formData.address_lat && formData.address_lng && (
                <p className="text-xs text-green-600">
                  <Check className="mr-1 inline h-3 w-3" />
                  Location coordinates captured - drag the map to adjust
                </p>
              )}
            </div>

            {/* Pincode - auto-filled from address */}
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                placeholder="Auto-filled from address or enter manually"
                maxLength={6}
              />
            </div>

            {/* Map - shown when coordinates are available */}
            {formData.address_lat && formData.address_lng && (
              <div className="space-y-2">
                <Label>Confirm Location on Map</Label>
                <p className="text-xs text-gray-500">
                  Drag the map to fine-tune the exact pick-up location
                </p>
                <div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
                  <Map
                    defaultZoom={17}
                    center={{
                      lat: formData.address_lat,
                      lng: formData.address_lng,
                    }}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    style={mapContainerStyle}
                    onDragend={onMapDragEnd}
                  />
                  <div style={markerStyle}>
                    <MapPin
                      className="h-8 w-8 text-black"
                      strokeWidth={1}
                      fill="hsl(var(--primary))"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border bg-blue-50 p-4">
              <h3 className="mb-2 font-medium text-blue-800">
                License Information
              </h3>
              <p className="text-sm text-blue-700">
                Select the current license status of the customer. This helps
                track their learning journey.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_a_DL"
                  name="has_a_DL"
                  checked={formData.has_a_DL}
                  onCheckedChange={(checked) =>
                    updateFormData({
                      has_a_DL: !!checked,
                      has_two_wheeler_license: checked
                        ? false
                        : formData.has_two_wheeler_license,
                    })
                  }
                />
                <Label htmlFor="has_a_DL" className="cursor-pointer">
                  Has a 4-wheeler Driving License (DL)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_two_wheeler_license"
                  name="has_two_wheeler_license"
                  checked={formData.has_two_wheeler_license}
                  onCheckedChange={(checked) =>
                    updateFormData({
                      has_two_wheeler_license: !!checked,
                      has_a_DL: checked ? false : formData.has_a_DL,
                    })
                  }
                />
                <Label
                  htmlFor="has_two_wheeler_license"
                  className="cursor-pointer"
                >
                  Has a 2-wheeler license only (no 4-wheeler)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="address_change_required"
                  name="address_change_required"
                  checked={formData.address_change_required}
                  onCheckedChange={(checked) =>
                    updateFormData({ address_change_required: !!checked })
                  }
                />
                <Label
                  htmlFor="address_change_required"
                  className="cursor-pointer"
                >
                  License address change required
                </Label>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Learning License (LL) Details</h4>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="LL_received"
                  name="LL_received"
                  checked={formData.LL_received}
                  onCheckedChange={(checked) =>
                    updateFormData({ LL_received: !!checked })
                  }
                />
                <Label htmlFor="LL_received" className="cursor-pointer">
                  Learning License (LL) Received
                </Label>
              </div>

              {formData.LL_received && (
                <div className="ml-6 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="LL_received_date">LL Received Date</Label>
                    <Input
                      id="LL_received_date"
                      name="LL_received_date"
                      type="date"
                      value={formData.LL_received_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="LL_application_id">LL Application ID</Label>
                    <Input
                      id="LL_application_id"
                      name="LL_application_id"
                      value={formData.LL_application_id}
                      onChange={handleInputChange}
                      placeholder="e.g., KA01-123456"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Driving License (DL) Details</h4>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="DL_received"
                  name="DL_received"
                  checked={formData.DL_received}
                  onCheckedChange={(checked) =>
                    updateFormData({ DL_received: !!checked })
                  }
                />
                <Label htmlFor="DL_received" className="cursor-pointer">
                  Driving License (DL) Received
                </Label>
              </div>

              {formData.DL_received && (
                <div className="ml-6 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="DL_received_date">DL Received Date</Label>
                    <Input
                      id="DL_received_date"
                      name="DL_received_date"
                      type="date"
                      value={formData.DL_received_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="DL_id">DL Number</Label>
                    <Input
                      id="DL_id"
                      name="DL_id"
                      value={formData.DL_id}
                      onChange={handleInputChange}
                      placeholder="e.g., KA01-20230001234"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Course Type Selection */}
            <div className="space-y-2">
              <Label>
                Course Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.courseType}
                onValueChange={(value: CourseType) => {
                  updateFormData({
                    courseType: value,
                    selectedCourseId: "",
                    selectedModules: [],
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="predefined">Predefined Course</SelectItem>
                  <SelectItem value="custom">
                    Custom Course (Modules)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Predefined Course Selection */}
            {formData.courseType === "predefined" && (
              <div className="space-y-2">
                <Label>
                  Select Course <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.selectedCourseId}
                  onValueChange={(value) =>
                    updateFormData({ selectedCourseId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_COURSES.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} ({course.duration} lessons)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Course - Module Selection */}
            {formData.courseType === "custom" && (
              <div className="space-y-2">
                <Label>
                  Select Modules <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILL_MODULES.map((module) => (
                    <div
                      key={module.id}
                      className={`flex cursor-pointer items-center space-x-2 rounded-lg border p-3 transition-colors ${
                        formData.selectedModules.includes(module.id)
                          ? "border-primary bg-primary/10"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleModule(module.id)}
                    >
                      <Checkbox
                        checked={formData.selectedModules.includes(module.id)}
                        onCheckedChange={() => toggleModule(module.id)}
                      />
                      <div>
                        <p className="font-medium">{module.name}</p>
                        <p className="text-sm text-gray-500">
                          {module.hours} lessons
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Lessons Display */}
            {totalLessons > 0 && (
              <div className="rounded-lg border bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-800">
                    Total Lessons:
                  </span>
                  <Badge variant="secondary" className="text-lg">
                    {totalLessons} lessons
                  </Badge>
                </div>
                {courseName && (
                  <p className="mt-1 text-sm text-green-700">{courseName}</p>
                )}
              </div>
            )}

            <Separator />

            {/* Progress Tracking */}
            <div className="space-y-4">
              <h4 className="font-medium">Progress & Payment</h4>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="completedLessons">Lessons Completed</Label>
                  <Input
                    id="completedLessons"
                    name="completedLessons"
                    type="number"
                    min="0"
                    max={totalLessons}
                    value={formData.completedLessons}
                    onChange={(e) =>
                      updateFormData({
                        completedLessons: e.target.value,
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500">
                    Out of {totalLessons} total lessons
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Enrollment Status</Label>
                  <Select
                    value={formData.enrollmentStatus}
                    onValueChange={(value: any) =>
                      updateFormData({ enrollmentStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Course Amount (₹)</Label>
                  <Input
                    id="totalAmount"
                    name="totalAmount"
                    type="number"
                    min="0"
                    value={formData.totalAmount}
                    onChange={(e) => {
                      const totalVal = e.target.value;
                      const totalNum = parseInt(totalVal) || 0;
                      const paidNum = parseInt(formData.amountPaid) || 0;
                      updateFormData({
                        totalAmount: totalVal,
                        paymentStatus:
                          totalNum > 0 && paidNum >= totalNum
                            ? "completed"
                            : paidNum > 0
                              ? "partial"
                              : "pending",
                      });
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Amount Already Paid (₹)</Label>
                  <Input
                    id="amountPaid"
                    name="amountPaid"
                    type="number"
                    min="0"
                    value={formData.amountPaid}
                    onChange={(e) => {
                      const paidVal = e.target.value;
                      const paidNum = parseInt(paidVal) || 0;
                      const totalNum = parseInt(formData.totalAmount) || 0;
                      updateFormData({
                        amountPaid: paidVal,
                        paymentStatus:
                          totalNum > 0 && paidNum >= totalNum
                            ? "completed"
                            : paidNum > 0
                              ? "partial"
                              : "pending",
                      });
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0"
                  />
                </div>
              </div>

              {(parseInt(formData.totalAmount) || 0) > 0 && (
                <div className="rounded-lg border bg-amber-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-800">Payment Status:</span>
                    <Badge
                      variant={
                        formData.paymentStatus === "completed"
                          ? "default"
                          : formData.paymentStatus === "partial"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {formData.paymentStatus === "completed"
                        ? "Fully Paid"
                        : formData.paymentStatus === "partial"
                          ? `Partial (₹${(parseInt(formData.totalAmount) || 0) - (parseInt(formData.amountPaid) || 0)} remaining)`
                          : "Pending"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="comments">Additional Notes / Comments</Label>
              <Textarea
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={handleInputChange}
                placeholder="Any additional information about this customer (e.g., special requirements, previous issues, etc.)"
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        // Schedule Setup step (only when showScheduleSetup is true)
        if (showScheduleSetup) {
          const today = startOfDay(new Date());

          return (
            <div className="space-y-6">
              <Alert className="border-blue-500 bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-800">
                  Schedule Remaining Lessons
                </AlertTitle>
                <AlertDescription className="text-blue-700">
                  Click on time slots in the calendar to schedule{" "}
                  {remainingLessons} lesson(s). Lessons will be assigned in
                  order (Lesson {completedLessonsNum + 1} first).
                </AlertDescription>
              </Alert>

              {/* Instructor Selection */}
              <div className="space-y-2">
                <Label>
                  Select Instructor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.selectedInstructorId}
                  onValueChange={(value) =>
                    updateFormData({ selectedInstructorId: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructorsLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : instructors && instructors.length > 0 ? (
                      instructors.map((instructor) => (
                        <SelectItem
                          key={instructor.id_instructor}
                          value={instructor.id_instructor}
                        >
                          {instructor.name} ({instructor.phone})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No instructors found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Progress Bar */}
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Scheduling Progress: {scheduledCount} of {remainingLessons}{" "}
                    lessons
                  </span>
                  {scheduledCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllSchedules}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="mr-1 h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{
                      width: `${(scheduledCount / remainingLessons) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Calendar Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateCalendarWeek("prev")}
                  disabled={isBefore(calendarStartDate, today)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-lg font-medium">
                  {format(calendarStartDate, "MMM d")} -{" "}
                  {format(addDays(calendarStartDate, 6), "MMM d, yyyy")}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateCalendarWeek("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-4">
                  {calendarDays.map((date) => {
                    const isPast = isBefore(date, today);
                    const isToday = isSameDay(date, today);

                    return (
                      <div
                        key={date.toISOString()}
                        className={`w-[112px] flex-shrink-0 overflow-hidden rounded border ${
                          isPast ? "bg-gray-50 opacity-50" : "bg-white"
                        } ${isToday ? "border-2 border-primary" : "border-gray-200"}`}
                      >
                        <div
                          className={`border-b py-1 text-center ${isToday ? "bg-primary/10" : "bg-gray-50"}`}
                        >
                          <div
                            className={`text-[10px] ${isToday ? "font-bold text-primary" : "text-gray-500"}`}
                          >
                            {format(date, "EEE")}
                          </div>
                          <div
                            className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}
                          >
                            {format(date, "d")}
                          </div>
                        </div>
                        <div className="max-h-[280px] space-y-0.5 overflow-y-auto p-0.5">
                          {TIME_SLOTS.map((slot) => {
                            const isSelected = isSlotSelected(date, slot.value);
                            const lessonNum = getSlotLessonNumber(
                              date,
                              slot.value,
                            );
                            const hour = parseInt(slot.value.slice(0, 2));
                            const minutes = slot.value.slice(3, 5);
                            const ampm = hour < 12 ? "am" : "pm";
                            const displayHour =
                              hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            const displayTime =
                              minutes === "30"
                                ? `${displayHour}:30${ampm}`
                                : `${displayHour}${ampm}`;

                            return (
                              <button
                                key={slot.value}
                                onClick={() =>
                                  handleSlotClick(date, slot.value)
                                }
                                disabled={isPast}
                                className={`w-full rounded py-1 text-xs transition-colors ${
                                  isSelected
                                    ? "bg-primary font-bold text-white"
                                    : isPast
                                      ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                      : "cursor-pointer hover:bg-primary/20"
                                }`}
                              >
                                {isSelected ? `L${lessonNum}` : displayTime}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {/* Selected Lessons Summary */}
              {scheduledCount > 0 && (
                <div className="rounded-lg border bg-green-50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 font-medium text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    Scheduled Lessons
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {formData.scheduleEntries
                      .filter((e) => e.date && e.startTime)
                      .sort((a, b) => a.lessonNumber - b.lessonNumber)
                      .map((entry) => {
                        const timeSlot = TIME_SLOTS.find(
                          (t) => t.value === entry.startTime,
                        );
                        return (
                          <div
                            key={entry.lessonNumber}
                            className="flex items-center justify-between rounded border bg-white p-2"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="default">
                                Lesson {entry.lessonNumber}
                              </Badge>
                              <span className="text-sm">
                                {format(new Date(entry.date), "EEE, MMM d")} at{" "}
                                {timeSlot?.label || entry.startTime}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newEntries = formData.scheduleEntries.map(
                                  (e) =>
                                    e.lessonNumber === entry.lessonNumber
                                      ? { ...e, date: "", startTime: "" }
                                      : e,
                                );
                                updateFormData({ scheduleEntries: newEntries });
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded bg-primary" />
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded border bg-white" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded bg-gray-100" />
                  <span>Past (unavailable)</span>
                </div>
              </div>
            </div>
          );
        }
      // Fall through to Review if not showing schedule setup
      // (This case won't be reached if showScheduleSetup is false since Review is case 4)

      // eslint-disable-next-line no-fallthrough
      case 5:
        // Review step (case 4 without schedule setup, or case 5 with schedule setup)
        return (
          <div className="space-y-6">
            {migrationSuccess ? (
              <div className="space-y-6">
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <AlertTitle className="text-green-800">
                    Migration Successful!
                  </AlertTitle>
                  <AlertDescription className="text-green-700">
                    {formData.name} has been successfully migrated to the
                    platform. They can now log in using their phone number.
                    {formData.scheduleEntries.length > 0 &&
                      formData.selectedInstructorId && (
                        <span className="mt-1 block">
                          {formData.scheduleEntries.length} lessons have been
                          scheduled
                          {formData.email &&
                            " and calendar invites have been sent"}
                          .
                        </span>
                      )}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button onClick={handleReset} className="flex-1">
                    Migrate Another Customer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/admin/learner-management")}
                    className="flex-1"
                  >
                    Go to Learner Management
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Alert className="border-blue-500 bg-blue-50">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <AlertTitle className="text-blue-800">
                    Review Migration Data
                  </AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Please review all the information below before submitting.
                    Once migrated, the customer will be able to access the app.
                  </AlertDescription>
                </Alert>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Personal Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>
                        <strong>Name:</strong> {formData.name}
                      </p>
                      <p>
                        <strong>Phone:</strong> {formData.phone}
                      </p>
                      {formData.email && (
                        <p>
                          <strong>Email:</strong> {formData.email}
                        </p>
                      )}
                      {formData.dob && (
                        <p>
                          <strong>DOB:</strong> {formData.dob}
                        </p>
                      )}
                      {formData.area && (
                        <p>
                          <strong>Area:</strong> {formData.area}
                        </p>
                      )}
                      {formData.pick_up_location && (
                        <p>
                          <strong>Address:</strong> {formData.pick_up_location}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* License Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <FileUp className="h-4 w-4" />
                        License Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>
                        <strong>4-Wheeler DL:</strong>{" "}
                        {formData.has_a_DL ? "Yes" : "No"}
                      </p>
                      <p>
                        <strong>2-Wheeler License:</strong>{" "}
                        {formData.has_two_wheeler_license ? "Yes" : "No"}
                      </p>
                      <p>
                        <strong>LL Received:</strong>{" "}
                        {formData.has_a_DL
                          ? "Yes (auto-set, has DL)"
                          : completedLessonsNum > 0
                            ? "Yes (auto-set, has lessons)"
                            : formData.LL_received
                              ? "Yes"
                              : "No"}
                      </p>
                      <p>
                        <strong>DL Received:</strong>{" "}
                        {formData.DL_received ? "Yes" : "No"}
                      </p>
                      {formData.address_change_required && (
                        <Badge variant="outline" className="mt-2">
                          Address Change Required
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

                  {/* Course Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4" />
                        Course Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>
                        <strong>Course:</strong> {courseName || "Not selected"}
                      </p>
                      <p>
                        <strong>Total Lessons:</strong> {totalLessons}
                      </p>
                      <p>
                        <strong>Completed:</strong> {completedLessonsNum}
                      </p>
                      <p>
                        <strong>Remaining:</strong> {remainingLessons}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <Badge variant="outline">
                          {formData.enrollmentStatus}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>

                  {/* Payment Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4" />
                        Payment Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>
                        <strong>Total Amount:</strong> ₹
                        {parseInt(formData.totalAmount) || 0}
                      </p>
                      <p>
                        <strong>Amount Paid:</strong> ₹
                        {parseInt(formData.amountPaid) || 0}
                      </p>
                      <p>
                        <strong>Balance:</strong> ₹
                        {(parseInt(formData.totalAmount) || 0) -
                          (parseInt(formData.amountPaid) || 0)}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <Badge
                          variant={
                            formData.paymentStatus === "completed"
                              ? "default"
                              : formData.paymentStatus === "partial"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {formData.paymentStatus === "completed"
                            ? "Fully Paid"
                            : formData.paymentStatus === "partial"
                              ? "Partial"
                              : "Pending"}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Schedule Info (if schedule was set up) */}
                {formData.scheduleEntries.length > 0 &&
                  formData.selectedInstructorId && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4" />
                          Scheduled Lessons
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <strong>Instructor:</strong>{" "}
                          {instructors?.find(
                            (i) =>
                              i.id_instructor === formData.selectedInstructorId,
                          )?.name || "Selected"}
                        </p>
                        <div className="mt-2 space-y-1">
                          {formData.scheduleEntries
                            .filter((e) => e.date && e.startTime)
                            .map((entry) => (
                              <div
                                key={entry.lessonNumber}
                                className="flex items-center gap-2 text-xs"
                              >
                                <Badge variant="outline">
                                  Lesson {entry.lessonNumber}
                                </Badge>
                                <span>
                                  {format(new Date(entry.date), "MMM d, yyyy")}
                                </span>
                                <span>at {entry.startTime}</span>
                              </div>
                            ))}
                        </div>
                        {formData.email && (
                          <p className="mt-2 text-green-600">
                            <CheckCircle2 className="mr-1 inline h-3 w-3" />
                            Calendar invite will be sent to {formData.email}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                {formData.comments && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        {formData.comments}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen bg-white p-4 md:p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="mb-4 h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Customer Migration
          </h1>
          <p className="mt-2 text-muted-foreground">
            Migrate existing customers from paper records to the digital
            platform
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
                  className={`flex flex-col items-center ${
                    currentStep >= step.id ? "text-primary" : "text-gray-400"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      currentStep > step.id
                        ? "border-primary bg-primary text-white"
                        : currentStep === step.id
                          ? "border-primary bg-white text-primary"
                          : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="mt-2 hidden text-xs font-medium md:block">
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-1 flex-1 rounded ${
                      currentStep > step.id ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {STEPS[currentStep - 1]?.title || "Migration"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 &&
                "Enter the customer's basic personal information"}
              {currentStep === 2 &&
                "Specify the customer's license status and documents"}
              {currentStep === 3 &&
                "Select course, track progress, and record payment details"}
              {currentStep === 4 &&
                showScheduleSetup &&
                "Schedule the remaining lessons for this learner"}
              {currentStep === reviewStepNumber &&
                "Review and confirm all migration details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            {/* Navigation Buttons */}
            {!migrationSuccess && (
              <div className="mt-8 flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {currentStep < reviewStepNumber ? (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Complete Migration
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main export with APIProvider wrapper for Google Maps
export default function LearnerMigration() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <MigrationFormContent />
    </APIProvider>
  );
}
