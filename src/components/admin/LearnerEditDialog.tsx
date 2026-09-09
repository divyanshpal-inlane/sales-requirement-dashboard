import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Edit2,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { googleMapsLoader } from "@/utils/googleMaps";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Puducherry",
  "Chandigarh",
  "Jammu and Kashmir",
  "Ladakh",
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface LearnerEditData {
  id: string;
  name?: string | null;
  phone: string;
  email?: string | null;
  dob?: string | null;
  aadhar_state?: string | null;
  pick_up_location?: string | null;
  area?: string | null;
  pincode?: string | null;
  city?: string | null;
  address_lat?: number | null;
  address_lng?: number | null;
  preferred_start_date?: string | null;
  preferred_completion_days?: number | null;
  prefers_two_hour_classes?: boolean | null;
  two_hour_days?: string | null;
  has_a_DL?: boolean | null;
  has_two_wheeler_license?: boolean | null;
  address_change_required?: boolean | null;
  DL_test_date?: string | null;
  DL_result?: boolean | null;
  LL_application_id?: string | null;
  LL_test_date?: string | null;
  LL_received?: boolean | null;
  LL_received_date?: string | null;
  is_LL_form_filled?: boolean | null;
}

interface LearnerEditDialogProps {
  learner: LearnerEditData;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function LocationTab({
  formData,
  updateField,
}: {
  formData: LearnerEditData;
  updateField: (field: keyof LearnerEditData, value: any) => void;
}) {
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [areaSearch, setAreaSearch] = useState("");

  const { data: serviceableAreas } = useQuery({
    queryKey: ["serviceable-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Serviceable_Areas")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredAreas = serviceableAreas?.filter((a) =>
    a.name.toLowerCase().includes(areaSearch.toLowerCase()),
  );

  // Google Places renders its suggestions dropdown (.pac-container) at the
  // <body> level, behind/outside the Radix Dialog. Without this, suggestions
  // are unclickable: the dropdown stacks below the dialog and clicks register
  // as outside-clicks on the Dialog's overlay.
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

  // Initialize Google Places autocomplete
  useEffect(() => {
    let listener: google.maps.MapsEventListener | null = null;

    googleMapsLoader.load().then(() => {
      if (!addressInputRef.current || autocompleteRef.current) return;

      autocompleteRef.current = new google.maps.places.Autocomplete(
        addressInputRef.current,
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

        updateField("pick_up_location", place.formatted_address);
        updateField("address_lat", lat);
        updateField("address_lng", lng);

        // Extract city and pincode from address components
        const components = place.address_components || [];
        const cityComp = components.find(
          (c) =>
            c.types.includes("locality") ||
            c.types.includes("administrative_area_level_2"),
        );
        const pincodeComp = components.find((c) =>
          c.types.includes("postal_code"),
        );
        const sublocalityComp = components.find(
          (c) =>
            c.types.includes("sublocality_level_1") ||
            c.types.includes("sublocality"),
        );

        if (cityComp) updateField("city", cityComp.long_name);
        if (pincodeComp) updateField("pincode", pincodeComp.long_name);
        if (sublocalityComp) {
          updateField("area", sublocalityComp.long_name);
          setAreaSearch(sublocalityComp.long_name);
        }
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
    <div className="grid gap-4">
      {/* Google Places Address Search */}
      <div>
        <Label htmlFor="pick_up_location" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Pickup Location / Address
        </Label>
        <Input
          id="pick_up_location"
          ref={addressInputRef}
          defaultValue={formData.pick_up_location || ""}
          onChange={(e) => updateField("pick_up_location", e.target.value)}
          className="mt-1"
          placeholder="Start typing an address..."
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a Google Places suggestion to auto-fill lat/lng, city, pincode.
          If you type manually, update lat/lng below so geo features stay
          accurate.
        </p>
      </div>

      {/* Area Dropdown */}
      <div>
        <Label htmlFor="area">Area</Label>
        <div className="relative mt-1">
          <Input
            id="area"
            value={areaSearch || formData.area || ""}
            onChange={(e) => {
              setAreaSearch(e.target.value);
              updateField("area", e.target.value);
            }}
            placeholder="Search or select area..."
          />
          {areaSearch && filteredAreas && filteredAreas.length > 0 && (
            <div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
              {filteredAreas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    updateField("area", a.name);
                    setAreaSearch("");
                  }}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city || ""}
            onChange={(e) => updateField("city", e.target.value)}
            className="mt-1"
            placeholder="e.g., Bangalore"
          />
        </div>
        <div>
          <Label htmlFor="pincode">Pincode</Label>
          <Input
            id="pincode"
            value={formData.pincode || ""}
            onChange={(e) => updateField("pincode", e.target.value)}
            className="mt-1"
            placeholder="e.g., 560034"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="address_lat">Latitude</Label>
          <Input
            id="address_lat"
            type="number"
            step="any"
            value={formData.address_lat ?? ""}
            onChange={(e) =>
              updateField(
                "address_lat",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            className="mt-1"
            placeholder="Auto-filled or paste manually"
          />
        </div>
        <div>
          <Label htmlFor="address_lng">Longitude</Label>
          <Input
            id="address_lng"
            type="number"
            step="any"
            value={formData.address_lng ?? ""}
            onChange={(e) =>
              updateField(
                "address_lng",
                e.target.value ? parseFloat(e.target.value) : null,
              )
            }
            className="mt-1"
            placeholder="Auto-filled or paste manually"
          />
        </div>
      </div>

      {formData.address_lat && formData.address_lng && (
        <a
          href={`https://maps.google.com/?q=${formData.address_lat},${formData.address_lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <MapPin className="h-4 w-4" />
          View on Google Maps
        </a>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Address Change Required</Label>
          <p className="text-sm text-muted-foreground">
            Does the learner need to change their address for DL?
          </p>
        </div>
        <Switch
          checked={formData.address_change_required || false}
          onCheckedChange={(checked) =>
            updateField("address_change_required", checked)
          }
        />
      </div>
    </div>
  );
}

export function LearnerEditDialog({
  learner,
  open,
  onClose,
  onSaved,
}: LearnerEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<LearnerEditData>(learner);
  const [activeTab, setActiveTab] = useState("personal");

  // Reset form data when learner changes
  useEffect(() => {
    setFormData(learner);
  }, [learner]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<LearnerEditData>) => {
      const { id, phone, ...updateData } = data;
      const { error } = await supabase
        .from("Learner")
        .update(updateData)
        .eq("id", learner.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      queryClient.invalidateQueries({ queryKey: ["customer-info"] });
      queryClient.invalidateQueries({ queryKey: ["learner-details"] });
      // Address/profile changes flow into many views (learner home, instructor
      // schedule, schedule pickers). Invalidate any query keyed on this
      // learner.id, plus the instructor-schedule prefix since those keys are
      // keyed by instructor phone and the learner row is read via join.
      queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey.includes(learner.id),
      });
      queryClient.invalidateQueries({ queryKey: ["instructor"] });
      queryClient.invalidateQueries({ queryKey: ["learner"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      toast({
        title: "Learner Updated",
        description: "Learner information has been updated successfully.",
      });
      onSaved?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const updateField = (field: keyof LearnerEditData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        // Don't treat clicks on the Google Places suggestions dropdown as
        // outside-clicks — without this, picking a suggestion closes the
        // dialog instead of selecting the address.
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".pac-container") || target.closest(".pac-item")) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edit Learner: {learner.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="license">License</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone (Read-only)
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="dob" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob || ""}
                  onChange={(e) => updateField("dob", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label
                  htmlFor="aadhar_state"
                  className="flex items-center gap-2"
                >
                  <IdCard className="h-4 w-4" />
                  Aadhar State
                </Label>
                <Select
                  value={formData.aadhar_state || ""}
                  onValueChange={(value) => updateField("aadhar_state", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4 pt-4">
            <LocationTab formData={formData} updateField={updateField} />
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div>
                <Label
                  htmlFor="preferred_start_date"
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Preferred Start Date
                </Label>
                <Input
                  id="preferred_start_date"
                  type="date"
                  value={formData.preferred_start_date || ""}
                  onChange={(e) =>
                    updateField("preferred_start_date", e.target.value)
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label
                  htmlFor="preferred_completion_days"
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Preferred Completion Duration (days)
                </Label>
                <Input
                  id="preferred_completion_days"
                  type="number"
                  value={formData.preferred_completion_days || ""}
                  onChange={(e) =>
                    updateField(
                      "preferred_completion_days",
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  className="mt-1"
                  placeholder="e.g., 30"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Prefers 2-Hour Classes</Label>
                  <p className="text-sm text-muted-foreground">
                    Would the learner like 2-hour sessions?
                  </p>
                </div>
                <Switch
                  checked={formData.prefers_two_hour_classes || false}
                  onCheckedChange={(checked) =>
                    updateField("prefers_two_hour_classes", checked)
                  }
                />
              </div>

              {formData.prefers_two_hour_classes && (
                <div>
                  <Label>Preferred Days for 2-Hour Classes</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const selectedDays = (formData.two_hour_days || "")
                        .split(",")
                        .filter(Boolean);
                      const isSelected = selectedDays.includes(day);
                      return (
                        <Button
                          key={day}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newDays = isSelected
                              ? selectedDays.filter((d) => d !== day)
                              : [...selectedDays, day];
                            updateField("two_hour_days", newDays.join(","));
                          }}
                        >
                          {day}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* License Tab */}
          <TabsContent value="license" className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Has 4-Wheeler License (DL)</Label>
                  <p className="text-sm text-muted-foreground">
                    Does the learner already have a driving license?
                  </p>
                </div>
                <Select
                  value={
                    formData.has_a_DL === true
                      ? "yes"
                      : formData.has_a_DL === false
                        ? "no"
                        : "unset"
                  }
                  onValueChange={(value) =>
                    updateField(
                      "has_a_DL",
                      value === "yes" ? true : value === "no" ? false : null,
                    )
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not Set</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Has 2-Wheeler License</Label>
                  <p className="text-sm text-muted-foreground">
                    Does the learner have a 2-wheeler license?
                  </p>
                </div>
                <Switch
                  checked={formData.has_two_wheeler_license || false}
                  onCheckedChange={(checked) =>
                    updateField("has_two_wheeler_license", checked)
                  }
                />
              </div>

              {formData.has_a_DL === false && (
                <>
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 font-semibold">
                      Learner License (LL) Details
                    </h4>
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="LL_application_id">
                          LL Application ID
                        </Label>
                        <Input
                          id="LL_application_id"
                          value={formData.LL_application_id || ""}
                          onChange={(e) =>
                            updateField("LL_application_id", e.target.value)
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="LL_test_date">LL Test Date</Label>
                        <Input
                          id="LL_test_date"
                          type="date"
                          value={formData.LL_test_date || ""}
                          onChange={(e) =>
                            updateField("LL_test_date", e.target.value)
                          }
                          className="mt-1"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>LL Form Filled</Label>
                        <Switch
                          checked={formData.is_LL_form_filled || false}
                          onCheckedChange={(checked) =>
                            updateField("is_LL_form_filled", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>LL Received</Label>
                        <Switch
                          checked={formData.LL_received || false}
                          onCheckedChange={(checked) =>
                            updateField("LL_received", checked)
                          }
                        />
                      </div>

                      {formData.LL_received && (
                        <div>
                          <Label htmlFor="LL_received_date">
                            LL Received Date
                          </Label>
                          <Input
                            id="LL_received_date"
                            type="date"
                            value={formData.LL_received_date || ""}
                            onChange={(e) =>
                              updateField("LL_received_date", e.target.value)
                            }
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-semibold">DL Test Details</h4>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="DL_test_date">DL Test Date</Label>
                    <Input
                      id="DL_test_date"
                      type="date"
                      value={formData.DL_test_date || ""}
                      onChange={(e) =>
                        updateField("DL_test_date", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>DL Test Result</Label>
                      <p className="text-sm text-muted-foreground">
                        Did the learner pass the DL test?
                      </p>
                    </div>
                    <Select
                      value={
                        formData.DL_result === true
                          ? "pass"
                          : formData.DL_result === false
                            ? "fail"
                            : "pending"
                      }
                      onValueChange={(value) =>
                        updateField(
                          "DL_result",
                          value === "pass"
                            ? true
                            : value === "fail"
                              ? false
                              : null,
                        )
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
