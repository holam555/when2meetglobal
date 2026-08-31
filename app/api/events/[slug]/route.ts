import { NextResponse } from "next/server";
import { readBundle, updateEvent } from "@/lib/kv";
import { storageError } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const bundle = await readBundle(params.slug);
    if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(bundle);
  } catch (e) {
    return storageError("readBundle", e);
  }
}

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.confirmedSlot === "string" || body.confirmedSlot === null) {
    patch.confirmedSlot = body.confirmedSlot ?? undefined;
  }
  try {
    const bundle = await updateEvent(params.slug, patch);
    if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(bundle);
  } catch (e) {
    return storageError("updateEvent", e);
  }
}
