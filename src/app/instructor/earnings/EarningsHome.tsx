import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Coins,
  Loader2,
  Phone,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useUser } from "@/context/auth-context";
import { useMaskedCall } from "@/hooks/useMaskedCall";
import {
  useInstructorEarnings,
  useInstructorKAM,
} from "@/queries/instructorEarnings";
import { formatINR } from "@/utils/earnings";

import { initialsOf, ScreenMessage, Spinner, timeGreeting } from "./_shared";

type PeriodTab = "today" | "thisWeek" | "thisMonth";

const PERIOD_LABELS: Record<PeriodTab, string> = {
  today: "Today",
  thisWeek: "This week",
  thisMonth: "This month",
};

export default function EarningsHome() {
  const navigate = useNavigate();
  const { phone } = useUser();
  const { data, isLoading, isError } = useInstructorEarnings(phone);
  const { data: kam } = useInstructorKAM(data?.instructorId);
  const { initiateCall, isCallLoading } = useMaskedCall();
  const [period, setPeriod] = useState<PeriodTab>("thisWeek");

  if (isLoading) return <Spinner />;
  if (isError || !data)
    return (
      <ScreenMessage>
        We couldn&apos;t load your earnings right now. Pull to refresh or try
        again shortly.
      </ScreenMessage>
    );

  const firstName = (data.instructorName ?? "").split(/\s+/)[0] || "there";
  const monthEarnings = data.periods.thisMonth.earnings;
  const classesDone = data.classesThisMonth;
  const assigned = data.assignedThisMonth;
  const remaining = Math.max(0, assigned - classesDone);
  const progressPct =
    assigned > 0 ? Math.min(100, (classesDone / assigned) * 100) : 0;

  const selected = data.periods[period];

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="relative bg-[#00CE84] px-5 pb-12 pt-4 text-white">
        <button
          type="button"
          onClick={() => navigate("/instructor")}
          aria-label="Back to dashboard"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-start justify-between pl-10">
          <div>
            <p className="text-sm opacity-90">{timeGreeting()} 👋</p>
            <h1 className="text-xl font-bold">{firstName}</h1>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D9FF7A] text-sm font-bold text-[#0F1F14]">
            {initialsOf(data.instructorName)}
          </div>
        </div>
      </div>

      <div className="-mt-8 flex-1 space-y-4 overflow-y-auto px-4 pb-6">
        {/* Hero earnings card */}
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Total earnings this month
          </p>
          <p className="mt-1 text-4xl font-bold text-[#0F1F14]">
            {formatINR(monthEarnings)}
          </p>
          <p className="mt-1 text-xs text-gray-400">Updated just now</p>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-gray-600">Classes done this month</span>
              <span className="rounded-full bg-[#E8FAF3] px-2 py-0.5 text-xs font-semibold text-[#00874F]">
                {classesDone} / {assigned}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#00CE84]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {remaining > 0 && (
              <p className="mt-2 rounded-lg bg-[#F0FFF8] px-3 py-1.5 text-xs font-medium text-[#00874F]">
                🎯 {remaining} more {remaining === 1 ? "class" : "classes"} ={" "}
                {formatINR(remaining * data.perClassRate)} more this month
              </p>
            )}
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex gap-2 rounded-xl bg-white p-1 shadow-sm">
          {(Object.keys(PERIOD_LABELS) as PeriodTab[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-[#00CE84] text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Earned</p>
            <p className="mt-1 text-2xl font-bold text-[#0F1F14]">
              {formatINR(selected.earnings)}
            </p>
            <p className="mt-1 text-xs text-[#00874F]">
              {selected.classes} {selected.classes === 1 ? "class" : "classes"}{" "}
              done
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Pending payout</p>
            <p className="mt-1 text-2xl font-bold text-[#0F1F14]">
              {formatINR(data.pendingPayout)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {data.pendingPayoutStatus === "paid"
                ? "Paid out"
                : `Pays out ${formatPayoutHint(data.nextPayoutDate, data.payoutDay)}`}
            </p>
          </div>
        </div>

        {/* Discrepancy / Contact KAM */}
        {kam && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#E6870A]" />
              <div className="flex-1">
                <p className="font-semibold text-[#0F1F14]">
                  Something look wrong?
                </p>
                <p className="text-sm text-gray-500">
                  Contact your KAM to fix it fast
                </p>
              </div>
              <button
                type="button"
                disabled={isCallLoading || !kam.phone}
                onClick={() => initiateCall(phone ?? "", kam.phone ?? "")}
                className="flex items-center gap-1.5 rounded-lg border border-[#00CE84] px-3 py-1.5 text-xs font-semibold text-[#00874F] disabled:opacity-50"
              >
                {isCallLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )}
                Contact KAM
              </button>
            </div>
          </div>
        )}

        {/* Secondary CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate("/instructor/earnings/more")}
            className="flex flex-col items-start gap-2 rounded-xl bg-[#F0FFF8] p-4 text-left"
          >
            <Coins className="h-5 w-5 text-[#00874F]" />
            <span className="text-sm font-semibold text-[#00874F]">
              More ways to earn
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/instructor/earnings/compare")}
            className="flex flex-col items-start gap-2 rounded-xl bg-[#F8F8FF] p-4 text-left"
          >
            <BarChart3 className="h-5 w-5 text-[#6D5BD0]" />
            <span className="text-sm font-semibold text-[#6D5BD0]">
              How do I compare?
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Friday" or "Mon, 22 Jun" — short, friendly payout hint. */
function formatPayoutHint(nextDate: string, payoutDay: string): string {
  try {
    return format(new Date(nextDate), "EEE, d MMM");
  } catch {
    return payoutDay;
  }
}
