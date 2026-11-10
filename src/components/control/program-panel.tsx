"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputClass } from "@/components/ui/input";
import { useNow } from "@/hooks/use-now";
import { addItem, clearProgram, deleteItem, goTo, moveItem, updateItem } from "@/lib/timer/actions";
import { uid } from "@/lib/timer/defaults";
import { useTimerStore } from "@/lib/timer/store";
import { hhmm, plannedStart, programSummary } from "@/lib/timer/timing";
import type { ProgramItem } from "@/lib/timer/types";
import { cn } from "@/lib/utils";
import { SyncedInput } from "./synced-input";
import { TemplatesBox } from "./templates-box";

/** The service program: items with name, speaker and minutes, plus templates. */
export function ProgramPanel() {
  const state = useTimerStore((s) => s.state)!;
  const dispatch = useTimerStore((s) => s.dispatch);
  // Planned times only change with the program, so a slow tick is enough.
  const now = useNow(30_000);
  const [focusId, setFocusId] = useState<string | null>(null);
  const canControl = useTimerStore((s) => s.access.canControl);

  const onAdd = () => {
    const id = uid();
    dispatch(addItem({ id, name: "New item", minutes: 5, person: "" }));
    setFocusId(id);
  };

  const onClear = () => {
    if (!confirm("Remove every item from the program?")) return;
    dispatch(clearProgram);
  };

  return (
    <Card>
      <div className="p-6 pb-4">
        <h2 className="font-semibold leading-tight">Program</h2>
        <p className="mt-1 text-sm text-muted-foreground">{programSummary(state, now)}</p>
      </div>
      <fieldset disabled={!canControl} className="min-w-0">
      <div className="space-y-1 px-3 sm:px-4">
        {state.items.map((it, i) => (
          <ProgramRow
            key={it.id}
            item={it}
            index={i}
            current={i === state.index}
            done={i < state.index}
            planned={hhmm(plannedStart(state, i, now))}
            focusOnMount={it.id === focusId}
            onFocused={() => setFocusId(null)}
            onGo={() => dispatch(goTo(i))}
            onChange={(patch) => dispatch(updateItem(it.id, patch))}
            onMove={(dir) => dispatch(moveItem(it.id, dir))}
            onDelete={() => {
              if (!confirm(`Delete "${it.name || "this item"}"?`)) return;
              dispatch(deleteItem(it.id));
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 p-6 pt-4">
        <Button variant="outline" onClick={onAdd}>
          <Plus />
          Add item
        </Button>
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onClear}>
          <Trash2 />
          Clear program
        </Button>
      </div>
      </fieldset>
      <TemplatesBox />
    </Card>
  );
}

interface RowProps {
  item: ProgramItem;
  index: number;
  current: boolean;
  done: boolean;
  planned: string;
  focusOnMount: boolean;
  onFocused: () => void;
  onGo: () => void;
  onChange: (patch: Partial<Omit<ProgramItem, "id">>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}

// On phones each row takes two lines (name + minutes, then speaker + actions);
// from `sm` up it is one line, as in the prototype.
const reset = "sm:col-start-auto sm:row-start-auto";

function ProgramRow(p: RowProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const { focusOnMount, onFocused } = p;

  // A newly added item gets its name selected, ready to type over.
  useEffect(() => {
    if (!focusOnMount || !nameRef.current) return;
    nameRef.current.focus();
    nameRef.current.select();
    onFocused();
  }, [focusOnMount, onFocused]);

  return (
    <div
      className={cn(
        "grid items-center gap-2 rounded-lg border border-transparent p-2 transition-colors",
        "grid-cols-[2.25rem_minmax(0,1fr)_5.5rem]",
        "sm:grid-cols-[2.25rem_minmax(0,1.6fr)_minmax(0,1.1fr)_5.5rem_2.75rem_auto]",
        p.current && "border-primary-200 bg-primary-50",
        p.done && "opacity-60",
      )}
    >
      <button
        className={cn(
          "col-start-1 row-span-2 flex h-9 w-9 items-center justify-center self-start rounded-full border text-sm font-semibold tabular-nums transition-colors sm:row-span-1 sm:self-center",
          p.current
            ? "border-primary bg-primary text-primary-foreground"
            : "bg-background hover:border-primary hover:text-primary",
        )}
        title="Go to this item"
        onClick={p.onGo}
      >
        {p.index + 1}
      </button>
      <SyncedInput
        ref={nameRef}
        className={cn(inputClass, "col-start-2 row-start-1 bg-background", reset)}
        type="text"
        placeholder="Item name"
        maxLength={120}
        aria-label="Item name"
        value={p.item.name}
        onValue={(name) => p.onChange({ name })}
      />
      <SyncedInput
        className={cn(inputClass, "col-start-2 row-start-2 bg-background", reset)}
        type="text"
        placeholder="Speaker or leader"
        maxLength={80}
        aria-label="Speaker"
        value={p.item.person}
        onValue={(person) => p.onChange({ person })}
      />
      <label className={cn("col-start-3 row-start-1 flex items-center gap-1.5 text-xs text-muted-foreground", reset)}>
        <SyncedInput
          className={cn(inputClass, "bg-background px-2 text-right")}
          type="number"
          min={0}
          max={600}
          step={1}
          aria-label="Minutes"
          value={p.item.minutes}
          onValue={(v) => p.onChange({ minutes: Math.max(0, Number(v) || 0) })}
        />
        min
      </label>
      <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">{p.planned}</span>
      <div className={cn("col-start-3 row-start-2 flex justify-end", reset)}>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Move up" onClick={() => p.onMove(-1)}>
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Move down" onClick={() => p.onMove(1)}>
          <ArrowDown />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          title="Delete"
          onClick={p.onDelete}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
