import "@/components/admin/sales-dashboard/sales-dashboard.css";

import type { KeyboardEvent, RefObject } from "react";
import {
  Fragment,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { LocateStatus } from "@/components/admin/sales-dashboard/LocationSearch";
import type {
  CustomerFormValues,
  SlotPick,
} from "@/components/admin/sales-dashboard/TentativeBookingModal";
import {
  DEFAULT_CUSTOMER_FORM,
  TentativeBookingModal,
} from "@/components/admin/sales-dashboard/TentativeBookingModal";
import type {
  BlockDetail,
  InstructorRow,
  LightInstructor,
} from "@/hooks/useSalesData";
import { useSalesData } from "@/hooks/useSalesData";
import {
  isTimeUnavailable,
  validateOneHourBlock,
} from "@/lib/sales-dashboard/availability";
import type { KmlZone } from "@/lib/sales-dashboard/kml";
import {
  fetchKmlData,
  matchLocation,
  normalizeName,
  resolveInstructorName,
} from "@/lib/sales-dashboard/kml";
import {
  dateToWeekdayLower,
  minutesToTime,
  timeToMinutes,
} from "@/lib/sales-dashboard/validation";

const LocationSearch = lazy(
  () => import("@/components/admin/sales-dashboard/LocationSearch"),
);

interface SlotInfo {
  title: string;
  detail: string[];
  // Drives cell background color. "tentative" = yellow (any payment
  // status), "booked" = purple (booked/completed/pending_payment — i.e.
  // a real class, never overridable from Sales). Buffer zones and
  // everything else stay "default" (existing plain appearance).
  kind: "free" | "tentative" | "booked" | "default";
  // Set only for a non-buffer, unpaid tentative slot — the one case Sales
  // is allowed to override. Carries what the override action needs
  // without a second lookup.
  override: {
    blockId: number;
    instrId: string;
    date: string;
    startMinute: number;
    endMinute: number;
    tentativeDetails: Record<string, unknown> | null;
  } | null;
}

type SortKey = "freeDesc" | "freeAsc" | "alpha";

const LOCATION_COLORS = [
  "#1a73e8",
  "#e8710a",
  "#188038",
  "#a142f4",
  "#c52828",
  "#00897b",
  "#f4511e",
  "#0d47a1",
  "#6a1b9a",
  "#2e7d32",
  "#00695c",
  "#ad1457",
] as const;

function isBookable(
  instructor: Pick<InstructorRow, "status" | "enabled">,
): boolean {
  return (
    instructor.enabled !== false && (instructor.status ?? "active") === "active"
  );
}

// Distinct from isBookable: enabled === false means the instructor has been
// deactivated/removed and should never be searchable. status !== "active"
// (e.g. "on_break") is a *temporary* state — that instructor still exists
// and a sales rep searching for them by name should be able to find them,
// same as the existing behavior for location-matched on-break instructors
// (see workingOnMap below).
function isDisabled(instructor: Pick<InstructorRow, "enabled">): boolean {
  return instructor.enabled === false;
}

// Short label shown next to an instructor's name wherever they can appear
// (search suggestions, grid rows, location chips) when they're temporarily
// unavailable but still real/searchable — null for active or disabled
// instructors (disabled ones aren't shown in these lists at all).
function statusNote(
  instructor: Pick<InstructorRow, "status" | "enabled">,
): string | null {
  if (instructor.enabled === false) return null;
  const status = instructor.status ?? "active";
  if (status === "active") return null;
  if (status === "on_break") return "On break";
  if (status === "paused") return "Paused";
  return "Unavailable";
}

const EMPTY_LIGHT: LightInstructor[] = [];

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function monthLabel(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mm - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function shortDate(iso: string): {
  weekday: string;
  date: string;
  day: string;
} {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
    date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    day: d.toLocaleDateString("en-GB", { day: "numeric" }),
  };
}

function initialTheme(): "light" | "dark" {
  const stored = localStorage.getItem("lane-sales-dashboard-theme");
  return stored === "light" || stored === "dark" ? stored : "light";
}

function showDetailTitle(
  instructor: InstructorRow,
  windowTotal: number,
  days: number,
): string {
  const areas =
    instructor.areas.length > 0 ? `Areas: ${instructor.areas.join(", ")}` : "";
  return [areas, `${windowTotal} free slots across ${days} days`]
    .filter(Boolean)
    .join(" · ");
}

interface GridProps {
  instructors: InstructorRow[];
  freeGrid: Map<string, Map<string, number[]>>;
  freeSets: Map<string, Set<number>>;
  windowTotals: Map<string, number>;
  timeCols: string[];
  timeStarts: number[];
  dates: string[];
  selectedDate: string;
  gridMinutes: number;
  expanded: Set<string>;
  selectedRows: Set<string>;
  rowColors: ReadonlyMap<string, string>;
  loadingRows: LightInstructor[];
  onToggleExpand: (id: string) => void;
  onToggleSelectRow: (id: string) => void;
  onRemove?: (id: string) => void;
  onDoubleClick?: (instrId: string, date: string, minute: number) => void;
  onOverrideClick?: (override: NonNullable<SlotInfo["override"]>) => void;
  resolveInfo: (
    instrId: string,
    date: string,
    minute: number,
    free: boolean,
  ) => SlotInfo;
}

interface SlotCellProps {
  instrId: string;
  date: string;
  minute: number;
  free: boolean;
  band: boolean;
  timeLabel: string;
  canBook1Hour?: boolean;
  onDoubleClick?: (instrId: string, date: string, minute: number) => void;
  onOverrideClick?: (override: NonNullable<SlotInfo["override"]>) => void;
  resolveInfo: (
    instrId: string,
    date: string,
    minute: number,
    free: boolean,
  ) => SlotInfo;
}

function SlotCellInner({
  instrId,
  date,
  minute,
  free,
  band,
  timeLabel,
  canBook1Hour,
  onDoubleClick,
  onOverrideClick,
  resolveInfo,
}: SlotCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  // Computed on every render, not just while hovered — kind drives the
  // cell's background color (yellow tentative / purple booked), which
  // must be visible at a glance, not only on hover.
  const info = resolveInfo(instrId, date, minute, free);
  const cls = ["cell"];
  if (free) {
    cls.push("cell-free");
    if (canBook1Hour === false) cls.push("cell-half");
  } else if (info.kind === "tentative") {
    cls.push("cell-tentative");
  } else if (info.kind === "booked") {
    cls.push("cell-booked");
  } else if (band) {
    cls.push("cell-band");
  }
  if (isHovered) cls.push("cell-hovered");
  return (
    <td
      className={cls.join(" ")}
      title={
        free
          ? canBook1Hour === false
            ? `Free ${timeLabel} — adjacent slot booked, can't book 1hr`
            : `Free ${timeLabel} — double-click to book 1hr`
          : "Hover for details"
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={() => {
        if (free && onDoubleClick) {
          onDoubleClick(instrId, date, minute);
        }
      }}
    >
      {isHovered && (
        <div className="slot-pop">
          <div className={free ? "pop-title free" : "pop-title busy"}>
            {info.title}
          </div>
          {info.detail.map((line, i) => (
            <div key={i} className="pop-line">
              {line}
            </div>
          ))}
          {info.override && (
            <button
              type="button"
              className="slot-pop-override-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOverrideClick?.(info.override!);
              }}
            >
              Override Slot
            </button>
          )}
        </div>
      )}
    </td>
  );
}

// Memoized with stable props (see SlotCellProps) so that opening/closing one
// popover only re-renders the (at most two) cells whose isOpen actually
// changed, instead of every cell in the table — critical once several
// instructors with 400-day schedules are loaded/expanded at once.
const SlotCell = memo(SlotCellInner);

interface MiniRowProps {
  instrId: string;
  d: string;
  isCurrent: boolean;
  timeCols: string[];
  timeStarts: number[];
  gridMinutes: number;
  freeGrid: Map<string, Map<string, number[]>>;
  onDoubleClick?: (instrId: string, date: string, minute: number) => void;
  onOverrideClick?: (override: NonNullable<SlotInfo["override"]>) => void;
  resolveInfo: (
    instrId: string,
    date: string,
    minute: number,
    free: boolean,
  ) => SlotInfo;
}

function MiniRowInner({
  instrId,
  d,
  isCurrent,
  timeCols,
  timeStarts,
  gridMinutes,
  freeGrid,
  onDoubleClick,
  onOverrideClick,
  resolveInfo,
}: MiniRowProps) {
  // Computed here (inside the memoized row), not in the parent's map loop —
  // so this Set only gets rebuilt when THIS row actually re-renders, not on
  // every popover click anywhere in the table.
  const dayFree = useMemo(
    () => new Set(freeGrid.get(instrId)?.get(d) ?? []),
    [freeGrid, instrId, d],
  );
  const { weekday, date } = shortDate(d);
  return (
    <tr className={isCurrent ? "mini-row current" : "mini-row"}>
      <td className="mini-date">
        {weekday} {date}
        <span className="mini-count">{dayFree.size}</span>
      </td>
      {timeCols.map((t, ti) => {
        const m = timeStarts[ti];
        const free = dayFree.has(m);
        const band = Math.floor(ti / 2) % 2 === 1;
        const canBook1Hour =
          free && validateOneHourBlock(instrId, d, m, freeGrid);
        return (
          <SlotCell
            key={t}
            instrId={instrId}
            date={d}
            free={free}
            band={band}
            minute={m}
            timeLabel={`${t}–${minutesToTime(m + gridMinutes)}`}
            canBook1Hour={canBook1Hour}
            onDoubleClick={onDoubleClick}
            onOverrideClick={onOverrideClick}
            resolveInfo={resolveInfo}
          />
        );
      })}
    </tr>
  );
}

// Memoized so that, within one instructor's expanded 400-day schedule, only
// the one date-row whose popover state actually changed re-renders — not all
// 400. Combined with InstructorRowGroup below, this is what makes clicking a
// slot cost O(1) instead of O(total cells on screen).
const MiniRow = memo(MiniRowInner);

interface InstructorRowGroupProps {
  instr: InstructorRow;
  freeSet: Set<number> | undefined;
  windowTotal: number;
  isExpanded: boolean;
  isSelected: boolean;
  rowColor: string | undefined;
  timeCols: string[];
  timeStarts: number[];
  dates: string[];
  selectedDate: string;
  gridMinutes: number;
  freeGrid: Map<string, Map<string, number[]>>;
  onToggleExpand: (id: string) => void;
  onToggleSelectRow: (id: string) => void;
  onRemove?: (id: string) => void;
  onDoubleClick?: (instrId: string, date: string, minute: number) => void;
  onOverrideClick?: (override: NonNullable<SlotInfo["override"]>) => void;
  resolveInfo: (
    instrId: string,
    date: string,
    minute: number,
    free: boolean,
  ) => SlotInfo;
}

function InstructorRowGroupInner(props: InstructorRowGroupProps) {
  const {
    instr,
    freeSet,
    windowTotal,
    isExpanded,
    isSelected,
    rowColor,
    timeCols,
    timeStarts,
    dates,
    selectedDate,
    onDoubleClick,
    onOverrideClick,
    gridMinutes,
    freeGrid,
    onToggleExpand,
    onToggleSelectRow,
    onRemove,
    resolveInfo,
  } = props;
  const detailTitle = showDetailTitle(instr, windowTotal, dates.length);

  return (
    <Fragment>
      <tr className={isSelected ? "row row-selected" : "row"}>
        <td className="instructor-cell" title={detailTitle}>
          <button
            type="button"
            className="row-select"
            aria-label={
              isSelected
                ? `Un-highlight ${instr.name}'s row`
                : `Highlight ${instr.name}'s row`
            }
            title="Highlight this row"
            onClick={() => onToggleSelectRow(instr.id)}
          >
            {isSelected ? "●" : "○"}
          </button>
          {rowColor && (
            <span
              className="loc-swatch"
              style={{ background: rowColor }}
              title={`${instr.name}’s zone colour on the map`}
            />
          )}
          <button
            type="button"
            className={isExpanded ? "expand open" : "expand"}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? `Hide ${instr.name}'s full timetable`
                : `Show ${instr.name}'s full timetable`
            }
            title={
              isExpanded
                ? "Hide this instructor's full timetable"
                : "Show this instructor's full schedule across all dates"
            }
            onClick={() => onToggleExpand(instr.id)}
          >
            <span className="expand-chev" aria-hidden="true">
              {isExpanded ? "▲" : "▼"}
            </span>
            <span className="expand-label">
              {isExpanded ? "Hide schedule" : "Schedule"}
            </span>
          </button>
          <button
            type="button"
            className="instructor-name"
            title={detailTitle}
            onClick={() => onToggleExpand(instr.id)}
          >
            {instr.name}
            {statusNote(instr) && (
              <span className="break-badge">{statusNote(instr)}</span>
            )}
          </button>
          {onRemove && (
            <button
              type="button"
              className="remove-instr"
              title={`Remove ${instr.name} from the grid`}
              aria-label={`Remove ${instr.name} from the grid`}
              onClick={() => onRemove(instr.id)}
            >
              ×
            </button>
          )}
        </td>
        {timeCols.map((t, ti) => {
          const m = timeStarts[ti];
          const free = freeSet?.has(m) ?? false;
          const band = Math.floor(ti / 2) % 2 === 1;
          const canBook1Hour =
            free && validateOneHourBlock(instr.id, selectedDate, m, freeGrid);
          return (
            <SlotCell
              key={t}
              instrId={instr.id}
              date={selectedDate}
              free={free}
              band={band}
              minute={m}
              timeLabel={`${t}–${minutesToTime(m + gridMinutes)}`}
              canBook1Hour={canBook1Hour}
              onDoubleClick={onDoubleClick}
              onOverrideClick={onOverrideClick}
              resolveInfo={resolveInfo}
            />
          );
        })}
      </tr>
      {isExpanded && (
        <tr className="detail-row">
          <td colSpan={timeCols.length + 1}>
            <div className="detail">
              <div className="detail-header">
                <span className="detail-title">
                  <span className="detail-chev" aria-hidden="true">
                    ▲
                  </span>
                  {instr.name}
                  <span className="detail-badge">full schedule</span>
                </span>
                <span className="detail-sub">
                  {dates.length} days · {windowTotal} free slots
                </span>
                {instr.areas.length > 0 && (
                  <span className="detail-areas">
                    Areas: {instr.areas.join(", ")}
                  </span>
                )}
                <button
                  type="button"
                  className="detail-close"
                  onClick={() => onToggleExpand(instr.id)}
                  aria-label={`Hide ${instr.name}'s full timetable`}
                >
                  Hide schedule ▲
                </button>
              </div>
              <table className="mini">
                <thead>
                  <tr>
                    <th className="mini-date">Date</th>
                    {timeCols.map((t) => (
                      <th key={t} className="mini-time">
                        <span className="time-label">{t}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dates.map((d) => (
                    <MiniRow
                      key={d}
                      instrId={instr.id}
                      d={d}
                      isCurrent={d === selectedDate}
                      timeCols={timeCols}
                      timeStarts={timeStarts}
                      gridMinutes={gridMinutes}
                      freeGrid={freeGrid}
                      onDoubleClick={onDoubleClick}
                      onOverrideClick={onOverrideClick}
                      resolveInfo={resolveInfo}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
      <tr className="row-gap" aria-hidden="true">
        <td colSpan={timeCols.length + 1} />
      </tr>
    </Fragment>
  );
}

// Memoized: since `openPop` is `null` (referentially stable) for every
// instructor except the one whose popover just changed, this bails out
// entirely for all other instructors on every click — including skipping
// their mini-table's 400-row map if expanded.
const InstructorRowGroup = memo(InstructorRowGroupInner);

function AvailabilityGridInner(props: GridProps) {
  const {
    instructors,
    freeGrid,
    freeSets,
    windowTotals,
    timeCols,
    timeStarts,
    dates,
    selectedDate,
    gridMinutes,
    expanded,
    selectedRows,
    rowColors,
    loadingRows,
    onToggleExpand,
    onToggleSelectRow,
    onRemove,
    onDoubleClick,
    onOverrideClick,
    resolveInfo,
  } = props;

  return (
    <table className="roster grid">
      <thead>
        <tr>
          <th className="col-instructor">Instructor</th>
          {timeCols.map((t) => (
            <th key={t} className="col-time-h">
              <span className="time-label">{t}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {instructors.map((instr) => (
          <InstructorRowGroup
            key={instr.id}
            instr={instr}
            freeSet={freeSets.get(instr.id)}
            windowTotal={windowTotals.get(instr.id) ?? 0}
            isExpanded={expanded.has(instr.id)}
            isSelected={selectedRows.has(instr.id)}
            rowColor={rowColors.get(instr.id)}
            timeCols={timeCols}
            timeStarts={timeStarts}
            dates={dates}
            selectedDate={selectedDate}
            gridMinutes={gridMinutes}
            freeGrid={freeGrid}
            onToggleExpand={onToggleExpand}
            onToggleSelectRow={onToggleSelectRow}
            onRemove={onRemove}
            onDoubleClick={onDoubleClick}
            onOverrideClick={onOverrideClick}
            resolveInfo={resolveInfo}
          />
        ))}
        {loadingRows.map((li) => (
          <tr key={li.id} className="row row-loading">
            <td className="instructor-cell">{li.name}</td>
            <td colSpan={timeCols.length}>
              <span className="row-loading-msg">Loading schedule…</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const AvailabilityGrid = memo(AvailabilityGridInner);

export default function SalesDashboard() {
  const {
    phase,
    errorMsg,
    data,
    reload,
    loadInstructors,
    removeInstructor,
    loadInstructorIndex,
  } = useSalesData();
  const [filter, setFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [dateIndex, setDateIndex] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("freeDesc");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const [helpOpen, setHelpOpen] = useState(false);
  const [kmlZones, setKmlZones] = useState<KmlZone[] | null>(null);
  const [kmlError, setKmlError] = useState<string | null>(null);
  const [locSearch, setLocSearch] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [tentativeModalOpen, setTentativeModalOpen] = useState(false);
  // Task 19 (multiple-class booking): one customer form can carry N
  // slots. Both live here, not inside the modal, specifically so they
  // survive the modal hiding/reopening while Sales picks each additional
  // class on the grid (see handleAddAnotherSlot / addingSlotMode below).
  const [pendingSlots, setPendingSlots] = useState<SlotPick[]>([]);
  const [customerFormData, setCustomerFormData] = useState<CustomerFormValues>(
    () => DEFAULT_CUSTOMER_FORM(),
  );
  // True while Sales has clicked "+ Add another class" and is picking
  // the next slot for the SAME in-progress batch.
  const [addingSlotMode, setAddingSlotMode] = useState(false);
  // Set while an override is in progress. Unlike the multi-class flow,
  // overriding never needs Sales to pick a slot on the grid — it always
  // replaces the SAME slot the unpaid tentative hold already occupies,
  // for a different (paying) learner. tentativeDetails here is the OLD
  // customer's info, kept only for on-screen reference — the form itself
  // starts blank, since this is a new learner, not the same one moving.
  const [overrideContext, setOverrideContext] = useState<{
    blockId: number;
    tentativeDetails: Record<string, unknown> | null;
  } | null>(null);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const slotNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSlotNotice = useCallback((message: string) => {
    if (slotNoticeTimerRef.current) clearTimeout(slotNoticeTimerRef.current);
    setSlotNotice(message);
    slotNoticeTimerRef.current = setTimeout(() => setSlotNotice(null), 4000);
  }, []);

  // Hides the modal (formData/pendingSlots stay exactly as they are —
  // both live in this component, not the modal) and arms "pick another
  // slot" mode. handleSlotDoubleClick appends the next double-clicked
  // free slot to pendingSlots and reopens the modal.
  const handleAddAnotherSlot = useCallback(() => {
    setTentativeModalOpen(false);
    setAddingSlotMode(true);
  }, []);

  const cancelAddingSlot = useCallback(() => {
    setAddingSlotMode(false);
    setTentativeModalOpen(true);
  }, []);

  const handleRemoveSlot = useCallback((index: number) => {
    setPendingSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCloseTentativeModal = useCallback(() => {
    setTentativeModalOpen(false);
    setPendingSlots([]);
    setCustomerFormData(DEFAULT_CUSTOMER_FORM());
    setOverrideContext(null);
    setAddingSlotMode(false);
  }, []);

  const handleTentativeSuccess = useCallback(() => {
    setTentativeModalOpen(false);
    setPendingSlots([]);
    setCustomerFormData(DEFAULT_CUSTOMER_FORM());
    setOverrideContext(null);
    setAddingSlotMode(false);
    reload();
  }, [reload]);

  useEffect(() => {
    if (!addingSlotMode) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setAddingSlotMode(false);
        setTentativeModalOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addingSlotMode]);

  useEffect(() => {
    return () => {
      if (slotNoticeTimerRef.current) clearTimeout(slotNoticeTimerRef.current);
    };
  }, []);
  const searchRef = useRef<HTMLDivElement>(null);

  const config = data?.config ?? null;
  const dates = useMemo(() => data?.dates ?? [], [data]);
  const displayGrid = useMemo(
    () => data?.displayGrid ?? new Map<string, Map<string, number[]>>(),
    [data],
  );
  const timeStarts = data?.timeStarts ?? [];

  const months = useMemo(() => {
    const out: string[] = [];
    for (const d of dates) {
      const m = d.slice(0, 7);
      if (out[out.length - 1] !== m) out.push(m);
    }
    return out;
  }, [dates]);
  const activeMonth = months.includes(selectedMonth)
    ? selectedMonth
    : (months[0] ?? "");
  const monthIdx = months.indexOf(activeMonth);
  const goPrev = () => {
    if (monthIdx > 0) {
      setSelectedMonth(months[monthIdx - 1]);
      setDateIndex(0);
    }
  };
  const goNext = () => {
    if (monthIdx < months.length - 1) {
      setSelectedMonth(months[monthIdx + 1]);
      setDateIndex(0);
    }
  };
  const visibleDates = useMemo(
    () => dates.filter((d) => d.startsWith(activeMonth)),
    [dates, activeMonth],
  );

  const safeDateIndex = Math.min(
    dateIndex,
    Math.max(0, visibleDates.length - 1),
  );
  const selectedDate = visibleDates[safeDateIndex] ?? null;

  useOutsideClick(searchRef, () => setSearchOpen(false));

  // Theme is scoped to this component's own wrapper (.sales-dashboard-root),
  // NOT document.documentElement — toggling it must never reskin the rest of
  // the admin app.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.setAttribute("data-theme", theme);
    localStorage.setItem("lane-sales-dashboard-theme", theme);
  }, [theme]);

  // Entering "pick a slot on the grid" mode (add-another-class) is easy to
  // miss if the grid is scrolled out of view or the user doesn't notice the
  // modal closed — scroll the grid into view and give it a visible
  // highlighted border for as long as picking mode is active, so it's
  // unmistakable where to click next. (Override no longer needs this — it
  // always reuses the same slot the unpaid hold already occupies, so the
  // modal opens directly with no grid interaction required.)
  const gridWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (addingSlotMode) {
      gridWrapRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [addingSlotMode]);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchKmlData(), loadInstructorIndex()])
      .then(([zones]) => {
        if (active) {
          setKmlZones(zones);
          setKmlError(null);
        }
      })
      .catch((err: unknown) => {
        if (active)
          setKmlError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      active = false;
    };
  }, [loadInstructorIndex]);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [helpOpen]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addToCompare = (id: string) => {
    loadInstructors([id]);
    setCompareIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSearchOpen(false);
  };

  const removeFromCompare = useCallback((id: string) => {
    setCompareIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const toggleRoster = (id: string) => {
    if (data?.instructors.some((i) => i.id === id)) removeInstructor(id);
    else loadInstructors([id]);
  };

  const clearLocation = () => {
    setLocSearch(null);
  };

  const allInstructors = data?.allInstructors ?? EMPTY_LIGHT;

  const dbNormNames = useMemo(() => {
    const set = new Set<string>();
    for (const i of allInstructors) set.add(normalizeName(i.name));
    return set;
  }, [allInstructors]);

  const dbByName = useMemo(() => {
    const map = new Map<string, LightInstructor>();
    for (const i of allInstructors) {
      const key = normalizeName(i.name);
      if (!map.has(key)) map.set(key, i);
    }
    return map;
  }, [allInstructors]);

  const instructorsById = useMemo(() => {
    const map = new Map<string, InstructorRow>();
    if (!data) return map;
    for (const i of data.instructors) map.set(i.id, i);
    return map;
  }, [data]);

  const locMatch = useMemo(() => {
    if (!locSearch || !kmlZones) return null;
    const res = matchLocation(kmlZones, {
      lat: locSearch.lat,
      lng: locSearch.lng,
    });
    const ids: string[] = [];
    const resolvedNames = new Map<string, string>();
    for (const name of res.names) {
      const resolved = resolveInstructorName(name, dbNormNames);
      if (!resolved) continue;
      const light = dbByName.get(resolved);
      if (light && !ids.includes(light.id)) {
        ids.push(light.id);
        resolvedNames.set(name, light.id);
      }
    }
    return { ids, zones: res.names, via: res.via, resolvedNames };
  }, [locSearch, kmlZones, dbNormNames, dbByName]);

  useEffect(() => {
    if (locMatch && locMatch.ids.length > 0) loadInstructors(locMatch.ids);
  }, [locMatch, loadInstructors]);

  const locResult = useMemo(() => {
    if (!locMatch || !kmlZones) return null;
    const zoneByName = new Map(kmlZones.map((z) => [z.name, z]));
    const instrs: InstructorRow[] = [];
    const instrColors: Record<string, string> = {};
    const zoneInfo: Record<
      string,
      { color: string; instructorName: string; rawName: string }
    > = {};
    for (const name of locMatch.zones) {
      const lightId = locMatch.resolvedNames.get(name);
      const instr = lightId ? instructorsById.get(lightId) : undefined;
      if (!instr) continue;
      let color = instrColors[instr.id];
      if (!color) {
        color = LOCATION_COLORS[instrs.length % LOCATION_COLORS.length];
        instrColors[instr.id] = color;
        instrs.push(instr);
      }
      zoneInfo[name] = {
        color,
        instructorName: instr.name,
        rawName: zoneByName.get(name)?.rawName ?? name,
      };
    }
    return {
      instrs,
      zones: locMatch.zones,
      via: locMatch.via,
      instrColors,
      zoneInfo,
    };
  }, [locMatch, kmlZones, instructorsById]);

  const rowColors = useMemo(
    () => new Map(Object.entries(locResult?.instrColors ?? {})),
    [locResult],
  );

  const locStatus: LocateStatus = useMemo(() => {
    if (!locSearch) return "idle";
    if (kmlZones === null) return "loading";
    if (locResult && locResult.instrs.length > 0) return "found";
    return "none";
  }, [locSearch, kmlZones, locResult]);

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const resetDashboard = () => {
    setFilter("");
    setSearchOpen(false);
    setDateIndex(0);
    setExpanded(new Set());
    setCompareIds([]);
    setSort("freeDesc");
    setSelectedMonth("");
    setSelectedRows(new Set());
    clearLocation();
  };

  // Any on-break/paused-but-enabled instructor that's either matched by
  // location OR already explicitly loaded (via name search + Add) is
  // treated as "working" for display purposes — real free counts still show
  // (their schedule/unavailability data is unaffected by this status), with
  // a "break-badge" note next to their name (see statusNote()) so it's clear
  // they're temporarily unavailable. Fully disabled instructors are never
  // included here.
  const workingOnMap = useMemo(() => {
    const set = new Set<string>();
    if (locSearch) {
      for (const i of locResult?.instrs ?? []) {
        if (!isBookable(i)) set.add(i.id);
      }
    }
    for (const i of data?.instructors ?? []) {
      if (!isBookable(i) && !isDisabled(i)) set.add(i.id);
    }
    return set;
  }, [locSearch, locResult, data]);

  const visibleInstructors = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const roster = locSearch
      ? (locResult?.instrs ?? [])
      : (data?.instructors ?? []);
    return roster
      .filter((i) => isBookable(i) || workingOnMap.has(i.id))
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true));
  }, [data, filter, locSearch, locResult, workingOnMap]);

  const searchResults = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return [];
    // Only excludes disabled instructors — an on-break instructor typed by
    // name should still be findable (see isDisabled/isBookable comment).
    return allInstructors
      .filter((i) => !isDisabled(i) && i.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allInstructors, filter]);

  const [locCollapsed, setLocCollapsed] = useState(false);

  const compareInstructors = useMemo(() => {
    if (!data) return [];
    return compareIds
      .map((id) => data.instructors.find((i) => i.id === id))
      .filter((i): i is InstructorRow => Boolean(i));
  }, [data, compareIds]);
  const inSelectionMode = compareIds.length > 0;

  const freeSets = useMemo(() => {
    const map = new Map<string, Set<number>>();
    if (!selectedDate || !data) return map;
    for (const instr of data.instructors) {
      if (!isBookable(instr) && !workingOnMap.has(instr.id)) continue;
      map.set(
        instr.id,
        new Set(displayGrid.get(instr.id)?.get(selectedDate) ?? []),
      );
    }
    return map;
  }, [data, selectedDate, workingOnMap, displayGrid]);

  const windowTotals = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    for (const instr of data.instructors) {
      if (!isBookable(instr) && !workingOnMap.has(instr.id)) continue;
      const instrDates = displayGrid.get(instr.id);
      let total = 0;
      for (const d of data.dates) total += instrDates?.get(d)?.length ?? 0;
      map.set(instr.id, total);
    }
    return map;
  }, [data, workingOnMap, displayGrid]);

  const dateTotals = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    for (const d of data.dates) {
      let total = 0;
      for (const instr of data.instructors) {
        if (!isBookable(instr) && !workingOnMap.has(instr.id)) continue;
        total += displayGrid.get(instr.id)?.get(d)?.length ?? 0;
      }
      map.set(d, total);
    }
    return map;
  }, [data, workingOnMap, displayGrid]);

  const sortRoster = useCallback(
    (list: InstructorRow[]): InstructorRow[] => {
      const freeCount = (i: InstructorRow) => freeSets.get(i.id)?.size ?? 0;
      switch (sort) {
        case "alpha":
          return [...list].sort((a, b) => a.name.localeCompare(b.name));
        case "freeAsc":
          return [...list].sort(
            (a, b) =>
              freeCount(a) - freeCount(b) || a.name.localeCompare(b.name),
          );
        default:
          return [...list].sort(
            (a, b) =>
              freeCount(b) - freeCount(a) || a.name.localeCompare(b.name),
          );
      }
    },
    [sort, freeSets],
  );

  const rows = useMemo(() => {
    return sortRoster(visibleInstructors);
  }, [visibleInstructors, sortRoster]);

  const blocksIndex = useMemo(() => {
    const map = new Map<string, Map<string, BlockDetail[]>>();
    if (!data) return map;
    for (const b of data.blocks) {
      let perDate = map.get(b.instructorId);
      if (!perDate) {
        perDate = new Map<string, BlockDetail[]>();
        map.set(b.instructorId, perDate);
      }
      const list = perDate.get(b.date) ?? [];
      list.push(b);
      perDate.set(b.date, list);
    }
    return map;
  }, [data]);

  // Declared here (after instructorsById/blocksIndex, not before) — this
  // needs both in its dependency array, and referencing a const before its
  // own declaration executes throws a ReferenceError (temporal dead zone),
  // not just a lint nit.
  const handleSlotDoubleClick = useCallback(
    (instrId: string, date: string, minute: number) => {
      // Re-verify instructor is still available
      const instr = instructorsById.get(instrId);
      if (
        !instr ||
        instr.enabled === false ||
        (instr.status ?? "active") !== "active"
      ) {
        showSlotNotice("Instructor no longer available.");
        return;
      }

      // Check for existing tentative block on this slot. Tentative blocks
      // are status === "hold" AND isTentative === true (see resolveInfo's
      // own "hold" -> "Tentative" classification above).
      const existingTentative = blocksIndex
        .get(instrId)
        ?.get(date)
        ?.some(
          (b) =>
            b.status === "hold" && b.isTentative && b.startMinute === minute,
        );
      if (existingTentative) {
        showSlotNotice("Tentative block already exists for this slot.");
        return;
      }

      // Validate 1-hour block availability
      const freeGrid = data?.freeGrid ?? null;
      if (!validateOneHourBlock(instrId, date, minute, freeGrid)) {
        showSlotNotice(
          "This 1-hour slot is not fully available. Please select a different time.",
        );
        return;
      }

      const startTime = minutesToTime(minute);
      const endTime = minutesToTime(minute + 60);
      const newSlot: SlotPick = {
        instructorId: instrId,
        instructorName: instr.name,
        date,
        startTime,
        endTime,
      };

      if (addingSlotMode) {
        // Task 19: adding another class to the SAME in-progress batch.
        // customerFormData is untouched — it's owned here, not by the
        // modal, so it survived the modal being hidden while this slot
        // was picked.
        const alreadyInBatch = pendingSlots.some(
          (s) =>
            s.instructorId === instrId &&
            s.date === date &&
            s.startTime === startTime,
        );
        if (alreadyInBatch) {
          showSlotNotice("That slot is already in this booking.");
          setAddingSlotMode(false);
          setTentativeModalOpen(true);
          return;
        }
        setPendingSlots((prev) => [...prev, newSlot]);
        setAddingSlotMode(false);
        setTentativeModalOpen(true);
        return;
      }

      // Fresh booking — reset to a clean single-slot batch and blank
      // customer form (currentUserName, if ever wired up, would seed
      // salesAgent here).
      setOverrideContext(null);
      setPendingSlots([newSlot]);
      setCustomerFormData(DEFAULT_CUSTOMER_FORM());
      setTentativeModalOpen(true);
    },
    [
      data?.freeGrid,
      showSlotNotice,
      instructorsById,
      blocksIndex,
      addingSlotMode,
      pendingSlots,
    ],
  );

  // Fresh re-check of a single pending slot's 1-hour availability, run
  // again right before submit (the grid may have changed since it was
  // added to the batch, possibly minutes ago).
  const validateSlotFresh = useCallback(
    (slot: SlotPick): boolean => {
      const minute = timeToMinutes(slot.startTime);
      return validateOneHourBlock(
        slot.instructorId,
        slot.date,
        minute,
        data?.freeGrid ?? null,
      );
    },
    [data?.freeGrid],
  );

  // Override always replaces the SAME slot the unpaid tentative hold
  // already occupies — for a different, paying learner. No grid picking
  // needed: open the modal immediately for that exact instructor/date/time,
  // with a blank form (this is a new learner, not the same one moving) and
  // paymentStatus pre-set to "half_paid" as a sensible starting point,
  // since the form won't accept "unpaid" in this mode (enforced in
  // TentativeBookingModal, and again server-side in the RPC).
  const handleOverrideClick = useCallback(
    (override: NonNullable<SlotInfo["override"]>) => {
      const instr = instructorsById.get(override.instrId);
      setOverrideContext({
        blockId: override.blockId,
        tentativeDetails: override.tentativeDetails,
      });
      setPendingSlots([
        {
          instructorId: override.instrId,
          instructorName: instr?.name ?? "",
          date: override.date,
          startTime: minutesToTime(override.startMinute),
          endTime: minutesToTime(override.endMinute),
        },
      ]);
      setCustomerFormData({
        ...DEFAULT_CUSTOMER_FORM(),
        paymentStatus: "half_paid",
      });
      setTentativeModalOpen(true);
    },
    [instructorsById],
  );

  const resolveInfo = useMemo(() => {
    const gap = config?.instructor_gap_minutes ?? 0;
    const g = Math.max(0, Math.floor(gap));
    return (
      instrId: string,
      date: string,
      minute: number,
      free: boolean,
    ): SlotInfo => {
      const instr = instructorsById.get(instrId);
      const name = instr?.name ?? "";
      const timeLabel = `${minutesToTime(minute)}–${minutesToTime(minute + (config?.gridMinutes ?? 30))}`;

      const unavail = (instr?.unavailability ?? null) as
        | unknown[]
        | null
        | undefined;
      const weekday = dateToWeekdayLower(date);
      const blockedByUnavail =
        unavail != null && isTimeUnavailable(unavail, date, weekday, minute);
      const unavailReason = () => {
        if (!Array.isArray(unavail)) return "";
        for (const u of unavail) {
          if (!isTimeUnavailable([u], date, weekday, minute)) continue;
          const r = (u as Record<string, unknown>)?.reason;
          if (typeof r === "string" && r.trim()) return r.trim();
        }
        return "";
      };

      if (free) {
        return {
          title: "Free",
          detail: [timeLabel, `Instructor: ${name}`],
          kind: "free",
          override: null,
        };
      }

      const slotLen = config?.gridMinutes ?? 30;
      const blocks = blocksIndex.get(instrId)?.get(date) ?? [];
      let cover: BlockDetail | null = null;
      for (const b of blocks) {
        if (b.status === "cancelled" || b.status === "rejected") continue;
        // Window-overlap check: does this slot's own span
        // [minute, minute + slotLen) overlap the gap-extended booking
        // window [b.startMinute - g, b.endMinute + g)? Comparing only the
        // slot's start minute against a fixed point (the previous
        // `minute + 1`) missed the slot immediately BEFORE a booking
        // whenever the gap is smaller than one grid step — e.g. a 30-min
        // slot ending right at the gap boundary would have its start
        // minute fall just outside `b.startMinute - g`, even though the
        // back half of that same slot is inside the gap and the grid's
        // own free/busy computation (buildFreeGrid, which correctly checks
        // the whole candidate window) already marks it non-free. That
        // mismatch showed up as a buffer slot rendering as generic "Busy"
        // instead of "Buffer for ...".
        if (b.startMinute - g < minute + slotLen && minute < b.endMinute + g) {
          cover = b;
          break;
        }
      }

      if (cover) {
        const blockTime = `${minutesToTime(cover.startMinute)}–${minutesToTime(cover.endMinute)}`;
        const isBuffer =
          minute < cover.startMinute || minute >= cover.endMinute;
        if (cover.status === "booked" || cover.status === "completed") {
          const detail = [blockTime, `Instructor: ${name}`];
          if (cover.learnerName) detail.push(`Learner: ${cover.learnerName}`);
          if (cover.area) detail.push(`Area: ${cover.area}`);
          if (cover.courseName) detail.push(`Course: ${cover.courseName}`);
          return {
            title: isBuffer
              ? `Buffer for ${cover.status === "booked" ? "Booked" : "Completed"} class`
              : cover.status === "booked"
                ? "Booked class"
                : "Completed class",
            detail,
            kind: isBuffer ? "default" : "booked",
            override: null,
          };
        }
        if (cover.status === "pending_payment" || cover.status === "hold") {
          // "hold" + isTentative === true is a genuine Sales tentative
          // block. "pending_payment" (and a "hold" that somehow isn't
          // flagged isTentative) is a real learner-side booking mid
          // payment — not something Sales created, never overridable here,
          // and shown as "booked" (purple), not "tentative" (yellow).
          const isSalesTentative = cover.status === "hold" && cover.isTentative;
          if (!isSalesTentative) {
            return {
              title: isBuffer
                ? "Buffer for Pending Payment slot"
                : "Payment pending",
              detail: isBuffer
                ? [blockTime, `Instructor: ${name}`]
                : [
                    blockTime,
                    `Instructor: ${name}`,
                    "Slot is on hold until payment completes.",
                  ],
              kind: isBuffer ? "default" : "booked",
              override: null,
            };
          }
          if (isBuffer) {
            return {
              title: "Buffer for Tentative slot",
              detail: [blockTime, `Instructor: ${name}`],
              kind: "default",
              override: null,
            };
          }
          // The actual tentative slot itself (not its buffer). Payment
          // status gates both the label and whether override is offered —
          // default to "unpaid" only if the field is missing entirely
          // (shouldn't happen for a real tentative row, but favors
          // showing the override option over silently hiding it).
          const paymentStatus = cover.paymentStatus ?? "unpaid";
          const isUnpaid = paymentStatus === "unpaid";
          return {
            title: isUnpaid ? "🟡 Tentative (Unpaid)" : "Tentative",
            detail: isUnpaid
              ? [
                  blockTime,
                  `Instructor: ${name}`,
                  "Unpaid — can be overridden with a new slot.",
                ]
              : [blockTime, `Instructor: ${name}`],
            kind: "tentative",
            override: isUnpaid
              ? {
                  blockId: cover.id,
                  instrId,
                  date,
                  startMinute: cover.startMinute,
                  endMinute: cover.endMinute,
                  tentativeDetails: cover.rawTentativeDetails,
                }
              : null,
          };
        }
        if (cover.status === "paused") {
          return {
            title: "Paused",
            detail: [
              blockTime,
              `Instructor: ${name}`,
              ...(cover.notes ? [`Reason: ${cover.notes}`] : []),
            ],
            kind: "default",
            override: null,
          };
        }
        return {
          title: cap(cover.status),
          detail: [blockTime, `Instructor: ${name}`],
          kind: "default",
          override: null,
        };
      }

      if (blockedByUnavail) {
        return {
          title: "Unavailable",
          detail: [
            timeLabel,
            `Instructor: ${name}`,
            ...(unavailReason()
              ? [`Reason: ${unavailReason()}`]
              : ["Instructor marked this time unavailable."]),
          ],
          kind: "default",
          override: null,
        };
      }

      return {
        title: "Busy",
        detail: [timeLabel, `Instructor: ${name}`],
        kind: "default",
        override: null,
      };
    };
  }, [config, instructorsById, blocksIndex]);

  const gridRows = useMemo(() => {
    if (compareIds.length === 0) return rows;
    return sortRoster(compareInstructors);
  }, [compareIds, compareInstructors, rows, sortRoster]);

  // Guarantees the timeline (06:00 column onward) always starts exactly
  // where the Instructor column ends, for any name length. The table's own
  // auto column-sizing can't be trusted here: .instructor-cell is a <td>
  // with display: flex (needed for the row-select/Schedule-button/name
  // layout), and browsers don't reliably feed a flex box's true content
  // width back into the table's intrinsic-width algorithm the way they do
  // for a plain table-cell — so a sufficiently long name can render wider
  // than the column the browser decided to allocate, spilling into the
  // first time column. Measuring the actual rendered content width
  // (scrollWidth, which reports the true extent even when it overflows the
  // box) and handing the table an explicit min-width sidesteps that
  // unreliable inference entirely.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cells = root.querySelectorAll<HTMLElement>(".instructor-cell");
    let widest = 0;
    cells.forEach((cell) => {
      if (cell.scrollWidth > widest) widest = cell.scrollWidth;
    });
    if (widest > 0) {
      root.style.setProperty("--instr-col-width", `${widest}px`);
    }
  }, [gridRows]);

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchResults.length > 0)
      toggleRoster(searchResults[0].id);
    if (e.key === "Escape") {
      setSearchOpen(false);
      setFilter("");
    }
  };

  if (phase === "loading") {
    return (
      <div className="sales-dashboard-root" data-theme={theme} ref={rootRef}>
        <main className="shell">
          <p className="state">Loading availability from the database…</p>
        </main>
      </div>
    );
  }

  if (phase === "error" || !data) {
    return (
      <div className="sales-dashboard-root" data-theme={theme} ref={rootRef}>
        <main className="shell">
          <div className="state error">
            <p>
              Couldn&apos;t load availability: {errorMsg ?? "unknown error"}
            </p>
            <button type="button" onClick={() => void reload()}>
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!config) return null;

  const selectedTotal = dateTotals.get(selectedDate) ?? 0;

  const fromLabel = shortDate(dates[0]);
  const toLabel = shortDate(dates[dates.length - 1]);
  const timeCols = timeStarts.map((m) => minutesToTime(m));

  return (
    <div className="sales-dashboard-root" data-theme={theme} ref={rootRef}>
      <main className="shell">
        <header className="topbar">
          <div className="brand">
            <h1>
              <span className="brand-dot" /> Instructor availability
            </h1>
          </div>

          <div className="cal-nav">
            <button
              type="button"
              className="cal-btn chev"
              onClick={goPrev}
              disabled={monthIdx <= 0}
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="cal-month">{monthLabel(activeMonth)}</div>
            <button
              type="button"
              className="cal-btn chev"
              onClick={goNext}
              disabled={monthIdx >= months.length - 1}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="controls">
            <div className="controls-row">
              <select
                className="sort-select"
                value={activeMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setDateIndex(0);
                }}
                aria-label="Select month"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>

              <select
                className="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort instructors"
              >
                <option value="freeDesc">Filter (Most free slots)</option>
                <option value="freeAsc">Filter (Least free slots)</option>
                <option value="alpha">Filter (A → Z)</option>
              </select>

              <div className="search" ref={searchRef}>
                <input
                  type="search"
                  placeholder="Search or compare instructors…"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    setSearchOpen(true);
                    void loadInstructorIndex();
                  }}
                  onKeyDown={onSearchKeyDown}
                  aria-label="Search instructors by name"
                />
                {searchOpen && searchResults.length > 0 && (
                  <ul className="suggest">
                    {searchResults.map((instr) => {
                      const inRoster =
                        data?.instructors.some((i) => i.id === instr.id) ??
                        false;
                      const isLoading =
                        data?.loading.some((i) => i.id === instr.id) ?? false;
                      return (
                        <li
                          key={instr.id}
                          className={
                            inRoster ? "suggest-row added" : "suggest-row"
                          }
                        >
                          <button
                            type="button"
                            className="suggest-main"
                            onClick={() => toggleRoster(instr.id)}
                          >
                            <span className="suggest-name-wrap">
                              <span className="suggest-name">{instr.name}</span>
                              {statusNote(instr) && (
                                <span className="break-badge">
                                  {statusNote(instr)}
                                </span>
                              )}
                            </span>
                            <span className="suggest-btn">
                              {inRoster
                                ? "✓ Added"
                                : isLoading
                                  ? "Loading…"
                                  : "＋ Add"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <button
                type="button"
                className="cal-btn icon-btn"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                aria-label="Toggle dark theme"
                title="Toggle dark theme"
              >
                {theme === "dark" ? "☀" : "☾"}
              </button>
              <button
                type="button"
                className="reset-dash"
                onClick={resetDashboard}
                aria-label="Reset dashboard"
                title="Reset filters, search and selection"
              >
                ↺ Reset
              </button>
              <button
                type="button"
                className="cal-btn icon-btn"
                onClick={() => setHelpOpen(true)}
                aria-label="Help"
                title="How to use this dashboard"
              >
                ?
              </button>
            </div>
          </div>
        </header>

        <Suspense fallback={null}>
          <LocationSearch
            zones={kmlZones}
            zonesError={kmlError}
            status={locStatus}
            resultLabel={locSearch?.label ?? null}
            point={
              locSearch ? { lat: locSearch.lat, lng: locSearch.lng } : null
            }
            matchedNames={locResult?.zones ?? []}
            via={locResult?.via ?? "none"}
            zoneInfo={locResult?.zoneInfo ?? {}}
            onLocate={(lat, lng, label) => setLocSearch({ lat, lng, label })}
            onClear={clearLocation}
            collapsed={locCollapsed}
            onToggleCollapsed={() => setLocCollapsed((c) => !c)}
          />
        </Suspense>

        <div className="summary">
          {!locCollapsed && locSearch && (
            <div className="loc-results">
              <span className="loc-results-count">
                {locStatus === "found" ? (
                  <>
                    <strong>{locResult?.instrs.length ?? 0}</strong> instructor
                    {(locResult?.instrs.length ?? 0) === 1 ? "" : "s"} near “
                    {locSearch.label}”
                  </>
                ) : (
                  <>No instructor covers “{locSearch.label}” yet.</>
                )}
              </span>
              {locResult && locResult.instrs.length > 0 && (
                <div className="loc-results-chips">
                  {locResult.instrs.map((instr) => {
                    const added = compareIds.includes(instr.id);
                    const rawZones = Object.values(locResult.zoneInfo)
                      .filter((z) => z.instructorName === instr.name)
                      .map((z) => z.rawName);
                    return (
                      <button
                        key={instr.id}
                        type="button"
                        className={added ? "loc-chip added" : "loc-chip"}
                        title={
                          rawZones.length
                            ? `Zone on map: ${rawZones.join(", ")}`
                            : undefined
                        }
                        onClick={() =>
                          added
                            ? removeFromCompare(instr.id)
                            : addToCompare(instr.id)
                        }
                      >
                        <span
                          className="loc-swatch"
                          style={{
                            background: locResult.instrColors[instr.id],
                          }}
                          title={`${instr.name}’s zone colour on the map`}
                        />
                        {`${instr.name} · ${freeSets.get(instr.id)?.size ?? 0} free`}
                        {statusNote(instr) && (
                          <span className="break-badge">
                            {statusNote(instr)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                className="clear-select"
                onClick={clearLocation}
              >
                Clear location
              </button>
            </div>
          )}
          {inSelectionMode ? (
            <>
              Comparing <strong>{gridRows.length}</strong> instructor
              {gridRows.length === 1 ? "" : "s"} ·{" "}
              <strong>{selectedTotal}</strong> free slots on {fromLabel.weekday}{" "}
              {fromLabel.date}
              <button
                type="button"
                className="clear-select"
                onClick={() => setCompareIds([])}
              >
                Clear selection
              </button>
            </>
          ) : rows.length === 0 ? (
            <>
              No instructors loaded yet — search by name above or use{" "}
              <strong>Search by location</strong> to load them.
            </>
          ) : (
            <>
              <strong>{rows.length}</strong> instructor
              {rows.length === 1 ? "" : "s"} shown ·{" "}
              <strong>{selectedTotal}</strong> free slots · {fromLabel.weekday}{" "}
              {fromLabel.date} → {toLabel.weekday} {toLabel.date} window
            </>
          )}
        </div>

        <nav className="tabs" aria-label="Select date">
          {visibleDates.map((d, i) => {
            const { weekday, day } = shortDate(d);
            const total = dateTotals.get(d) ?? 0;
            return (
              <button
                type="button"
                key={d}
                className={i === safeDateIndex ? "tab active" : "tab"}
                onClick={() => setDateIndex(i)}
              >
                <span>{weekday}</span>
                <strong>{day}</strong>
                <em>{total} free</em>
              </button>
            );
          })}
        </nav>

        <div
          className={
            addingSlotMode ? "grid-wrap grid-wrap-picking" : "grid-wrap"
          }
          ref={gridWrapRef}
        >
          <AvailabilityGrid
            instructors={gridRows}
            freeGrid={displayGrid}
            freeSets={freeSets}
            windowTotals={windowTotals}
            timeCols={timeCols}
            timeStarts={timeStarts}
            dates={dates}
            selectedDate={selectedDate}
            gridMinutes={config.gridMinutes}
            expanded={expanded}
            selectedRows={selectedRows}
            rowColors={rowColors}
            loadingRows={data?.loading ?? []}
            onToggleExpand={toggleExpand}
            onToggleSelectRow={toggleSelectRow}
            onRemove={inSelectionMode ? removeFromCompare : removeInstructor}
            onDoubleClick={handleSlotDoubleClick}
            onOverrideClick={handleOverrideClick}
            resolveInfo={resolveInfo}
          />
          {gridRows.length === 0 && !locSearch && (
            <p className="empty">
              No instructors loaded yet. Search by name above or use Search by
              location.
            </p>
          )}
          {gridRows.length === 0 && locSearch && (
            <p className="empty">
              No instructors match this location. Try another area.
            </p>
          )}
        </div>

        <footer className="legend">
          <span>
            <i className="swatch free" /> Free slot (no class, not on
            unavailability, outside the {config.instructor_gap_minutes}-minute
            travel gap)
          </span>
          <span>
            <i className="swatch tentative" /> 🟡 Tentative (unpaid can be
            overridden)
          </span>
          <span>
            <i className="swatch booked" /> 🟣 Booked
          </span>
          <span>
            <i className="swatch busy" /> Busy / other
          </span>
          <button
            type="button"
            className="reload"
            onClick={() => void reload()}
          >
            Refresh
          </button>
        </footer>

        {helpOpen && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- standard click-outside-to-dismiss backdrop; the modal itself has role="dialog" and a visible close button
          <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions -- stops the backdrop's dismiss click from bubbling; the modal itself has role="dialog" and a visible close button */}
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-label="How to use this dashboard"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>How to use this dashboard</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setHelpOpen(false)}
                  aria-label="Close help"
                >
                  ×
                </button>
              </div>

              <div className="help-section">
                <h3>What this page shows</h3>
                <p>
                  Live availability from the sales database: which of{" "}
                  {rows.length} active instructors can take a new learner in
                  each 30-minute slot, across {dates.length} days from{" "}
                  {fromLabel.weekday} {fromLabel.date}.
                </p>
              </div>

              <div className="help-section">
                <h3>Pick a month</h3>
                <ul>
                  <li>
                    Use the ‹ and › arrows beside the month name to step one
                    month at a time.
                  </li>
                  <li>
                    The month selector on the right jumps straight to any
                    visible month.
                  </li>
                  <li>The arrows stop at the start and end of the window.</li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Pick a date</h3>
                <ul>
                  <li>
                    Each tab is one date: weekday, day number, and total free
                    slots for that day.
                  </li>
                  <li>
                    Click a tab to view that date. The active day shows a blue
                    circle.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Filter the instructor list</h3>
                <ul>
                  <li>
                    The Filter select reorders instructors using the selected
                    date.
                  </li>
                  <li>
                    Most free slots first, least free slots first, or
                    alphabetical A to Z.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Search and compare instructors</h3>
                <ul>
                  <li>
                    Type a name to search; results drop down below the field.
                  </li>
                  <li>
                    Click + Compare (or press Enter for the top result) to pin
                    an instructor.
                  </li>
                  <li>
                    While comparing, the grid shows only the pinned instructors.
                  </li>
                  <li>
                    Remove one with the small ×, or reset with Clear selection.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Search by location</h3>
                <ul>
                  <li>
                    Below the search box, type an area or address (e.g.
                    Koramangala, Bangalore).
                  </li>
                  <li>
                    Pick a suggestion or press Search; the map shows the
                    matching coverage zones.
                  </li>
                  <li>
                    The grid narrows to instructors who work in that location.
                    Click a name chip to pin instructor(s) for comparison.
                  </li>
                  <li>
                    Clear location or ↺ Reset to go back to the full roster.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Read the grid</h3>
                <ul>
                  <li>Columns are 30-minute slots; rows are instructors.</li>
                  <li>
                    <strong>🟢 Green</strong> = free: no class, no time off,
                    enough travel time.
                  </li>
                  <li>
                    <strong>🟡 Yellow</strong> = tentative (created from this
                    dashboard) — unpaid, half paid, or full paid.
                  </li>
                  <li>
                    <strong>🟣 Purple</strong> = booked, completed, or a real
                    learner booking mid-payment — a confirmed class, never
                    editable from here.
                  </li>
                  <li>
                    Plain/unshaded = paused, unavailable, or a travel-gap buffer
                    around another slot.
                  </li>
                  <li>
                    <strong>Hover</strong> any slot for full details: status,
                    time, instructor, and — for a booked class — learner, area,
                    and course when known.
                  </li>
                  <li>
                    A {config.instructor_gap_minutes}-minute travel gap around
                    classes is applied, so green slots are safe to assign.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Create a tentative booking</h3>
                <ul>
                  <li>
                    <strong>Double-click</strong> any green (free) slot to open
                    the booking form for that 1-hour block.
                  </li>
                  <li>
                    Fill in the customer&apos;s name, phone, sales agent,
                    payment status, address, and course, then submit.
                  </li>
                  <li>
                    This always creates a <strong>tentative</strong> hold (shown
                    yellow) — it is never a confirmed/booked class. Operations
                    verifies the customer and converts valid tentative slots to
                    confirmed bookings separately.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Book multiple classes in one go</h3>
                <ul>
                  <li>
                    While the booking form is open, click{" "}
                    <strong>+ Add another class</strong> instead of submitting —
                    useful for a customer buying a course of several classes at
                    once.
                  </li>
                  <li>
                    The form hides and the grid gets a pulsing yellow border:{" "}
                    <strong>double-click the next free slot</strong> (any
                    date/instructor) to add it. The form reopens with that class
                    added — your name/phone/agent/course entries are kept,
                    nothing is lost.
                  </li>
                  <li>
                    Repeat for as many classes as needed. Each one appears in a
                    &quot;Selected Slots&quot; list with a × to remove it (the
                    last remaining slot can&apos;t be removed — use Cancel
                    instead).
                  </li>
                  <li>
                    Submitting creates all selected classes together as
                    tentative holds. If any one of them is no longer available
                    by the time you submit, the form tells you exactly which
                    class and creates none of them — so you never end up with a
                    half-created batch.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Override an unpaid tentative slot</h3>
                <ul>
                  <li>
                    Hover a <strong>yellow</strong> slot. If its payment status
                    is <strong>unpaid</strong>, the popover shows{" "}
                    <strong>🟡 Tentative (Unpaid)</strong> with an{" "}
                    <strong>Override Slot</strong> button.
                  </li>
                  <li>
                    Half-paid and full-paid tentative slots show plainly as{" "}
                    <strong>Tentative</strong> with no override option — once
                    any payment has been collected, that slot is protected and
                    can&apos;t be taken from this dashboard.
                  </li>
                  <li>
                    Clicking <strong>Override Slot</strong> opens the booking
                    form immediately for that <strong>same</strong> slot — no
                    need to pick a different time. This is for handing an unpaid
                    hold to a new, paying learner, not moving the existing
                    customer elsewhere.
                  </li>
                  <li>
                    Fill in the <strong>new</strong> learner&apos;s details.
                    Payment Status only offers <strong>Half Paid</strong> or{" "}
                    <strong>Full Paid</strong> — a new unpaid hold can&apos;t
                    override an existing one, so &quot;Unpaid&quot; isn&apos;t
                    an option here.
                  </li>
                  <li>
                    Submitting releases the old unpaid hold and creates a new
                    tentative slot (still tentative, never directly booked) for
                    the new learner at the same time. This is re-checked on the
                    server, not just here — if the old slot was paid or changed
                    by someone else in the meantime, the override is rejected
                    and the original booking stays exactly as it was.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>View an instructor&apos;s full schedule</h3>
                <ul>
                  <li>
                    Click an instructor&apos;s name or the Schedule button to
                    open their day-by-day timetable across all dates.
                  </li>
                  <li>
                    Each day shows its free-slot count; the highlighted row is
                    the currently selected date.
                  </li>
                  <li>
                    Click the name or Hide schedule to collapse the timetable.
                  </li>
                </ul>
              </div>

              <div className="help-section">
                <h3>Refresh and legend</h3>
                <ul>
                  <li>Bottom-right Refresh fetches the latest data.</li>
                  <li>The legend explains the slot colors used in the grid.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Tentative Booking Modal */}
      <TentativeBookingModal
        isOpen={tentativeModalOpen}
        onClose={handleCloseTentativeModal}
        onSuccess={handleTentativeSuccess}
        slots={pendingSlots}
        onRemoveSlot={handleRemoveSlot}
        onAddAnotherSlot={handleAddAnotherSlot}
        validateSlot={validateSlotFresh}
        formData={customerFormData}
        onFormDataChange={setCustomerFormData}
        overrideContext={overrideContext}
      />

      {/* Persistent banner while picking an additional class for an
          in-progress multi-class booking (Task 19) — the modal is
          hidden (not closed: pendingSlots/customerFormData are untouched)
          until a new slot is double-clicked or this is cancelled. */}
      {addingSlotMode && (
        <div className="slot-toast slot-toast-info" role="status">
          <span className="slot-toast-icon" aria-hidden="true">
            ➕
          </span>
          <span className="slot-toast-msg">
            <strong>👉 Pick the next class now:</strong> double-click any green
            (free) cell on the highlighted grid below to add it to this booking.
            The form isn&apos;t closed — it will reopen with your selection
            added.
          </span>
          <button
            type="button"
            className="slot-toast-close"
            aria-label="Cancel adding another class"
            onClick={cancelAddingSlot}
          >
            ×
          </button>
        </div>
      )}

      {/* Themed in-app notice, replaces the native browser alert() for
          slot-validation feedback (e.g. "not fully available"). */}
      {slotNotice && (
        <div className="slot-toast" role="alert">
          <span className="slot-toast-icon" aria-hidden="true">
            ⚠
          </span>
          <span className="slot-toast-msg">{slotNotice}</span>
          <button
            type="button"
            className="slot-toast-close"
            aria-label="Dismiss notice"
            onClick={() => {
              if (slotNoticeTimerRef.current)
                clearTimeout(slotNoticeTimerRef.current);
              setSlotNotice(null);
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function useOutsideClick(
  ref: RefObject<HTMLDivElement | null>,
  onOutside: () => void,
) {
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [ref, onOutside]);
}
