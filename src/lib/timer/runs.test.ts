import { describe, expect, it } from "vitest";
import { addTime, goTo, resetItem, toggleRun } from "./actions";
import { defaultState } from "./defaults";
import { runToRecord } from "./runs";
import type { TimerState } from "./types";
import type { Recipe } from "./actions";

const apply = (s: TimerState, r: Recipe, now: number) => {
  const next = structuredClone(s);
  r(next, now);
  return next;
};

const t0 = 1_800_000_000_000;

describe("service report runs", () => {
  it("records nothing for an item that never started", () => {
    const s = defaultState();
    expect(runToRecord(s, apply(s, goTo(1), t0), t0)).toBeNull();
  });

  it("snapshots on pause and records the final run on moving on", () => {
    let s = apply(defaultState(), toggleRun, t0);
    const item = s.items[0];
    expect(s.timer.firstStartedAt).toBe(t0);

    const paused = apply(s, toggleRun, t0 + 60_000);
    const snap = runToRecord(s, paused, t0 + 60_000);
    expect(snap).toMatchObject({ id: `${item.id}:${t0}`, actualMs: 60_000, startedAt: t0, name: item.name });

    s = apply(paused, toggleRun, t0 + 90_000); // resume: same run
    expect(s.timer.firstStartedAt).toBe(t0);
    expect(runToRecord(paused, s, t0 + 90_000)).toBeNull();

    const extra = apply(s, addTime(1), t0 + 100_000);
    expect(runToRecord(s, extra, t0 + 100_000)).toBeNull();

    const moved = apply(extra, goTo(1), t0 + 150_000);
    const final = runToRecord(extra, moved, t0 + 150_000);
    expect(final).toMatchObject({
      id: `${item.id}:${t0}`, // same record as the snapshot
      actualMs: 120_000,
      extraMs: 60_000,
      plannedMinutes: item.minutes,
      endedAt: t0 + 150_000,
    });
  });

  it("starts a new run for the next item when keep-running is on", () => {
    const base = defaultState();
    base.settings.keepRunning = true;
    const s = apply(base, toggleRun, t0);
    const moved = apply(s, goTo(1), t0 + 30_000);
    expect(moved.timer.firstStartedAt).toBe(t0 + 30_000);
    expect(runToRecord(s, moved, t0 + 30_000)?.id).toBe(`${s.items[0].id}:${t0}`);
  });

  it("ignores runs of a few seconds", () => {
    const s = apply(defaultState(), toggleRun, t0);
    expect(runToRecord(s, apply(s, resetItem, t0 + 2000), t0 + 2000)).toBeNull();
    expect(runToRecord(s, apply(s, resetItem, t0 + 9000), t0 + 9000)).not.toBeNull();
  });
});
