"use client";
import type { ResponseDoc } from "@/lib/types";
import type { SlotTally } from "@/lib/scoring";
import { formatLocalFull, tzAbbreviation } from "@/lib/timezone";

export function BestSlotCard({
  top,
  viewerTz,
  totalResponses,
  onConfirm,
  isOrganizer,
  confirmedSlot,
  onPickSlot,
  highlightUtc,
}: {
  top: SlotTally[];
  viewerTz: string;
  totalResponses: number;
  responses: ResponseDoc[];
  onConfirm?: (utc: string | null) => void;
  isOrganizer?: boolean;
  confirmedSlot?: string;
  onPickSlot?: (utc: string) => void;
  highlightUtc?: string;
}) {
  if (top.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="text-mute text-sm">
          No overlapping availability yet. Share the link to collect responses.
        </div>
      </div>
    );
  }

  const best = top[0];

  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-mute mb-1">Best slot</div>
        <div className="font-serif text-2xl md:text-3xl leading-tight">
          {formatLocalFull(best.utcStart, viewerTz)}{" "}
          <span className="text-mute text-base">{tzAbbreviation(viewerTz, new Date(best.utcStart))}</span>
        </div>
        <div className="text-sm text-mute mt-1">
          Works for {best.freeNames.length} of {totalResponses}
          {best.maybeNames.length > 0 && ` · ${best.maybeNames.length} maybe`}
          {best.businessHoursBonus && " · business hours for everyone"}
        </div>
      </div>

      {top.length > 1 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {top.slice(1).map((t) => (
            <button
              key={t.utcStart}
              onClick={() => onPickSlot?.(t.utcStart)}
              className={`text-left p-3 rounded-md border transition ${
                highlightUtc === t.utcStart
                  ? "border-amber bg-surface2"
                  : "border-border hover:border-mute bg-surface2/40"
              }`}
            >
              <div className="font-serif text-base">
                {formatLocalFull(t.utcStart, viewerTz)}
              </div>
              <div className="text-xs text-mute mt-0.5">
                {t.freeNames.length} free
                {t.maybeNames.length > 0 && ` · ${t.maybeNames.length} maybe`}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOrganizer && (
        <div className="pt-2 border-t border-border flex items-center gap-3 flex-wrap">
          {confirmedSlot ? (
            <>
              <div className="text-sm">
                <span className="text-amber">Confirmed:</span>{" "}
                <span className="font-serif">{formatLocalFull(confirmedSlot, viewerTz)}</span>
              </div>
              <button
                onClick={() => onConfirm?.(null)}
                className="text-xs text-mute hover:text-ink underline"
              >
                Unlock
              </button>
            </>
          ) : (
            <button
              onClick={() => onConfirm?.(highlightUtc ?? best.utcStart)}
              className="px-4 py-2 bg-amber text-bg rounded-md font-medium hover:bg-amber/90 transition"
            >
              Confirm this time
            </button>
          )}
        </div>
      )}
    </div>
  );
}
