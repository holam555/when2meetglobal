import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import type { EventBundle, EventDoc, ResponseDoc } from "./types";

/**
 * Storage layer.
 *
 * Production (Vercel): uses Neon Postgres when DATABASE_URL (or POSTGRES_URL)
 * is set — create the database from the Vercel dashboard's Storage tab and the
 * connection string gets injected automatically.
 *
 * Local dev: falls back to JSON files in .data/ so the app runs with no setup.
 */
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const usePg = !!connectionString;
const sql = usePg ? neon(connectionString) : null;

const DATA_DIR = path.join(process.cwd(), ".data");
const filePath = (slug: string) => path.join(DATA_DIR, `${slug}.json`);

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/**
 * Creates the schema on first use. Memoized so it costs one round trip per
 * cold start; cleared on failure so a transient error doesn't poison the
 * instance for its whole lifetime.
 */
let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql!`CREATE TABLE IF NOT EXISTS events (
        slug       text PRIMARY KEY,
        doc        jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql!`CREATE TABLE IF NOT EXISTS responses (
        id         text PRIMARY KEY,
        event_slug text NOT NULL REFERENCES events(slug) ON DELETE CASCADE,
        doc        jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql!`CREATE INDEX IF NOT EXISTS responses_event_slug_idx
        ON responses (event_slug)`;
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export async function readBundle(slug: string): Promise<EventBundle | null> {
  if (usePg) {
    await ensureSchema();
    const events = await sql!`SELECT doc FROM events WHERE slug = ${slug}`;
    if (events.length === 0) return null;
    const responses = await sql!`SELECT doc FROM responses
      WHERE event_slug = ${slug} ORDER BY created_at`;
    return {
      event: events[0].doc as EventDoc,
      responses: responses.map((r) => r.doc as ResponseDoc),
    };
  }
  try {
    const raw = await fs.readFile(filePath(slug), "utf-8");
    return JSON.parse(raw) as EventBundle;
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw e;
  }
}

async function writeFileBundle(bundle: EventBundle): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    filePath(bundle.event.slug),
    JSON.stringify(bundle, null, 2),
    "utf-8"
  );
}

export async function createEvent(event: EventDoc): Promise<EventBundle> {
  const bundle: EventBundle = { event, responses: [] };
  if (usePg) {
    await ensureSchema();
    await sql!`INSERT INTO events (slug, doc)
      VALUES (${event.slug}, ${JSON.stringify(event)})`;
    return bundle;
  }
  await writeFileBundle(bundle);
  return bundle;
}

export async function upsertResponse(
  slug: string,
  response: ResponseDoc
): Promise<EventBundle | null> {
  if (usePg) {
    await ensureSchema();
    const events = await sql!`SELECT 1 FROM events WHERE slug = ${slug}`;
    if (events.length === 0) return null;
    // Single atomic statement: two people submitting at once can't clobber
    // each other the way a read-modify-write of one shared document could.
    await sql!`INSERT INTO responses (id, event_slug, doc)
      VALUES (${response.id}, ${slug}, ${JSON.stringify(response)})
      ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc`;
    return readBundle(slug);
  }
  const bundle = await readBundle(slug);
  if (!bundle) return null;
  const idx = bundle.responses.findIndex((r) => r.id === response.id);
  if (idx >= 0) bundle.responses[idx] = response;
  else bundle.responses.push(response);
  await writeFileBundle(bundle);
  return bundle;
}

export async function updateEvent(
  slug: string,
  patch: Partial<EventDoc>
): Promise<EventBundle | null> {
  if (usePg) {
    await ensureSchema();
    const events = await sql!`SELECT doc FROM events WHERE slug = ${slug}`;
    if (events.length === 0) return null;
    const merged = { ...(events[0].doc as EventDoc), ...patch };
    await sql!`UPDATE events SET doc = ${JSON.stringify(merged)}
      WHERE slug = ${slug}`;
    return readBundle(slug);
  }
  const bundle = await readBundle(slug);
  if (!bundle) return null;
  bundle.event = { ...bundle.event, ...patch };
  await writeFileBundle(bundle);
  return bundle;
}
