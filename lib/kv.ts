import { promises as fs } from "fs";
import path from "path";
import type { EventBundle, EventDoc, ResponseDoc } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function filePath(slug: string) {
  return path.join(DATA_DIR, `${slug}.json`);
}

export async function readBundle(slug: string): Promise<EventBundle | null> {
  try {
    const raw = await fs.readFile(filePath(slug), "utf-8");
    return JSON.parse(raw) as EventBundle;
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw e;
  }
}

export async function writeBundle(bundle: EventBundle): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath(bundle.event.slug), JSON.stringify(bundle, null, 2), "utf-8");
}

export async function createEvent(event: EventDoc): Promise<EventBundle> {
  const bundle: EventBundle = { event, responses: [] };
  await writeBundle(bundle);
  return bundle;
}

export async function upsertResponse(
  slug: string,
  response: ResponseDoc
): Promise<EventBundle | null> {
  const bundle = await readBundle(slug);
  if (!bundle) return null;
  const idx = bundle.responses.findIndex((r) => r.id === response.id);
  if (idx >= 0) bundle.responses[idx] = response;
  else bundle.responses.push(response);
  await writeBundle(bundle);
  return bundle;
}

export async function updateEvent(
  slug: string,
  patch: Partial<EventDoc>
): Promise<EventBundle | null> {
  const bundle = await readBundle(slug);
  if (!bundle) return null;
  bundle.event = { ...bundle.event, ...patch };
  await writeBundle(bundle);
  return bundle;
}
