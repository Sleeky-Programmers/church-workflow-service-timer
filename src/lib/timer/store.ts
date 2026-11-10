"use client";

/**
 * Local-first timer store. Every change goes through dispatch(), which
 *   1. applies an action to a copy of the state,
 *   2. saves it on this device, so it survives a restart with no internet,
 *   3. broadcasts it to the display window on the same laptop
 *      (BroadcastChannel, which needs no network),
 *   4. hands it to live sync (sync.ts), when this device is signed in.
 * Changes from other devices come in through replace(), which does 2 and 3.
 */
import { create } from "zustand";
import type { Recipe } from "./actions";
import { now } from "./clock";
import { normalise, uid } from "./defaults";
import type { TimerState } from "./types";

/** Where local mode (no account) keeps its program. */
export const LOCAL_KEY = "serviceTimer.v1";
/** The latest state on this laptop, which a display window loads first. */
export const DISPLAY_KEY = "serviceTimer.display.v1";
const CHANNEL_NAME = "service-timer";

export const clientId = uid() + uid();

export type Role = "control" | "display";
export type Conn = "local" | "connecting" | "online" | "offline" | "denied";

export interface Access {
  kind: "local" | "admin" | "operator" | "display";
  /** Start, pause, move between items, edit the program, send notes. */
  canControl: boolean;
  /** Change the display's look and save templates (signed-in operators and admins). */
  canEditSettings: boolean;
  /** Set the operator PIN and change the links (timer admins). */
  canManage: boolean;
}

export const LOCAL_ACCESS: Access = { kind: "local", canControl: true, canEditSettings: true, canManage: true };

type ChannelMessage = { type: "state"; state: TimerState } | { type: "hello" };

interface InitOptions {
  /** localStorage key for this device's copy, or null to keep nothing. */
  storageKey: string | null;
  /** Talk to other windows on this laptop. */
  channel?: boolean;
  /** State to start from when nothing is saved yet. */
  fresh?: () => TimerState;
}

interface TimerStore {
  state: TimerState | null;
  role: Role | null;
  conn: Conn;
  access: Access;
  /** Why the server turned this device away, if it did. */
  denied: string | null;
  /** Display link token and whether an operator PIN is set (signed-in admins). */
  sharing: { displayToken?: string; hasPin: boolean };
  /** Unsent changes exist (shown as a warning while offline). */
  unsynced: boolean;
  init: (role: Role, opts: InitOptions) => () => void;
  dispatch: (recipe: Recipe) => void;
  replace: (next: TimerState) => void;
  setMeta: (meta: Partial<Pick<TimerStore, "conn" | "access" | "denied" | "sharing" | "unsynced">>) => void;
}

let channel: BroadcastChannel | null = null;
let storageKey: string | null = null;
let localChange: ((prev: TimerState, next: TimerState) => void) | null = null;

/** Live sync registers here to hear about every local change. */
export function onLocalChange(fn: (prev: TimerState, next: TimerState) => void) {
  localChange = fn;
  return () => {
    if (localChange === fn) localChange = null;
  };
}

export function loadSaved(key: string, fresh?: () => TimerState): TimerState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return normalise(JSON.parse(raw));
  } catch {
    // Unreadable: start fresh.
  }
  return fresh ? fresh() : normalise(null);
}

function save(key: string | null, state: TimerState) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the timer keeps running from memory.
  }
}

function post(msg: ChannelMessage) {
  try {
    channel?.postMessage(msg);
  } catch {
    // Channel closed while the window was unloading.
  }
}

export const useTimerStore = create<TimerStore>()((set, get) => {
  /** Saves and shares a new state with the other windows on this laptop. */
  const publish = (next: TimerState) => {
    set({ state: next });
    save(storageKey, next);
    if (get().role === "control") {
      save(DISPLAY_KEY, next);
      post({ type: "state", state: next });
    }
  };

  return {
    state: null,
    role: null,
    conn: "local",
    access: LOCAL_ACCESS,
    denied: null,
    sharing: { hasPin: false },
    unsynced: false,

    init: (role, opts) => {
      storageKey = opts.storageKey;
      set({
        role,
        state: opts.storageKey ? loadSaved(opts.storageKey, opts.fresh) : (opts.fresh?.() ?? normalise(null)),
        conn: "local",
        access: LOCAL_ACCESS,
        denied: null,
        unsynced: false,
      });

      const adopt = (incoming: unknown) => {
        const s = normalise(incoming);
        if (s.origin === clientId) return; // Our own change echoed back
        set({ state: s });
        save(storageKey, s);
      };

      if (opts.channel && typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (e: MessageEvent<ChannelMessage>) => {
          const msg = e.data;
          if (!msg || typeof msg !== "object") return;
          if (msg.type === "state") adopt(msg.state);
          else if (msg.type === "hello" && get().role === "control") {
            const st = get().state;
            if (st) post({ type: "state", state: st });
          }
        };
        // A display asks for the latest state as soon as it opens.
        if (role === "display") post({ type: "hello" });
      }

      // Fallback for browsers without BroadcastChannel.
      const onStorage = (e: StorageEvent) => {
        if (role !== "display" || e.key !== storageKey || !e.newValue) return;
        try {
          adopt(JSON.parse(e.newValue));
        } catch {
          // Ignore a half-written value.
        }
      };
      window.addEventListener("storage", onStorage);

      return () => {
        window.removeEventListener("storage", onStorage);
        channel?.close();
        channel = null;
      };
    },

    dispatch: (recipe) => {
      const { state, role, access } = get();
      if (!state || role !== "control" || !access.canControl) return;
      const draft = structuredClone(state);
      recipe(draft, now());
      draft.origin = clientId;
      draft.seq = (state.seq ?? 0) + 1;
      publish(draft);
      localChange?.(state, draft);
    },

    replace: (next) => publish(next),

    setMeta: (meta) => set(meta),
  };
});
