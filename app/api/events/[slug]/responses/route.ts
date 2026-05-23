import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { upsertResponse, readBundle } from "@/lib/kv";
import type { ResponseDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const bundle = await readBundle(params.slug);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const { id, name, timezone, availability } = body ?? {};
  if (
    typeof name !== "string" ||
    typeof timezone !== "string" ||
    !Array.isArray(availability)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const response: ResponseDoc = {
    id: typeof id === "string" && id ? id : nanoid(10),
    eventSlug: params.slug,
    name: name.trim().slice(0, 60) || "Anonymous",
    timezone,
    availability: (availability as Array<{ utcStart?: unknown; status?: unknown }>)
      .filter((s) => s && typeof s.utcStart === "string")
      .map((s) => ({
        utcStart: s.utcStart as string,
        status: (s.status === "free" || s.status === "maybe" ? s.status : "busy") as "free" | "maybe" | "busy",
      })),
    createdAt: new Date().toISOString(),
  };
  const updated = await upsertResponse(params.slug, response);
  return NextResponse.json({ bundle: updated, responseId: response.id });
}
