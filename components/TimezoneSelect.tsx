"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { listAllTimezones, tzAbbreviation } from "@/lib/timezone";

export function TimezoneSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (tz: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const all = useMemo(() => listAllTimezones(), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 80);
    return all
      .filter((tz) => tz.toLowerCase().includes(q) || tz.replace(/_/g, " ").toLowerCase().includes(q))
      .slice(0, 80);
  }, [all, query]);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-3 py-2.5 bg-surface border border-border hover:border-mute transition rounded-md flex items-center justify-between gap-2"
      >
        <span className="truncate">
          <span className="text-ink">{value.replace(/_/g, " ")}</span>
          <span className="text-mute ml-2 text-sm">{tzAbbreviation(value)}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-mute shrink-0">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-surface border border-border rounded-md shadow-xl overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search timezone…"
            className="w-full px-3 py-2 bg-surface2 border-b border-border outline-none text-sm placeholder:text-mute"
          />
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {filtered.map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => {
                  onChange(tz);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface2 flex items-center justify-between ${
                  tz === value ? "text-amber" : "text-ink"
                }`}
              >
                <span className="truncate">{tz.replace(/_/g, " ")}</span>
                <span className="text-mute text-xs ml-2">{tzAbbreviation(tz)}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-mute text-sm">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
