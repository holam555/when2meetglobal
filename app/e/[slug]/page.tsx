"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AvailabilityGrid, type EditorMode } from "@/components/AvailabilityGrid";
import { HeatmapGrid } from "@/components/HeatmapGrid";
import { BestSlotCard } from "@/components/BestSlotCard";
import { ShareButton } from "@/components/ShareButton";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AvailabilityStatus, EventBundle } from "@/lib/types";
import { buildEventSlotsUTC, detectTimezone, tzAbbreviation, formatLocalFull } from "@/lib/timezone";
import { tallySlots, topSlots } from "@/lib/scoring";

type Tab = "you" | "everyone";

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [bundle, setBundle] = useState<EventBundle | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tz, setTz] = useState("UTC");
  const [responseId, setResponseId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("free");
  const [availability, setAvailability] = useState<Record<string, AvailabilityStatus>>({});
  const [tab, setTab] = useState<Tab>("you");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [highlightUtc, setHighlightUtc] = useState<string | undefined>();
  const [shareUrl, setShareUrl] = useState("");
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    setTz(detectTimezone());
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href.split("?")[0]);
      setIsOrganizer(localStorage.getItem(`organizer:${slug}`) === "1");
      const saved = localStorage.getItem(`participant:${slug}`);
      if (saved) {
        try {
          const p = JSON.parse(saved);
          setName(p.name || "");
          if (p.timezone) setTz(p.timezone);
          setResponseId(p.id || null);
        } catch {}
      }
    }
  }, [slug]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/events/${slug}`, { cache: "no-store" });
      if (!r.ok) throw new Error("not found");
      const b: EventBundle = await r.json();
      setBundle(b);
      // hydrate my response if found
      if (responseId) {
        const mine = b.responses.find((x) => x.id === responseId);
        if (mine) {
          const map: Record<string, AvailabilityStatus> = {};
          for (const a of mine.availability) if (a.status !== "busy") map[a.utcStart] = a.status;
          setAvailability(map);
          setName(mine.name);
          setTz(mine.timezone);
          setSubmitted(true);
        }
      }
    } catch {
      setLoadErr("Event not found");
    }
  }, [slug, responseId]);

  useEffect(() => {
    load();
  }, [load]);

  const utcSlots = useMemo(
    () => (bundle ? buildEventSlotsUTC(bundle.event) : []),
    [bundle]
  );

  const tallies = useMemo(
    () => (bundle ? tallySlots(utcSlots, bundle.responses) : {}),
    [bundle, utcSlots]
  );
  const top = useMemo(() => topSlots(tallies, 3), [tallies]);

  async function submit() {
    if (!bundle) return;
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        id: responseId,
        name,
        timezone: tz,
        availability: utcSlots.map((u) => ({
          utcStart: u,
          status: availability[u] ?? "busy",
        })),
      };
      const res = await fetch(`/api/events/${slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResponseId(data.responseId);
      setBundle(data.bundle);
      localStorage.setItem(
        `participant:${slug}`,
        JSON.stringify({ id: data.responseId, name, timezone: tz })
      );
      setSubmitted(true);
      setTab("everyone");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirm(utc: string | null) {
    if (!bundle) return;
    const r = await fetch(`/api/events/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedSlot: utc }),
    });
    if (r.ok) {
      const b = await r.json();
      setBundle(b);
    }
  }

  if (loadErr) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-3xl mb-3">Event not found</h1>
        <p className="text-mute">The link may be wrong or the event was deleted.</p>
        <a href="/" className="inline-block mt-6 px-4 py-2 bg-surface border border-border rounded-md hover:border-mute">
          Create new event
        </a>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16 text-center text-mute">Loading…</main>
    );
  }

  const otherTzs = Array.from(
    new Set(bundle.responses.map((r) => r.timezone).filter((t) => t !== tz))
  ).slice(0, 4);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="font-serif text-3xl sm:text-4xl leading-tight">{bundle.event.name}</h1>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-mute hover:text-ink">+ new event</a>
            <ThemeToggle />
          </div>
        </div>
        <div className="text-sm text-mute mt-1">
          {bundle.event.dates.length} date{bundle.event.dates.length === 1 ? "" : "s"} ·{" "}
          {bundle.responses.length} response{bundle.responses.length === 1 ? "" : "s"}
        </div>
      </header>

      {bundle.event.confirmedSlot && (
        <div className="mb-6 bg-amber/10 border border-amber/40 rounded-lg p-4">
          <div className="text-xs uppercase tracking-widest text-amber mb-1">Confirmed</div>
          <div className="font-serif text-xl">
            {formatLocalFull(bundle.event.confirmedSlot, tz)}{" "}
            <span className="text-mute text-sm">{tzAbbreviation(tz, new Date(bundle.event.confirmedSlot))}</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <ShareButton url={shareUrl} eventName={bundle.event.name} />
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mb-4">
        <div>
          <label className="block text-xs text-mute mb-1.5">Your timezone</label>
          <TimezoneSelect value={tz} onChange={setTz} />
        </div>
        <div className="text-xs text-mute">
          Times shown in <span className="text-ink">{tzAbbreviation(tz)}</span>
          {otherTzs.length > 0 && (
            <span>
              {" · others: "}
              {otherTzs.map((t) => tzAbbreviation(t)).join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        <TabBtn active={tab === "you"} onClick={() => setTab("you")}>
          Your availability
        </TabBtn>
        <TabBtn active={tab === "everyone"} onClick={() => setTab("everyone")}>
          Everyone {bundle.responses.length > 0 && <span className="text-mute">({bundle.responses.length})</span>}
        </TabBtn>
      </div>

      {tab === "you" ? (
        <section>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mb-4">
            <div>
              <label className="block text-xs text-mute mb-1.5">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-md outline-none focus:border-amber"
              />
            </div>
            <ModeToggle mode={mode} setMode={setMode} />
          </div>

          <p className="text-xs text-mute mb-3">
            Tap or drag to mark when you&apos;re {mode === "free" ? "free" : "maybe available"}.
            Tap a date header to toggle the whole day. Tap again to clear.
          </p>

          <AvailabilityGrid
            utcSlots={utcSlots}
            viewerTz={tz}
            value={availability}
            onChange={setAvailability}
            mode={mode}
          />

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={!name.trim() || submitting}
              className="px-5 py-3 bg-amber text-bg rounded-md font-medium hover:bg-amber/90 transition disabled:opacity-50"
            >
              {submitting ? "Saving…" : submitted ? "Update my times" : "Submit"}
            </button>
            <Legend />
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <BestSlotCard
            top={top}
            viewerTz={tz}
            totalResponses={bundle.responses.length}
            responses={bundle.responses}
            isOrganizer={isOrganizer}
            confirmedSlot={bundle.event.confirmedSlot}
            highlightUtc={highlightUtc}
            onPickSlot={(u) => setHighlightUtc(u)}
            onConfirm={confirm}
          />

          {bundle.responses.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-6 text-mute text-center">
              No responses yet. Share the link above.
            </div>
          ) : (
            <>
              <HeatmapGrid
                utcSlots={utcSlots}
                viewerTz={tz}
                responses={bundle.responses}
                highlightUtc={highlightUtc}
                onPickSlot={(u) => setHighlightUtc(u)}
              />
              <ParticipantList responses={bundle.responses} />
            </>
          )}
        </section>
      )}
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
        active ? "border-amber text-ink" : "border-transparent text-mute hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function ModeToggle({ mode, setMode }: { mode: EditorMode; setMode: (m: EditorMode) => void }) {
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
        <span className="w-3 h-3 rounded-sm bg-amber-deep/70 border border-dashed border-amber inline-block" /> Maybe
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-surface border border-border inline-block" /> Busy
      </span>
    </div>
  );
}

function ParticipantList({ responses }: { responses: EventBundle["responses"] }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-xs uppercase tracking-widest text-mute mb-3">Participants</div>
      <div className="flex flex-wrap gap-2">
        {responses.map((r) => (
          <div key={r.id} className="px-3 py-1.5 bg-surface2 border border-border rounded-full text-sm">
            {r.name}
            <span className="text-mute text-xs ml-2">{tzAbbreviation(r.timezone)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
