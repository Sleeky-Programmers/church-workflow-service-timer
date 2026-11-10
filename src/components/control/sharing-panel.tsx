"use client";

import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { timerApi } from "@/lib/api/endpoints";
import { useTimerStore } from "@/lib/timer/store";
import { Section } from "./section";

function CopyField({ label, hint, value }: { label: string; hint: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <Input readOnly value={value} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
        <Button
          variant="outline"
          className="h-10 shrink-0"
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Display link, phone control link and operator PIN (Product Plan, sections 5.3 and 5.4). */
export function SharingPanel({ mode }: { mode: "local" | "admin" | "operator" }) {
  const sharing = useTimerStore((s) => s.sharing);
  const canManage = useTimerStore((s) => s.access.canManage);
  const online = useTimerStore((s) => s.conn === "online");
  const setMeta = useTimerStore((s) => s.setMeta);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  if (mode === "local") {
    return (
      <Section title="Control from your phone">
        <p className="text-sm text-muted-foreground">
          This timer is running on this computer only, and the display window works with no internet.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create a free account
          </Link>{" "}
          to control the timer from phones and open displays on other screens.
        </p>
      </Section>
    );
  }

  if (mode === "operator") {
    return (
      <Section title="Control from your phone">
        <p className="text-sm text-muted-foreground">
          You are running the timer with the operator PIN. A signed-in timer admin can change the display&apos;s design.
        </p>
      </Section>
    );
  }

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setNote(null);
    try {
      setNote({ ok: true, text: await action() });
    } catch (err) {
      setNote({ ok: false, text: err instanceof ApiError ? err.message : "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const token = sharing.displayToken;

  return (
    <Section title="Displays and phones" description="Share the timer with other screens and volunteers.">
      {token && origin ? (
        <div className="space-y-4">
          <CopyField
            label="Display link"
            hint="Open on any screen to show the timer. No login needed. Press F for full screen."
            value={`${origin}/d/${token}`}
          />
          <CopyField
            label="Phone control link"
            hint={
              sharing.hasPin
                ? "Volunteers open this on their phone and enter the operator PIN."
                : "Set an operator PIN below first. Signed-in team members can also just sign in."
            }
            value={`${origin}/c/${token}`}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">The links appear once the timer is connected.</p>
      )}

      {canManage ? (
        <div className="mt-6 border-t pt-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4" />
            Operator PIN {sharing.hasPin ? <span className="font-normal text-success">· set</span> : null}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Lets volunteers run the timer from a phone without an account. Five wrong tries lock it for five minutes.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              placeholder="4 to 8 digits"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="sm:max-w-48"
            />
            <Button
              className="h-10"
              disabled={busy || !online || pin.length < 4}
              onClick={() =>
                run(async () => {
                  await timerApi.setPin(pin);
                  setPin("");
                  setMeta({ sharing: { ...sharing, hasPin: true } });
                  return "PIN saved. Phones using the old PIN need the new one.";
                })
              }
            >
              {sharing.hasPin ? "Change PIN" : "Set PIN"}
            </Button>
            {sharing.hasPin ? (
              <Button
                variant="ghost"
                className="h-10 text-destructive hover:text-destructive"
                disabled={busy || !online}
                onClick={() =>
                  run(async () => {
                    if (!confirm("Remove the operator PIN? Phones using it will stop working.")) return "";
                    await timerApi.clearPin();
                    setMeta({ sharing: { ...sharing, hasPin: false } });
                    return "PIN removed.";
                  })
                }
              >
                Remove PIN
              </Button>
            ) : null}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={busy || !online}
            onClick={() =>
              run(async () => {
                if (!confirm("Make new links? Displays and phones using the current links will stop working.")) return "";
                const { displayToken } = await timerApi.rotateLinks();
                setMeta({ sharing: { ...sharing, displayToken } });
                return "New links made. Share them again.";
              })
            }
          >
            <RefreshCw />
            Make new links
          </Button>
          {note?.text ? (
            <p className={`mt-3 text-sm ${note.ok ? "text-success" : "text-destructive"}`} role="status">
              {note.text}
            </p>
          ) : null}
          {!online ? <p className="mt-3 text-xs text-muted-foreground">Connect to the internet to change these.</p> : null}
        </div>
      ) : null}
    </Section>
  );
}
