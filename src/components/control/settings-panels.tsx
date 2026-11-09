"use client";

import { updateSettings } from "@/lib/timer/actions";
import { now } from "@/lib/timer/clock";
import { COLOR_LABELS, FONT_LABELS, PRESET_LABELS, PRESETS, SHOW_LABELS } from "@/lib/timer/defaults";
import { useTimerStore } from "@/lib/timer/store";
import { hhmm } from "@/lib/timer/timing";
import type { DisplayColors, DisplayToggles, FontKey } from "@/lib/timer/types";
import { SyncedInput } from "./synced-input";

/** The 11 switches for what shows on the display. */
export function DisplayTogglesPanel() {
  const show = useTimerStore((s) => s.state!.settings.show);
  const dispatch = useTimerStore((s) => s.dispatch);
  return (
    <details className="panel" open>
      <summary>What shows on the display</summary>
      <div className="inner">
        <div className="toggles">
          {(Object.keys(SHOW_LABELS) as (keyof DisplayToggles)[]).map((k) => (
            <label key={k} className="tog">
              <input
                type="checkbox"
                checked={!!show[k]}
                onChange={(e) => dispatch(updateSettings({ show: { ...show, [k]: e.target.checked } }))}
              />
              <span>{SHOW_LABELS[k]}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

export function ServiceSettingsPanel() {
  const st = useTimerStore((s) => s.state!.settings);
  const dispatch = useTimerStore((s) => s.dispatch);
  return (
    <details className="panel">
      <summary>Service settings</summary>
      <div className="inner">
        <div className="fields">
          <label className="field">
            Service start time
            <input
              type="time"
              value={st.serviceStart}
              onChange={(e) => dispatch(updateSettings({ serviceStart: e.target.value || "09:00" }))}
            />
          </label>
          <label className="field">
            Warning colour starts at (minutes left)
            <SyncedInput
              type="number"
              min={0}
              max={60}
              step={0.5}
              value={st.warnMin}
              onValue={(v) => dispatch(updateSettings({ warnMin: Math.max(0, Number(v) || 0) }))}
            />
          </label>
          <label className="field">
            Church name
            <SyncedInput
              type="text"
              maxLength={60}
              value={st.churchName}
              onValue={(churchName) => dispatch(updateSettings({ churchName }))}
            />
          </label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn quiet" onClick={() => dispatch(updateSettings({ serviceStart: hhmm(now()) }))}>
            Set start time to now
          </button>
        </div>
        <label className="tog" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            checked={!!st.keepRunning}
            onChange={(e) => dispatch(updateSettings({ keepRunning: e.target.checked }))}
          />{" "}
          Keep the timer running when moving to the next item
        </label>
        <label className="tog" style={{ marginTop: 6 }}>
          <input
            type="checkbox"
            checked={!!st.shortcuts}
            onChange={(e) => dispatch(updateSettings({ shortcuts: e.target.checked }))}
          />{" "}
          Keyboard shortcuts on this laptop (Space, N, P, +, −)
        </label>
      </div>
    </details>
  );
}

/** Logos of any shape are scaled to fit 600px without stretching. */
function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 600;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k);
      cv.height = Math.round(img.height * k);
      cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

export function DesignPanel() {
  const st = useTimerStore((s) => s.state!.settings);
  const dispatch = useTimerStore((s) => s.dispatch);
  return (
    <details className="panel">
      <summary>Design</summary>
      <div className="inner">
        <div className="fields">
          <label className="field">
            Font
            <select value={st.font} onChange={(e) => dispatch(updateSettings({ font: e.target.value as FontKey }))}>
              {(Object.keys(FONT_LABELS) as FontKey[]).map((k) => (
                <option key={k} value={k}>
                  {FONT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Colour presets
            <select
              value=""
              onChange={(e) => {
                const p = PRESETS[e.target.value as keyof typeof PRESETS];
                if (p) dispatch(updateSettings({ colors: { ...p } }));
              }}
            >
              <option value="">Choose a preset…</option>
              {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
                <option key={k} value={k}>
                  {PRESET_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="colors">
          {(Object.keys(COLOR_LABELS) as (keyof DisplayColors)[]).map((k) => (
            <label key={k} className="color">
              <SyncedInput
                type="color"
                value={st.colors[k]}
                onValue={(v) => dispatch(updateSettings({ colors: { ...st.colors, [k]: v } }))}
              />
              <span>{COLOR_LABELS[k]}</span>
            </label>
          ))}
        </div>
        <div className="logo-row">
          {st.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={st.logo} alt="Logo preview" />
          ) : null}
          <label className="btn" style={{ display: "inline-flex", alignItems: "center" }}>
            Upload logo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                readLogo(f)
                  .then((logo) => dispatch(updateSettings({ logo })))
                  .catch((err: Error) => alert(err.message));
              }}
            />
          </label>
          {st.logo ? (
            <button className="btn quiet danger" onClick={() => dispatch(updateSettings({ logo: "" }))}>
              Remove logo
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}

export function PhonePanel() {
  return (
    <details className="panel">
      <summary>Control from your phone</summary>
      <div className="inner">
        <p className="note">
          This timer is running on this computer only, and the display window works with no internet.
        </p>
        <p className="note">Phone control arrives with church accounts and online sync.</p>
      </div>
    </details>
  );
}
