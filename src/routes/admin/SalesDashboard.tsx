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
import { TentativeBookingModal } from "@/components/admin/sales-dashboard/TentativeBookingModal";
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
} from "@/lib/sales-dashboard/validation";

const LocationSearch = lazy(
  () => import("@/components/admin/sales-dashboard/LocationSearch"),
);

interface SlotInfo {
  title: string;
  detail: string[];
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
  resolveInfo,
}: SlotCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const info = isHovered ? resolveInfo(instrId, date, minute, free) : null;
  const cls = [
    free
      ? canBook1Hour === false
        ? "cell cell-free cell-half"
        : "cell cell-free"
      : band
        ? "cell cell-band"
        : "cell",
  ];
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
      {info && (
        <div className="slot-pop">
          <div className={free ? "pop-title free" : "pop-title busy"}>
            {info.title}
          </div>
          {info.detail.map((line, i) => (
            <div key={i} className="pop-line">
              {line}
            </div>
          ))}
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
  const [tentativeSlotData, setTentativeSlotData] = useState<{
    instructorId: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const slotNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSlotNotice = useCallback((message: string) => {
    if (slotNoticeTimerRef.current) clearTimeout(slotNoticeTimerRef.current);
    setSlotNotice(message);
    slotNoticeTimerRef.current = setTimeout(() => setSlotNotice(null), 4000);
  }, []);

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

      // Check for existing tentative block on this slot
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

      // Set modal data and open
      const startTime = minutesToTime(minute);
      const endTime = minutesToTime(minute + 60);
      setTentativeSlotData({ instructorId: instrId, date, startTime, endTime });
      setTentativeModalOpen(true);
    },
    [data?.freeGrid, showSlotNotice, instructorsById, blocksIndex],
  );

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
        };
      }

      const blocks = blocksIndex.get(instrId)?.get(date) ?? [];
      let cover: BlockDetail | null = null;
      for (const b of blocks) {
        if (b.status === "cancelled" || b.status === "rejected") continue;
        if (b.startMinute - g < minute + 1 && minute < b.endMinute + g) {
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
          };
        }
        if (cover.status === "pending_payment" || cover.status === "hold") {
          return {
            title: "Payment pending",
            detail: [
              blockTime,
              `Instructor: ${name}`,
              "Slot is on hold until payment completes.",
            ],
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
          };
        }
        return {
          title: cap(cover.status),
          detail: [blockTime, `Instructor: ${name}`],
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
        };
      }

      return { title: "Busy", detail: [timeLabel, `Instructor: ${name}`] };
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

        <div className="grid-wrap">
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
            <i className="swatch busy" /> Busy / booked
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
                    Green means the slot is free: no class, no time off, and
                    enough travel time.
                  </li>
                  <li>
                    Click any slot to open details: Free, Booked class, Payment
                    pending, Paused, Unavailable or Busy.
                  </li>
                  <li>
                    Booked slots show the learner, area and course when known.
                  </li>
                  <li>
                    A {config.instructor_gap_minutes}-minute travel gap around
                    classes is applied, so green slots are safe to assign.
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
        onClose={() => {
          setTentativeModalOpen(false);
          setTentativeSlotData(null);
        }}
        onSuccess={() => {
          reload();
        }}
        data={tentativeSlotData}
      />

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
