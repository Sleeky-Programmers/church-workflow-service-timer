/**
 * Every change to the timer, as a function that edits a draft copy of the
 * state. The store clones the state, applies one of these, then saves and
 * broadcasts the result (see store.ts). Ported from the prototype's handlers.
 */
import { freshTimer, uid } from "./defaults";
import { baseMs, currentItem } from "./timing";
import type { ProgramItem, TimerSettings, TimerState } from "./types";

export type Recipe = (draft: TimerState, now: number) => void;

export const toggleRun: Recipe = (s, now) => {
  const t = s.timer;
  if (!s.items.length) return;
  if (t.running) {
    t.elapsedBefore += now - (t.startedAt ?? now);
    t.running = false;
    t.startedAt = null;
  } else {
    t.running = true;
    t.startedAt = now;
  }
};

/** Moving between items resets the timer; with "keep running" on, the new item starts at once. */
export const goTo =
  (i: number): Recipe =>
  (s, now) => {
    if (i < 0 || i >= s.items.length) return;
    const was = s.timer.running;
    s.index = i;
    s.timer = freshTimer();
    if (was && s.settings.keepRunning) {
      s.timer.running = true;
      s.timer.startedAt = now;
    }
  };

/** Adjusts this run only; the item's minutes (and any template) stay as they are. */
export const addTime =
  (min: number): Recipe =>
  (s) => {
    const t = s.timer;
    t.extraMs = (t.extraMs || 0) + min * 60000;
    if (baseMs(s) + t.extraMs < 0) t.extraMs = -baseMs(s);
  };

export const resetItem: Recipe = (s) => {
  s.timer = freshTimer();
};

export const showMessage =
  (text: string): Recipe =>
  (s) => {
    const t = text.trim();
    if (!t) return;
    s.message = { text: t, shown: true };
  };

export const hideMessage: Recipe = (s) => {
  s.message.shown = false;
};

export const addItem =
  (item: ProgramItem): Recipe =>
  (s) => {
    s.items.push(item);
  };

export const updateItem =
  (id: string, patch: Partial<Omit<ProgramItem, "id">>): Recipe =>
  (s) => {
    const it = s.items.find((x) => x.id === id);
    if (!it) return;
    Object.assign(it, patch);
    if (patch.minutes !== undefined) it.minutes = Math.max(0, Number(patch.minutes) || 0);
  };

/** Keeps the current item selected after a move or delete. */
function keepCurrent(s: TimerState, curId: string | undefined) {
  const ni = s.items.findIndex((x) => x.id === curId);
  s.index = ni >= 0 ? ni : Math.min(s.index, Math.max(0, s.items.length - 1));
}

export const moveItem =
  (id: string, dir: -1 | 1): Recipe =>
  (s) => {
    const i = s.items.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.items.length) return;
    const curId = currentItem(s)?.id;
    [s.items[i], s.items[j]] = [s.items[j], s.items[i]];
    keepCurrent(s, curId);
  };

export const deleteItem =
  (id: string): Recipe =>
  (s) => {
    const i = s.items.findIndex((x) => x.id === id);
    if (i < 0) return;
    const curId = currentItem(s)?.id;
    s.items.splice(i, 1);
    if (i === s.index) s.timer = freshTimer();
    keepCurrent(s, curId);
  };

export const clearProgram: Recipe = (s) => {
  s.items = [];
  s.index = 0;
  s.timer = freshTimer();
};

/** Saves the current program as a template, replacing one with the same name. */
export const saveTemplate =
  (name: string, id: string = uid()): Recipe =>
  (s) => {
    const tpl = {
      name,
      serviceStart: s.settings.serviceStart,
      items: s.items.map((i) => ({ name: i.name, minutes: i.minutes, person: i.person || "" })),
    };
    const existing = s.templates.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) Object.assign(existing, tpl);
    else s.templates.push({ id, ...tpl });
  };

/** Templates are copies: loading gives the items new ids, so editing the program never changes the template. */
export const loadTemplate =
  (templateId: string): Recipe =>
  (s) => {
    const t = s.templates.find((x) => x.id === templateId);
    if (!t) return;
    s.items = t.items.map((i) => ({ id: uid(), name: i.name, minutes: i.minutes, person: i.person || "" }));
    if (t.serviceStart) s.settings.serviceStart = t.serviceStart;
    s.index = 0;
    s.timer = freshTimer();
    s.message.shown = false;
  };

/** Replaces the program with new items (e.g. from smart import), like loading a template. */
export const replaceProgram =
  (items: { name: string; person: string; minutes: number }[], serviceStart?: string): Recipe =>
  (s) => {
    s.items = items.map((i) => ({
      id: uid(),
      name: i.name,
      person: i.person || "",
      minutes: Math.max(0, Number(i.minutes) || 0),
    }));
    if (serviceStart) s.settings.serviceStart = serviceStart;
    s.index = 0;
    s.timer = freshTimer();
    s.message.shown = false;
  };

export const deleteTemplate =
  (templateId: string): Recipe =>
  (s) => {
    s.templates = s.templates.filter((x) => x.id !== templateId);
  };

export const updateSettings =
  (patch: Partial<TimerSettings>): Recipe =>
  (s) => {
    Object.assign(s.settings, patch);
  };
