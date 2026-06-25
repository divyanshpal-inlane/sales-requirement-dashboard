import { differenceInCalendarDays, endOfMonth } from "date-fns";
import { CalendarDays, CheckCircle2, Trophy } from "lucide-react";

import { useUser } from "@/context/auth-context";
import {
  useEarningConfig,
  useInstructorEarnings,
  useInstructorKAM,
} from "@/queries/instructorEarnings";
import { formatINR, PeriodTotals } from "@/utils/earnings";

import { BackHeader, ScreenMessage, Spinner } from "./_shared";

export default function EarningsComparison() {
  const { phone } = useUser();
  const { data, isLoading, isError } = useInstructorEarnings(phone);
  const { data: kam } = useInstructorKAM(data?.instructorId);
  const { data: config } = useEarningConfig();

  if (isLoading) return <Spinner />;
  if (isError || !data)
    return (
      <ScreenMessage>We couldn&apos;t load your comparison.</ScreenMessage>
    );

  const { thisWeek, lastWeek, thisMonth, lastMonth } = data.periods;
  const daysLeft = Math.max(
    0,
    differenceInCalendarDays(endOfMonth(new Date()), new Date()),
  );

  const message = (
    config?.availability_message_template ??
    "Hi, I'm available for extra classes this week. Please assign me more lessons."
  ).replace("{name}", data.instructorName ?? "");
  const waUrl = kam?.phone
    ? `https://wa.me/${kam.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <BackHeader
        title="My earnings comparison"
        subtitle="How am I doing over time?"
      />

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* WoW */}
        <ComparisonCard
          title="This week vs last week"
          prevLabel="Last week"
          prev={lastWeek}
          currentLabel="This week"
          current={thisWeek}
          driver={driverLine(thisWeek.earnings, lastWeek.earnings, true)}
        />

        {/* MoM */}
        {data.hasLastMonthData ? (
          <div className="space-y-0">
            <ComparisonCard
              title="This month vs last month"
              prevLabel="Last month"
              prev={lastMonth}
              currentLabel="This month"
              current={thisMonth}
              currentSuffix=" so far"
              driver={driverLine(thisMonth.earnings, lastMonth.earnings, false)}
            />
            {thisMonth.earnings >= lastMonth.earnings && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#F8FFF4] px-4 py-3">
                <Trophy className="h-4 w-4 text-[#00694A]" />
                <p className="text-sm font-medium text-[#00694A]">
                  {daysLeft} days still left — stay consistent!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              This month vs last month
            </p>
            <p className="mt-2 text-sm text-gray-500">
              This is your first month — nothing to compare yet. Keep completing
              your classes!
            </p>
          </div>
        )}

        {/* Nudge 1 — reliability (dark) */}
        <div className="rounded-2xl bg-[#0F1F14] p-5 text-white">
          <CheckCircle2 className="h-6 w-6 text-[#00CE84]" />
          <h3 className="mt-2 font-semibold">
            Complete every assigned class on time
          </h3>
          <p className="mt-1 text-sm text-white/70">
            Instructors who show up on time and follow guidelines get first
            priority when new classes are assigned.
          </p>
        </div>

        {/* Nudge 2 — availability (white) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <CalendarDays className="h-6 w-6 text-[#00874F]" />
          <h3 className="mt-2 font-semibold text-[#0F1F14]">
            Want to earn more?
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Let your KAM know your free slots — we&apos;ll assign extra classes
            when demand picks up in your area.
          </p>
          <button
            type="button"
            disabled={!waUrl}
            onClick={() =>
              waUrl && window.open(waUrl, "_blank", "noopener,noreferrer")
            }
            className="mt-3 w-full rounded-lg bg-[#00CE84] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Tell my KAM I&apos;m available
          </button>
        </div>
      </div>
    </div>
  );
}

function driverLine(current: number, prev: number, weekly: boolean): string {
  const diff = Math.round(current - prev);
  const span = weekly ? "week" : "month";
  if (diff > 0) return `You earned ${formatINR(diff)} more than last ${span}.`;
  if (diff < 0)
    return `You earned ${formatINR(Math.abs(diff))} less than last ${span}.`;
  return `Same as last ${span} so far.`;
}

function ComparisonCard({
  title,
  prevLabel,
  prev,
  currentLabel,
  current,
  currentSuffix = "",
  driver,
}: {
  title: string;
  prevLabel: string;
  prev: PeriodTotals;
  currentLabel: string;
  current: PeriodTotals;
  currentSuffix?: string;
  driver: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">{prevLabel}</p>
          <p className="text-xl font-semibold text-gray-300">
            {formatINR(prev.earnings)}
          </p>
          <p className="text-xs text-gray-300">{prev.classes} classes</p>
        </div>
        <span className="text-gray-300">→</span>
        <div className="text-right">
          <p className="text-xs font-semibold text-[#00874F]">
            {currentLabel} ✦
          </p>
          <p className="text-2xl font-bold text-[#0F1F14]">
            {formatINR(current.earnings)}
            {currentSuffix && (
              <span className="text-sm font-normal text-gray-400">
                {currentSuffix}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            {current.classes} classes{currentSuffix}
          </p>
        </div>
      </div>
      <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
        {driver}
      </p>
    </div>
  );
}
