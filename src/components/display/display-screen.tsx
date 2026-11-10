"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useNow } from "@/hooks/use-now";
import { storageKeys } from "@/lib/auth/session";
import { FONTS } from "@/lib/timer/defaults";
import { emptyState } from "@/lib/timer/remote";
import { DISPLAY_KEY, useTimerStore } from "@/lib/timer/store";
import { startSync } from "@/lib/timer/sync";
import { computeView, currentItem, hhmm } from "@/lib/timer/timing";

/**
 * Where the display gets the timer from:
 * - local: the control laptop's window, over BroadcastChannel (no network)
 * - link: a display link, over the internet (no login)
 */
export type DisplaySource = { kind: "local" } | { kind: "link"; displayToken: string };

/**
 * What the speaker and congregation see. It keeps no timer of its own:
 * it redraws from the shared state about five times a second.
 */
export function DisplayScreen({ source }: { source: DisplaySource }) {
  const state = useTimerStore((s) => s.state);
  const denied = useTimerStore((s) => s.denied);
  const conn = useTimerStore((s) => s.conn);
  const init = useTimerStore((s) => s.init);
  const now = useNow();
  const rootRef = useRef<HTMLDivElement>(null);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [hintGone, setHintGone] = useState(false);

  const token = source.kind === "link" ? source.displayToken : "";
  useEffect(() => {
    if (!token) return init("display", { storageKey: DISPLAY_KEY, channel: true });
    const key = storageKeys.screen(token);
    const stopStore = init("display", { storageKey: key, fresh: emptyState });
    const stopSync = startSync({ kind: "display", displayToken: token }, { pendingKey: storageKeys.pending(key) });
    return () => {
      stopSync();
      stopStore();
    };
  }, [init, token]);

  // Full screen with F or double-click.
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  // The hint fades after a few seconds; the cursor hides when idle.
  useEffect(() => {
    const hint = setTimeout(() => setHintGone(true), 6000);
    let idle: ReturnType<typeof setTimeout>;
    const wake = () => {
      setCursorHidden(false);
      clearTimeout(idle);
      idle = setTimeout(() => setCursorHidden(true), 2500);
    };
    document.addEventListener("mousemove", wake);
    wake();
    return () => {
      clearTimeout(hint);
      clearTimeout(idle);
      document.removeEventListener("mousemove", wake);
    };
  }, []);

  // Match the page behind the display to the chosen background.
  const bg = state?.settings.colors.bg;
  useEffect(() => {
    if (bg) document.body.style.background = bg;
  }, [bg]);

  if (denied && source.kind === "link") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-md">
          <p className="text-lg font-semibold">This display can&apos;t show the timer</p>
          <p className="mt-2 text-sm text-muted-foreground">{denied}</p>
        </div>
      </div>
    );
  }

  if (!state) return null;

  const st = state.settings;
  const sh = st.show;
  const c = st.colors;
  const it = currentItem(state);
  const v = computeView(state, now);
  const noteShown = !!(state.message.shown && state.message.text);

  const look = {
    "--d-bg": c.bg,
    "--d-text": c.text,
    "--d-accent": c.accent,
    "--d-warn": c.warn,
    "--d-over": c.over,
    "--d-font": FONTS[st.font] || FONTS.condensed,
  } as CSSProperties;

  const rootClass = [
    v.mode === "warn" && "warn",
    v.mode === "over" && "over",
    noteShown && "has-msg",
    cursorHidden && "nocursor",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div id="display" ref={rootRef} className={rootClass} style={look} onDoubleClick={toggleFullscreen} aria-live="off">
      <header className="d-top">
        <div className="d-brand">
          {sh.logo && st.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL, sized by CSS
            <img src={st.logo} alt="" />
          ) : null}
          <span>{sh.church ? st.churchName : ""}</span>
        </div>
        <div className={`d-clock${sh.clock ? "" : " hidden"}`}>{hhmm(now)}</div>
      </header>

      <main className="d-main">
        {noteShown ? (
          // Keyed by text so the attention animation restarts for each new note.
          <div key={state.message.text} className="d-note">
            <div className="d-note-tag">Note for you</div>
            <div className="d-note-text">{state.message.text}</div>
          </div>
        ) : null}
        <div className="d-clockblock">
          <div className={`d-item${!sh.item || !it ? " hidden" : ""}`}>{it?.name ?? ""}</div>
          <div className={`d-person${!sh.person || !it?.person ? " hidden" : ""}`}>{it?.person ?? ""}</div>
          <div className={`d-up${v.timeUp ? "" : " hidden"}`}>Time up</div>
          <div className={`d-time${v.hideTime ? " hidden" : ""}`}>{v.text}</div>
          <div className={`d-label${sh.labels ? "" : " hidden"}`}>{v.label}</div>
          <div className={`d-bar${sh.progress ? "" : " hidden"}`}>
            <span style={{ width: `${(Math.min(1, v.frac) * 100).toFixed(2)}%` }} />
          </div>
        </div>
      </main>

      <footer className="d-bottom">
        <div className="d-next">
          {sh.next && state.items.length ? (
            <>
              <span className="d-next-tag">{v.next ? "Next" : "Last item"}</span>
              {v.next ? <b>{v.next.name}</b> : null}
              {v.next?.person && sh.person ? <span className="who">{v.next.person}</span> : null}
            </>
          ) : null}
        </div>
        <div className={`d-sched ${v.schedClass}${!sh.schedule || !v.sched ? " hidden" : ""}`}>{v.sched}</div>
      </footer>

      {source.kind === "link" && conn !== "online" ? (
        // The timer keeps counting from its last update; this only says it may be stale.
        <div className="d-hint">Reconnecting…</div>
      ) : (
        <div className={`d-hint${hintGone ? " gone" : ""}`}>Press F or double-click for full screen</div>
      )}
      {st.showMark ? <div className="d-mark">Service Timer</div> : null}
    </div>
  );
}
