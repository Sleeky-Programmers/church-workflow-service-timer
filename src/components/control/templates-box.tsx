"use client";

import { useState } from "react";
import { deleteTemplate, loadTemplate, saveTemplate } from "@/lib/timer/actions";
import { uid } from "@/lib/timer/defaults";
import { useTimerStore } from "@/lib/timer/store";

/** Save, load and delete named service flows. Loading copies; it never links. */
export function TemplatesBox() {
  const state = useTimerStore((s) => s.state)!;
  const dispatch = useTimerStore((s) => s.dispatch);
  const [picked, setPicked] = useState("");
  const [name, setName] = useState("");

  const templates = state.templates;
  // Keep the chosen template selected even when the list changes underneath.
  const selectedId = templates.some((t) => t.id === picked) ? picked : (templates[0]?.id ?? "");
  const selected = templates.find((t) => t.id === selectedId);

  const onLoad = () => {
    if (!selected) return;
    if (state.items.length && !confirm(`Load "${selected.name}"? This replaces the current program.`)) return;
    dispatch(loadTemplate(selected.id));
  };

  const onDelete = () => {
    if (!selected) return;
    if (!confirm(`Delete the template "${selected.name}"? Your current program stays as it is.`)) return;
    dispatch(deleteTemplate(selected.id));
  };

  const onSave = () => {
    const n = name.trim();
    if (!n) {
      alert("Type a name for this template first.");
      return;
    }
    if (!state.items.length) {
      alert("The program is empty. Add items before saving a template.");
      return;
    }
    const existing = templates.find((t) => t.name.toLowerCase() === n.toLowerCase());
    if (existing && !confirm(`Replace the saved template "${existing.name}"?`)) return;
    const id = existing?.id ?? uid();
    dispatch(saveTemplate(n, id));
    setName("");
    setPicked(id);
  };

  return (
    <div className="tpl">
      <h3>Service templates</h3>
      <div className="row">
        <select aria-label="Saved templates" value={selectedId} onChange={(e) => setPicked(e.target.value)}>
          {templates.length ? (
            templates.map((t) => (
              <option key={t.id} value={t.id}>
                {`${t.name} (${t.items.length} items)`}
              </option>
            ))
          ) : (
            <option value="">No templates saved yet</option>
          )}
        </select>
        <button className="btn" onClick={onLoad}>
          Load
        </button>
        <button className="btn quiet danger" onClick={onDelete}>
          Delete
        </button>
      </div>
      <div className="row">
        <input
          type="text"
          maxLength={60}
          placeholder="Template name, e.g. Midweek service"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" onClick={onSave}>
          Save current program
        </button>
      </div>
    </div>
  );
}
