/**
 * The timing lines of the behaviour checklist (Developer Handoff, section 8),
 * plus the rules in section 5.
 */
import { describe, expect, it } from "vitest";
import { addTime, goTo, loadTemplate, saveTemplate, toggleRun, updateItem } from "./actions";
import { defaultState } from "./defaults";
import { computeView, fmt, MINUS, plannedStart, variance } from "./timing";
import type { TimerState } from "./types";

const MIN = 60000;
/** 09:00 local time on a fixed day, so the tests pass in any time zone. */
const NINE = new Date(2026, 10, 8, 9, 0, 0, 0).getTime();

function stateWith(items: [string, number][], extra?: Partial<TimerState["settings"]>): TimerState {
  const s = defaultState();
  s.items = items.map(([name, minutes], i) => ({ id: `i${i}`, name, minutes, person: "" }));
  s.settings = { ...s.settings, serviceStart: "09:00", warnMin: 2, ...extra };
  return s;
}

/** Applies an action to a copy, the way the store does. */
function apply(s: TimerState, recipe: (d: TimerState, now: number) => void, now: number) {
  const d = structuredClone(s);
  recipe(d, now);
  return d;
}

describe("countdown and warnings", () => {
  it("a 10-minute item counts down and turns amber at 2:00 left", () => {
    const s = apply(stateWith([["Word", 10]]), toggleRun, NINE);
    expect(computeView(s, NINE).text).toBe("10:00");
    expect(computeView(s, NINE + 1).text).toBe("10:00"); // Rounds up, never early
    expect(computeView(s, NINE + 7 * MIN + 59_000).mode).toBe("normal");
    const at2 = computeView(s, NINE + 8 * MIN);
    expect(at2.text).toBe("02:00");
    expect(at2.mode).toBe("warn");
    expect(at2.label).toBe("remaining");
  });

  it("never shows 00:00 while time is left", () => {
    const s = apply(stateWith([["Word", 10]]), toggleRun, NINE);
    expect(computeView(s, NINE + 10 * MIN - 1).text).toBe("00:01");
  });

  it("at zero shows Time up and counts up as −00:01, −00:02 in red", () => {
    const s = apply(stateWith([["Word", 10]]), toggleRun, NINE);
    const at0 = computeView(s, NINE + 10 * MIN);
    expect(at0.timeUp).toBe(true);
    expect(at0.mode).toBe("over");
    expect(computeView(s, NINE + 10 * MIN + 1000).text).toBe(`${MINUS}00:01`);
    expect(computeView(s, NINE + 10 * MIN + 2000).text).toBe(`${MINUS}00:02`);
    expect(computeView(s, NINE + 17 * MIN + 12_000).text).toBe(`${MINUS}07:12`);
  });

  it("with the over-time toggle off it shows Time up and 00:00", () => {
    let s = stateWith([["Word", 10]]);
    s.settings.show.overTime = false;
    s = apply(s, toggleRun, NINE);
    const v = computeView(s, NINE + 12 * MIN);
    expect(v.timeUp).toBe(true);
    expect(v.text).toBe("00:00");
  });

  it("shows hours only when needed", () => {
    expect(fmt(65 * MIN)).toBe("1:05:00");
    expect(fmt(5 * MIN)).toBe("05:00");
  });

  it("pause and resume carry elapsed time over", () => {
    let s = apply(stateWith([["Word", 10]]), toggleRun, NINE);
    s = apply(s, toggleRun, NINE + 3 * MIN); // Pause
    expect(computeView(s, NINE + 20 * MIN).text).toBe("07:00");
    expect(computeView(s, NINE + 20 * MIN).label).toBe("paused");
    s = apply(s, toggleRun, NINE + 20 * MIN); // Resume
    expect(computeView(s, NINE + 21 * MIN).text).toBe("06:00");
  });
});

describe("adjustments and templates", () => {
  it("+1 and −1 change only the current run; the template keeps its minutes", () => {
    let s = stateWith([["Word", 10]]);
    s = apply(s, saveTemplate("Sunday", "t1"), NINE);
    s = apply(s, toggleRun, NINE);
    s = apply(s, addTime(1), NINE);
    s = apply(s, addTime(1), NINE);
    s = apply(s, addTime(-1), NINE);
    expect(computeView(s, NINE).text).toBe("11:00");
    expect(s.items[0].minutes).toBe(10);
    expect(s.templates.find((t) => t.id === "t1")!.items[0].minutes).toBe(10);
  });

  it("−1 cannot take the allowed time below zero", () => {
    let s = stateWith([["Word", 1]]);
    s = apply(s, addTime(-5), NINE);
    expect(s.timer.extraMs).toBe(-MIN);
  });

  it("loading a template copies items with new ids; editing the program leaves the template alone", () => {
    let s = stateWith([["Word", 10]]);
    s = apply(s, saveTemplate("Sunday", "t1"), NINE);
    s = apply(s, loadTemplate("t1"), NINE);
    expect(s.items[0].id).not.toBe("i0");
    s = apply(s, updateItem(s.items[0].id, { minutes: 30 }), NINE);
    expect(s.templates[0].items[0].minutes).toBe(10);
  });
});

describe("schedule tracker", () => {
  it("stays hidden until the first item has started", () => {
    const s = stateWith([["A", 10], ["B", 10]]);
    expect(variance(s, NINE)).toBeNull();
    expect(computeView(s, NINE).sched).toBe("");
  });

  it("planned start is service start plus earlier items' default minutes", () => {
    const s = stateWith([["A", 10], ["B", 15], ["C", 5]]);
    expect(plannedStart(s, 2, NINE)).toBe(NINE + 25 * MIN);
  });

  it("reads On schedule, behind and ahead", () => {
    const s = apply(stateWith([["A", 10], ["B", 10]]), toggleRun, NINE);
    expect(computeView(s, NINE + MIN).sched).toBe("On schedule");
    const late = apply(stateWith([["A", 10], ["B", 10]]), toggleRun, NINE + 5 * MIN);
    expect(computeView(late, NINE + 5 * MIN).sched).toBe("5 mins behind");
    expect(computeView(late, NINE + 5 * MIN).schedClass).toBe("behind");
    const early = apply(stateWith([["A", 10], ["B", 10]]), toggleRun, NINE - 3 * MIN);
    expect(computeView(early, NINE - 3 * MIN).sched).toBe("3 mins ahead");
  });

  it("granting extra minutes shows the service falling behind", () => {
    let s = apply(stateWith([["A", 10], ["B", 10]]), toggleRun, NINE);
    s = apply(s, addTime(5), NINE);
    // The tracker uses default minutes, so every granted minute used puts the service behind.
    expect(computeView(s, NINE + 10 * MIN).sched).toBe("On schedule");
    expect(computeView(s, NINE + 13 * MIN).sched).toBe("3 mins behind");
  });
});

describe("moving between items", () => {
  it("next resets the item's timer and keeps running when keep-running is on", () => {
    let s = apply(stateWith([["A", 10], ["B", 10]]), toggleRun, NINE);
    s = apply(s, addTime(3), NINE);
    s = apply(s, goTo(1), NINE + 4 * MIN);
    expect(s.index).toBe(1);
    expect(s.timer.extraMs).toBe(0);
    expect(s.timer.running).toBe(true);
    expect(computeView(s, NINE + 4 * MIN).text).toBe("10:00");
  });

  it("next stops the timer when keep-running is off", () => {
    let s = apply(stateWith([["A", 10], ["B", 10]], { keepRunning: false }), toggleRun, NINE);
    s = apply(s, goTo(1), NINE + MIN);
    expect(s.timer.running).toBe(false);
    expect(computeView(s, NINE + 2 * MIN).label).toBe("ready");
  });

  it("ignores moves past either end", () => {
    const s = apply(stateWith([["A", 10]]), goTo(1), NINE);
    expect(s.index).toBe(0);
  });
});
