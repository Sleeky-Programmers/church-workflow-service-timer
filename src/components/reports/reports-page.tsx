"use client";

import { ArrowLeft, BarChart3, ChevronRight, Loader2, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { reportsApi, type ServiceReport, type ServiceSummary } from "@/lib/api/endpoints";
import { isSignedIn } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/** "1 h 05 min", "12 min", "45 s". */
export function duration(ms: number) {
  const s = Math.round(Math.abs(ms) / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

/** How a run compared with the plan; within 30 seconds counts as on time. */
export function overText(overMs: number) {
  if (Math.abs(overMs) < 30_000) return { text: "On time", tone: "ok" as const };
  return overMs > 0
    ? { text: `${duration(overMs)} over`, tone: "over" as const }
    : { text: `${duration(overMs)} under`, tone: "under" as const };
}

const toneClass = { ok: "text-success-700", over: "text-destructive", under: "text-muted-foreground" };

// Dates are the branch's service days, so show them without shifting zones.
const dayText = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const timeText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";

type Load<T> = { state: "loading" } | { state: "ok"; data: T } | { state: "error"; message: string; planRequired?: boolean };

function useLoad<T>(fn: () => Promise<T>, key: string): Load<T> {
  const router = useRouter();
  const [result, setResult] = useState<Load<T>>({ state: "loading" });
  useEffect(() => {
    let live = true;
    setResult({ state: "loading" });
    fn()
      .then((data) => live && setResult({ state: "ok", data }))
      .catch((err) => {
        if (!live) return;
        if (err instanceof ApiError && err.status === 401) router.replace("/login?expired=1");
        else
          setResult({
            state: "error",
            message: err instanceof ApiError ? err.message : "Couldn't load reports.",
            planRequired: err instanceof ApiError && err.code === "PLAN_REQUIRED",
          });
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the key changes
  }, [key]);
  return result;
}

function Upsell({ message }: { message: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">Service reports</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          <Button className="mt-4" asChild>
            <Link href="/billing">See the Church plan</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Problem({ load }: { load: Extract<Load<unknown>, { state: "error" }> }) {
  if (load.planRequired) return <Upsell message={load.message} />;
  return (
    <Card className="p-6">
      <p className="font-semibold">{load.message}</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link href="/control">Back to the timer</Link>
      </Button>
    </Card>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function ServiceList() {
  const load = useLoad(() => reportsApi.list(90), "list");
  if (load.state === "loading") return <Spinner />;
  if (load.state === "error") return <Problem load={load} />;
  const services: ServiceSummary[] = load.data;
  if (!services.length) {
    return (
      <Card className="p-6 text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-semibold">No services yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run the timer in a service and it will show here: how long each item took against the program.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <ul className="divide-y">
        {services.map((s) => {
          const over = overText(s.overMs);
          return (
            <li key={s.date}>
              <Link
                href={`/reports?date=${s.date}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 md:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{dayText(s.date)}</p>
                  <p className="text-sm text-muted-foreground">
                    {timeText(s.startedAt)} – {timeText(s.endedAt)} · {s.items} {s.items === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="tabular-nums">{duration(s.actualMs)}</p>
                  <p className={cn("tabular-nums", toneClass[over.tone])}>{over.text}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ServiceDetail({ date }: { date: string }) {
  const load = useLoad(() => reportsApi.service(date), `date:${date}`);
  if (load.state === "loading") return <Spinner />;
  if (load.state === "error") return <Problem load={load} />;
  const r: ServiceReport = load.data;
  const total = overText(r.overMs);
  return (
    <>
      <Card className="p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service</p>
        <h2 className="mt-1 text-xl font-semibold leading-tight">{dayText(r.date)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {timeText(r.startedAt)} – {timeText(r.endedAt)}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
          <div>
            <p className="text-muted-foreground">Planned</p>
            <p className="font-medium tabular-nums">{duration(r.plannedMs)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Actual</p>
            <p className="font-medium tabular-nums">{duration(r.actualMs)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Difference</p>
            <p className={cn("font-medium tabular-nums", toneClass[total.tone])}>{total.text}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="p-6 pb-2 font-semibold">Item by item</h3>
        {r.items.length ? (
          <ul className="divide-y px-6 pb-2 text-sm">
            {r.items.map((i, n) => {
              const over = overText(i.overMs);
              return (
                <li key={`${i.startedAt}-${n}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-muted-foreground">
                      {timeText(i.startedAt)}
                      {i.person ? ` · ${i.person}` : ""}
                      {i.extraMs ? ` · ${i.extraMs > 0 ? "+" : "−"}${duration(i.extraMs)} given` : ""}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p>
                      {duration(i.actualMs)}
                      <span className="text-muted-foreground"> of {duration(i.plannedMs)}</span>
                    </p>
                    <p className={toneClass[over.tone]}>{over.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Nothing was recorded for this day.</p>
        )}
      </Card>
    </>
  );
}

/**
 * Service reports (Product Plan, section 7, Church plan): each service
 * against its program. Free churches are recorded too and see an upsell.
 */
export function ReportsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const date = params.get("date");
  const valid = !!date && /^\d{4}-\d{2}-\d{2}$/.test(date);

  useEffect(() => {
    if (!isSignedIn()) router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 md:px-6">
          <Button variant="ghost" size="icon" asChild aria-label={valid ? "Back to all services" : "Back to the timer"}>
            <Link href={valid ? "/reports" : "/control"}>
              <ArrowLeft />
            </Link>
          </Button>
          <Image src="/assets/logo/cw-mark.png" alt="Church Workflow" width={32} height={32} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Reports</p>
            <p className="text-xs text-muted-foreground">How each service ran against its program</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        {valid ? <ServiceDetail date={date!} /> : <ServiceList />}
      </main>
    </div>
  );
}
