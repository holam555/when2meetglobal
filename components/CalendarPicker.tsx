"use client";
import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  addDays,
} from "date-fns";

const MAX = 14;

export function CalendarPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(today);

  const cells = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const out: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }, [cursor]);

  const valueSet = new Set(value);

  function toggle(d: Date) {
    if (isBefore(d, today)) return;
    const key = format(d, "yyyy-MM-dd");
    const next = new Set(value);
    if (next.has(key)) next.delete(key);
    else {
      if (next.size >= MAX) return;
      next.add(key);
    }
    onChange(Array.from(next).sort());
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="p-1.5 hover:bg-surface2 rounded text-mute hover:text-ink transition"
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
        </button>
        <div className="font-serif text-xl">{format(cursor, "MMMM yyyy")}</div>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="p-1.5 hover:bg-surface2 rounded text-mute hover:text-ink transition"
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-mute mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const isSel = valueSet.has(key);
          const inMonth = isSameMonth(d, cursor);
          const isPast = isBefore(d, today) && !isSameDay(d, today);
          const isToday = isSameDay(d, today);
          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              onClick={() => toggle(d)}
              className={[
                "aspect-square text-sm transition",
                "rounded-md",
                isPast ? "text-mute/30 cursor-not-allowed" : "hover:bg-surface2",
                !inMonth && !isPast ? "text-mute/50" : "",
                isSel
                  ? "bg-amber text-bg font-medium hover:bg-amber"
                  : isToday
                  ? "ring-1 ring-amber/50 text-ink"
                  : "",
              ].join(" ")}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-mute flex justify-between">
        <span>{value.length} of {MAX} selected</span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="hover:text-ink transition">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
