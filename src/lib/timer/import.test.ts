import { describe, expect, it } from "vitest";
import { replaceProgram, toggleRun } from "./actions";
import { defaultState } from "./defaults";

const apply = (s: ReturnType<typeof defaultState>, recipe: (d: typeof s, now: number) => void) => {
  const d = structuredClone(s);
  recipe(d, 1_000);
  return d;
};

describe("loading imported items into the program", () => {
  it("replaces the program, resets the timer and takes the start time", () => {
    let s = apply(defaultState(), toggleRun);
    s.message = { text: "Please round off", shown: true };
    s.index = 3;
    s = apply(
      s,
      replaceProgram(
        [
          { name: "Prayer", person: "Min. A", minutes: 8 },
          { name: "The Word", person: "", minutes: -5 },
        ],
        "08:30",
      ),
    );
    expect(s.items.map((i) => [i.name, i.minutes])).toEqual([
      ["Prayer", 8],
      ["The Word", 0],
    ]);
    expect(new Set(s.items.map((i) => i.id)).size).toBe(2);
    expect(s.index).toBe(0);
    expect(s.timer.running).toBe(false);
    expect(s.message.shown).toBe(false);
    expect(s.settings.serviceStart).toBe("08:30");
  });

  it("keeps the start time when none was read", () => {
    const s = apply(defaultState(), replaceProgram([{ name: "Prayer", person: "", minutes: 8 }]));
    expect(s.settings.serviceStart).toBe(defaultState().settings.serviceStart);
  });
});
