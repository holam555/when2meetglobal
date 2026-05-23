import type { ResponseDoc, AvailabilityStatus } from "./types";
import { isBusinessHourLocal } from "./timezone";

export type SlotTally = {
  utcStart: string;
  freeNames: string[];
  maybeNames: string[];
  busyNames: string[];
  score: number;
  businessHoursBonus: boolean;
};

export function tallySlots(
  utcSlots: string[],
  responses: ResponseDoc[]
): Record<string, SlotTally> {
  const tallies: Record<string, SlotTally> = {};
  for (const slot of utcSlots) {
    tallies[slot] = {
      utcStart: slot,
      freeNames: [],
      maybeNames: [],
      busyNames: [],
      score: 0,
      businessHoursBonus: false,
    };
  }

  for (const r of responses) {
    const map = new Map<string, AvailabilityStatus>();
    for (const a of r.availability) map.set(a.utcStart, a.status);
    for (const slot of utcSlots) {
      const status = map.get(slot) ?? "busy";
      const t = tallies[slot];
      if (status === "free") t.freeNames.push(r.name);
      else if (status === "maybe") t.maybeNames.push(r.name);
      else t.busyNames.push(r.name);
    }
  }

  for (const slot of utcSlots) {
    const t = tallies[slot];
    let score = t.freeNames.length * 2 + t.maybeNames.length * 1;

    // Business-hours bonus: only if every free participant has it in 9am–7pm local.
    if (t.freeNames.length > 0) {
      const allBiz = responses
        .filter((r) => t.freeNames.includes(r.name))
        .every((r) => isBusinessHourLocal(slot, r.timezone));
      if (allBiz) {
        t.businessHoursBonus = true;
        score += 1;
      }
    }
    t.score = score;
  }

  return tallies;
}

export function topSlots(tallies: Record<string, SlotTally>, n = 3): SlotTally[] {
  return Object.values(tallies)
    .filter((t) => t.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.freeNames.length !== a.freeNames.length)
        return b.freeNames.length - a.freeNames.length;
      return new Date(a.utcStart).getTime() - new Date(b.utcStart).getTime();
    })
    .slice(0, n);
}

export function maxFreeCount(tallies: Record<string, SlotTally>): number {
  let m = 0;
  for (const t of Object.values(tallies)) m = Math.max(m, t.freeNames.length);
  return m;
}
