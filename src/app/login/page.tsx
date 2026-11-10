"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell, FormError, FormField } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { loadProfile, localMode, signIn } from "@/lib/auth/session";

function LoginForm() {
  const router = useRouter();
  const expired = useSearchParams().get("expired");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(expired ? "Your session ended. Please sign in again." : null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(email.trim(), password);
      signIn(res);
      const profile = await loadProfile();
      router.replace(profile?.churchId ? "/control" : "/setup");
    } catch (err) {
      if (err instanceof ApiError && /not verified/i.test(err.message)) {
        await authApi.requestOtp(email.trim()).catch(() => undefined);
        router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError(
        err instanceof ApiError && err.status === 401
          ? "That email and password don't match."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Try again.",
      );
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      description="Use your Church Workflow account. One account works for both."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <FormField label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="mt-6 border-t pt-5">
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => {
            localMode.set(true);
            router.push("/control");
          }}
        >
          Use on this computer only, without an account
        </Button>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
