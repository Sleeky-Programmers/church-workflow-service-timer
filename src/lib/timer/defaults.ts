import type {
  DisplayColors,
  DisplayToggles,
  FontKey,
  ProgramItem,
  Template,
  TimerRun,
  TimerState,
} from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

/** A sample program so a new church sees a working timer straight away. */
const SAMPLE: [name: string, minutes: number, person: string][] = [
  ["Opening Worship", 10, ""],
  ["Prayer", 8, ""],
  ["Announcements", 2, ""],
  ["Praise & Worship", 25, ""],
  ["Tithes & Offering", 8, ""],
  ["The Word", 40, ""],
  ["Closing Prayer", 5, ""],
];

export const SHOW_LABELS: Record<keyof DisplayToggles, string> = {
  timeLeft: "Time left (countdown)",
  overTime: "Over time (counts up after zero)",
  labels: "Words under the timer",
  progress: "Progress bar",
  item: "Current item",
  person: "Current speaker",
  next: "Who's next",
  schedule: "Ahead / behind schedule",
  clock: "Clock",
  church: "Church name",
  logo: "Logo",
};

export const PRESETS: Record<"royal" | "night" | "light", DisplayColors> = {
  royal: { bg: "#0c1a4d", text: "#f6f4ee", accent: "#3f63e0", warn: "#e9b949", over: "#ff4545" },
  night: { bg: "#000000", text: "#ffffff", accent: "#4169e1", warn: "#f2c14e", over: "#ff3b3b" },
  light: { bg: "#f4f6fc", text: "#0c1a4d", accent: "#2f52d0", warn: "#b7791f", over: "#d01f1f" },
};

export const PRESET_LABELS: Record<keyof typeof PRESETS, string> = {
  royal: "Royal blue",
  night: "Black",
  light: "Light",
};

export const COLOR_LABELS: Record<keyof DisplayColors, string> = {
  bg: "Background",
  text: "Text",
  accent: "Progress",
  warn: "Warning",
  over: "Over time",
};

export const FONTS: Record<FontKey, string> = {
  condensed: 'Bahnschrift,"DIN Alternate","Avenir Next Condensed","Arial Narrow",Arial,sans-serif',
  modern: '"Segoe UI Variable Display","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif',
  serif: 'Georgia,Cambria,"Times New Roman",serif',
  rounded: '"Segoe UI Rounded","Arial Rounded MT Bold","SF Pro Rounded",Nunito,"Trebuchet MS",sans-serif',
};

export const FONT_LABELS: Record<FontKey, string> = {
  condensed: "Condensed (clear numbers)",
  modern: "Modern",
  serif: "Classic serif",
  rounded: "Rounded",
};

export const QUICK_NOTES = ["Please round off", "2 minutes left", "Time is up"];

export const freshTimer = (): TimerRun => ({
  running: false,
  startedAt: null,
  elapsedBefore: 0,
  extraMs: 0,
  firstStartedAt: null,
});

export function sampleItems(): ProgramItem[] {
  return SAMPLE.map(([name, minutes, person]) => ({ id: uid(), name, minutes, person }));
}

export function sampleTemplate(): Template {
  return {
    id: uid(),
    name: "Sunday Worship Service",
    serviceStart: "09:00",
    items: SAMPLE.map(([name, minutes, person]) => ({ name, minutes, person })),
  };
}

export function defaultState(): TimerState {
  return {
    items: sampleItems(),
    index: 0,
    timer: freshTimer(),
    message: { text: "", shown: false },
    templates: [sampleTemplate()],
    settings: {
      churchName: "",
      serviceStart: "09:00",
      warnMin: 2,
      keepRunning: true,
      shortcuts: false,
      font: "condensed",
      colors: { ...PRESETS.royal },
      logo: "",
      show: {
        timeLeft: true,
        overTime: true,
        labels: true,
        progress: true,
        item: true,
        person: true,
        next: true,
        schedule: true,
        clock: true,
        church: true,
        logo: true,
      },
    },
  };
}

/** Fills in anything missing from saved or received state. */
export function normalise(input: unknown): TimerState {
  const d = defaultState();
  const s = input as Partial<TimerState> | null;
  if (!s || typeof s !== "object" || !Array.isArray(s.items)) return d;
  const settings = { ...d.settings, ...(s.settings || {}) };
  settings.colors = { ...d.settings.colors, ...(s.settings?.colors || {}) };
  settings.show = { ...d.settings.show, ...(s.settings?.show || {}) };
  if (!(settings.font in FONTS)) settings.font = "condensed";
  const items = s.items.map((it) => ({
    id: String(it.id || uid()),
    name: String(it.name ?? ""),
    person: String(it.person ?? ""),
    minutes: Math.max(0, Number(it.minutes) || 0),
  }));
  let index = typeof s.index === "number" && s.index >= 0 ? s.index : 0;
  if (index >= items.length) index = Math.max(0, items.length - 1);
  return {
    items,
    index,
    timer: { ...freshTimer(), ...(s.timer || {}) },
    message: { text: "", shown: false, ...(s.message || {}) },
    templates: Array.isArray(s.templates) ? s.templates : [sampleTemplate()],
    settings,
    origin: s.origin,
    seq: s.seq,
  };
}
