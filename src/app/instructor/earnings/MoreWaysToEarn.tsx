import { Car, Gift, Lightbulb, Star, Users } from "lucide-react";

import { useUser } from "@/context/auth-context";
import {
  EarningProgram,
  ProgramStatusPill,
  useEarningConfig,
  useEarningPrograms,
  useInstructorEarnings,
} from "@/queries/instructorEarnings";
import { formatINR } from "@/utils/earnings";

import { BackHeader, ScreenMessage, Spinner } from "./_shared";

const ICONS: Record<string, typeof Gift> = {
  refer_learner: Star,
  refer_instructor: Users,
  lane_cars: Car,
  review_bonus: Star,
};

const PILL: Record<ProgramStatusPill, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-[#E8FAF3] text-[#00874F]" },
  new: { label: "New", className: "bg-[#FFF4CC] text-[#946200]" },
  coming_soon: {
    label: "Launching soon",
    className: "bg-gray-100 text-gray-400",
  },
};

export default function MoreWaysToEarn() {
  const { phone } = useUser();
  const { data: earnings } = useInstructorEarnings(phone);
  const { data: programs, isLoading } = useEarningPrograms();
  const { data: config } = useEarningConfig();

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <BackHeader title="More ways to earn" subtitle="Beyond regular classes" />

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Hero banner */}
        <div className="bg-[#00CE84] px-5 py-6 text-white">
          <p className="text-sm opacity-90">Your extra earnings this month</p>
          <p className="mt-1 text-3xl font-bold">
            {formatINR(earnings?.bonusMtd ?? 0)} earned from bonuses
          </p>
          <p className="mt-1 text-sm opacity-90">
            Refer and earn more — see how below
          </p>
        </div>

        {isLoading ? (
          <div className="py-10">
            <Spinner />
          </div>
        ) : !programs || programs.length === 0 ? (
          <ScreenMessage>No earning opportunities right now.</ScreenMessage>
        ) : (
          <div className="space-y-3 px-4 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Active opportunities
            </p>
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}

        {/* Tip strip */}
        {config?.tip_copy && (
          <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl bg-[#D9FF7A] p-4">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[#0F1F14]" />
            <p className="text-sm text-[#0F1F14]">{config.tip_copy}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramCard({ program }: { program: EarningProgram }) {
  const Icon = ICONS[program.key] ?? Gift;
  const pill = PILL[program.status_pill];
  const isComingSoon = program.status_pill === "coming_soon";

  const handleCta = () => {
    if (isComingSoon) return;
    if (program.cta_url) {
      window.open(program.cta_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${
        isComingSoon ? "opacity-60" : ""
      }`}
    >
      <div className="flex gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: program.icon_bg ?? "#F0F0F0" }}
        >
          <Icon className="h-5 w-5 text-[#0F1F14]" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#0F1F14]">{program.title}</h3>
          {program.description && (
            <p className="mt-0.5 text-sm text-gray-500">
              {program.description}
            </p>
          )}
          {program.amount_label && (
            <p className="mt-2 text-sm font-bold text-[#00874F]">
              {program.amount_label}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pill.className}`}
            >
              {pill.label}
            </span>
            {!isComingSoon && program.cta_label && (
              <button
                type="button"
                onClick={handleCta}
                className="text-sm font-semibold text-[#00874F]"
              >
                {program.cta_label} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
