"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
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
    <div className="border-t p-6">
      <h3 className="text-sm font-semibold">Service templates</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Select
          aria-label="Saved templates"
          className="sm:flex-1"
          value={selectedId}
          onChange={(e) => setPicked(e.target.value)}
        >
          {templates.length ? (
            templates.map((t) => (
              <option key={t.id} value={t.id}>
                {`${t.name} (${t.items.length} items)`}
              </option>
            ))
          ) : (
            <option value="">No templates saved yet</option>
          )}
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 flex-1 sm:flex-none" onClick={onLoad} disabled={!selected}>
            Load
          </Button>
          <Button
            variant="ghost"
            className="h-10 flex-1 text-destructive hover:text-destructive sm:flex-none"
            onClick={onDelete}
            disabled={!selected}
          >
            Delete
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          className="sm:flex-1"
          maxLength={60}
          placeholder="Template name, e.g. Midweek service"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button className="h-10" onClick={onSave}>
          <Save />
          Save current program
        </Button>
      </div>
    </div>
  );
}
