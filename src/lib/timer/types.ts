/**
 * The whole timer is one state object and every screen is drawn from it
 * (Developer Handoff, section 4). In later phases this splits into church
 * settings, templates and one live session per service in the API.
 */

export interface ProgramItem {
  id: string;
  name: string;
  person: string;
  minutes: number;
}

export interface TemplateItem {
  name: string;
  person: string;
  minutes: number;
}

export interface Template {
  id: string;
  name: string;
  serviceStart: string;
  items: TemplateItem[];
}

/** Stores a start moment, never a ticking number, so devices never drift. */
export interface TimerRun {
  running: boolean;
  startedAt: number | null;
  elapsedBefore: number;
  /** +1 / −1 adjustments for this run only; the item's minutes stay clean. */
  extraMs: number;
}

export interface SpeakerMessage {
  text: string;
  shown: boolean;
}

export type FontKey = "condensed" | "modern" | "serif" | "rounded";

export interface DisplayColors {
  bg: string;
  text: string;
  accent: string;
  warn: string;
  over: string;
}

export interface DisplayToggles {
  timeLeft: boolean;
  overTime: boolean;
  labels: boolean;
  progress: boolean;
  item: boolean;
  person: boolean;
  next: boolean;
  schedule: boolean;
  clock: boolean;
  church: boolean;
  logo: boolean;
}

export interface TimerSettings {
  churchName: string;
  /** "HH:MM", local time. */
  serviceStart: string;
  /** Minutes left when the display turns amber. */
  warnMin: number;
  keepRunning: boolean;
  /** Off by default: shortcuts firing while typing caused real problems. */
  shortcuts: boolean;
  font: FontKey;
  colors: DisplayColors;
  /** Data URL in local mode; replaced by a file-storage URL in Phase 1. */
  logo: string;
  show: DisplayToggles;
  /**
   * From the church's plan (signed in only; local mode has neither). On the
   * Free plan the display shows a small "Service Timer" mark, and own
   * colours and logo are locked.
   */
  showMark?: boolean;
  customBranding?: boolean;
}

export interface TimerState {
  items: ProgramItem[];
  index: number;
  timer: TimerRun;
  message: SpeakerMessage;
  templates: Template[];
  settings: TimerSettings;
  /** Client id of the last writer. */
  origin?: string;
  seq?: number;
}

export type ViewMode = "normal" | "warn" | "over";

export interface TimerView {
  mode: ViewMode;
  text: string;
  label: string;
  frac: number;
  hideTime: boolean;
  timeUp: boolean;
  sched: string;
  schedClass: "" | "behind" | "ahead";
  next: { name: string; person: string } | null;
}
