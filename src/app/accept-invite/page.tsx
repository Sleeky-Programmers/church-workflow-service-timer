"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell, FormError, FormField } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { inviteApi } from "@/lib/api/endpoints";
import { loadProfile, signIn } from "@/lib/auth/session";

/** The link in a timer invite email: set a password and start using the timer. */
function AcceptInvite() {
  const router = useRouter();
  const token = useSearchParams().get("invite") || "";
  const [email, setEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(token ? null : "This invite link is incomplete.");
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    inviteApi
      .preview(token)
      .then((p) => {
        setEmail(p.email);
        setForm((f) => ({ ...f, firstName: p.firstName ?? "", lastName: p.lastName ?? "" }));
      })
      .catch(() => setLinkError("This invite link isn't valid. Ask your timer admin to send it again."));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    setError(null);
    try {
      signIn(
        await inviteApi.accept(token, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          password: form.password,
        }),
      );
      await loadProfile();
      router.replace("/control");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setExists(true);
      setError(
        err instanceof ApiError && err.status === 409
          ? "There's already an account with this email. Sign in with it instead."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Try again.",
      );
      setBusy(false);
    }
  };

  if (linkError) {
    return (
      <AuthShell title="Invite link not working" description={linkError}>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }
  if (!email) return null;

  return (
    <AuthShell
      title="Join your church's service timer"
      description={
        <>
          You were invited as <span className="font-medium text-foreground">{email}</span>. Set a password to start.
        </>
      }
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        {exists ? (
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Sign in instead</Link>
          </Button>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name">
            <Input
              required
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </FormField>
          <FormField label="Last name">
            <Input
              required
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </FormField>
        </div>
        <FormField label="Password">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? "Setting up…" : "Join and open the timer"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInvite />
    </Suspense>
  );
}
