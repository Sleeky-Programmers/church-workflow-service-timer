/**
 * Timing rules (Developer Handoff, section 5), ported exactly from the
 * prototype's view(). Pure functions: every one takes `now` explicitly so
 * the rules can be unit-tested and every screen computes the same seconds.
 */
import type { ProgramItem, TimerRun, TimerState, TimerView } from "./types";

export function elapsed(t: TimerRun, now: number): number {
  return t.elapsedBefore + (t.running && t.startedAt ? now - t.startedAt : 0);
}

export function currentItem(s: TimerState): ProgramItem | null {
  return s.items[s.index] || null;
}

/** The item's default minutes, without any +/− adjustments. */
export function baseMs(s: TimerState): number {
  const it = currentItem(s);
  return it ? Math.max(0, Number(it.minutes) || 0) * 60000 : 0;
}

/** Time allowed for this run: default minutes plus adjustments. */
export function allotted(s: TimerState): number {
  return Math.max(0, baseMs(s) + (s.timer.extraMs || 0));
}

/** Service start (on the day of `now`, local time) plus every earlier item's default minutes. */
export function plannedStart(s: TimerState, i: number, now: number): number {
  const [h, m] = String(s.settings.serviceStart || "09:00").split(":").map(Number);
  const d = new Date(now);
  d.setHours(h || 0, m || 0, 0, 0);
  let t = d.getTime();
  for (let k = 0; k < i && k < s.items.length; k++) t += (Number(s.items[k].minutes) || 0) * 60000;
  return t;
}

/**
 * When the current item will end (by its default minutes) against when the
 * next one was planned to start. Positive = behind, negative = ahead.
 * Null until the first item has started.
 */
export function variance(s: TimerState, now: number): number | null {
  if (!s.items.length) return null;
  const el = elapsed(s.timer, now);
  if (s.index === 0 && el === 0 && !s.timer.running) return null;
  return now + Math.max(0, baseMs(s) - el) - plannedStart(s, s.index + 1, now);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** MM:SS, with hours only when needed (1:05:00). */
export function fmt(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function minsText(n: number): string {
  return n === 1 ? "1 min" : `${n} mins`;
}

export const MINUS = "−";

/** Everything a screen needs to draw the timer at moment `now`. */
export function computeView(s: TimerState, now: number): TimerView {
  const sh = s.settings.show;
  const al = allotted(s);
  const el = elapsed(s.timer, now);
  const rem = al - el;
  const v: TimerView = {
    mode: "normal",
    text: "--:--",
    label: "",
    frac: 0,
    hideTime: false,
    timeUp: false,
    sched: "",
    schedClass: "",
    next: null,
  };
  if (!s.items.length) {
    v.label = "Add items to the program";
    return v;
  }
  if (rem > 0) {
    v.mode = rem <= (Number(s.settings.warnMin) || 0) * 60000 ? "warn" : "normal";
    // Round up so the screen never shows 00:00 while time is left.
    v.text = fmt(Math.ceil(rem / 1000) * 1000);
    v.label = s.timer.running ? "remaining" : el > 0 ? "paused" : "ready";
    v.frac = al ? el / al : 0;
    v.hideTime = !sh.timeLeft;
  } else {
    v.mode = "over";
    v.frac = 1;
    v.timeUp = true;
    if (sh.overTime) {
      v.text = MINUS + fmt(-rem);
      v.label = s.timer.running ? "over time" : "over time (paused)";
    } else {
      v.text = "00:00";
      v.label = "";
    }
  }
  const vr = variance(s, now);
  if (vr !== null) {
    const m = Math.round(Math.abs(vr) / 60000);
    v.sched = m < 1 ? "On schedule" : vr > 0 ? `${minsText(m)} behind` : `${minsText(m)} ahead`;
    v.schedClass = m < 1 ? "" : vr > 0 ? "behind" : "ahead";
  }
  const nx = s.items[s.index + 1];
  v.next = nx ? { name: nx.name, person: nx.person } : null;
  return v;
}

export function programSummary(s: TimerState, now: number): string {
  if (!s.items.length) return "No items yet. Add the first one below.";
  const total = s.items.reduce((a, i) => a + (Number(i.minutes) || 0), 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const len = h ? `${h}h ${m}m` : `${m} mins`;
  const end = plannedStart(s, s.items.length, now);
  return `${s.items.length} items, ${len} in total. Planned to end at ${hhmm(end)}.`;
}
