import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { MatrixInstructor } from "@/queries/instructorMatrix";

interface Props {
  instructors: MatrixInstructor[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// Typeahead that lets the admin pick several instructors as chips. When any are
// selected the matrix shows only those; with none selected it shows everyone.
export function InstructorMultiSelect({
  instructors,
  selectedIds,
  onChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedInstructors = useMemo(
    () => instructors.filter((i) => selectedSet.has(i.id)),
    [instructors, selectedSet],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instructors
      .filter((i) => !selectedSet.has(i.id))
      .filter(
        (i) =>
          !q || `${i.name ?? ""} ${i.phone ?? ""}`.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [instructors, selectedSet, query]);

  // Dismiss the dropdown on any click outside the control.
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const add = (id: string) => {
    onChange([...selectedIds, id]);
    setQuery("");
    setOpen(true); // stay open to add more
  };
  const remove = (id: string) =>
    onChange(selectedIds.filter((x) => x !== id));

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div
        className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        {selectedInstructors.map((i) => (
          <Badge key={i.id} variant="secondary" className="gap-1 pr-1">
            {i.name}
            <button
              type="button"
              aria-label={`Remove ${i.name}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(i.id);
              }}
              className="rounded-full hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            selectedInstructors.length ? "Add another…" : "Search instructors…"
          }
          className="min-w-[7rem] flex-1 bg-transparent px-1 text-sm outline-none"
        />
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
              setQuery("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {suggestions.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => add(i.id)}
              className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span className="font-medium">{i.name}</span>
              {i.phone && (
                <span className="text-[11px] text-muted-foreground">
                  {i.phone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
