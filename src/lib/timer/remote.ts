/**
 * Maps between the one state object the screens draw from and the API's
 * three parts: settings (per branch), templates (per church) and the live
 * session (per branch). The session carries serviceStart, because loading a
 * template changes it.
 */
import { defaultState, FONTS } from "./defaults";
import type {
  DisplayColors,
  DisplayToggles,
  FontKey,
  ProgramItem,
  SpeakerMessage,
  TemplateItem,
  TimerRun,
  TimerSettings,
  TimerState,
} from "./types";

export interface ServerSettings {
  churchName: string;
  churchNameOverride: string | null;
  serviceStart: string;
  warnMin: number;
  keepRunning: boolean;
  shortcuts: boolean;
  font: FontKey;
  colors: DisplayColors;
  show: DisplayToggles;
  logoUrl: string | null;
  hasOwnLogo: boolean;
  hasPin: boolean;
  displayToken?: string;
  plan?: { key: string; name: string; customBranding: boolean; showMark: boolean };
}

export interface ServerSession {
  items: ProgramItem[];
  index: number;
  timer: TimerRun;
  message: SpeakerMessage;
  serviceStart: string;
  version: number;
  origin: string | null;
}

export interface ServerTemplate {
  id: string;
  name: string;
  serviceStart: string;
  items: TemplateItem[];
}

/** An empty program, for a signed-in device before the server answers. */
export function emptyState(): TimerState {
  const s = defaultState();
  s.items = [];
  s.templates = [];
  return s;
}

/** Settings from the server; the session's serviceStart is kept. */
export function applySettings(state: TimerState, s: ServerSettings): TimerState {
  return {
    ...state,
    settings: {
      ...state.settings,
      churchName: s.churchName,
      warnMin: s.warnMin,
      keepRunning: s.keepRunning,
      shortcuts: s.shortcuts,
      font: s.font in FONTS ? s.font : "condensed",
      colors: { ...state.settings.colors, ...s.colors },
      show: { ...state.settings.show, ...s.show },
      logo: s.logoUrl || "",
      showMark: s.plan?.showMark ?? false,
      customBranding: s.plan?.customBranding ?? true,
    },
  };
}

export function applySession(state: TimerState, s: ServerSession): TimerState {
  return {
    ...state,
    items: s.items.map((i) => ({ id: i.id, name: i.name, person: i.person ?? "", minutes: i.minutes })),
    index: s.index,
    timer: { ...s.timer, firstStartedAt: s.timer.firstStartedAt ?? null },
    message: { ...s.message },
    settings: { ...state.settings, serviceStart: s.serviceStart },
    origin: s.origin ?? undefined,
  };
}

export function applyTemplates(state: TimerState, templates: ServerTemplate[]): TimerState {
  return { ...state, templates: templates.map((t) => ({ ...t, items: t.items.map((i) => ({ ...i })) })) };
}

/** The live session to send, trimmed to what the API accepts. */
export function sessionPayload(state: TimerState, origin: string) {
  return {
    items: state.items.slice(0, 200).map((i) => ({
      id: i.id.slice(0, 40),
      name: i.name.slice(0, 120),
      person: (i.person || "").slice(0, 80),
      minutes: Math.min(600, Math.max(0, Number(i.minutes) || 0)),
    })),
    index: Math.max(0, state.index),
    timer: {
      running: state.timer.running,
      startedAt: state.timer.running ? state.timer.startedAt : null,
      elapsedBefore: Math.max(0, state.timer.elapsedBefore),
      extraMs: state.timer.extraMs,
      firstStartedAt: state.timer.firstStartedAt ?? null,
    },
    message: { text: state.message.text.slice(0, 80), shown: state.message.shown },
    serviceStart: state.settings.serviceStart,
    origin,
  };
}

const sessionKey = (s: TimerState) =>
  JSON.stringify([s.items, s.index, s.timer, s.message, s.settings.serviceStart]);

export function sessionChanged(a: TimerState, b: TimerState) {
  return sessionKey(a) !== sessionKey(b);
}

/** Settings stored on the server (the logo goes through its own upload). */
const SETTINGS_KEYS = ["churchName", "warnMin", "keepRunning", "shortcuts", "font", "colors", "show"] as const;
type SyncedSettings = Pick<TimerSettings, (typeof SETTINGS_KEYS)[number]>;

/** What changed in the server-side settings, or null if nothing did. */
export function settingsDiff(a: TimerSettings, b: TimerSettings): Partial<SyncedSettings> | null {
  const out: Partial<SyncedSettings> = {};
  for (const k of SETTINGS_KEYS) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) (out as Record<string, unknown>)[k] = b[k];
  }
  return Object.keys(out).length ? out : null;
}

/** Re-applies changes not yet sent over settings that just came from the server. */
export function overlaySettings(state: TimerState, pending: Partial<SyncedSettings> | null): TimerState {
  if (!pending) return state;
  return { ...state, settings: { ...state.settings, ...pending } };
}
