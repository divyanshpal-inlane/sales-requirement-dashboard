import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

/** Centered spinner that fills the mobile frame. */
export function Spinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-[#00CE84]" />
    </div>
  );
}

/** Full-frame error / empty message. */
export function ScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-8 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

/** Back header used by the secondary earnings screens. */
export function BackHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
      >
        <ArrowLeft className="h-5 w-5 text-gray-700" />
      </button>
      <div>
        <h1 className="text-lg font-semibold text-[#0F1F14]">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

/** "RK" from "Ravi Kumar". */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return "IN";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function timeGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
