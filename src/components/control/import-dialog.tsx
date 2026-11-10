"use client";

import { AlertTriangle, FileUp, Loader2, Plus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FormError } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, inputClass } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { importApi, timerApi, type ImportedItem, type ImportUsage } from "@/lib/api/endpoints";
import { ACCEPT, prepareUpload, UploadError } from "@/lib/import/prepare-upload";
import { replaceProgram } from "@/lib/timer/actions";
import { useTimerStore } from "@/lib/timer/store";
import { cn } from "@/lib/utils";

type Step = "choose" | "reading" | "review";
type Row = ImportedItem & { key: number };

let nextKey = 1;
const withKeys = (items: ImportedItem[]): Row[] => items.map((i) => ({ ...i, key: nextKey++ }));

function usageLine(u: ImportUsage | null) {
  if (!u) return null;
  const left = Math.max(0, u.limit - u.used);
  const resets = new Date(u.resetsOn).toLocaleDateString(undefined, { day: "numeric", month: "long" });
  if (left === 0) return `No imports left this month. More on ${resets}.`;
  return u.limit === 1
    ? `1 free import a month · ${left === 1 ? "available now" : "used"}`
    : `${left} of ${u.limit} imports left this month`;
}

/**
 * Smart import (Product Plan, section 4): upload a PDF, Word document or
 * photo of the order of service, or paste it, then check what was read
 * before saving it as a template or loading it into the program. Nothing
 * is saved without the church confirming it.
 */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const state = useTimerStore((s) => s.state)!;
  const dispatch = useTimerStore((s) => s.dispatch);
  const online = useTimerStore((s) => s.conn === "online");
  const canManage = useTimerStore((s) => s.access.canManage);
  const [step, setStep] = useState<Step>("choose");
  const [usage, setUsage] = useState<ImportUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    importApi
      .usage()
      .then(setUsage)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "reading") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  const noneLeft = !!usage && usage.used >= usage.limit;

  const read = async (input: { file: File } | { text: string }) => {
    setError(null);
    setStep("reading");
    try {
      const result =
        "file" in input
          ? await importApi.extract(await prepareUpload(input.file))
          : await importApi.extract({ text: input.text });
      setRows(withKeys(result.items));
      setName(result.serviceName || "Imported service");
      setStart(result.serviceStart || state.settings.serviceStart);
      setUsage(result.usage);
      setStep("review");
    } catch (err) {
      if (err instanceof ApiError && err.code === "IMPORT_LIMIT_REACHED") setLimitReached(true);
      setError(
        err instanceof UploadError || err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again, or add the program by hand.",
      );
      setStep("choose");
    }
  };

  const update = (key: number, patch: Partial<ImportedItem>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, confident: true } : r)));

  const clean = () =>
    rows
      .map((r) => ({ name: r.name.trim(), person: r.person.trim(), minutes: Math.max(0, Math.round(r.minutes) || 0) }))
      .filter((r) => r.name);

  const loadIntoProgram = () => {
    const items = clean();
    if (!items.length) return setError("Add at least one item first.");
    if (state.items.length && !confirm("Load these items? This replaces the current program.")) return;
    dispatch(replaceProgram(items, /^\d\d:\d\d$/.test(start) ? start : undefined));
    onClose();
  };

  const saveTemplate = async () => {
    const items = clean();
    const n = name.trim();
    if (!n) return setError("Give the template a name first.");
    if (!items.length) return setError("Add at least one item first.");
    setBusy(true);
    setError(null);
    const body = { name: n, serviceStart: /^\d\d:\d\d$/.test(start) ? start : "09:00", items };
    try {
      const existing = state.templates.find((t) => t.name.toLowerCase() === n.toLowerCase());
      if (existing) {
        if (!confirm(`Replace the saved template "${existing.name}"?`)) return;
        await timerApi.updateTemplate(existing.id, body);
      } else {
        await timerApi.createTemplate(body);
      }
      setSaved(n);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the template. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const unsure = rows.filter((r) => !r.confident).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
    >
      <Card className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-b-none sm:rounded-xl">
        <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
          <div>
            <h2 id="import-title" className="flex items-center gap-2 font-semibold leading-tight">
              <Sparkles className="h-4 w-4 text-primary" />
              Import a program
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "review"
                ? "Check what we read before you use it. Items we weren't sure about are highlighted."
                : "Upload your order of service as a PDF, Word document or photo, or paste it."}
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} disabled={step === "reading"}>
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <FormError message={error} />

          {step === "choose" ? (
            <div className={cn("space-y-5", error && "mt-4")}>
              {!online ? (
                <p className="text-sm text-muted-foreground">Smart import needs the internet. Connect and try again.</p>
              ) : null}
              <button
                type="button"
                disabled={!online || noneLeft || limitReached}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f && online && !noneLeft) void read({ file: f });
                }}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors hover:border-primary hover:bg-primary-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <FileUp className="h-8 w-8 text-primary" />
                <span className="font-medium">Choose a file or take a photo</span>
                <span className="text-sm text-muted-foreground">PDF, Word (.docx), or a photo of the printed program</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void read({ file: f });
                }}
              />

              <div>
                <label htmlFor="import-paste" className="text-sm font-medium">
                  Or paste it
                </label>
                <textarea
                  id="import-paste"
                  rows={5}
                  maxLength={20000}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={"Opening Prayer – Min. Adebisi – 10 mins\nPraise & Worship – 25 mins\n…"}
                  className={cn(inputClass, "mt-1.5 h-auto py-2")}
                  disabled={!online || noneLeft || limitReached}
                />
                <Button
                  variant="outline"
                  className="mt-2"
                  disabled={!online || noneLeft || limitReached || !pasted.trim()}
                  onClick={() => void read({ text: pasted })}
                >
                  Read pasted program
                </Button>
              </div>

              {usageLine(usage) ? <p className="text-xs text-muted-foreground">{usageLine(usage)}</p> : null}
              {(limitReached || noneLeft) && canManage ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/billing">See plans</Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          {step === "reading" ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Reading your program…</p>
              <p className="text-sm text-muted-foreground">This usually takes 10 to 30 seconds.</p>
            </div>
          ) : null}

          {step === "review" ? (
            <div className={cn("space-y-4", error && "mt-4")}>
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Service name</span>
                  <Input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Start time</span>
                  <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                </label>
              </div>

              {unsure ? (
                <p className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {unsure === 1 ? "1 item needs" : `${unsure} items need`} checking: the time or name was estimated or hard
                  to read.
                </p>
              ) : null}

              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div
                    key={r.key}
                    className={cn(
                      "grid grid-cols-[1.75rem_minmax(0,1fr)_5rem_2rem] items-center gap-2 rounded-lg border p-2 sm:grid-cols-[1.75rem_minmax(0,1.4fr)_minmax(0,1fr)_5rem_2rem]",
                      !r.confident ? "border-amber-300 bg-amber-50" : "border-transparent",
                    )}
                  >
                    <span className="text-center text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                    <Input
                      aria-label="Item name"
                      maxLength={120}
                      value={r.name}
                      onChange={(e) => update(r.key, { name: e.target.value })}
                      className="bg-background"
                    />
                    <Input
                      aria-label="Speaker"
                      placeholder="Speaker"
                      maxLength={80}
                      value={r.person}
                      onChange={(e) => update(r.key, { person: e.target.value })}
                      className="col-start-2 row-start-2 bg-background sm:col-start-auto sm:row-start-auto"
                    />
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Input
                        aria-label="Minutes"
                        type="number"
                        min={0}
                        max={600}
                        value={r.minutes}
                        onChange={(e) => update(r.key, { minutes: Number(e.target.value) })}
                        className="bg-background px-2 text-right"
                      />
                      min
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${r.name || "item"}`}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setRows((rs) => [...rs, { key: nextKey++, name: "New item", person: "", minutes: 5, confident: true }])
                }
              >
                <Plus />
                Add item
              </Button>
              {saved ? (
                <p className="text-sm text-success" role="status">
                  Saved as the template &ldquo;{saved}&rdquo;. It&apos;s now in your template list.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {step === "review" ? (
          <div className="flex flex-col-reverse gap-2 border-t p-5 sm:flex-row sm:justify-end sm:p-6">
            <Button variant="ghost" onClick={() => setStep("choose")} disabled={busy}>
              Start over
            </Button>
            <Button variant="outline" onClick={saveTemplate} disabled={busy || !online}>
              {busy ? "Saving…" : saved ? "Save again" : "Save as template"}
            </Button>
            <Button onClick={loadIntoProgram} disabled={busy}>
              Load into program
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
