"use client";

import { ArrowLeft, Building2, Check, Loader2, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FormError } from "@/components/auth/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { branchesApi, type BranchList } from "@/lib/api/endpoints";
import { isSignedIn } from "@/lib/auth/session";
import { switchBranch } from "@/lib/auth/switch-branch";

/**
 * Branches (Church plan): each has its own timer, display link, PIN and
 * reports. Free has one; the Church plan more. Church Workflow churches
 * manage branches in Church Workflow, but can add them here too.
 */
export function BranchesPage() {
  const router = useRouter();
  const [data, setData] = useState<BranchList | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; upgrade: boolean } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    () =>
      branchesApi
        .list()
        .then((d) => {
          setData(d);
          setLoadError(null);
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) router.replace("/login?expired=1");
          else setLoadError(err instanceof ApiError ? err.message : "Couldn't load branches.");
        }),
    [router],
  );

  useEffect(() => {
    if (!isSignedIn()) router.replace("/login");
    else void load();
  }, [load, router]);

  const full = !!data && data.limit !== null && data.limit > 0 && data.count >= data.limit;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy("add");
    setError(null);
    try {
      await branchesApi.create(name.trim());
      setName("");
      await load();
    } catch (err) {
      setError({
        text: err instanceof ApiError ? err.message : "Couldn't add the branch. Try again.",
        upgrade: err instanceof ApiError && err.status === 403 && /Church plan/.test(err.message),
      });
    } finally {
      setBusy(null);
    }
  };

  const open = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await switchBranch(id);
    } catch (err) {
      setError({ text: err instanceof ApiError ? err.message : "Couldn't switch branch.", upgrade: false });
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 md:px-6">
          <Button variant="ghost" size="icon" asChild aria-label="Back to the timer">
            <Link href="/control">
              <ArrowLeft />
            </Link>
          </Button>
          <Image src="/assets/logo/cw-mark.png" alt="Church Workflow" width={32} height={32} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Branches</p>
            <p className="text-xs text-muted-foreground">Each branch has its own timer, display link and PIN</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        {loadError ? (
          <Card className="p-6">
            <p className="font-semibold">{loadError}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/control">Back to the timer</Link>
            </Button>
          </Card>
        ) : null}

        {!data && !loadError ? (
          <div className="flex justify-center py-16" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : null}

        {data ? (
          <>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 p-6 pb-2">
                <h2 className="font-semibold">Your branches</h2>
                {data.limit !== null && data.limit > 0 ? (
                  <Badge variant="outline" shape="pill">
                    {data.count} of {data.limit} used
                  </Badge>
                ) : null}
              </div>
              <ul className="divide-y px-6 pb-2">
                {data.branches.map((b) => {
                  const here = b.id === data.activeBranchId || (!data.activeBranchId && b.isHQ);
                  return (
                    <li key={b.id} className="flex items-center gap-3 py-3">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{b.name}</p>
                        {b.isHQ ? <p className="text-xs text-muted-foreground">Head branch</p> : null}
                      </div>
                      {here ? (
                        <span className="flex items-center gap-1 text-sm text-success-700">
                          <Check className="h-4 w-4" /> This device
                        </span>
                      ) : (
                        <Button variant="outline" size="sm" disabled={!!busy} onClick={() => open(b.id)}>
                          {busy === b.id ? <Loader2 className="animate-spin" /> : null}
                          Open its timer
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold">Add a branch</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.limit === null
                  ? "Your branches are shared with Church Workflow, and its plan's branch limit applies."
                  : full
                    ? data.limit === 1
                      ? "More branches are part of the Church plan."
                      : `Your plan includes ${data.limit} branches.`
                    : "It gets its own timer, display link and PIN, and its own service reports."}
              </p>
              <form onSubmit={add} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <label className="flex-1">
                  <span className="sr-only">Branch name</span>
                  <Input
                    placeholder="e.g. Lekki"
                    maxLength={80}
                    value={name}
                    disabled={full}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <Button type="submit" disabled={full || busy === "add" || !name.trim()}>
                  {busy === "add" ? <Loader2 className="animate-spin" /> : <Plus />}
                  Add branch
                </Button>
              </form>
              {full && data.limit === 1 ? (
                <Button variant="outline" className="mt-3" asChild>
                  <Link href="/billing">See the Church plan</Link>
                </Button>
              ) : null}
              <div className="mt-3">
                <FormError message={error?.text ?? null} />
                {error?.upgrade && !(full && data.limit === 1) ? (
                  <Button variant="outline" className="mt-3" asChild>
                    <Link href="/billing">See the Church plan</Link>
                  </Button>
                ) : null}
              </div>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
