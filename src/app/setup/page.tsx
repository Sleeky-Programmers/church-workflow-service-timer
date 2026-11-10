"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell, FormError, FormField } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { isSignedIn, loadProfile } from "@/lib/auth/session";

/** Last step of sign-up: the church the timer belongs to. */
export default function SetupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", country: "Nigeria", state: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace("/login");
      return;
    }
    loadProfile()
      .then((p) => {
        if (!p) router.replace("/login");
        else if (p.churchId) router.replace("/control");
        else setReady(true);
      })
      .catch(() => setReady(true));
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.createChurch({
        name: form.name.trim(),
        address: form.address.trim(),
        country: form.country.trim(),
        state: form.state.trim(),
      });
      await loadProfile();
      router.replace("/control");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <AuthShell title="Set up your church" description="This is the name your display shows. You can change it later.">
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <FormField label="Church name">
          <Input required maxLength={80} value={form.name} onChange={set("name")} placeholder="e.g. Grace Assembly, Lekki" />
        </FormField>
        <FormField label="Address">
          <Input required autoComplete="street-address" value={form.address} onChange={set("address")} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="State">
            <Input required autoComplete="address-level1" value={form.state} onChange={set("state")} />
          </FormField>
          <FormField label="Country">
            <Input required autoComplete="country-name" value={form.country} onChange={set("country")} />
          </FormField>
        </div>
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? "Setting up…" : "Open the timer"}
        </Button>
      </form>
    </AuthShell>
  );
}
