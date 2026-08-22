import { format } from "date-fns";
import { ArrowLeft, CalendarPlus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DL_RTO_OPTIONS,
  DL_SLOT_UPLOAD_LEAD_DAYS,
  isDLSlotUploadAllowed,
  parseLLDateYmd,
  todayYmd,
} from "@/constants/llPipeline";
import {
  useCreateDLTestSlot,
  useDeleteDLTestSlot,
  useDLTestSlots,
  useSetDLTestSlotActive,
} from "@/queries/dlTestSlots";
import { useCurrentUser } from "@/queries/userManagement";

/**
 * Ops uploads monthly DL test dates per RTO. Customers then pick from this
 * list (V1 items 6 & 12) — free-form preferred dates are no longer used.
 */
export default function DLTestSlots() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const { data: slots, isLoading } = useDLTestSlots({ includeInactive: true });
  const createSlot = useCreateDLTestSlot();
  const setActive = useSetDLTestSlotActive();
  const deleteSlot = useDeleteDLTestSlot();

  const [testDate, setTestDate] = useState("");
  const [rto, setRto] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const minUploadDate = useMemo(() => {
    const d = parseLLDateYmd(todayYmd());
    d.setDate(d.getDate() + DL_SLOT_UPLOAD_LEAD_DAYS);
    return format(d, "yyyy-MM-dd");
  }, []);

  const visible = useMemo(() => {
    const list = slots ?? [];
    return showInactive ? list : list.filter((s) => s.is_active);
  }, [slots, showInactive]);

  const handleAdd = () => {
    if (!testDate || !rto) {
      toast({
        title: "Missing fields",
        description: "Pick a test date and an RTO.",
        variant: "destructive",
      });
      return;
    }
    if (!isDLSlotUploadAllowed(testDate)) {
      toast({
        title: "Too soon",
        description: `Slots must be uploaded at least ${DL_SLOT_UPLOAD_LEAD_DAYS} days before the test date.`,
        variant: "destructive",
      });
      return;
    }
    createSlot.mutate(
      {
        testDate,
        rto,
        uploadedBy: currentUser?.name ?? null,
      },
      {
        onSuccess: () => {
          toast({ title: "Slot added" });
          setTestDate("");
        },
        onError: (e: Error) =>
          toast({
            title: "Could not add slot",
            description: e.message,
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-white p-4"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/ll-pipeline")}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">DL Test Dates</h1>
            <p className="text-sm text-gray-500">
              Upload monthly slots (≥{DL_SLOT_UPLOAD_LEAD_DAYS} days ahead).
              Customers only see dates 14+ days out, within their LL maturity →
              expiry window.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 w-full max-w-3xl space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add a test date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-sm">Test date</Label>
                <Input
                  type="date"
                  min={minUploadDate}
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block text-sm">RTO</Label>
                <Select value={rto || undefined} onValueChange={setRto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick an RTO…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DL_RTO_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleAdd}
              disabled={createSlot.isPending}
              className="w-full sm:w-auto"
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              {createSlot.isPending ? "Adding…" : "Add slot"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">
              Uploaded slots ({visible.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInactive((v) => !v)}
            >
              {showInactive ? "Hide inactive" : "Show inactive"}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-gray-400">
                No slots yet. Add the first monthly date above.
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {visible.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {format(parseLLDateYmd(s.test_date), "dd MMM yyyy")}
                        <span className="ml-2 font-normal text-gray-600">
                          · {s.rto}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.uploaded_by
                          ? `Uploaded by ${s.uploaded_by}`
                          : "Uploaded"}{" "}
                        · {format(new Date(s.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          s.is_active
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-gray-300 bg-gray-50 text-gray-500"
                        }
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        disabled={setActive.isPending}
                        onClick={() =>
                          setActive.mutate(
                            { id: s.id, isActive: !s.is_active },
                            {
                              onError: (e: Error) =>
                                toast({
                                  title: "Update failed",
                                  description: e.message,
                                  variant: "destructive",
                                }),
                            },
                          )
                        }
                      >
                        {s.is_active ? "Deactivate" : "Reactivate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={deleteSlot.isPending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Delete this slot permanently? Prefer deactivate if customers might have seen it.",
                            )
                          )
                            return;
                          deleteSlot.mutate(s.id, {
                            onError: (e: Error) =>
                              toast({
                                title: "Delete failed",
                                description: e.message,
                                variant: "destructive",
                              }),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
