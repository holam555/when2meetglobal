"use client";
import { useEffect, useMemo, useRef } from "react";
import { format, parseISO } from "date-fns";
import type { AvailabilityStatus } from "@/lib/types";
import { groupSlotsByLocalDate, localDateKey, localTimeOfDay } from "@/lib/timezone";

export type EditorMode = "free" | "maybe";

export function AvailabilityGrid({
  utcSlots,
  viewerTz,
  value,
  onChange,
  mode,
}: {
  utcSlots: string[];
  viewerTz: string;
  value: Record<string, AvailabilityStatus>;
  onChange: (next: Record<string, AvailabilityStatus>) => void;
  mode: EditorMode;
}) {
  const { dates, rowKeys } = useMemo(
    () => groupSlotsByLocalDate(utcSlots, viewerTz),
    [utcSlots, viewerTz]
  );

  // Build lookup: dateKey + timeKey -> utcStart
  const lookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const iso of utcSlots) {
      const k = `${localDateKey(iso, viewerTz)}|${localTimeOfDay(iso, viewerTz)}`;
      m.set(k, iso);
    }
    return m;
  }, [utcSlots, viewerTz]);

  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    paintStatus: AvailabilityStatus;
    touched: Set<string>;
  }>({ active: false, paintStatus: "busy", touched: new Set() });

  function cycleStatus(curr: AvailabilityStatus): AvailabilityStatus {
    if (mode === "free") {
      return curr === "free" ? "busy" : "free";
    }
    return curr === "maybe" ? "busy" : "maybe";
  }

  function applyPaint(utc: string, status: AvailabilityStatus) {
    if (value[utc] === status || (!value[utc] && status === "busy")) return;
    const next = { ...value };
    if (status === "busy") delete next[utc];
    else next[utc] = status;
    onChange(next);
  }

  function getSlotFromPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    const cell = el.closest("[data-utc]") as HTMLElement | null;
    if (!cell) return null;
    return cell.getAttribute("data-utc");
  }

  function onPointerDown(e: React.PointerEvent) {
    const target = (e.target as HTMLElement).closest("[data-utc]") as HTMLElement | null;
    if (!target) return;
    const utc = target.getAttribute("data-utc")!;
    const curr = value[utc] ?? "busy";
    const nextStatus = cycleStatus(curr);
    dragRef.current = {
      active: true,
      paintStatus: nextStatus,
      touched: new Set([utc]),
    };
    applyPaint(utc, nextStatus);
    gridRef.current?.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const utc = getSlotFromPoint(e.clientX, e.clientY);
    if (!utc || dragRef.current.touched.has(utc)) return;
    dragRef.current.touched.add(utc);
    applyPaint(utc, dragRef.current.paintStatus);
  }

  function onPointerUp() {
    dragRef.current.active = false;
  }

  useEffect(() => {
    const up = () => (dragRef.current.active = false);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div className="overflow-x-auto scrollbar-thin -mx-1 px-1">
      <div
        ref={gridRef}
        className="inline-block no-select touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `48px repeat(${dates.length}, minmax(56px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="sticky left-0 bg-bg z-10" />
          {dates.map((d) => (
            <div key={d} className="text-center pb-2 px-1">
              <div className="text-xs text-mute uppercase tracking-wide">
                {format(parseISO(d), "EEE")}
              </div>
              <div className="text-base font-serif">{format(parseISO(d), "MMM d")}</div>
            </div>
          ))}

          {/* Rows */}
          {rowKeys.map((timeKey, rIdx) => {
            const showLabel = timeKey.endsWith(":00");
            return (
              <RowFragment
                key={timeKey}
                timeKey={timeKey}
                showLabel={showLabel}
                isLast={rIdx === rowKeys.length - 1}
                dates={dates}
                lookup={lookup}
                value={value}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RowFragment({
  timeKey,
  showLabel,
  isLast,
  dates,
  lookup,
  value,
}: {
  timeKey: string;
  showLabel: boolean;
  isLast: boolean;
  dates: string[];
  lookup: Map<string, string>;
  value: Record<string, AvailabilityStatus>;
}) {
  return (
    <>
      <div
        className={`sticky left-0 bg-bg text-xs text-mute pr-2 text-right ${
          showLabel ? "" : "opacity-0"
        }`}
        style={{ height: 22 }}
      >
        {showLabel ? formatHourLabel(timeKey) : ""}
      </div>
      {dates.map((d) => {
        const utc = lookup.get(`${d}|${timeKey}`);
        if (!utc) {
          return <div key={d + timeKey} className="bg-transparent" style={{ height: 22 }} />;
        }
        const s = value[utc] ?? "busy";
        return (
          <Cell key={utc} utc={utc} status={s} showLabel={showLabel} isLast={isLast} />
        );
      })}
    </>
  );
}

function formatHourLabel(timeKey: string): string {
  const [h] = timeKey.split(":").map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${am ? "a" : "p"}`;
}

function Cell({
  utc,
  status,
  showLabel,
  isLast,
}: {
  utc: string;
  status: AvailabilityStatus;
  showLabel: boolean;
  isLast: boolean;
}) {
  let cls = "border-r border-border/60";
  if (showLabel) cls += " border-t border-border";
  if (isLast) cls += " border-b border-border";
  if (status === "free") cls += " bg-amber";
  else if (status === "maybe")
    cls += " bg-amber-deep/70 border-dashed";
  else cls += " bg-surface hover:bg-surface2";

  return (
    <div
      data-utc={utc}
      className={`transition-colors ${cls}`}
      style={{ height: 22 }}
    />
  );
}
