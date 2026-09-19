import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";

import { minutesToTime, timeToMinutes } from "@/lib/sales-dashboard/validation";
import { isValidPhone, normalizePhone } from "@/lib/sales-dashboard/validation";
import { supabase } from "@/lib/supabaseClient";

export interface TentativeBookingData {
  instructorId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  customerName: string;
  customerPhone: string;
  salesAgent: string;
  paymentStatus: "unpaid" | "half_paid" | "full_paid";
  customerAddress: string;
  course: string;
}

// One selected class in the batch. Task 19 (multiple-class booking): a
// single customer form can carry N of these — one Schedule row gets
// created per slot, all sharing the same tentative_details.
export interface SlotPick {
  instructorId: string;
  instructorName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface CustomerFormValues {
  customerName: string;
  customerPhone: string;
  salesAgent: string;
  paymentStatus: "unpaid" | "half_paid" | "full_paid";
  customerAddress: string;
  course: string;
}

export const DEFAULT_CUSTOMER_FORM = (
  currentUserName = "",
): CustomerFormValues => ({
  customerName: "",
  customerPhone: "",
  salesAgent: currentUserName,
  paymentStatus: "unpaid",
  customerAddress: "",
  course: "demo",
});

interface TentativeBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // 1..N slots. The modal renders nothing if this is empty while open —
  // the parent owns exactly when that can happen.
  slots: SlotPick[];
  onRemoveSlot: (index: number) => void;
  // Hides the modal (without losing formData/slots — both live in the
  // parent) and arms "pick another slot" mode on the grid.
  onAddAnotherSlot: () => void;
  // Fresh re-check of one slot's availability at submit time — the grid
  // could have changed since it was added to the batch.
  validateSlot: (slot: SlotPick) => boolean;
  formData: CustomerFormValues;
  onFormDataChange: (data: CustomerFormValues) => void;
  // Present only when this submission should replace an existing unpaid
  // tentative slot rather than create fresh ones. blockId identifies the
  // old Schedule row to release. Override is always exactly one slot —
  // the "add another class" / multi-slot list UI is hidden in this mode.
  overrideContext?: {
    blockId: number;
    tentativeDetails: Record<string, unknown> | null;
  } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const COURSES = [
  { id: "demo", label: "Demo Class" },
  { id: "course_4", label: "4-Class Course" },
  { id: "course_5", label: "5-Class Course" },
  { id: "course_6", label: "6-Class Course" },
  { id: "course_10", label: "10-Class Course" },
  { id: "course_15", label: "15-Class Course" },
  { id: "course_20", label: "20-Class Course" },
];

function formatSlotTime(startTime: string, endTime: string): string {
  try {
    return `${minutesToTime(timeToMinutes(startTime))}–${minutesToTime(timeToMinutes(endTime))}`;
  } catch {
    return `${startTime}–${endTime}`;
  }
}

// Translates the raw Postgres error from a losing race against the
// schedule_no_overlap_new_rows exclusion constraint (code 23P01 -- fires on
// exact duplicates, partial overlaps, and concurrent inserts for the same
// slot alike) into a message a sales agent can actually act on, instead of
// surfacing "conflicting key value violates exclusion constraint...".
function friendlyBookingError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "23P01" || code === "23505") {
    return "This slot was just booked by another sales agent. Please close this and pick a different time.";
  }
  // Duck-typed, not `instanceof Error` -- the object thrown from a failed
  // Supabase/Postgrest call isn't necessarily a real Error instance, but
  // does carry a .message.
  const message = (error as { message?: string } | null)?.message;
  return message || "Failed to create tentative booking";
}

export const TentativeBookingModal: React.FC<TentativeBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  slots,
  onRemoveSlot,
  onAddAnotherSlot,
  validateSlot,
  formData,
  onFormDataChange,
  overrideContext = null,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  const createTentativeMutation = useMutation({
    mutationFn: async () => {
      if (slots.length === 0) throw new Error("No slot selected");

      const normalizedPhone = normalizePhone(formData.customerPhone);
      if (!normalizedPhone) {
        throw new Error("Invalid phone number");
      }

      const tentativeDetails = {
        name: formData.customerName,
        phone: normalizedPhone,
        sales_agent: formData.salesAgent,
        payment_status: formData.paymentStatus,
        address: formData.customerAddress,
        course: formData.course,
        created_at: new Date().toISOString(),
      };

      if (overrideContext) {
        // An override must go to a paying learner — that's the entire
        // point of taking the slot away from an unpaid hold. Checked here
        // for a fast, clear message, and re-checked server-side too (see
        // the RPC) since this must not be enforceable by the frontend
        // alone.
        if (formData.paymentStatus === "unpaid") {
          throw new Error(
            "An override must be Half Paid or Full Paid — the new learner is taking this slot because they're paying, unlike the unpaid hold being replaced.",
          );
        }
        // Always exactly one slot in override mode, and always the SAME
        // slot the old unpaid hold already occupies — the RPC derives the
        // instructor/date/time from the old row itself, not from anything
        // passed here, so there's no way for the client to redirect an
        // override to a different slot. Server-side re-validation happens
        // inside this function, not here — it re-checks (fresh, not
        // trusting anything the client already believes) that the old
        // slot still exists, is still unpaid, and that the payment status
        // being submitted is actually half/full paid, then deletes the
        // old row and inserts the new one atomically. See the
        // override_tentative_slot SQL migration.
        const { error } = await sb.rpc("override_tentative_slot", {
          p_old_schedule_id: overrideContext.blockId,
          p_new_tentative_details: tentativeDetails,
        });
        if (error) throw error;
        return;
      }

      // Re-validate every slot fresh — the grid could have changed since
      // any of them were added to the batch. Fail on the FIRST conflict
      // found, naming exactly which class it is, and don't attempt any
      // insert at all: partial creation would leave a confusing mix of
      // real and missing classes for a batch the user thinks either all
      // happened or none did.
      for (let i = 0; i < slots.length; i++) {
        if (!validateSlot(slots[i])) {
          const s = slots[i];
          throw new Error(
            `Class ${i + 1} (${s.date} • ${formatSlotTime(s.startTime, s.endTime)} • ${s.instructorName}) is no longer available. Remove or change it and try again.`,
          );
        }
      }

      const rows = slots.map((s) => ({
        instructor_id: s.instructorId,
        date: s.date,
        start_time: s.startTime,
        end_time: s.endTime,
        status: "hold",
        isTentative: true,
        tentative_details: tentativeDetails,
        learner_id: null,
        course_id: null,
        lesson_id: null,
      }));

      // A single multi-row insert is one Postgres statement — if any row
      // conflicts (e.g. a race with another sales agent since we
      // validated above), the exclusion constraint rejects the whole
      // statement and NONE of the rows are created. That's what gives
      // this batch "all or nothing" behavior using nothing more than the
      // existing single-row insert path, just called with N rows.
      const { error } = await sb.from("Schedule").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      setSuccessMessage(
        overrideContext
          ? "Slot handed to the new learner successfully!"
          : slots.length > 1
            ? `${slots.length} tentative classes booked successfully!`
            : "Tentative slot booked successfully!",
      );
      setTimeout(() => {
        setErrors({});
        setSuccessMessage("");
        onSuccess();
      }, 1500);
    },
    onError: (error: Error) => {
      setErrors({ submit: friendlyBookingError(error) });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = "Phone number is required";
    } else if (!isValidPhone(formData.customerPhone)) {
      // normalizePhone() alone would accept e.g. "0987654321" — 10 digits,
      // but not a real Indian mobile number (can't start with 0).
      // isValidPhone() additionally rejects that case.
      newErrors.customerPhone = "Invalid phone number";
    }
    if (!formData.salesAgent.trim()) {
      newErrors.salesAgent = "Sales agent name is required";
    }
    if (!formData.customerAddress.trim()) {
      newErrors.customerAddress = "Address is required";
    }
    if (!formData.course) {
      newErrors.course = "Course selection is required";
    }
    if (slots.length === 0) {
      newErrors.submit = "Select at least one slot";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createTentativeMutation.mutate();
    }
  };

  if (!isOpen || slots.length === 0) return null;

  const set = <K extends keyof CustomerFormValues>(
    key: K,
    value: CustomerFormValues[K],
  ) => onFormDataChange({ ...formData, [key]: value });

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="modal-backdrop" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {overrideContext
              ? "Override Tentative Slot"
              : "Create Tentative Slot Booking"}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close booking modal"
          >
            ×
          </button>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-700 dark:bg-green-900 dark:text-green-200">
            {successMessage}
          </div>
        )}

        {errors.submit && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900 dark:text-red-200">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected Slots */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            {overrideContext && (
              <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                Replacing an unpaid tentative hold
                {typeof overrideContext.tentativeDetails?.name === "string" &&
                overrideContext.tentativeDetails.name
                  ? ` (previously held for ${overrideContext.tentativeDetails.name})`
                  : ""}{" "}
                with a booking for a new, paying learner. Enter the new
                learner&apos;s details below — Payment Status must be Half Paid
                or Full Paid.
              </p>
            )}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {overrideContext
                  ? "Slot Being Taken Over"
                  : `Selected Slots (${slots.length})`}
              </span>
              {!overrideContext && (
                <button
                  type="button"
                  className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                  onClick={onAddAnotherSlot}
                >
                  + Add another class
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {slots.map((s, i) => (
                <div
                  key={`${s.instructorId}-${s.date}-${s.startTime}`}
                  className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <span>
                    Class {i + 1}: {s.date} •{" "}
                    {formatSlotTime(s.startTime, s.endTime)} •{" "}
                    {s.instructorName}
                  </span>
                  {!overrideContext && slots.length > 1 && (
                    <button
                      type="button"
                      className="flex-none rounded-full px-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900"
                      aria-label={`Remove class ${i + 1}`}
                      onClick={() => onRemoveSlot(i)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label
              htmlFor="customerName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Customer Name *
            </label>
            <input
              id="customerName"
              type="text"
              value={formData.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              placeholder="Enter customer name"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${
                errors.customerName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.customerName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.customerName}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="customerPhone"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Phone Number *
            </label>
            <input
              id="customerPhone"
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => set("customerPhone", e.target.value)}
              placeholder="10-digit phone number"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${
                errors.customerPhone ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.customerPhone && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.customerPhone}
              </p>
            )}
          </div>

          {/* Sales Agent */}
          <div>
            <label
              htmlFor="salesAgent"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Sales Agent *
            </label>
            <input
              id="salesAgent"
              type="text"
              value={formData.salesAgent}
              onChange={(e) => set("salesAgent", e.target.value)}
              placeholder="Sales agent name"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${
                errors.salesAgent ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.salesAgent && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.salesAgent}
              </p>
            )}
          </div>

          {/* Payment Status */}
          <div>
            <label
              htmlFor="paymentStatus"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Payment Status {overrideContext && "*"}
            </label>
            <select
              id="paymentStatus"
              value={formData.paymentStatus}
              onChange={(e) =>
                set(
                  "paymentStatus",
                  e.target.value as "unpaid" | "half_paid" | "full_paid",
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
            >
              {/* "Unpaid" isn't offered at all in override mode — a paying
                  learner is the entire reason Sales can take this slot
                  from an unpaid hold in the first place. Disallowed here
                  as well as on submit (and again server-side) so there's
                  no dead end where a valid-looking option turns into a
                  rejection later. */}
              {!overrideContext && <option value="unpaid">Unpaid</option>}
              <option value="half_paid">Half Paid</option>
              <option value="full_paid">Full Paid</option>
            </select>
            {overrideContext && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be Half Paid or Full Paid to override an unpaid tentative
                slot.
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="customerAddress"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Customer Address *
            </label>
            <textarea
              id="customerAddress"
              value={formData.customerAddress}
              onChange={(e) => set("customerAddress", e.target.value)}
              placeholder="Enter full address"
              rows={3}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${
                errors.customerAddress ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.customerAddress && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.customerAddress}
              </p>
            )}
          </div>

          {/* Course */}
          <div>
            <label
              htmlFor="course"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Course *
            </label>
            <select
              id="course"
              value={formData.course}
              onChange={(e) => set("course", e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${
                errors.course ? "border-red-500" : "border-gray-300"
              }`}
            >
              {COURSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.course && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.course}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createTentativeMutation.isPending}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTentativeMutation.isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createTentativeMutation.isPending
                ? overrideContext
                  ? "Overriding..."
                  : "Booking..."
                : overrideContext
                  ? "Confirm Override"
                  : slots.length > 1
                    ? `Create ${slots.length} Tentative Blocks`
                    : "Create Tentative Block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
