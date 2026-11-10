"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell, FormError, FormField } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { loadProfile, signIn } from "@/lib/auth/session";

function VerifyForm() {
  const router = useRouter();
  const email = useSearchParams().get("email") || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      signIn(await authApi.verifyOtp(email, code.trim()));
      const profile = await loadProfile();
      router.replace(profile?.churchId ? "/control" : "/setup");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "That code is wrong or has expired. Check the email, or send a new code."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Try again.",
      );
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await authApi.requestOtp(email);
      setInfo("A new code is on its way.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send a new code.");
    }
  };

  return (
    <AuthShell
      title="Check your email"
      description={
        <>
          We sent a code to <span className="font-medium text-foreground">{email || "your email"}</span>.
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        {info ? <p className="text-sm text-success">{info}</p> : null}
        <FormField label="Code">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-lg tracking-[0.3em]"
          />
        </FormField>
        <Button type="submit" className="h-10 w-full" disabled={busy || !code}>
          {busy ? "Checking…" : "Verify email"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={resend} disabled={!email}>
          Send a new code
        </Button>
      </form>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
