import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createEvent } from "@/lib/kv";
import { storageError } from "@/lib/apiError";
import type { EventDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, dates, timeRange, organizerTimezone } = body ?? {};
  if (
    typeof name !== "string" ||
    !Array.isArray(dates) ||
    dates.length === 0 ||
    !timeRange ||
    typeof timeRange.start !== "number" ||
    typeof timeRange.end !== "number" ||
    timeRange.end <= timeRange.start ||
    typeof organizerTimezone !== "string"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const event: EventDoc = {
    slug: nanoid(8),
    name: name.trim().slice(0, 120) || "Untitled event",
    dates: dates.slice(0, 14),
    timeRange: {
      start: Math.max(0, Math.min(23, timeRange.start)),
      end: Math.max(1, Math.min(24, timeRange.end)),
    },
    organizerTimezone,
    createdAt: new Date().toISOString(),
  };
  try {
    const bundle = await createEvent(event);
    return NextResponse.json(bundle);
  } catch (e) {
    return storageError("createEvent", e);
  }
}
