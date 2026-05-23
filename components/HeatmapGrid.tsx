"use client";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { ResponseDoc } from "@/lib/types";
import { groupSlotsByLocalDate, localDateKey, localTimeOfDay, formatLocalFull } from "@/lib/timezone";
import { tallySlots, type SlotTally } from "@/lib/scoring";
import { useTheme } from "./ThemeToggle";

export function HeatmapGrid({
  utcSlots,
  viewerTz,
  responses,
  highlightUtc,
  onPickSlot,
}: {
  utcSlots: string[];
  viewerTz: string;
  responses: ResponseDoc[];
  highlightUtc?: string;
  onPickSlot?: (utc: string) => void;
}) {
  const { dates, rowKeys } = useMemo(
    () => groupSlotsByLocalDate(utcSlots, viewerTz),
    [utcSlots, viewerTz]
  );
  const lookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const iso of utcSlots) {
      m.set(`${localDateKey(iso, viewerTz)}|${localTimeOfDay(iso, viewerTz)}`, iso);
    }
    return m;
  }, [utcSlots, viewerTz]);

  const tallies = useMemo(() => tallySlots(utcSlots, responses), [utcSlots, responses]);
  const maxFree = responses.length;
  const palette = useHeatPalette();

  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto scrollbar-thin -mx-1 px-1 relative">
      <div className="inline-block no-select">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `48px repeat(${dates.length}, minmax(56px, 1fr))`,
          }}
        >
          <div className="sticky left-0 bg-bg z-10" />
          {dates.map((d) => (
            <div key={d} className="text-center pb-2 px-1">
              <div className="text-xs text-mute uppercase tracking-wide">
                {format(parseISO(d), "EEE")}
              </div>
              <div className="text-base font-serif">{format(parseISO(d), "MMM d")}</div>
            </div>
          ))}
          {rowKeys.map((timeKey, rIdx) => {
            const showLabel = timeKey.endsWith(":00");
            return (
              <RowFrag
                key={timeKey}
                timeKey={timeKey}
                showLabel={showLabel}
                isLast={rIdx === rowKeys.length - 1}
                dates={dates}
                lookup={lookup}
                tallies={tallies}
                maxFree={maxFree}
                palette={palette}
                highlightUtc={highlightUtc}
                onHover={setHover}
                onPick={onPickSlot}
              />
            );
          })}
        </div>
      </div>
      {hover && tallies[hover] && (
        <HoverCard tally={tallies[hover]} viewerTz={viewerTz} />
      )}
    </div>
  );
}

function RowFrag({
  timeKey,
  showLabel,
  isLast,
  dates,
  lookup,
  tallies,
  maxFree,
  palette,
  highlightUtc,
  onHover,
  onPick,
}: {
  timeKey: string;
  showLabel: boolean;
  isLast: boolean;
  dates: string[];
  lookup: Map<string, string>;
  tallies: Record<string, SlotTally>;
  maxFree: number;
  palette: HeatPalette;
  highlightUtc?: string;
  onHover: (s: string | null) => void;
  onPick?: (utc: string) => void;
}) {
  return (
    <>
      <div
        className={`sticky left-0 bg-bg text-xs text-mute pr-2 text-right ${
          showLabel ? "" : "opacity-0"
        }`}
        style={{ height: 22 }}
      >
        {showLabel ? hLabel(timeKey) : ""}
      </div>
      {dates.map((d) => {
        const utc = lookup.get(`${d}|${timeKey}`);
        if (!utc) return <div key={d + timeKey} style={{ height: 22 }} />;
        const t = tallies[utc];
        const intensity = maxFree === 0 ? 0 : t.freeNames.length / maxFree;
        const maybeFrac = maxFree === 0 ? 0 : t.maybeNames.length / maxFree;
        const bg = mixHeat(intensity, maybeFrac, palette);
        const isHi = utc === highlightUtc;
        return (
          <div
            key={utc}
            onMouseEnter={() => onHover(utc)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onPick?.(utc)}
            className={`border-r border-border/60 ${showLabel ? "border-t border-border" : ""} ${
              isLast ? "border-b border-border" : ""
            } ${isHi ? "ring-2 ring-amber" : ""} cursor-pointer transition-colors`}
            style={{ height: 22, background: bg }}
          />
        );
      })}
    </>
  );
}

function hLabel(timeKey: string): string {
  const [h] = timeKey.split(":").map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${am ? "a" : "p"}`;
}

type HeatPalette = { base: number[]; peak: number[]; maybe: number[] };

function mixHeat(freeFrac: number, maybeFrac: number, p: HeatPalette): string {
  const base = lerpColor(p.base, p.peak, freeFrac);
  const maybeWeight = Math.min(0.5, maybeFrac * 0.5);
  const out = lerpColor(base, p.maybe, maybeWeight);
  return `rgb(${out[0]}, ${out[1]}, ${out[2]})`;
}

function lerpColor(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function readVar(name: string): number[] {
  if (typeof window === "undefined") return [0, 0, 0];
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/\s+/).map((n) => Number(n));
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) return parts;
  return [0, 0, 0];
}

function useHeatPalette(): HeatPalette {
  const [theme] = useTheme();
  const [pal, setPal] = useState<HeatPalette>({
    base: [28, 25, 23],
    peak: [245, 158, 11],
    maybe: [133, 77, 14],
  });
  useEffect(() => {
    setPal({
      base: readVar("--c-heat-base"),
      peak: readVar("--c-heat-peak"),
      maybe: readVar("--c-heat-maybe"),
    });
  }, [theme]);
  return pal;
}

function HoverCard({ tally, viewerTz }: { tally: SlotTally; viewerTz: string }) {
  return (
    <div className="hidden md:block absolute top-2 right-2 z-20 bg-surface border border-border rounded-md p-3 shadow-xl max-w-xs">
      <div className="text-sm font-serif mb-1">{formatLocalFull(tally.utcStart, viewerTz)}</div>
      <div className="text-xs text-mute mb-2">Score {tally.score}</div>
      <Group label="Free" names={tally.freeNames} color="text-amber" />
      <Group label="Maybe" names={tally.maybeNames} color="text-amber-deep" />
      <Group label="Busy" names={tally.busyNames} color="text-mute" />
    </div>
  );
}

function Group({ label, names, color }: { label: string; names: string[]; color: string }) {
  if (names.length === 0) return null;
  return (
    <div className="text-xs mb-1">
      <span className={`${color} font-medium`}>{label}: </span>
      <span className="text-ink/80">{names.join(", ")}</span>
    </div>
  );
}
