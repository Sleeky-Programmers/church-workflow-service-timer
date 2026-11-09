"use client";

import { useState } from "react";
import { useNow } from "@/hooks/use-now";
import { addTime, goTo, hideMessage, resetItem, showMessage, toggleRun } from "@/lib/timer/actions";
import { QUICK_NOTES } from "@/lib/timer/defaults";
import { useTimerStore } from "@/lib/timer/store";
import { computeView, currentItem, elapsed, MINUS } from "@/lib/timer/timing";

/** The current item, its countdown, the transport buttons and notes to the speaker. */
export function NowPanel() {
  const state = useTimerStore((s) => s.state)!;
  const dispatch = useTimerStore((s) => s.dispatch);
  const now = useNow();
  const [msgText, setMsgText] = useState("");

  const it = currentItem(state);
  const v = computeView(state, now);
  const ex = Math.round((state.timer.extraMs || 0) / 60000);
  const startLabel = state.timer.running ? "Pause" : elapsed(state.timer, now) > 0 ? "Resume" : "Start";

  const label =
    (v.timeUp ? "Time up" + (v.label ? ", " + v.label : "") : v.label) +
    (v.hideTime ? " (countdown hidden on display)" : "");

  const sendNote = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMsgText(t);
    dispatch(showMessage(t));
  };

  return (
    <section id="now" className={`panel now ${v.mode === "normal" ? "" : v.mode}`} aria-label="Current item">
      <div className="now-item">{it ? it.name : "No items yet"}</div>
      <div className="now-person">{it?.person || ""}</div>
      <div className="now-time">{v.text}</div>
      <div className="now-label">
        {label}
        {ex ? <span className="adj">{`  ${ex > 0 ? "+" : MINUS}${Math.abs(ex)} min adjusted`}</span> : null}
      </div>
      <div className="now-bar">
        <span style={{ width: `${(Math.min(1, v.frac) * 100).toFixed(2)}%` }} />
      </div>
      <div className="now-meta">
        <span>
          {v.next
            ? "Next: " + v.next.name + (v.next.person ? " · " + v.next.person : "")
            : state.items.length
              ? "Last item"
              : ""}
        </span>
        <span className={v.schedClass}>{v.sched}</span>
      </div>

      <div className="transport">
        <button className="btn" aria-label="Previous item" onClick={() => dispatch(goTo(state.index - 1))}>
          ◀ Prev
        </button>
        <button className="btn primary" onClick={() => dispatch(toggleRun)}>
          {startLabel}
        </button>
        <button className="btn" aria-label="Next item" onClick={() => dispatch(goTo(state.index + 1))}>
          Next ▶
        </button>
      </div>
      <div className="row">
        <button className="btn" onClick={() => dispatch(addTime(-1))}>
          {MINUS}1 min
        </button>
        <button className="btn" onClick={() => dispatch(addTime(1))}>
          +1 min
        </button>
        <button className="btn" onClick={() => dispatch(addTime(5))}>
          +5 min
        </button>
        <button className="btn quiet" onClick={() => dispatch(resetItem)}>
          Reset
        </button>
      </div>

      <div className="msgbox">
        <h2>Message to the speaker</h2>
        <div className="chips">
          {QUICK_NOTES.map((n) => (
            <button key={n} className="chip" onClick={() => sendNote(n)}>
              {n}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Type a short message"
          maxLength={80}
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendNote(msgText);
          }}
        />
        <div className="row">
          <button className="btn" onClick={() => sendNote(msgText)}>
            Show message
          </button>
          <button className="btn quiet" onClick={() => dispatch(hideMessage)}>
            Hide
          </button>
        </div>
      </div>
      {state.settings.shortcuts ? (
        <p className="kbd">Shortcuts: Space start/pause · N next · P previous · + / {MINUS} one minute</p>
      ) : null}
    </section>
  );
}
