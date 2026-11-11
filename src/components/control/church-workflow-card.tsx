"use client";

import { CalendarClock, ExternalLink, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import {
  churchWorkflowApi,
  type ChurchWorkflowStatus,
  type UpcomingService,
} from "@/lib/api/endpoints";
import { openChurchWorkflow } from "@/lib/church-workflow";
import { loadTemplate, updateSettings } from "@/lib/timer/actions";
import { useTimerStore } from "@/lib/timer/store";

const HIDE_KEY = "serviceTimer.cwPromptHiddenUntil";
const HIDE_FOR_MS = 30 * 86_400_000;

function promptHidden() {
  try {
    return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

/** "Today", "Tomorrow" or "Sun 15 Nov". */
export function dayLabel(date: string, today = new Date()) {
  const d = new Date(`${date}T12:00:00`);
  const t = new Date(today);
  t.setHours(12, 0, 0, 0);
  const diff = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * The timer's link to Church Workflow (Product Plan, section 8): its
 * upcoming services feed the timer, and timer-only churches see a gentle,
 * dismissible prompt to try it.
 */
export function ChurchWorkflowCard() {
  const canManage = useTimerStore((s) => s.access.canManage);
  const canControl = useTimerStore((s) => s.access.canControl);
  const templates = useTimerStore((s) => s.state?.templates ?? []);
  const itemCount = useTimerStore((s) => s.state?.items.length ?? 0);
  const dispatch = useTimerStore((s) => s.dispatch);
  const [status, setStatus] = useState<ChurchWorkflowStatus | null>(null);
  const [services, setServices] = useState<UpcomingService[]>([]);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHidden(promptHidden());
    let live = true;
    churchWorkflowApi
      .status()
      .then((s) => {
        if (!live) return;
        setStatus(s);
        if (s.state !== "available") {
          churchWorkflowApi
            .services()
            .then((list) => live && setServices(list))
            .catch(() => undefined);
        }
      })
      .catch(() => undefined); // Offline: nothing to show.
    return () => {
      live = false;
    };
  }, []);

  if (!status) return null;

  const open = async (startTrial = false) => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await openChurchWorkflow({ startTrial }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open Church Workflow. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const use = (s: UpcomingService) => {
    const template = templates.find((t) => t.name.trim().toLowerCase() === s.title.trim().toLowerCase());
    if (template) {
      if (itemCount && !confirm(`Replace the current program with the "${template.name}" template?`)) return;
      dispatch(loadTemplate(template.id));
    }
    if (s.startTime) dispatch(updateSettings({ serviceStart: s.startTime }));
  };

  // A timer-only church that hasn't tried Church Workflow: a gentle prompt.
  if (status.state === "available") {
    if (!canManage || hidden) return null;
    return (
      <Card className="relative p-5">
        <button
          type="button"
          className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-accent"
          aria-label="Hide for now"
          title="Hide for now"
          onClick={() => {
            try {
              localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_FOR_MS));
            } catch {
              // Storage blocked: hidden until the page reloads.
            }
            setHidden(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="pr-8 font-semibold">Plan this service with your team in Church Workflow</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule services, keep your members and teams in one place, and the timer shows each service ready to run.
          Same login, nothing to re-enter. Free for {status.trialDays} days.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => open(true)} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ExternalLink />}
          Try Church Workflow
        </Button>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </Card>
    );
  }

  if (status.state === "ended") {
    if (!canManage) return null;
    return (
      <Card className="p-5">
        <h2 className="font-semibold">Your Church Workflow trial has ended</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The timer is back on its own plan. Choose a Church Workflow plan to keep your services and members there, with
          the timer included.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => open()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ExternalLink />}
          Open Church Workflow
        </Button>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </Card>
    );
  }

  // On Church Workflow: its services feed the timer.
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Services from Church Workflow</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {services.length
              ? "Use one to set the start time, and load a template with the same name if you have one."
              : "Add your services in Church Workflow and the next two weeks show here."}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => open()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ExternalLink />}
          Open Church Workflow
        </Button>
      </div>
      {services.length ? (
        <ul className="mt-3 divide-y rounded-lg border">
          {services.map((s) => {
            const template = templates.find((t) => t.name.trim().toLowerCase() === s.title.trim().toLowerCase());
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {dayLabel(s.date)}
                    {s.startTime ? ` · ${s.startTime}` : ""}
                    {s.location ? ` · ${s.location}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canControl || (!s.startTime && !template)}
                  onClick={() => use(s)}
                >
                  {template ? "Load" : "Use start time"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </Card>
  );
}
