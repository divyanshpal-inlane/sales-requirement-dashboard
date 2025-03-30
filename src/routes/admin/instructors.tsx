import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PlusCircle, X } from "lucide-react";
import { useState } from "react";
import { addDays, format, startOfWeek, endOfWeek, isSameDay } from "date-fns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";

// Define a type for the instructor data that comes from the database
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
  experience: number | null;
  radius: number | null;
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
  radius: number;
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
  radius: 0,
};

export default function InstructorsManagement() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [instructorData, setInstructorData] = useState<InstructorData>(
    initialInstructorData,
  );
  const [newArea, setNewArea] = useState<string>("");
  const [openScheduleDialogId, setOpenScheduleDialogId] = useState<string | null>(null); // Track which instructor's schedule dialog is open
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all instructors along with their schedules
  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select(`
          *,
          schedules:Schedule (
            id,
            date,
            start_time,
            end_time,
            learner:learner_id ( name )
          )
        `)
        .order("name");

      if (error) throw error;
      return data as (InstructorFromDB & { schedules: Schedule[] })[];
    },
  });

  // Add or update an instructor
  const mutation = useMutation({
    mutationFn: async (data: InstructorData) => {
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
              radius: data.radius,
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
            radius: data.radius,
          })
          .eq("id_instructor", data.id_instructor)
          .select();

        if (error) throw error;
        return updatedInstructor;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructors"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: formMode === "add" ? "Instructor Added" : "Instructor Updated",
        description: formMode === "add"
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
  };

  const handleAddArea = () => {
    if (!newArea.trim()) return;
    
    // Check if area already exists
    if (instructorData.areas.includes(newArea.trim())) {
      toast({ 
        title: "Area already exists", 
        description: "This area is already added", 
        variant: "destructive" 
      });
      return;
    }
    
    setInstructorData({
      ...instructorData,
      areas: [...instructorData.areas, newArea.trim()],
    });
    setNewArea("");
  };

  const handleRemoveArea = (areaToRemove: string) => {
    setInstructorData({
      ...instructorData,
      areas: instructorData.areas.filter((area) => area !== areaToRemove),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddArea();
    }
  };

  const handleOpenScheduleDialog = (id: string) => {
    setOpenScheduleDialogId(id); // Set the ID of the instructor whose dialog is open
  };

  const handleCloseScheduleDialog = () => {
    setOpenScheduleDialogId(null); // Close the dialog
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
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
        <div className="flex justify-center items-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instructors?.map((instructor) => (
            <Card key={instructor.id_instructor} className="overflow-hidden shadow-lg rounded-lg">
              <CardHeader className="bg-primary text-white p-4">
                <CardTitle className="text-lg font-bold">{instructor.name}</CardTitle>
                <p className="text-sm">{instructor.email || "No email provided"}</p>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                    <p>{instructor.phone}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Address:</span>
                    <p>{instructor.address || "No address provided"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Radius:</span>
                    <p>{instructor.radius ? `${instructor.radius} km` : "No radius provided"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">DL Number:</span>
                    <p>{instructor.DL_number || "Not provided"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Car Details:</span>
                    <p>
                      {instructor.car_make || "N/A"} - {instructor.car_mode || "N/A"} ({instructor.car_number || "N/A"})
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Experience:</span>
                    <p>{instructor.experience || "Not provided"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Areas:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {instructor.areas?.map((area: string) => (
                        <span
                          key={area}
                          className="inline-block bg-muted text-xs px-2 py-1 rounded"
                        >
                          {area}
                        </span>
                      )) || "No areas assigned"}
                    </div>
                  </div>
                </div>

                {/* View Schedule Button */}
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOpenScheduleDialog(instructor.id_instructor)}
                  >
                    View Schedule
                  </Button>
                </div>
              </CardContent>
              <div className="p-4 border-t">
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
                      <DialogTitle>{instructor.name}'s Weekly Schedule</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <WeeklyScheduleView
                        schedules={instructor.schedules}
                        unavailability={instructor.unavailability || []}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCloseScheduleDialog}>
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto scrollbar-none  h-[calc(100vh-50px)]"style={{ scrollbarWidth: "none" }}>
          <DialogHeader>
            <DialogTitle>
              {formMode === "add" ? "Add New Instructor" : "Edit Instructor Details"}
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
                  onChange={(e) => setInstructorData({ ...instructorData, name: e.target.value })}
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
                  onChange={(e) => setInstructorData({ ...instructorData, phone: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <Input
                  id="address"
                  value={instructorData.address}
                  onChange={(e) => setInstructorData({ ...instructorData, address: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="radius" className="text-right">
                  Radius (km)
                </Label>
                <Input
                  id="radius"
                  type="number"
                  value={instructorData.radius}
                  onChange={(e) => setInstructorData({ ...instructorData, radius: parseFloat(e.target.value) || 0 })}
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
                    setInstructorData({ ...instructorData, email: e.target.value })
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
                <Label htmlFor="car_make" className="text-right">
                  Car Make
                </Label>
                <Select
                  value={instructorData.car_make || ""}
                  onValueChange={(value) =>
                    setInstructorData({ ...instructorData, car_make: value })
                  }
                  className="col-span-3"
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
                <Label className="text-right pt-2">Areas</Label>
                <div className="col-span-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      placeholder="Add area"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddArea}
                    >
                      Add
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {instructorData.areas.map((area) => (
                      <div 
                        key={area}
                        className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-sm"
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
                    <p className="text-sm text-muted-foreground mt-2">
                      No areas added. Please add at least one area.
                    </p>
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
                  : formMode === "add" ? "Add Instructor" : "Update Instructor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleCalendar({ schedules }: { schedules: Schedule[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const filteredSchedules = schedules.filter((schedule) => {
    const scheduleDate = new Date(schedule.date);
    return (
      scheduleDate.getFullYear() === currentMonth.getFullYear() &&
      scheduleDate.getMonth() === currentMonth.getMonth()
    );
  });

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={handlePrevMonth}>
          Previous
        </Button>
        <h3 className="text-lg font-semibold">
          {currentMonth.toLocaleString("default", { month: "long" })} {currentMonth.getFullYear()}
        </h3>
        <Button variant="outline" onClick={handleNextMonth}>
          Next
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {/* Days of the Week */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="font-medium text-sm text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Empty Cells for Days Before the First Day of the Month */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={index} className="p-2"></div>
        ))}

        {/* Days of the Month */}
        {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
          const day = dayIndex + 1;
          const schedule = filteredSchedules.find(
            (s) => new Date(s.date).getDate() === day
          );

          return (
            <div
              key={day}
              className={`p-2 border rounded-md ${
                schedule ? "bg-primary text-white" : "bg-gray-100"
              }`}
            >
              {day}
              {schedule && (
                <div className="text-xs mt-1">
                  <p>{schedule.start_time} - {schedule.end_time}</p>
                  <p>{schedule.learner?.name || "No Learner"}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));

  const handleWeekChange = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) =>
      direction === "next" ? addDays(prev, 7) : addDays(prev, -7)
    );
  };

  return (
    <div>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4 ">
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
      <div className="overflow-x-auto overflow-y-auto p-4 scrollbar-none  h-[calc(100vh-50px)] max-h-96"style={{ scrollbarWidth: "none" }}>
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="border border-gray-200 p-2">Time</th>
              {Array.from({ length: 7 }).map((_, index) => {
                const day = addDays(currentWeekStart, index);
                return (
                  <th key={index} className="border border-gray-200 p-2">
                    {format(day, "EEE")}
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

                    // Find unavailability for the current day and time
                    const unavailable = unavailability.find((u) => {
                      const unavailableStart = new Date(
                        `${u.booked_date}T${u.booked_start_time}`
                      );
                      const unavailableEnd = new Date(
                        `${u.booked_date}T${u.booked_end_time}`
                      );
                      const currentTime = new Date(day);
                      currentTime.setHours(hour, minute);

                      return (
                        isSameDay(unavailableStart, day) &&
                        currentTime >= unavailableStart &&
                        currentTime < unavailableEnd
                      );
                    });

                    return (
                      <td
                        key={dayIndex}
                        className={`border border-gray-200 p-2 text-center ${
                          schedule
                            ? "bg-primary text-white"
                            : unavailable
                            ? "bg-red-200 text-red-800"
                            : ""
                        }`}
                      >
                        {schedule
                          ? `${schedule.start_time} - ${schedule.end_time}`
                          : unavailable
                          ? "Unavailable"
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
    </div>
  );
}