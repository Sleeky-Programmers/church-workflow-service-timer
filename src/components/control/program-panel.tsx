"use client";

import { useEffect, useRef, useState } from "react";
import { useNow } from "@/hooks/use-now";
import { addItem, clearProgram, deleteItem, goTo, moveItem, updateItem } from "@/lib/timer/actions";
import { uid } from "@/lib/timer/defaults";
import { useTimerStore } from "@/lib/timer/store";
import { hhmm, plannedStart, programSummary } from "@/lib/timer/timing";
import type { ProgramItem } from "@/lib/timer/types";
import { SyncedInput } from "./synced-input";
import { TemplatesBox } from "./templates-box";

/** The service program: items with name, speaker and minutes, plus templates. */
export function ProgramPanel() {
  const state = useTimerStore((s) => s.state)!;
  const dispatch = useTimerStore((s) => s.dispatch);
  // Planned times only change with the program, so a slow tick is enough.
  const now = useNow(30_000);
  const [focusId, setFocusId] = useState<string | null>(null);

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
    <section className="panel">
      <h2>Program</h2>
      <p className="p-sum">{programSummary(state, now)}</p>
      <div id="plist">
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
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={onAdd}>
          Add item
        </button>
        <button className="btn quiet danger" onClick={onClear}>
          Clear program
        </button>
      </div>
      <TemplatesBox />
    </section>
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
    <div className={`prow${p.current ? " current" : ""}${p.done ? " done" : ""}`}>
      <button className="pnum" title="Go to this item" onClick={p.onGo}>
        {p.index + 1}
      </button>
      <SyncedInput
        ref={nameRef}
        className="pname"
        type="text"
        placeholder="Item name"
        aria-label="Item name"
        value={p.item.name}
        onValue={(name) => p.onChange({ name })}
      />
      <SyncedInput
        className="pperson"
        type="text"
        placeholder="Speaker or leader"
        aria-label="Speaker"
        value={p.item.person}
        onValue={(person) => p.onChange({ person })}
      />
      <label className="pmin">
        <SyncedInput
          type="number"
          min={0}
          max={600}
          step={1}
          aria-label="Minutes"
          value={p.item.minutes}
          onValue={(v) => p.onChange({ minutes: Math.max(0, Number(v) || 0) })}
        />
        <span>min</span>
      </label>
      <span className="ptime">{p.planned}</span>
      <div className="pact">
        <button title="Move up" onClick={() => p.onMove(-1)}>
          ↑
        </button>
        <button title="Move down" onClick={() => p.onMove(1)}>
          ↓
        </button>
        <button title="Delete" onClick={p.onDelete}>
          ✕
        </button>
      </div>
    </div>
  );
}
