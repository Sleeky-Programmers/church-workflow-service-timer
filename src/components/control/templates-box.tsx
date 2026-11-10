"use client";

import { Save, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { timerApi } from "@/lib/api/endpoints";
import { deleteTemplate, loadTemplate, saveTemplate } from "@/lib/timer/actions";
import { uid } from "@/lib/timer/defaults";
import { useTimerStore } from "@/lib/timer/store";
import { ImportDialog } from "./import-dialog";

const OFFLINE =
  "Not connected, so templates can't be saved or deleted right now. Wait until the badge at the top says Live, then try again.";

/**
 * Save, load and delete named service flows. Loading copies; it never links.
 * Signed in, templates live on the server and are shared by the whole church;
 * saving is blocked while offline, so a template saved on one device can't be
 * overwritten by another's stale copy (handoff, section 6).
 */
export function TemplatesBox() {
  const state = useTimerStore((s) => s.state)!;
  const dispatch = useTimerStore((s) => s.dispatch);
  const canControl = useTimerStore((s) => s.access.canControl);
  const canEdit = useTimerStore((s) => s.access.canEditSettings);
  const onlineMode = useTimerStore((s) => s.conn !== "local");
  const online = useTimerStore((s) => s.conn === "online");
  const [picked, setPicked] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  const templates = state.templates;
  // Keep the chosen template selected even when the list changes underneath.
  const selectedId = templates.some((t) => t.id === picked) ? picked : (templates[0]?.id ?? "");
  const selected = templates.find((t) => t.id === selectedId);

  const remote = async (action: () => Promise<void>) => {
    if (!online) {
      alert(OFFLINE);
      return;
    }
    setBusy(true);
    try {
      await action();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onLoad = () => {
    if (!selected) return;
    if (state.items.length && !confirm(`Load "${selected.name}"? This replaces the current program.`)) return;
    dispatch(loadTemplate(selected.id));
  };

  const onDelete = () => {
    if (!selected) return;
    if (!confirm(`Delete the template "${selected.name}"? Your current program stays as it is.`)) return;
    if (!onlineMode) {
      dispatch(deleteTemplate(selected.id));
      return;
    }
    void remote(async () => {
      await timerApi.deleteTemplate(selected.id);
    });
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

    if (!onlineMode) {
      const id = existing?.id ?? uid();
      dispatch(saveTemplate(n, id));
      setName("");
      setPicked(id);
      return;
    }
    void remote(async () => {
      const body = {
        name: n,
        serviceStart: state.settings.serviceStart,
        items: state.items.map((i) => ({ name: i.name, person: i.person || "", minutes: i.minutes })),
      };
      const saved = existing
        ? await timerApi.updateTemplate(existing.id, body)
        : await timerApi.createTemplate(body);
      setName("");
      setPicked(saved.id);
    });
  };

  return (
    <div className="border-t p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Service templates</h3>
        {onlineMode && canEdit ? (
          <Button variant="outline" size="sm" onClick={() => setImporting(true)}>
            <Sparkles />
            Import program
          </Button>
        ) : null}
      </div>
      {importing ? <ImportDialog onClose={() => setImporting(false)} /> : null}
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
          <Button
            variant="outline"
            className="h-10 flex-1 sm:flex-none"
            onClick={onLoad}
            disabled={!selected || !canControl}
          >
            Load
          </Button>
          {canEdit ? (
            <Button
              variant="ghost"
              className="h-10 flex-1 text-destructive hover:text-destructive sm:flex-none"
              onClick={onDelete}
              disabled={!selected || busy}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </div>
      {canEdit ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            className="sm:flex-1"
            maxLength={60}
            placeholder="Template name, e.g. Midweek service"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button className="h-10" onClick={onSave} disabled={busy}>
            <Save />
            {busy ? "Saving…" : "Save current program"}
          </Button>
        </div>
      ) : null}
      {onlineMode && !online && canEdit ? (
        <p className="mt-2 text-xs text-muted-foreground">Templates can only be saved while connected.</p>
      ) : null}
    </div>
  );
}
