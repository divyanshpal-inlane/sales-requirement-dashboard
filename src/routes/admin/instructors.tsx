import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PlusCircle, X } from "lucide-react";
import { useState } from "react";

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
}

interface InstructorData {
  id_instructor?: string;
  name: string;
  phone: string;
  areas: string[];
}

const initialInstructorData: InstructorData = {
  name: "",
  phone: "",
  areas: [],
};

export default function InstructorsManagement() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [instructorData, setInstructorData] = useState<InstructorData>(
    initialInstructorData,
  );
  const [newArea, setNewArea] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all instructors
  const { data: instructors, isLoading } = useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Instructor")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as InstructorFromDB[];
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
              areas: data.areas,
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
            areas: data.areas,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructors?.map((instructor) => (
            <Card key={instructor.id_instructor} className="overflow-hidden">
              <CardHeader className="bg-muted">
                <CardTitle>
                  <span>{instructor.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                    <p>{instructor.phone}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Areas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
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
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleEditInstructor(instructor)}
                    >
                      Edit Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Instructor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {formMode === "add" ? "Add New Instructor" : "Edit Instructor Details"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={instructorData.name}
                  onChange={(e) => setInstructorData({ ...instructorData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={instructorData.phone}
                  onChange={(e) => setInstructorData({ ...instructorData, phone: e.target.value })}
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