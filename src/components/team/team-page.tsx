"use client";

import { ArrowLeft, Mail, RotateCw, Trash2, UserPlus, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FormError } from "@/components/auth/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { teamApi, TIMER_ROLE_INFO, type Team, type TimerRole } from "@/lib/api/endpoints";
import { isSignedIn } from "@/lib/auth/session";

const ROLES = Object.keys(TIMER_ROLE_INFO) as TimerRole[];

/**
 * Timer admins invite people and decide what they can do (Product Plan,
 * section 5.2). Invites are emailed with a link to /accept-invite.
 */
export function TeamPage() {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", role: "operator" as TimerRole });

  const load = useCallback(() => {
    teamApi
      .list()
      .then((t) => {
        setTeam(t);
        setLoadError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login?expired=1");
        else
          setLoadError(
            err instanceof ApiError && err.status === 403
              ? "Only timer admins can manage the team."
              : err instanceof ApiError
                ? err.message
                : "Couldn't load your team.",
          );
      });
  }, [router]);

  useEffect(() => {
    if (!isSignedIn()) router.replace("/login");
    else load();
  }, [load, router]);

  /** Runs one action, shows its result, then reloads the list. */
  const act = async (key: string, action: () => Promise<string>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      setNotice(await action());
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    void act("invite", async () => {
      await teamApi.invite({
        email: form.email.trim(),
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        role: form.role,
      });
      setForm((f) => ({ ...f, email: "", firstName: "", lastName: "" }));
      return `Invite sent to ${form.email.trim()}.`;
    });
  };

  const full = !!team && team.seats.limit > 0 && team.seats.used >= team.seats.limit;

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
            <p className="font-semibold leading-tight">Team</p>
            <p className="text-xs text-muted-foreground">Who can use your service timer</p>
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

        {team ? (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold leading-tight">Invite someone</h2>
                  <p className="mt-1 text-sm text-muted-foreground">They&apos;ll get an email with a link to set their password.</p>
                </div>
                {team.seats.limit > 0 ? (
                  <Badge variant={full ? "destructive" : "outline"} shape="pill">
                    {team.seats.used} of {team.seats.limit} seats used
                  </Badge>
                ) : null}
              </div>
              <form onSubmit={invite} className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5 sm:col-span-3">
                    <span className="text-sm font-medium">Email</span>
                    <Input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">First name</span>
                    <Input
                      maxLength={60}
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Last name</span>
                    <Input
                      maxLength={60}
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Role</span>
                    <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TimerRole })}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {TIMER_ROLE_INFO[r].name}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">{TIMER_ROLE_INFO[form.role].does}</p>
                <Button type="submit" disabled={busy === "invite" || full}>
                  <UserPlus />
                  {busy === "invite" ? "Sending…" : "Send invite"}
                </Button>
                {full ? (
                  <p className="text-sm text-muted-foreground">
                    All seats are in use. Remove someone or cancel an invite to add another person.
                    {team.plan === "FREE" ? (
                      <>
                        {" "}
                        Or{" "}
                        <Link href="/billing" className="font-medium text-primary hover:underline">
                          upgrade to the Church plan
                        </Link>{" "}
                        for more seats.
                      </>
                    ) : null}
                  </p>
                ) : null}
              </form>
            </Card>

            <FormError message={error} />
            {notice ? (
              <p className="text-sm text-success" role="status">
                {notice}
              </p>
            ) : null}

            {team.invites.length ? (
              <Card>
                <h2 className="p-6 pb-2 font-semibold leading-tight">Waiting to accept</h2>
                <ul className="divide-y px-6 pb-2">
                  {team.invites.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.name || i.email}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {i.name ? `${i.email} · ` : ""}
                          {i.roleName}
                          {i.sentAt ? ` · sent ${new Date(i.sentAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!busy}
                        onClick={() => act(`resend-${i.id}`, async () => (await teamApi.resend(i.id), `Invite sent again to ${i.email}.`))}
                      >
                        <RotateCw />
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={!!busy}
                        onClick={() => {
                          if (!confirm(`Cancel the invite to ${i.email}?`)) return;
                          void act(`cancel-${i.id}`, async () => (await teamApi.cancel(i.id), "Invite cancelled."));
                        }}
                      >
                        <X />
                        Cancel
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card>
              <h2 className="p-6 pb-2 font-semibold leading-tight">Team</h2>
              <ul className="divide-y px-6 pb-2">
                {team.members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {m.name || m.email}
                        {m.isYou ? <span className="font-normal text-muted-foreground"> (you)</span> : null}
                        {m.suspended ? (
                          <Badge variant="secondary" shape="pill" className="ml-2">
                            Suspended
                          </Badge>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    {m.manageable ? (
                      <>
                        <Select
                          aria-label={`Role for ${m.name || m.email}`}
                          className="h-9 w-44"
                          value={m.timerRole ?? ""}
                          disabled={!!busy}
                          onChange={(e) => {
                            const role = e.target.value as TimerRole;
                            void act(
                              `role-${m.id}`,
                              async () => (await teamApi.changeRole(m.id, role), `${m.name || m.email} is now a ${TIMER_ROLE_INFO[role].name}.`),
                            );
                          }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {TIMER_ROLE_INFO[r].name}
                            </option>
                          ))}
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${m.name || m.email}`}
                          disabled={!!busy}
                          onClick={() => {
                            if (!confirm(`Remove ${m.name || m.email}? Their account will be deleted and they'll lose access.`)) return;
                            void act(`remove-${m.id}`, async () => (await teamApi.remove(m.id), `${m.name || m.email} was removed.`));
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground" title={m.timerRole || m.isOwner || m.isYou ? undefined : "Managed in Church Workflow"}>
                        {m.roleName}
                        {!m.timerRole && !m.isOwner ? " · in Church Workflow" : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
