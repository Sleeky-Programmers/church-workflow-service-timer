"use client";

import { CreditCard, LogIn, LogOut, MonitorPlay, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { storageKeys } from "@/lib/auth/session";
import { addTime, goTo, toggleRun } from "@/lib/timer/actions";
import { emptyState } from "@/lib/timer/remote";
import { LOCAL_KEY, useTimerStore } from "@/lib/timer/store";
import { startSync } from "@/lib/timer/sync";
import { ConnectionBadge } from "./connection-badge";
import { NowPanel } from "./now-panel";
import { ProgramPanel } from "./program-panel";
import { DesignPanel, DisplayTogglesPanel, ServiceSettingsPanel } from "./settings-panels";
import { SharingPanel } from "./sharing-panel";

const DISPLAY_WINDOW = "serviceTimerDisplay";

export type ControlMode =
  | { kind: "local" }
  | { kind: "admin"; userName: string; onSignOut: () => void; onSignedOut: () => void }
  | { kind: "operator"; displayToken: string; operatorToken: string; onDenied: (message: string) => void };

function storageKeyFor(mode: ControlMode) {
  if (mode.kind === "local") return LOCAL_KEY;
  if (mode.kind === "admin") return storageKeys.online;
  return storageKeys.operator(mode.displayToken);
}

export function ControlPanel({ mode }: { mode: ControlMode }) {
  const ready = useTimerStore((s) => s.state !== null);
  const shortcuts = useTimerStore((s) => !!s.state?.settings.shortcuts);
  const conn = useTimerStore((s) => s.conn);
  const canManage = useTimerStore((s) => s.access.canManage);
  const unsynced = useTimerStore((s) => s.unsynced);
  const init = useTimerStore((s) => s.init);
  const dispatch = useTimerStore((s) => s.dispatch);

  // Mode changes only when the page changes, so the key is enough to restart.
  const key = storageKeyFor(mode);
  const operatorToken = mode.kind === "operator" ? mode.operatorToken : "";
  useEffect(() => {
    const stopStore = init("control", {
      storageKey: key,
      channel: true,
      fresh: mode.kind === "local" ? undefined : emptyState,
    });
    if (mode.kind === "local") return stopStore;
    const stopSync = startSync(
      mode.kind === "admin"
        ? { kind: "admin" }
        : { kind: "operator", displayToken: mode.displayToken, operatorToken: mode.operatorToken },
      {
        pendingKey: storageKeys.pending(key),
        onDenied: mode.kind === "operator" ? mode.onDenied : undefined,
        onSignedOut: mode.kind === "admin" ? mode.onSignedOut : undefined,
      },
    );
    return () => {
      stopSync();
      stopStore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the device's identity changes
  }, [init, key, operatorToken]);

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
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {mode.kind === "admin"
                ? mode.userName
                : mode.kind === "operator"
                  ? "Operator (PIN)"
                  : "by Church Workflow"}
            </p>
          </div>
          <ConnectionBadge />
          {mode.kind !== "operator" ? (
            <Button onClick={openDisplay}>
              <MonitorPlay />
              <span className="hidden sm:inline">Open display</span>
            </Button>
          ) : null}
          {mode.kind === "admin" && canManage ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/team">
                  <Users />
                  <span className="hidden sm:inline">Team</span>
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/billing">
                  <CreditCard />
                  <span className="hidden sm:inline">Plan</span>
                </Link>
              </Button>
            </>
          ) : null}
          {mode.kind === "admin" ? (
            <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={mode.onSignOut}>
              <LogOut />
            </Button>
          ) : null}
          {mode.kind === "local" ? (
            <Button variant="outline" asChild>
              <Link href="/login">
                <LogIn />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      {conn === "offline" ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800" role="status">
          {unsynced
            ? "Not connected. The timer keeps running here, and your changes will be sent when the connection returns. Templates can only be saved while connected."
            : "Not connected. The timer keeps running here and will catch up when the connection returns."}
        </div>
      ) : null}

      <main className="mx-auto grid max-w-7xl gap-6 p-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] md:p-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        <NowPanel />
        <div className="flex min-w-0 flex-col gap-6">
          <ProgramPanel />
          <DisplayTogglesPanel />
          <ServiceSettingsPanel />
          <DesignPanel />
          <SharingPanel mode={mode.kind} />
        </div>
      </main>
    </div>
  );
}
