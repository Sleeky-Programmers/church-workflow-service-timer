"use client";

import { useEffect, useState } from "react";
import { AuthShell, FormError, FormField } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { timerApi } from "@/lib/api/endpoints";
import { operatorTokens } from "@/lib/auth/session";
import { ControlPanel } from "./control-panel";

/**
 * /c/<link>: a volunteer's phone. The operator PIN unlocks control without
 * an account (Product Plan, section 5.3). When the PIN or link changes, the
 * server turns the phone away and it asks for the PIN again.
 */
export function OperatorGate({ displayToken }: { displayToken: string }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setToken(operatorTokens.get(displayToken));
    setReady(true);
  }, [displayToken]);

  if (!ready) return null;
  if (!token) {
    return (
      <PinForm
        displayToken={displayToken}
        notice={notice}
        onUnlocked={(t) => {
          operatorTokens.set(displayToken, t);
          setNotice(null);
          setToken(t);
        }}
      />
    );
  }
  return (
    <ControlPanel
      mode={{
        kind: "operator",
        displayToken,
        operatorToken: token,
        onDenied: (message) => {
          operatorTokens.set(displayToken, null);
          setNotice(message);
          setToken(null);
        },
      }}
    />
  );
}

function PinForm({
  displayToken,
  notice,
  onUnlocked,
}: {
  displayToken: string;
  notice: string | null;
  onUnlocked: (token: string) => void;
}) {
  const [church, setChurch] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    timerApi
      .publicSnapshot(displayToken)
      .then((s) => setChurch(s.settings.churchName || null))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setLinkError(err.message);
      });
  }, [displayToken]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { operatorToken } = await timerApi.operatorLogin(displayToken, pin);
      onUnlocked(operatorToken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setPin("");
      setBusy(false);
    }
  };

  if (linkError) {
    return (
      <AuthShell title="This link doesn't work" description={linkError}>
        <p className="text-sm text-muted-foreground">Links change when a timer admin makes new ones.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Run the service timer"
      description={church ? `Enter the operator PIN for ${church}.` : "Enter the operator PIN from your timer admin."}
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <FormField label="Operator PIN">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="text-lg tracking-[0.3em]"
          />
        </FormField>
        <Button type="submit" className="h-10 w-full" disabled={busy || pin.length < 4}>
          {busy ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </AuthShell>
  );
}
