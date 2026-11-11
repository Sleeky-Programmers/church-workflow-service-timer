"use client";

/**
 * Live sync with the API over Socket.IO, following the rules the prototype
 * learned in live services (Developer Handoff, section 6):
 *
 * - Every message carries the server's clock; this device corrects its own.
 * - The latest write wins, and a device that comes back with unsent changes
 *   sends them rather than being overwritten. Unsent changes survive a
 *   reload, so a laptop that loses the internet keeps everything.
 * - Socket.IO pings every 5 seconds; we also reconnect as soon as the page
 *   is visible again or the network returns.
 * - Settings and templates go over REST. Templates are only saved online.
 */
import { io, type Socket } from "socket.io-client";
import { apiOrigin, ApiError, freshAccessToken, tokens } from "@/lib/api/client";
import { timerApi } from "@/lib/api/endpoints";
import { lastCanManage } from "@/lib/auth/session";
import { now, syncToServer } from "./clock";
import { runToRecord, type ItemRun } from "./runs";
import {
  applySession,
  applySettings,
  applyTemplates,
  overlaySettings,
  sessionChanged,
  sessionPayload,
  settingsDiff,
  type ServerSession,
  type ServerSettings,
  type ServerTemplate,
} from "./remote";
import { clientId, onLocalChange, useTimerStore, type Access } from "./store";

export type SyncAuth =
  | { kind: "admin" }
  | { kind: "operator"; displayToken: string; operatorToken: string }
  | { kind: "display"; displayToken: string };

interface SyncOptions {
  /** Where unsent changes are kept across reloads. */
  pendingKey: string;
  /** The server turned this device away (expired PIN session, no access, bad link). */
  onDenied?: (message: string) => void;
  /** A signed-in user's session could not be refreshed. */
  onSignedOut?: () => void;
}

type PendingSettings = ReturnType<typeof settingsDiff>;

interface Hello {
  settings: ServerSettings;
  session: ServerSession;
  templates: ServerTemplate[];
  access: { kind: Access["kind"]; canControl: boolean; canManage: boolean };
  serverNow: number;
}

const RETRY_MS = 3000;

let active: { applySettings: (s: ServerSettings) => void } | null = null;

/** Applies settings returned by a REST call (e.g. a logo upload) right away. */
export function applyServerSettings(s: ServerSettings) {
  active?.applySettings(s);
}

export function startSync(auth: SyncAuth, opts: SyncOptions): () => void {
  const store = useTimerStore;
  const state = () => store.getState().state!;

  // Unsent changes, kept across reloads.
  let unsyncedSession = false;
  let pendingSettings: PendingSettings = null;
  // Item runs for service reports, not yet saved on the server.
  let pendingRuns: ItemRun[] = [];
  try {
    const saved = JSON.parse(localStorage.getItem(opts.pendingKey) || "null");
    unsyncedSession = !!saved?.session;
    pendingSettings = saved?.settings ?? null;
    pendingRuns = Array.isArray(saved?.runs) ? saved.runs : [];
  } catch {
    // Nothing saved.
  }
  const savePending = () => {
    try {
      localStorage.setItem(
        opts.pendingKey,
        JSON.stringify({ session: unsyncedSession, settings: pendingSettings, runs: pendingRuns }),
      );
    } catch {
      // Storage blocked: pending changes live in memory only.
    }
    store.getState().setMeta({ unsynced: unsyncedSession || !!pendingSettings });
  };

  let stopped = false;
  let denied = false;
  let changeSeq = 0;
  let pushing = false;
  let pushAgain = false;
  let pushTimer: ReturnType<typeof setTimeout> | undefined;
  let settingsTimer: ReturnType<typeof setTimeout> | undefined;

  store.getState().setMeta({
    conn: "connecting",
    denied: null,
    // Until the server says otherwise: displays watch, others wait to be told.
    access: { kind: auth.kind, canControl: auth.kind !== "display", canEditSettings: false, canManage: false },
  });
  savePending();

  const socket: Socket = io(`${apiOrigin()}/service-timer`, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: (cb) => {
      if (auth.kind === "operator") return cb({ operatorToken: auth.operatorToken });
      if (auth.kind === "display") return cb({ displayToken: auth.displayToken });
      freshAccessToken()
        .then((token) => cb({ token }))
        .catch((err) => {
          // Signed out: stop. Can't refresh right now (offline): try with
          // the token we have; if the server says it expired, recoverSession
          // refreshes and reconnects once the network is back.
          if (err instanceof ApiError && err.status === 401) {
            stop();
            opts.onSignedOut?.();
          } else cb({ token: tokens.access() ?? undefined });
        });
    },
  });

  const applySettingsFromServer = (s: ServerSettings) => {
    store.getState().replace(overlaySettings(applySettings(state(), s), pendingSettings));
    const sharing = store.getState().sharing;
    store.getState().setMeta({
      sharing: { displayToken: s.displayToken ?? sharing.displayToken, hasPin: s.hasPin },
    });
  };
  active = { applySettings: applySettingsFromServer };

  // --------------------------------------------------------------- sending

  const schedulePush = (delay = 120) => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushSession, delay);
  };

  async function pushSession() {
    if (stopped || !socket.connected || !unsyncedSession) return;
    if (pushing) {
      pushAgain = true;
      return;
    }
    pushing = true;
    const seqAtSend = changeSeq;
    let retry = false;
    try {
      const ack = await socket
        .timeout(8000)
        .emitWithAck("session:push", sessionPayload(state(), clientId));
      if (ack?.ok) {
        if (ack.serverNow) syncToServer(ack.serverNow);
        if (changeSeq === seqAtSend) unsyncedSession = false;
      } else if (!store.getState().access.canControl) {
        unsyncedSession = false; // Not allowed: nothing to resend.
      } else retry = true;
    } catch {
      retry = true; // No answer in time
    } finally {
      pushing = false;
      savePending();
      if (pushAgain || (unsyncedSession && changeSeq !== seqAtSend)) {
        pushAgain = false;
        schedulePush(0);
      } else if (retry) schedulePush(RETRY_MS);
    }
  }

  const scheduleSettings = (delay = 450) => {
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(flushSettings, delay);
  };

  async function flushSettings() {
    if (stopped || !pendingSettings || !socket.connected) return;
    if (!store.getState().access.canEditSettings) return;
    const sending = pendingSettings;
    pendingSettings = null;
    savePending();
    try {
      applySettingsFromServer(await timerApi.updateSettings(sending));
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      // Network trouble or a server error: keep the change and try again.
      if (status === 0 || status >= 500) {
        pendingSettings = { ...sending, ...(pendingSettings ?? {}) };
        scheduleSettings(RETRY_MS);
      }
      savePending();
    }
  }

  let runsTimer: ReturnType<typeof setTimeout> | undefined;
  let pushingRuns = false;
  const scheduleRuns = (delay = 300) => {
    clearTimeout(runsTimer);
    runsTimer = setTimeout(pushRuns, delay);
  };

  async function pushRuns() {
    if (stopped || pushingRuns || !socket.connected || !pendingRuns.length) return;
    if (!store.getState().access.canControl) return;
    pushingRuns = true;
    const sending = pendingRuns.slice(0, 50);
    let retry = false;
    try {
      const ack = await socket.timeout(8000).emitWithAck("runs:push", { runs: sending });
      if (ack?.ok) {
        // Keep any run that got a newer snapshot while this was in flight.
        pendingRuns = pendingRuns.filter((r) => !sending.includes(r));
      } else retry = true;
    } catch {
      retry = true;
    } finally {
      pushingRuns = false;
      savePending();
      if (retry) scheduleRuns(RETRY_MS * 3);
      else if (pendingRuns.length) scheduleRuns(0);
    }
  }

  const offLocal = onLocalChange((prev, next) => {
    const run = runToRecord(prev, next, now());
    if (run) {
      pendingRuns = [...pendingRuns.filter((r) => r.id !== run.id), run].slice(-200);
      scheduleRuns();
    }
    if (sessionChanged(prev, next)) {
      unsyncedSession = true;
      changeSeq += 1;
      schedulePush();
    }
    const diff = settingsDiff(prev.settings, next.settings);
    if (diff && store.getState().access.canEditSettings) {
      pendingSettings = { ...(pendingSettings ?? {}), ...diff };
      scheduleSettings();
    }
    savePending();
  });

  // ------------------------------------------------------------- receiving

  socket.on("hello", (h: Hello) => {
    syncToServer(h.serverNow);
    const access: Access = {
      kind: h.access.kind,
      canControl: h.access.canControl,
      canManage: h.access.canManage,
      canEditSettings: h.access.kind === "admin" && h.access.canControl,
    };
    store.getState().setMeta({ conn: "online", denied: null, access });
    if (h.access.kind === "admin") lastCanManage.set(h.access.canManage);

    let next = overlaySettings(applySettings(state(), h.settings), pendingSettings);
    if (h.access.kind !== "display") next = applyTemplates(next, h.templates);
    // A device with unsent changes sends them instead of taking the server's copy.
    if (!(unsyncedSession && access.canControl)) {
      unsyncedSession = false;
      next = applySession(next, h.session);
    }
    store.getState().replace(next);
    store.getState().setMeta({
      sharing: { displayToken: h.settings.displayToken, hasPin: h.settings.hasPin },
    });
    savePending();
    if (unsyncedSession) schedulePush(0);
    if (pendingSettings) scheduleSettings(0);
    if (pendingRuns.length) scheduleRuns(500);
  });

  socket.on("session", ({ session, serverNow }: { session: ServerSession; serverNow: number }) => {
    syncToServer(serverNow);
    if (session.origin === clientId || unsyncedSession) return;
    store.getState().replace(applySession(state(), session));
  });

  socket.on("settings", ({ settings, serverNow }: { settings: ServerSettings; serverNow: number }) => {
    syncToServer(serverNow);
    applySettingsFromServer(settings);
  });

  socket.on("templates", ({ templates, serverNow }: { templates: ServerTemplate[]; serverNow: number }) => {
    syncToServer(serverNow);
    if (auth.kind !== "display") store.getState().replace(applyTemplates(state(), templates));
  });

  // An expired sign-in is not a reason to give up mid-service: refresh the
  // token and reconnect, retrying while the network is down. Only a refused
  // refresh (signed out elsewhere, account removed) ends the session.
  let recovering = false;
  async function recoverSession() {
    if (stopped) return;
    recovering = true;
    store.getState().setMeta({ conn: "offline" });
    try {
      await freshAccessToken();
      recovering = false;
      if (!stopped) socket.connect();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        recovering = false;
        stop();
        opts.onSignedOut?.();
      } else setTimeout(recoverSession, RETRY_MS);
    }
  }

  socket.on("denied", ({ message }: { message: string }) => {
    if (auth.kind === "admin" && /expired/i.test(message)) {
      void recoverSession();
      return;
    }
    denied = true;
    store.getState().setMeta({ conn: "denied", denied: message });
    opts.onDenied?.(message);
  });

  socket.on("disconnect", (reason) => {
    if (stopped) return;
    if (!denied) store.getState().setMeta({ conn: "offline" });
    // The server ends guest connections when the PIN or links change:
    // reconnect, and it will either welcome us back or say why not.
    if (reason === "io server disconnect" && !denied && !recovering) setTimeout(() => socket.connect(), 500);
  });

  socket.on("connect_error", () => {
    if (!stopped && !denied) store.getState().setMeta({ conn: "offline" });
  });

  const wake = () => {
    if (!stopped && !denied && !document.hidden && !socket.connected) socket.connect();
  };
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("online", wake);

  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimeout(pushTimer);
    clearTimeout(settingsTimer);
    clearTimeout(runsTimer);
    offLocal();
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("online", wake);
    socket.removeAllListeners();
    socket.disconnect();
    if (active?.applySettings === applySettingsFromServer) active = null;
  }

  return stop;
}
