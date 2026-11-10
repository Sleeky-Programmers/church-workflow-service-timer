"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNow } from "@/hooks/use-now";
import { addTime, goTo, hideMessage, resetItem, showMessage, toggleRun } from "@/lib/timer/actions";
import { QUICK_NOTES } from "@/lib/timer/defaults";
import { useTimerStore } from "@/lib/timer/store";
import { computeView, currentItem, elapsed, MINUS } from "@/lib/timer/timing";
import { cn } from "@/lib/utils";

/** The current item, its countdown, the transport buttons and notes to the speaker. */
export function NowPanel() {
  const state = useTimerStore((s) => s.state)!;
  const dispatch = useTimerStore((s) => s.dispatch);
  const now = useNow();
  const canControl = useTimerStore((s) => s.access.canControl);
  const [msgText, setMsgText] = useState("");

  const it = currentItem(state);
  const v = computeView(state, now);
  const ex = Math.round((state.timer.extraMs || 0) / 60000);
  const running = state.timer.running;
  const startLabel = running ? "Pause" : elapsed(state.timer, now) > 0 ? "Resume" : "Start";

  const tone = v.mode === "over" ? "text-destructive" : v.mode === "warn" ? "text-amber-600" : "text-foreground";
  const barTone = v.mode === "over" ? "bg-destructive" : v.mode === "warn" ? "bg-amber-500" : "bg-primary";
  const label = v.label + (v.hideTime ? " (countdown hidden on display)" : "");

  const sendNote = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMsgText(t);
    dispatch(showMessage(t));
  };

  return (
    <Card className="lg:sticky lg:top-24" aria-label="Current item">
      <fieldset disabled={!canControl} className="min-w-0 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Now</p>
            <h1 className="mt-1 text-xl font-semibold leading-tight">{it ? it.name : "No items yet"}</h1>
            <p className="min-h-5 text-sm text-muted-foreground">{it?.person || ""}</p>
          </div>
          {v.timeUp ? (
            <Badge variant="destructive" shape="pill" className="shrink-0">
              Time up
            </Badge>
          ) : null}
        </div>

        <div className={cn("mt-4 text-7xl font-bold tabular-nums tracking-tight transition-colors", tone)}>{v.text}</div>
        <p className={cn("text-sm transition-colors", v.mode === "normal" ? "text-muted-foreground" : tone)}>
          {label}
          {ex ? (
            <span className="ml-2 font-medium text-amber-600">{`${ex > 0 ? "+" : MINUS}${Math.abs(ex)} min adjusted`}</span>
          ) : null}
        </p>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-colors", barTone)}
            style={{ width: `${(Math.min(1, v.frac) * 100).toFixed(2)}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {v.next
              ? "Next: " + v.next.name + (v.next.person ? " · " + v.next.person : "")
              : state.items.length
                ? "Last item"
                : ""}
          </span>
          <span
            className={cn(
              v.schedClass === "behind" && "font-medium text-amber-600",
              v.schedClass === "ahead" && "font-medium text-success",
            )}
          >
            {v.sched}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_1.4fr_1fr] gap-2">
          <Button
            variant="outline"
            className="h-14 text-base"
            aria-label="Previous item"
            onClick={() => dispatch(goTo(state.index - 1))}
          >
            <SkipBack />
            Prev
          </Button>
          <Button className="h-14 text-base" onClick={() => dispatch(toggleRun)}>
            {running ? <Pause /> : <Play />}
            {startLabel}
          </Button>
          <Button
            variant="outline"
            className="h-14 text-base"
            aria-label="Next item"
            onClick={() => dispatch(goTo(state.index + 1))}
          >
            Next
            <SkipForward />
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <Button variant="outline" className="h-11" onClick={() => dispatch(addTime(-1))}>
            {MINUS}1 min
          </Button>
          <Button variant="outline" className="h-11" onClick={() => dispatch(addTime(1))}>
            +1 min
          </Button>
          <Button variant="outline" className="h-11" onClick={() => dispatch(addTime(5))}>
            +5 min
          </Button>
          <Button variant="ghost" className="h-11" onClick={() => dispatch(resetItem)}>
            <RotateCcw />
            Reset
          </Button>
        </div>

        <div className="mt-6 border-t pt-5">
          <h2 className="text-sm font-semibold">Message to the speaker</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_NOTES.map((n) => (
              <button
                key={n}
                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                onClick={() => sendNote(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <Input
            className="mt-3"
            placeholder="Type a short message"
            maxLength={80}
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendNote(msgText);
            }}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button onClick={() => sendNote(msgText)}>Show message</Button>
            <Button variant="outline" onClick={() => dispatch(hideMessage)}>
              Hide
            </Button>
          </div>
          {state.message.shown && state.message.text ? (
            <p className="mt-2 text-xs text-muted-foreground">
              On the display now: <span className="font-medium text-foreground">{state.message.text}</span>
            </p>
          ) : null}
        </div>

        {state.settings.shortcuts ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Shortcuts: Space start/pause · N next · P previous · + / {MINUS} one minute
          </p>
        ) : null}
      </fieldset>
    </Card>
  );
}
