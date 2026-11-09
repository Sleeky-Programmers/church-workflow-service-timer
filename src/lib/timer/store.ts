"use client";

/**
 * Local-first timer store. Every change goes through dispatch(), which
 *   1. applies an action to a copy of the state,
 *   2. saves it on this device, so it survives restarts with no internet,
 *   3. broadcasts it to the display window on the same laptop
 *      (BroadcastChannel, which needs no network).
 * Phase 1 adds a fourth step, sending it to the server for phones, without
 * changing any screen.
 */
import { create } from "zustand";
import type { Recipe } from "./actions";
import { now } from "./clock";
import { normalise, uid } from "./defaults";
import type { TimerState } from "./types";

export const STORAGE_KEY = "serviceTimer.v1";
const CHANNEL_NAME = "service-timer";

export const clientId = uid() + uid();

type Role = "control" | "display";
type ChannelMessage = { type: "state"; state: TimerState } | { type: "hello" };

interface TimerStore {
  state: TimerState | null;
  role: Role | null;
  /** Loads saved state and starts listening to other windows. Returns a cleanup. */
  init: (role: Role) => () => void;
  dispatch: (recipe: Recipe) => void;
}

let channel: BroadcastChannel | null = null;

function loadLocal(): TimerState {
  try {
    return normalise(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return normalise(null);
  }
}

function saveLocal(state: TimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

export const useTimerStore = create<TimerStore>()((set, get) => ({
  state: null,
  role: null,

  init: (role) => {
    set({ role, state: loadLocal() });

    const adopt = (incoming: unknown) => {
      const s = normalise(incoming);
      if (s.origin === clientId) return; // Our own change echoed back
      set({ state: s });
    };

    if (typeof BroadcastChannel !== "undefined") {
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

    // Fallback for browsers without BroadcastChannel: the storage event
    // fires in every other window of this origin.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
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
    const { state, role } = get();
    if (!state || role !== "control") return;
    const draft = structuredClone(state);
    recipe(draft, now());
    draft.origin = clientId;
    draft.seq = (state.seq ?? 0) + 1;
    set({ state: draft });
    saveLocal(draft);
    post({ type: "state", state: draft });
  },
}));
