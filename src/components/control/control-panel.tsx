"use client";

import { MonitorPlay } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
          <Image src="/assets/logo/cw-mark.png" alt="Church Workflow" width={32} height={32} priority />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">Service Timer</p>
            <p className="hidden text-xs text-muted-foreground sm:block">by Church Workflow</p>
          </div>
          <Badge variant="outline" shape="pill" className="gap-1.5 font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-gray-400" aria-hidden />
            Local mode
          </Badge>
          <Button onClick={openDisplay}>
            <MonitorPlay />
            <span className="hidden sm:inline">Open display</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] md:p-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        <NowPanel />
        <div className="flex min-w-0 flex-col gap-6">
          <ProgramPanel />
          <DisplayTogglesPanel />
          <ServiceSettingsPanel />
          <DesignPanel />
          <PhonePanel />
        </div>
      </main>
    </div>
  );
}
