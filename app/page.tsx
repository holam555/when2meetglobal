"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPicker } from "@/components/CalendarPicker";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AvailabilityGrid, type EditorMode } from "@/components/AvailabilityGrid";
import type { EventDoc, AvailabilityStatus } from "@/lib/types";
import { buildEventSlotsUTC, detectTimezone } from "@/lib/timezone";

const HOURS = Array.from({ length: 25 }, (_, i) => i);

function hourLabel(h: number) {
  if (h === 0) return "12am";
  if (h === 24) return "12am (next)";
  if (h === 12) return "12pm";
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${am ? "am" : "pm"}`;
}

type Step = "setup" | "draw";

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [name, setName] = useState("");
  const [yourName, setYourName] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [start, setStart] = useState(9);
  const [end, setEnd] = useState(22);
  const [tz, setTz] = useState("UTC");
  const [mode, setMode] = useState<EditorMode>("free");
  const [availability, setAvailability] = useState<Record<string, AvailabilityStatus>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setTz(detectTimezone());
  }, []);

  // Build the UTC slot list from current setup, used in step 2
  const utcSlots = useMemo(() => {
    if (dates.length === 0 || end <= start) return [];
    const tempEvent: EventDoc = {
      slug: "",
      name: name || "Untitled",
      dates,
      timeRange: { start, end },
      organizerTimezone: tz,
      createdAt: "",
    };
    return buildEventSlotsUTC(tempEvent);
  }, [dates, end, start, name, tz]);

  function goToDraw(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!dates.length) {
      setErr("Pick at least one date");
      return;
    }
    if (end <= start) {
      setErr("End time must be after start time");
      return;
    }
    setStep("draw");
  }

  async function finalize() {
    if (!yourName.trim()) {
      setErr("Add your name so people know who's responding");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Untitled event",
          dates,
          timeRange: { start, end },
          organizerTimezone: tz,
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const bundle = await res.json();
      const slug = bundle.event.slug;

      // Submit organizer's availability too
      const respRes = await fetch(`/api/events/${slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: yourName,
          timezone: tz,
          availability: utcSlots.map((u) => ({
            utcStart: u,
            status: availability[u] ?? "busy",
          })),
        }),
      });
      const respData = await respRes.json();

      try {
        localStorage.setItem(`organizer:${slug}`, "1");
        localStorage.setItem(
          `participant:${slug}`,
          JSON.stringify({
            id: respData.responseId,
            name: yourName,
            timezone: tz,
          })
        );
      } catch {}
      router.push(`/e/${slug}`);
    } catch {
      setErr("Could not create event. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight">
            When<span className="text-amber">2</span>Meet
            <span className="text-mute"> · Global</span>
          </h1>
          <p className="text-mute mt-2 text-base">
            Find a time that works across timezones. No accounts. Just a link.
          </p>
        </div>
        <ThemeToggle className="mt-1 shrink-0" />
      </header>

      <StepIndicator step={step} />

      {step === "setup" ? (
        <form onSubmit={goToDraw} className="space-y-6 mt-6">
          <div>
            <label className="block text-sm text-mute mb-2">Event name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. June hangout"
              className="w-full px-4 py-3 bg-surface border border-border focus:border-amber outline-none rounded-md text-ink placeholder:text-mute transition"
            />
          </div>

          <div>
            <label className="block text-sm text-mute mb-2">
              Candidate dates <span className="text-mute/70">(up to 14)</span>
            </label>
            <CalendarPicker value={dates} onChange={setDates} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-mute mb-2">From</label>
              <select
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-md outline-none focus:border-amber"
              >
                {HOURS.slice(0, 24).map((h) => (
                  <option key={h} value={h}>{hourLabel(h)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-mute mb-2">To</label>
              <select
                value={end}
                onChange={(e) => setEnd(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-md outline-none focus:border-amber"
              >
                {HOURS.slice(1).map((h) => (
                  <option key={h} value={h}>{hourLabel(h)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-mute mb-2">Your timezone</label>
            <TimezoneSelect value={tz} onChange={setTz} />
          </div>

          {err && <div className="text-amber text-sm">{err}</div>}

          <button
            type="submit"
            className="w-full px-6 py-3.5 bg-amber text-bg rounded-md font-medium hover:bg-amber/90 transition flex items-center justify-center gap-2"
          >
            Next: mark your availability
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      ) : (
        <section className="mt-6 space-y-5">
          <div className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-serif text-xl leading-tight">{name || "Untitled event"}</div>
              <div className="text-xs text-mute mt-1">
                {dates.length} date{dates.length === 1 ? "" : "s"} · {hourLabel(start)}–{hourLabel(end)} · {tz.replace(/_/g, " ")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep("setup")}
              className="text-xs text-mute hover:text-ink underline"
            >
              Edit dates
            </button>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs text-mute mb-1.5">Your name</label>
              <input
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-md outline-none focus:border-amber"
              />
            </div>
            <ModeToggle mode={mode} setMode={setMode} />
          </div>

          <p className="text-xs text-mute">
            Tap or drag to mark when you&apos;re{" "}
            {mode === "free" ? "free" : "maybe available"}. Tap again to clear.
          </p>

          <AvailabilityGrid
            utcSlots={utcSlots}
            viewerTz={tz}
            value={availability}
            onChange={setAvailability}
            mode={mode}
          />

          {err && <div className="text-amber text-sm">{err}</div>}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={finalize}
              disabled={submitting || !yourName.trim()}
              className="px-6 py-3 bg-amber text-bg rounded-md font-medium hover:bg-amber/90 transition disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create & share"}
            </button>
            <Legend />
          </div>
        </section>
      )}

      <footer className="mt-16 text-xs text-mute/70 text-center">
        Times stored as UTC. Everyone sees the grid in their own local time.
      </footer>
    </main>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const items = [
    { key: "setup", label: "Pick dates" },
    { key: "draw", label: "Your availability" },
  ] as const;
  return (
    <div className="flex items-center gap-3 text-xs">
      {items.map((it, i) => {
        const active = it.key === step;
        const done = step === "draw" && it.key === "setup";
        return (
          <div key={it.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium ${
                  active
                    ? "bg-amber text-bg"
                    : done
                    ? "bg-amber/20 text-amber border border-amber/40"
                    : "bg-surface border border-border text-mute"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={active ? "text-ink" : "text-mute"}>{it.label}</span>
            </div>
            {i < items.length - 1 && (
              <span className="w-8 h-px bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModeToggle({
  mode,
  setMode,
}: {
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
}) {
  return (
    <div className="inline-flex bg-surface border border-border rounded-md p-0.5">
      <button
        type="button"
        onClick={() => setMode("free")}
        className={`px-3 py-2 text-sm rounded ${
          mode === "free" ? "bg-amber text-bg" : "text-mute hover:text-ink"
        }`}
      >
        Free
      </button>
      <button
        type="button"
        onClick={() => setMode("maybe")}
        className={`px-3 py-2 text-sm rounded ${
          mode === "maybe" ? "bg-amber-deep text-white" : "text-mute hover:text-ink"
        }`}
      >
        Maybe
      </button>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs text-mute">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-amber inline-block" /> Free
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-amber-deep/70 border border-dashed border-amber inline-block" />{" "}
        Maybe
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-surface border border-border inline-block" />{" "}
        Busy
      </span>
    </div>
  );
}
