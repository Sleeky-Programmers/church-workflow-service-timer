"use client";

import { useEffect } from "react";
import { addTime, goTo, toggleRun } from "@/lib/timer/actions";
import { useTimerStore } from "@/lib/timer/store";
import { NowPanel } from "./now-panel";
import { ProgramPanel } from "./program-panel";
import { DesignPanel, DisplayTogglesPanel, PhonePanel, ServiceSettingsPanel } from "./settings-panels";

const DISPLAY_WINDOW = "serviceTimerDisplay";

export function ControlPanel() {
  const ready = useTimerStore((s) => s.state !== null);
  const shortcuts = useTimerStore((s) => !!s.state?.settings.shortcuts);
  const init = useTimerStore((s) => s.init);
  const dispatch = useTimerStore((s) => s.dispatch);

  useEffect(() => init("control"), [init]);

  // Shortcuts are off by default and never act while any field has focus:
  // in live use, typing a note once fired "−" and jumped items.
  useEffect(() => {
    if (!shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (/INPUT|SELECT|TEXTAREA/.test(ae.tagName) || ae.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const index = useTimerStore.getState().state?.index ?? 0;
      if (e.code === "Space") {
        e.preventDefault();
        dispatch(toggleRun);
      } else if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") dispatch(goTo(index + 1));
      else if (e.key === "p" || e.key === "P" || e.key === "ArrowLeft") dispatch(goTo(index - 1));
      else if (e.key === "+" || e.key === "=") dispatch(addTime(1));
      else if (e.key === "-" || e.key === "_") dispatch(addTime(-1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcuts, dispatch]);

  const openDisplay = () => {
    const win = window.open("/display", DISPLAY_WINDOW, "popup,width=1280,height=720");
    if (!win) alert("The browser blocked the display window. Allow pop-ups for this page and try again.");
  };

  if (!ready) return null;

  return (
    <div id="control">
      <div className="c-head">
        <h1>Service timer</h1>
        <span className="conn">
          <i />
          <span>Local mode</span>
        </span>
        <button className="btn primary" onClick={openDisplay}>
          Open display
        </button>
      </div>

      <div className="c-grid">
        <NowPanel />
        <div className="right">
          <ProgramPanel />
          <DisplayTogglesPanel />
          <ServiceSettingsPanel />
          <DesignPanel />
          <PhonePanel />
        </div>
      </div>
    </div>
  );
}
