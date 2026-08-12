import { format } from "date-fns";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Download,
  Gift,
  Hourglass,
  MapPin,
  PartyPopper,
  Star,
  Truck,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DL_PHASE_CUSTOMER_STATUSES,
  DL_RETEST_FEE_DEFAULT,
  DL_RTO_OPTIONS,
  DL_TEST_CHECKLIST,
} from "@/constants/llPipeline";
import { whatsappHref } from "@/constants/support";
import { useLearner } from "@/queries/learner";
import {
  LLApplication,
  LLDocument,
  llDocumentUrl,
} from "@/queries/llApplications";
import {
  useMyLLApplication,
  useRequestLLHelp,
  useSelectDLTestDate,
} from "@/queries/llCustomer";

import { daysUntil, JourneyCard, SupportCallButton } from "./journeyShared";

/** Google Maps directions to the test RTO (address preferred, else name). */
function directionsHref(application: LLApplication): string {
  const query =
    application.dl_test_rto_address ||
    application.dl_test_rto ||
    "RTO Bengaluru";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** All-day Google Calendar event for the DL test. */
function calendarHref(application: LLApplication): string {
  const d = application.dl_test_date?.replaceAll("-", "") ?? "";
  const details = [
    application.dl_test_time ? `Time: ${application.dl_test_time}` : null,
    `Carry: ${DL_TEST_CHECKLIST.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "DL Test (Lane)",
    dates: `${d}/${d}`,
    details,
    location: application.dl_test_rto_address ?? application.dl_test_rto ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function ChecklistCard() {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-1 text-sm font-semibold">What to carry</p>
      <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
        {DL_TEST_CHECKLIST.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Customer picks a preferred DL test date + RTO; ops confirms the slot with
 * the RTO afterwards. Used by the matured / classes-completed / retest /
 * missed-test states.
 */
function DLDatePicker({
  application,
  learnerId,
  learnerName,
}: {
  application: LLApplication;
  learnerId: string;
  learnerName: string | null;
}) {
  const selectDate = useSelectDLTestDate();
  const [date, setDate] = useState("");
  const [rto, setRto] = useState("");

  const minDate = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div>
        <Label className="mb-1 block text-sm">Preferred test date</Label>
        <Input
          type="date"
          min={minDate}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div>
        <Label className="mb-1 block text-sm">Preferred RTO</Label>
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
      <Button
        className="w-full py-3 text-lg"
        disabled={!date || !rto || selectDate.isPending}
        onClick={() =>
          selectDate.mutate({
            applicationId: application.id,
            learnerId,
            fromStatus: application.status,
            preferredDate: date,
            preferredRto: rto,
            actorName: learnerName,
          })
        }
      >
        <CalendarDays className="mr-2 h-5 w-5" />
        {selectDate.isPending ? "Submitting…" : "Select DL Test Date"}
      </Button>
    </div>
  );
}

/**
 * The DL-test phase of the journey — one screen per status, from "LL
 * matured / classes completed" through card delivery (RTO-flow spec, part 2).
 */
export function DLPhaseCard({
  application,
  documents,
  learnerId,
  learnerName,
}: {
  application: LLApplication;
  documents: LLDocument[];
  learnerId: string;
  learnerName: string | null;
}) {
  const requestHelp = useRequestLLHelp();
  const [helpRequested, setHelpRequested] = useState<string | null>(null);
  const status = application.status;

  const requestOnce = (reason: string) => {
    requestHelp.mutate(
      {
        applicationId: application.id,
        learnerId,
        reason,
        actorName: learnerName,
      },
      { onSuccess: () => setHelpRequested(reason) },
    );
  };
  const isRequested = (reason: string) =>
    helpRequested === reason || application.escalation_reason === reason;

  // ── Pick a DL test date (LL matured / classes completed) ───────────────
  if (status === "ll_matured" || status === "dl_date_selection") {
    const classesTrack =
      status === "dl_date_selection" && application.ll_type === "with_classes";
    return (
      <JourneyCard title="Pick Your DL Test Date">
        <p className="text-base">
          {classesTrack
            ? "You have completed your classes. Pick your preferred DL test date and RTO."
            : "Great news — your Learner's Licence has matured. You can now pick your DL test date."}
        </p>
        <DLDatePicker
          application={application}
          learnerId={learnerId}
          learnerName={learnerName}
        />
      </JourneyCard>
    );
  }

  // ── Preference received — ops confirming with the RTO ──────────────────
  if (status === "dl_date_preference_received") {
    return (
      <JourneyCard title="Confirming Your DL Test Slot">
        <div className="flex items-center gap-3">
          <Hourglass className="h-8 w-8 shrink-0 text-primary" />
          <p className="text-base">
            We have received your preferred date{" "}
            <span className="font-semibold">
              {application.dl_preferred_date
                ? format(new Date(application.dl_preferred_date), "dd MMM yyyy")
                : ""}
            </span>{" "}
            at{" "}
            <span className="font-semibold">
              {application.dl_preferred_rto}
            </span>
            . Our team is confirming the slot with the RTO and will get back to
            you within 24 hours.
          </p>
        </div>
      </JourneyCard>
    );
  }

  // ── Ops slot booking — Parivahan OTP needed ────────────────────────────
  if (status === "dl_otp_required") {
    return (
      <JourneyCard title="Quick Call Coming Up">
        <p className="text-base">
          Our team will call you shortly for the Parivahan OTP needed to book
          your DL slot. Please keep the mobile number linked to your Aadhaar
          handy 📱
        </p>
        <SupportCallButton label="Need Help" />
      </JourneyCard>
    );
  }

  // ── Test confirmed (incl. countdown + test-day morning) ────────────────
  if (status === "dl_test_scheduled") {
    const untilTest = daysUntil(application.dl_test_date);
    const isTestDay = untilTest === 0;
    return (
      <JourneyCard
        title={isTestDay ? "It's DL Test Day! 🚗" : "Your DL Test is Confirmed"}
      >
        {isTestDay ? (
          <p className="text-base font-medium">
            All the best for your DL test today. Please reach the RTO 30 minutes
            early.
          </p>
        ) : (
          untilTest !== null &&
          untilTest > 0 &&
          untilTest <= 3 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                {untilTest} day{untilTest === 1 ? "" : "s"} to go — you&apos;ve
                got this! 💪
              </p>
              <p className="mt-1 text-xs text-amber-700">
                On test day: reach the RTO 30 minutes early, your documents are
                verified, and an RTO inspector rides along while you drive a
                short test route.
              </p>
            </div>
          )
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-medium">
              {application.dl_test_date
                ? format(new Date(application.dl_test_date), "dd MMM yyyy")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Time</p>
            <p className="font-medium">{application.dl_test_time ?? "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500">RTO</p>
            <p className="font-medium">
              {application.dl_test_rto ?? "—"}
              {application.dl_test_rto_address && (
                <span className="block text-sm font-normal text-gray-600">
                  {application.dl_test_rto_address}
                </span>
              )}
            </p>
          </div>
        </div>
        <ChecklistCard />
        <div className="grid grid-cols-2 gap-2">
          {!isTestDay && (
            <Button asChild variant="outline">
              <a
                href={calendarHref(application)}
                target="_blank"
                rel="noreferrer"
              >
                <CalendarPlus className="mr-1 h-4 w-4" />
                Add to Calendar
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className={isTestDay ? "" : ""}>
            <a
              href={directionsHref(application)}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin className="mr-1 h-4 w-4" />
              Get Directions
            </a>
          </Button>
          {isTestDay && <SupportCallButton label="Need Help" />}
        </div>
      </JourneyCard>
    );
  }

  // ── Test missed ────────────────────────────────────────────────────────
  if (status === "dl_test_missed") {
    return (
      <JourneyCard title="You Missed Your DL Test Slot">
        <p className="text-base">
          You missed your DL test slot. Pick a new date and we will rebook it
          with the RTO.
        </p>
        <p className="text-sm text-gray-500">
          Note: the RTO may charge a fresh slot fee for the new booking — our
          team will confirm this with you.
        </p>
        <DLDatePicker
          application={application}
          learnerId={learnerId}
          learnerName={learnerName}
        />
      </JourneyCard>
    );
  }

  // ── Results pending ────────────────────────────────────────────────────
  if (status === "dl_results_pending") {
    return (
      <JourneyCard title="DL Test Done ✅">
        <div className="flex items-center gap-3">
          <Hourglass className="h-8 w-8 shrink-0 text-primary" />
          <p className="text-base">
            Your test is done. The RTO usually updates results within 1–2
            working days and we will notify you as soon as it is out.
          </p>
        </div>
      </JourneyCard>
    );
  }

  // ── Test failed — plan the retest ──────────────────────────────────────
  if (status === "dl_test_failed") {
    const fee = application.dl_retest_fee ?? DL_RETEST_FEE_DEFAULT;
    return (
      <JourneyCard title="DL Test Update">
        <p className="text-base">
          You did not clear the DL test this time. Our team will call you to
          plan the retest — a retest fee of Rs. {fee} applies.
        </p>
        <p className="text-sm font-medium">
          Pick a preferred retest date to get started:
        </p>
        <DLDatePicker
          application={application}
          learnerId={learnerId}
          learnerName={learnerName}
        />
      </JourneyCard>
    );
  }

  // ── Test passed / approval pending ─────────────────────────────────────
  if (status === "dl_test_passed") {
    return (
      <JourneyCard title="Congratulations! 🎉">
        <div className="flex items-center gap-3">
          <PartyPopper className="h-8 w-8 shrink-0 text-primary" />
          <p className="text-base">
            Congratulations on clearing your DL test! Your licence is now with
            the RTO for final approval — this usually takes a few working days.
          </p>
        </div>
      </JourneyCard>
    );
  }

  // ── DL number generated ────────────────────────────────────────────────
  if (status === "dl_number_generated") {
    const dlCardDoc = documents.find((d) => d.doc_type === "dl_card") ?? null;
    return (
      <JourneyCard title="Your Driving Licence is Approved 🎉">
        <div className="rounded-lg border bg-gradient-to-br from-primary/10 to-white p-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">
              {application.dl_number ?? "—"}
            </span>
          </div>
          <div className="mt-2 text-sm">
            <p className="text-gray-500">Valid Till</p>
            <p className="font-medium">
              {application.dl_expiry_date
                ? format(new Date(application.dl_expiry_date), "dd MMM yyyy")
                : "—"}
            </p>
          </div>
        </div>
        {dlCardDoc && (
          <Button asChild variant="outline" className="w-full py-3 text-lg">
            <a href={llDocumentUrl(dlCardDoc)} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-5 w-5" />
              Download DL
            </a>
          </Button>
        )}
        <p className="text-sm text-gray-600">
          Your physical DL card will be printed and dispatched by the RTO — we
          will keep you posted.
        </p>
      </JourneyCard>
    );
  }

  // ── Card dispatched ────────────────────────────────────────────────────
  if (status === "dl_delivery_pending") {
    const editReason = "Customer wants to update the DL card delivery address";
    return (
      <JourneyCard title="Your DL Card is on the Way 📦">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 shrink-0 text-primary" />
          <p className="text-base">
            Your DL card has been dispatched
            {application.dl_dispatch_eta
              ? ` and should reach you by ${format(
                  new Date(application.dl_dispatch_eta),
                  "dd MMM yyyy",
                )}`
              : " and should reach you soon"}
            .
          </p>
        </div>
        {application.dl_tracking_ref && (
          <p className="text-sm">
            Tracking reference:{" "}
            <span className="font-semibold">{application.dl_tracking_ref}</span>
          </p>
        )}
        <div className="rounded-md border p-3">
          <p className="text-sm text-gray-500">Delivery address</p>
          <p className="text-sm font-medium">
            {application.form_data?.address ??
              "Address on your RTO application"}
          </p>
          {isRequested(editReason) ? (
            <p className="mt-2 text-sm font-medium text-green-700">
              Got it — our team will call you to confirm the new address.
            </p>
          ) : (
            <Button
              variant="link"
              className="h-auto p-0 text-sm"
              disabled={requestHelp.isPending}
              onClick={() => requestOnce(editReason)}
            >
              Need it delivered somewhere else? Tell us
            </Button>
          )}
        </div>
      </JourneyCard>
    );
  }

  // ── Not delivered ──────────────────────────────────────────────────────
  if (status === "dl_not_delivered") {
    const ticketId = application.id.slice(0, 8).toUpperCase();
    return (
      <JourneyCard title="Delivery Issue — We're On It">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 shrink-0 text-red-500" />
          <p className="text-base">
            We have not been able to deliver your DL card. Our team has raised
            ticket <span className="font-semibold">{ticketId}</span> and will
            call you to confirm the delivery address.
          </p>
        </div>
        <SupportCallButton label="Talk to Lane Team" />
      </JourneyCard>
    );
  }

  // ── Delivered — journey complete ───────────────────────────────────────
  if (status === "dl_delivered") {
    return (
      <JourneyCard title="You're All Set! 🥳">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />
          <p className="text-base">
            Your DL card has been delivered. You are all set — have the best
            time behind the wheel!
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <a
              href={whatsappHref(
                "Hi Lane team! I just finished my DL journey — here's my feedback: ",
              )}
              target="_blank"
              rel="noreferrer"
            >
              <Star className="mr-1 h-4 w-4" />
              Rate your experience
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                "I got my Driving Licence with Lane 🚗 They handled everything — LL, classes and the DL test. Check them out: https://web.inlane.in",
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <Gift className="mr-1 h-4 w-4" />
              Refer a friend
            </a>
          </Button>
        </div>
      </JourneyCard>
    );
  }

  return null;
}

/**
 * Post-LL surface for the NORMAL homepage (learners who moved on to classes
 * and no longer see the LL flow): shows the DL-phase card when the journey
 * is in the DL phase, else the 30-day LL-expiry warning, else nothing.
 */
export function PostLLHomeCard() {
  const { data: learner } = useLearner();
  const { data: mine } = useMyLLApplication(learner?.id);
  const application = mine?.application ?? null;

  if (!learner || !application) return null;

  if (DL_PHASE_CUSTOMER_STATUSES.includes(application.status)) {
    return (
      <div className="mb-4">
        <DLPhaseCard
          application={application}
          documents={mine?.documents ?? []}
          learnerId={learner.id}
          learnerName={learner.name}
        />
      </div>
    );
  }

  return <LLExpiryBannerInner application={application} learner={learner} />;
}

const DL_DATE_REASON = "Customer wants to pick a DL test date before LL expiry";

function LLExpiryBannerInner({
  application,
  learner,
}: {
  application: LLApplication;
  learner: { id: string; name: string | null };
}) {
  const requestHelp = useRequestLLHelp();
  const [requested, setRequested] = useState(false);

  const expiryDays = daysUntil(application.ll_expiry_date);
  if (expiryDays === null || expiryDays < 0 || expiryDays > 30) return null;

  const alreadyRequested =
    requested || application.escalation_reason === DL_DATE_REASON;

  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-800">
        Your Learner&apos;s Licence expires on{" "}
        {format(new Date(application.ll_expiry_date!), "dd MMM yyyy")}. Book
        your DL test before then so you do not have to reapply.
      </p>
      {alreadyRequested ? (
        <p className="mt-2 text-sm font-medium text-green-700">
          Request received — our team will call you with the available DL test
          dates.
        </p>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full border-amber-400"
          disabled={requestHelp.isPending}
          onClick={() =>
            requestHelp.mutate(
              {
                applicationId: application.id,
                learnerId: learner.id,
                reason: DL_DATE_REASON,
                actorName: learner.name,
              },
              { onSuccess: () => setRequested(true) },
            )
          }
        >
          Select DL Test Date
        </Button>
      )}
    </div>
  );
}
