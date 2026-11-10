"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { isSignedIn, loadProfile, localMode, signOut } from "@/lib/auth/session";
import { useTimerStore } from "@/lib/timer/store";
import { ControlPanel, type ControlMode } from "./control-panel";

/**
 * /control: signed in → the church's live timer; "this computer only" →
 * local mode; otherwise → sign in. Offline, the last known profile is used
 * so the laptop still opens the timer.
 */
export function ControlGate() {
  const router = useRouter();
  const [mode, setMode] = useState<ControlMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isSignedIn()) {
      if (localMode.get()) setMode({ kind: "local" });
      else router.replace("/login");
      return;
    }
    const leave = (path: string) => {
      signOut();
      router.replace(path);
    };
    loadProfile()
      .then((p) => {
        if (!p) return leave("/login?expired=1");
        if (!p.churchId) return router.replace("/setup");
        setMode({
          kind: "admin",
          userName: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.email,
          onSignOut: () => {
            const { unsynced } = useTimerStore.getState();
            const warning = unsynced
              ? "Some changes haven't been sent yet and will be lost. Sign out anyway?"
              : "Sign out of the Service Timer on this device?";
            if (confirm(warning)) leave("/login");
          },
          onSignedOut: () => leave("/login?expired=1"),
        });
      })
      .catch((err: Error) => setError(err.message || "Could not load your account."));
  }, [router, attempt]);

  if (error) {
    return (
      <AuthShell title="Couldn't open the timer" description={error}>
        <Button
          className="w-full"
          onClick={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
        >
          Try again
        </Button>
      </AuthShell>
    );
  }
  if (!mode) return null;
  return <DeniedGuard mode={mode} />;
}

/** A signed-in user without timer access sees why, instead of an empty timer. */
function DeniedGuard({ mode }: { mode: ControlMode }) {
  const denied = useTimerStore((s) => s.denied);
  if (denied && mode.kind === "admin") {
    return (
      <AuthShell title="You can't open the timer yet" description={denied}>
        <p className="text-sm text-muted-foreground">
          Ask your church&apos;s admin to give you a Timer role (Timer Viewer, Timer Operator or Timer Admin) in Church
          Workflow, then sign in again.
        </p>
        <Button variant="outline" className="mt-5 w-full" onClick={mode.onSignOut}>
          Sign out
        </Button>
      </AuthShell>
    );
  }
  return <ControlPanel mode={mode} />;
}
