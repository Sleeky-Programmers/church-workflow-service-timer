"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { churchWorkflowApi, type ChurchWorkflowStatus } from "@/lib/api/endpoints";
import { openChurchWorkflow } from "@/lib/church-workflow";

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

/**
 * Church Workflow on the Plan page: what it adds and how to try it, or
 * where the church stands with it. The timer is included in it.
 */
export function ChurchWorkflowPlanCard({ onChange }: { onChange?: () => void }) {
  const [status, setStatus] = useState<ChurchWorkflowStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    churchWorkflowApi
      .status()
      .then(setStatus)
      .catch(() => undefined);
  }, []);

  if (!status) return null;

  const open = async (startTrial = false) => {
    setBusy(true);
    setError(null);
    try {
      const next = await openChurchWorkflow({ startTrial });
      if (next.state !== status.state) onChange?.();
      setStatus(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open Church Workflow. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy: Record<ChurchWorkflowStatus["state"], { title: string; text: string; action: string; start?: boolean }> = {
    available: {
      title: "Need more than a timer?",
      text: `Church Workflow plans your services with your team and keeps members, giving and departments in one place. The timer is included, it uses the same login, and it's free for ${status.trialDays} days.`,
      action: `Try Church Workflow free for ${status.trialDays} days`,
      start: true,
    },
    trial: {
      title: "You're trying Church Workflow",
      text: `${status.trialEndsAt ? `Your trial runs until ${date(status.trialEndsAt)}. ` : ""}The timer is included while it runs; choose a Church Workflow plan to keep it that way.`,
      action: "Open Church Workflow",
    },
    ended: {
      title: "Your Church Workflow trial has ended",
      text: "The timer is back on its own plan. Choose a Church Workflow plan to have it included again.",
      action: "Open Church Workflow",
    },
    active: {
      title: "Church Workflow",
      text: "Your church is on Church Workflow, and the timer is included.",
      action: "Open Church Workflow",
    },
    member: {
      title: "Church Workflow",
      text: "Your church uses Church Workflow, and the timer is included.",
      action: "Open Church Workflow",
    },
  };
  const c = copy[status.state];

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <Image src="/assets/logo/cw-mark.png" alt="" width={40} height={40} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{c.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
          <Button className="mt-4" variant={c.start ? "default" : "outline"} onClick={() => open(!!c.start)} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ExternalLink />}
            {c.action}
          </Button>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>
      </div>
    </Card>
  );
}
