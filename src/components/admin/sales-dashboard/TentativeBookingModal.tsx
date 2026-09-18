import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";

import { minutesToTime, timeToMinutes } from "@/lib/sales-dashboard/validation";
import { normalizePhone } from "@/lib/sales-dashboard/validation";
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

interface TentativeBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  data: {
    instructorId: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null;
  currentUserName?: string;
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

export const TentativeBookingModal: React.FC<TentativeBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  data,
  currentUserName = "",
}) => {
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    salesAgent: currentUserName,
    paymentStatus: "unpaid" as "unpaid" | "half_paid" | "full_paid",
    customerAddress: "",
    course: "demo",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  const createTentativeMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("No slot data provided");

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

      const { error } = await sb.from("Schedule").insert([
        {
          instructor_id: data.instructorId,
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          status: "hold",
          isTentative: true,
          tentative_details: tentativeDetails,
          learner_id: null,
          course_id: null,
          lesson_id: null,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      setSuccessMessage("Tentative slot booked successfully!");
      setTimeout(() => {
        setFormData({
          customerName: "",
          customerPhone: "",
          salesAgent: currentUserName,
          paymentStatus: "unpaid",
          customerAddress: "",
          course: "demo",
        });
        setErrors({});
        setSuccessMessage("");
        onSuccess();
        onClose();
      }, 1500);
    },
    onError: (error: Error) => {
      setErrors({
        submit: error.message || "Failed to create tentative booking",
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = "Phone number is required";
    } else if (!normalizePhone(formData.customerPhone)) {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createTentativeMutation.mutate();
    }
  };

  if (!isOpen || !data) return null;

  let startTime = "";
  let endTime = "";
  try {
    startTime = minutesToTime(timeToMinutes(data.startTime));
    endTime = minutesToTime(timeToMinutes(data.endTime));
  } catch (e) {
    console.error("Error parsing slot times:", e);
    return null;
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="modal-backdrop" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Tentative Slot Booking</h2>
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
          {/* Slot Info (Read-only) */}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Slot: {data.date} • {startTime}–{endTime}
            </p>
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
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, customerPhone: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, salesAgent: e.target.value })
              }
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
              Payment Status
            </label>
            <select
              id="paymentStatus"
              value={formData.paymentStatus}
              onChange={(e) => {
                const value = e.target.value as
                  | "unpaid"
                  | "half_paid"
                  | "full_paid";
                setFormData({
                  ...formData,
                  paymentStatus: value,
                });
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="unpaid">Unpaid</option>
              <option value="half_paid">Half Paid</option>
              <option value="full_paid">Full Paid</option>
            </select>
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
              onChange={(e) =>
                setFormData({ ...formData, customerAddress: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, course: e.target.value })
              }
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
                ? "Booking..."
                : "Create Tentative Block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
