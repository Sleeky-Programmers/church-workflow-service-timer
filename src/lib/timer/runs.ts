/**
 * Service reports: how long each item actually ran. The device that moves
 * the timer on records it from its own changes. A pause sends a snapshot,
 * and moving on (or resetting, loading a template…) sends the final one.
 * Each run is named by its item and when it first started, so later
 * snapshots of the same run update one record on the server.
 */
import { elapsed } from "./timing";
import type { TimerState } from "./types";

export interface ItemRun {
  id: string;
  name: string;
  person: string;
  plannedMinutes: number;
  extraMs: number;
  actualMs: number;
  startedAt: number;
  endedAt: number;
}

/** Shorter runs are a slip of the finger, not part of the service. */
export const MIN_RUN_MS = 5000;

function snapshot(s: TimerState, now: number): ItemRun | null {
  const item = s.items[s.index];
  const first = s.timer.firstStartedAt;
  if (!item || first == null) return null;
  const actualMs = Math.round(elapsed(s.timer, now));
  if (actualMs < MIN_RUN_MS) return null;
  return {
    id: `${item.id}:${first}`.slice(0, 80),
    name: item.name.slice(0, 120) || "Untitled item",
    person: (item.person || "").slice(0, 80),
    plannedMinutes: Math.min(600, Math.max(0, Number(item.minutes) || 0)),
    extraMs: s.timer.extraMs || 0,
    actualMs: Math.min(actualMs, 43_200_000),
    startedAt: first,
    endedAt: now,
  };
}

/** The run to record for a change from `prev` to `next`, if any. */
export function runToRecord(prev: TimerState, next: TimerState, now: number): ItemRun | null {
  const prevFirst = prev.timer.firstStartedAt ?? null;
  if (prevFirst == null) return null;
  const prevItem = prev.items[prev.index];
  const nextItem = next.items[next.index];
  const sameRun = nextItem?.id === prevItem?.id && (next.timer.firstStartedAt ?? null) === prevFirst;

  // Moved on, reset, or the program changed under it: the run is over.
  if (!sameRun) return snapshot(prev, now);
  // Paused: a snapshot, in case nobody moves on before the device goes away.
  if (prev.timer.running && !next.timer.running) return snapshot(next, now);
  return null;
}
