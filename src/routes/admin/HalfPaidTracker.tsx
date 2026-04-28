import { formatDistanceToNow } from "date-fns";
import { RefreshCcw } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface HalfPaidEnrollment {
  id: string;
  amount: number;
  installment1_amount: number;
  installment2_amount: number;
  payment_status: string;
  created_at: string;
  learner_id: string;
  Learner: {
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  Courses: {
    id: string;
    name: string;
    duration: number;
  } | null;
  payment: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    updated_at: string;
    installment_type: string;
  } | null;
}

export function HalfPaidTracker() {
  const [enrollments, setEnrollments] = useState<HalfPaidEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHalfPaidEnrollments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("enrollment")
        .select(
          `
          id,
          amount,
          installment1_amount,
          installment2_amount,
          payment_status,
          created_at,
          learner_id,
          Learner (
            id,
            name,
            phone,
            email
          ),
          Courses (
            id,
            name,
            duration
          ),
          payment (
            id,
            amount,
            status,
            created_at,
            updated_at,
            installment_type
          )
        `,
        )
        .eq("payment_status", "half_paid")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEnrollments((data as unknown as HalfPaidEnrollment[]) || []);
    } catch (err) {
      console.error("Error fetching half-paid enrollments:", err);
      toast({
        title: "Error",
        description: "Failed to fetch half-paid enrollments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalfPaidEnrollments();
  }, []);

  const getFirstPaymentDate = (
    enrollment: HalfPaidEnrollment,
  ): string | null => {
    if (
      enrollment.payment?.status === "completed" &&
      enrollment.payment?.updated_at
    ) {
      return enrollment.payment.updated_at;
    }
    if (enrollment.payment?.created_at) {
      return enrollment.payment.created_at;
    }
    return enrollment.created_at;
  };

  const getDaysSince = (dateStr: string | null): string => {
    if (!dateStr) return "Unknown";
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  };

  const getBalanceDue = (enrollment: HalfPaidEnrollment): number => {
    if (enrollment.installment2_amount) {
      return enrollment.installment2_amount;
    }
    // Fallback: total minus what was paid
    const paid =
      enrollment.installment1_amount || enrollment.payment?.amount || 0;
    return (enrollment.amount || 0) - paid;
  };

  const getAmountPaid = (enrollment: HalfPaidEnrollment): number => {
    return enrollment.installment1_amount || enrollment.payment?.amount || 0;
  };

  const totalOutstanding = enrollments.reduce(
    (sum, e) => sum + getBalanceDue(e),
    0,
  );

  return (
    <Card className="mt-6 transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">50% Payment Tracker</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Learners who paid first installment — pending second half
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchHalfPaidEnrollments}
          disabled={loading}
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-4 text-center text-muted-foreground">Loading...</p>
        ) : enrollments.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            No learners with pending second installment
          </p>
        ) : (
          <>
            {/* Summary stats */}
            <div className="mb-4 flex flex-wrap gap-3">
              <Badge variant="secondary" className="text-sm">
                {enrollments.length} learner
                {enrollments.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="text-sm">
                Total outstanding: ₹{totalOutstanding.toLocaleString()}
              </Badge>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase">
                      Learner
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase">
                      Course
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase">
                      Paid
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase">
                      Balance Due
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase">
                      Total
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase">
                      Paid On
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase">
                      Time Since
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => {
                    const paymentDate = getFirstPaymentDate(enrollment);
                    const daysSince = getDaysSince(paymentDate);
                    const balanceDue = getBalanceDue(enrollment);
                    const amountPaid = getAmountPaid(enrollment);

                    return (
                      <tr
                        key={enrollment.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="px-2 py-2">
                          <div className="font-medium">
                            {enrollment.Learner?.name || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {enrollment.Learner?.phone || ""}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-sm">
                          {enrollment.Courses?.name || "Unknown"}
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-medium text-green-600">
                          ₹{amountPaid.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-medium text-red-600">
                          ₹{balanceDue.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right text-sm">
                          ₹{(enrollment.amount || 0).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-sm">
                          {paymentDate
                            ? new Date(paymentDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-sm">
                          <Badge
                            variant={
                              paymentDate &&
                              Date.now() - new Date(paymentDate).getTime() >
                                14 * 24 * 60 * 60 * 1000
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {daysSince}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
