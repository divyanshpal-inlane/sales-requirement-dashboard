import { differenceInCalendarDays } from "date-fns";
import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUPPORT_PHONE_TEL, telHref } from "@/constants/support";

/** Days elapsed since an ISO date (calendar days, local time). */
export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, differenceInCalendarDays(new Date(), new Date(iso)));
}

export function hoursSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
}

/** Days from today until an ISO date — negative when it's in the past. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return differenceInCalendarDays(new Date(iso), new Date());
}

/** Card shell shared by every journey state. */
export function JourneyCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mx-auto mt-4 w-full max-w-2xl">
      <CardHeader className="rounded-t-xl bg-primary text-white">
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-5">{children}</CardContent>
    </Card>
  );
}

export function SupportCallButton({ label }: { label: string }) {
  return (
    <Button asChild variant="outline" className="w-full py-3 text-lg">
      <a href={telHref(SUPPORT_PHONE_TEL)}>
        <Phone className="mr-2 h-5 w-5" />
        {label}
      </a>
    </Button>
  );
}
