"use client";

import { Clock, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, inputClass, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import { timerApi } from "@/lib/api/endpoints";
import { updateSettings } from "@/lib/timer/actions";
import { now } from "@/lib/timer/clock";
import { COLOR_LABELS, FONT_LABELS, PRESET_LABELS, PRESETS, SHOW_LABELS } from "@/lib/timer/defaults";
import { useTimerStore } from "@/lib/timer/store";
import { applyServerSettings } from "@/lib/timer/sync";
import { hhmm } from "@/lib/timer/timing";
import type { DisplayColors, DisplayToggles, FontKey } from "@/lib/timer/types";
import { cn } from "@/lib/utils";
import { Section, SwitchRow } from "./section";
import { SyncedInput } from "./synced-input";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

/** Read-only for PIN operators and viewers: the display's look is set by signed-in users. */
function ReadOnlyNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="mb-3 text-xs text-muted-foreground">Only signed-in timer operators and admins can change these.</p>;
}

const useCanEditSettings = () => useTimerStore((s) => s.access.canEditSettings);

/** The 11 switches for what shows on the display. */
export function DisplayTogglesPanel() {
  const show = useTimerStore((s) => s.state!.settings.show);
  const dispatch = useTimerStore((s) => s.dispatch);
  const canEdit = useCanEditSettings();
  return (
    <Section title="What shows on the display" description="Every element is optional." defaultOpen>
      <ReadOnlyNote show={!canEdit} />
      <fieldset disabled={!canEdit} className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(SHOW_LABELS) as (keyof DisplayToggles)[]).map((k) => (
          <SwitchRow key={k} label={SHOW_LABELS[k]}>
            <Switch
              checked={!!show[k]}
              onCheckedChange={(on) => dispatch(updateSettings({ show: { ...show, [k]: on } }))}
            />
          </SwitchRow>
        ))}
      </fieldset>
    </Section>
  );
}

export function ServiceSettingsPanel() {
  const st = useTimerStore((s) => s.state!.settings);
  const dispatch = useTimerStore((s) => s.dispatch);
  const canControl = useTimerStore((s) => s.access.canControl);
  const canEdit = useCanEditSettings();
  return (
    <Section title="Service settings">
      <div className="grid gap-4 sm:grid-cols-3">
        {/* The start time belongs to the live service, so operators can change it. */}
        <Field label="Service start time">
          <Input
            type="time"
            disabled={!canControl}
            value={st.serviceStart}
            onChange={(e) => dispatch(updateSettings({ serviceStart: e.target.value || "09:00" }))}
          />
        </Field>
        <Field label="Warning colour at (minutes left)">
          <SyncedInput
            className={inputClass}
            type="number"
            min={0}
            max={60}
            step={0.5}
            disabled={!canEdit}
            value={st.warnMin}
            onValue={(v) => dispatch(updateSettings({ warnMin: Math.max(0, Math.min(60, Number(v) || 0)) }))}
          />
        </Field>
        <Field label="Church name">
          <SyncedInput
            className={inputClass}
            type="text"
            maxLength={60}
            disabled={!canEdit}
            value={st.churchName}
            onValue={(churchName) => dispatch(updateSettings({ churchName }))}
          />
        </Field>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={!canControl}
        onClick={() => dispatch(updateSettings({ serviceStart: hhmm(now()) }))}
      >
        <Clock />
        Set start time to now
      </Button>
      <fieldset disabled={!canEdit} className="mt-4 grid gap-2">
        <SwitchRow label="Keep the timer running when moving to the next item">
          <Switch checked={!!st.keepRunning} onCheckedChange={(on) => dispatch(updateSettings({ keepRunning: on }))} />
        </SwitchRow>
        <SwitchRow label="Keyboard shortcuts on the control laptop" hint="Space, N, P, + and −. Ignored while you type.">
          <Switch checked={!!st.shortcuts} onCheckedChange={(on) => dispatch(updateSettings({ shortcuts: on }))} />
        </SwitchRow>
      </fieldset>
    </Section>
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
  const canEdit = useCanEditSettings();
  // Signed in, the logo goes to file storage; locally it is kept as image data.
  const onlineMode = useTimerStore((s) => s.conn !== "local");
  const online = useTimerStore((s) => s.conn === "online");
  const canManage = useTimerStore((s) => s.access.canManage);
  const [logoBusy, setLogoBusy] = useState(false);
  // Free plan: colour presets only, no own logo (Product Plan, section 7).
  const brandingLocked = onlineMode && st.customBranding === false;

  const setLogo = async (file: File) => {
    const dataUrl = await readLogo(file);
    if (!onlineMode) {
      dispatch(updateSettings({ logo: dataUrl }));
      return;
    }
    setLogoBusy(true);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      applyServerSettings(await timerApi.uploadLogo(blob));
    } finally {
      setLogoBusy(false);
    }
  };

  const removeLogo = async () => {
    if (!onlineMode) {
      dispatch(updateSettings({ logo: "" }));
      return;
    }
    setLogoBusy(true);
    try {
      applyServerSettings(await timerApi.removeLogo());
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not remove the logo.");
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <Section title="Design" description="Colours, font and logo for the display screen.">
      <ReadOnlyNote show={!canEdit} />
      <fieldset disabled={!canEdit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Font">
            <Select value={st.font} onChange={(e) => dispatch(updateSettings({ font: e.target.value as FontKey }))}>
              {(Object.keys(FONT_LABELS) as FontKey[]).map((k) => (
                <option key={k} value={k}>
                  {FONT_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Colour presets">
            <Select
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
            </Select>
          </Field>
        </div>

        <fieldset
          disabled={brandingLocked}
          className={cn("mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5", brandingLocked && "opacity-50")}
        >
          {(Object.keys(COLOR_LABELS) as (keyof DisplayColors)[]).map((k) => (
            <label
              key={k}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition-colors hover:bg-accent/50"
            >
              <SyncedInput
                type="color"
                className="h-7 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                value={st.colors[k]}
                onValue={(v) => dispatch(updateSettings({ colors: { ...st.colors, [k]: v } }))}
              />
              {COLOR_LABELS[k]}
            </label>
          ))}
        </fieldset>
      </fieldset>

      {brandingLocked ? (
        <p className="mt-4 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Your own colours and logo are part of the Church plan. On the Free plan, choose a colour preset.{" "}
          {canManage ? (
            <Link href="/billing" className="font-medium text-primary hover:underline">
              See plans
            </Link>
          ) : (
            "Ask your timer admin about upgrading."
          )}
        </p>
      ) : null}

      <div className={cn("mt-4 flex flex-wrap items-center gap-3", brandingLocked && "hidden")}>
        {st.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL or uploaded image, sized by CSS
          <img src={st.logo} alt="Logo preview" className="h-12 max-w-40 rounded-md border bg-muted object-contain p-1" />
        ) : null}
        {canEdit ? (
          <>
            <label
              className={cn(
                buttonVariants({ variant: "outline" }),
                "cursor-pointer",
                (logoBusy || (onlineMode && !online)) && "pointer-events-none opacity-50",
              )}
            >
              <Upload />
              {logoBusy ? "Uploading…" : "Upload logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setLogo(f).catch((err: Error) =>
                    alert(err instanceof ApiError ? err.message : err.message || "Could not upload the logo."),
                  );
                }}
              />
            </label>
            {st.logo ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={logoBusy || (onlineMode && !online)}
                onClick={removeLogo}
              >
                Remove logo
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
      {onlineMode && !st.logo && !brandingLocked ? (
        <p className="mt-2 text-xs text-muted-foreground">No logo yet: the display shows your church&apos;s name.</p>
      ) : null}
    </Section>
  );
}
