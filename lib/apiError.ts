import { NextResponse } from "next/server";

/**
 * Storage failures used to surface as a bare 500 with an empty body, which
 * made an outage on the deployed site effectively undiagnosable from the
 * client. Log the real error server-side and return something readable.
 */
export function storageError(op: string, e: unknown) {
  console.error(`[storage] ${op} failed:`, e);
  return NextResponse.json(
    { error: "Storage unavailable", op },
    { status: 503 }
  );
}
