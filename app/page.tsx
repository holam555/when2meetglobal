"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPicker } from "@/components/CalendarPicker";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { detectTimezone } from "@/lib/timezone";

const HOURS = Array.from({ length: 25 }, (_, i) => i);

function hourLabel(h: number) {
  if (h === 0) return "12am";
  if (h === 24) return "12am (next)";
  if (h === 12) return "12pm";
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${am ? "am" : "pm"}`;
}

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [start, setStart] = useState(9);
  const [end, setEnd] = useState(22);
  const [tz, setTz] = useState("UTC");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setTz(detectTimezone());
  }, []);

  async function submit(e: React.FormEvent) {
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
      if (!res.ok) throw new Error("Failed");
      const bundle = await res.json();
      try {
        localStorage.setItem(`organizer:${bundle.event.slug}`, "1");
      } catch {}
      router.push(`/e/${bundle.event.slug}`);
    } catch {
      setErr("Could not create event. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
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

      <form onSubmit={submit} className="space-y-6">
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
          <label className="block text-sm text-mute mb-2">Candidate dates (up to 14)</label>
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
          disabled={submitting}
          className="w-full px-6 py-3.5 bg-amber text-bg rounded-md font-medium hover:bg-amber/90 transition disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create & Share"}
        </button>
      </form>

      <footer className="mt-16 text-xs text-mute/70 text-center">
        Times stored as UTC. Everyone sees the grid in their own local time.
      </footer>
    </main>
  );
}
