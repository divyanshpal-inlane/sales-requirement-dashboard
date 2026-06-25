import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdjustmentType,
  PayoutStatus,
  useCreateAdjustment,
  useDeleteAdjustment,
  useEarningAdjustments,
  useGeneratePayout,
  useInstructorEarningSettings,
  useInstructorPayouts,
  useUpdatePayoutStatus,
  useUpsertInstructorEarningSettings,
} from "@/queries/instructorEarnings";
import { formatINR, getEarningPeriods } from "@/utils/earnings";

interface Props {
  instructorId: string | null;
  name: string | null;
  phone: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ADJUSTMENT_TYPES: AdjustmentType[] = [
  "adjustment",
  "bonus",
  "referral",
  "correction",
];

export default function InstructorEarningsDrawer({
  instructorId,
  name,
  phone,
  open,
  onOpenChange,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>{name ?? "Instructor"}</DrawerTitle>
          {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
        </DrawerHeader>
        {open && instructorId && (
          <div className="space-y-6 overflow-y-auto px-4 pb-10">
            <SettingsSection instructorId={instructorId} />
            <AdjustmentsSection instructorId={instructorId} />
            <PayoutsSection instructorId={instructorId} />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </h3>
  );
}

function SettingsSection({ instructorId }: { instructorId: string }) {
  const { data: settings, isLoading } =
    useInstructorEarningSettings(instructorId);
  const upsert = useUpsertInstructorEarningSettings();
  const [rate, setRate] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    setRate(
      settings?.per_class_rate != null ? String(settings.per_class_rate) : "",
    );
    setTarget(
      settings?.monthly_class_target != null
        ? String(settings.monthly_class_target)
        : "",
    );
  }, [settings]);

  const save = async () => {
    try {
      await upsert.mutateAsync({
        instructorId,
        perClassRate: rate.trim() === "" ? null : Number(rate),
        monthlyClassTarget: target.trim() === "" ? null : Number(target),
      });
      toast.success("Overrides saved");
    } catch {
      toast.error("Failed to save overrides");
    }
  };

  return (
    <section>
      <SectionTitle>Rate &amp; target overrides</SectionTitle>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Leave blank to use the global defaults.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Per-class rate (₹)</Label>
              <Input
                type="number"
                value={rate}
                placeholder="Global"
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Monthly class target</Label>
              <Input
                type="number"
                value={target}
                placeholder="Global"
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>
          <Button size="sm" onClick={save} disabled={upsert.isPending}>
            {upsert.isPending && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            Save overrides
          </Button>
        </div>
      )}
    </section>
  );
}

function AdjustmentsSection({ instructorId }: { instructorId: string }) {
  const { data: adjustments, isLoading } = useEarningAdjustments(instructorId);
  const create = useCreateAdjustment();
  const remove = useDeleteAdjustment();

  const today = new Date().toISOString().split("T")[0];
  const [type, setType] = useState<AdjustmentType>("adjustment");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(today);

  const add = async () => {
    if (amount.trim() === "" || Number.isNaN(Number(amount))) {
      toast.error("Enter a valid amount (use a minus sign to deduct)");
      return;
    }
    try {
      await create.mutateAsync({
        instructorId,
        type,
        amount: Number(amount),
        reason: reason.trim() || null,
        effectiveDate: date,
      });
      setAmount("");
      setReason("");
      toast.success("Adjustment added");
    } catch {
      toast.error("Failed to add adjustment");
    }
  };

  return (
    <section>
      <SectionTitle>Manual adjustments</SectionTitle>

      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AdjustmentType)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm capitalize"
            >
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Amount (₹, − to deduct)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Effective date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <Button size="sm" onClick={add} disabled={create.isPending}>
          {create.isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3 w-3" />
          )}
          Add adjustment
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="mt-3 h-4 w-4 animate-spin text-gray-400" />
      ) : adjustments && adjustments.length > 0 ? (
        <ul className="mt-3 divide-y divide-gray-100">
          {adjustments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm">
                  <span className="font-medium capitalize">{a.type}</span>{" "}
                  <span
                    className={a.amount < 0 ? "text-red-600" : "text-[#00874F]"}
                  >
                    {a.amount < 0 ? "−" : "+"}
                    {formatINR(Math.abs(a.amount))}
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  {a.effective_date}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove.mutate({ id: a.id, instructorId })}
                className="text-gray-400 hover:text-red-600"
                aria-label="Delete adjustment"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-400">No adjustments yet.</p>
      )}
    </section>
  );
}

function PayoutsSection({ instructorId }: { instructorId: string }) {
  const { data: payouts, isLoading } = useInstructorPayouts(instructorId);
  const generate = useGeneratePayout();
  const updateStatus = useUpdatePayoutStatus();
  const period = getEarningPeriods().payoutPeriod;

  const runCurrent = async () => {
    try {
      await generate.mutateAsync({
        instructorId,
        periodStart: period.start,
        periodEnd: period.end,
      });
      toast.success("Payout run generated for current period");
    } catch {
      toast.error("Failed to generate payout");
    }
  };

  const setStatus = async (id: string, status: PayoutStatus) => {
    try {
      await updateStatus.mutateAsync({ id, instructorId, status });
      toast.success(`Marked ${status}`);
    } catch {
      toast.error("Failed to update payout");
    }
  };

  return (
    <section>
      <SectionTitle>Payout runs</SectionTitle>
      <Button
        size="sm"
        variant="outline"
        onClick={runCurrent}
        disabled={generate.isPending}
      >
        {generate.isPending && (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        )}
        Generate for {period.start} → {period.end}
      </Button>

      {isLoading ? (
        <Loader2 className="mt-3 h-4 w-4 animate-spin text-gray-400" />
      ) : payouts && payouts.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {payouts.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-gray-200 p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {p.period_start} → {p.period_end}
                </span>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {p.classes_count} classes × {formatINR(p.per_class_rate)} +{" "}
                {formatINR(p.adjustments_total)} adj ={" "}
                <span className="font-semibold text-[#0F1F14]">
                  {formatINR(p.net_amount)}
                </span>
              </p>
              {p.status !== "paid" && p.status !== "cancelled" && (
                <div className="mt-2 flex gap-2">
                  {p.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(p.id, "approved")}
                    >
                      Approve
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setStatus(p.id, "paid")}>
                    Mark paid
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-400">No payout runs yet.</p>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: PayoutStatus }) {
  const styles: Record<PayoutStatus, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
