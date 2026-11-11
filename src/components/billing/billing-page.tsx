"use client";

import { ArrowLeft, Check, CreditCard, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FormError } from "@/components/auth/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import { billingApi, type BillingOverview } from "@/lib/api/endpoints";
import { isSignedIn } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
const limitText = (n: number | null) => (n === null ? "As your Church Workflow plan" : n === 0 ? "Unlimited" : String(n));

function Usage({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const full = limit !== null && limit > 0 && used >= limit;
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", full && "text-destructive")}>
        {limit === null || limit === 0 ? used : `${used} of ${limit}`}
      </span>
    </div>
  );
}

/**
 * Plans and billing (Product Plan, section 7). Timer-only churches choose
 * Free or the Church plan and pay with Paystack for a month or a year;
 * Church Workflow churches have the timer included.
 */
export function BillingPage() {
  const router = useRouter();
  const params = useSearchParams();
  // Paystack returns with ?reference= (and ?trxref=) after payment.
  const reference = params.get("reference") || params.get("trxref");
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [paying, setPaying] = useState<"monthly" | "yearly" | null>(null);
  // Off unless the payer asks: a card is only kept on file by choice.
  const [autoRenew, setAutoRenew] = useState(false);
  const [stopping, setStopping] = useState(false);

  const load = useCallback(() => {
    return billingApi
      .overview()
      .then((d) => {
        setData(d);
        setLoadError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login?expired=1");
        else
          setLoadError(
            err instanceof ApiError && err.status === 403
              ? "Only timer admins can manage the plan."
              : err instanceof ApiError
                ? err.message
                : "Couldn't load your plan.",
          );
      });
  }, [router]);

  useEffect(() => {
    if (!isSignedIn()) {
      router.replace("/login");
      return;
    }
    if (!reference) {
      void load();
      return;
    }
    // Back from Paystack: confirm the payment, then show the updated plan.
    billingApi
      .confirm(reference)
      .then(({ status }) =>
        setResult(
          status === "success"
            ? { ok: true, text: "Payment received. Thank you! You're on the Church plan." }
            : status === "pending"
              ? { ok: true, text: "We're waiting for Paystack to confirm your payment. Check back in a few minutes." }
              : { ok: false, text: "That payment didn't go through. You haven't been charged; please try again." },
        ),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't confirm the payment."))
      .finally(() => {
        router.replace("/billing");
        void load();
      });
  }, [reference, load, router]);

  const pay = async (cycle: "monthly" | "yearly") => {
    setPaying(cycle);
    setError(null);
    try {
      const { authorizationUrl } = await billingApi.checkout(cycle, autoRenew);
      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the payment. Try again.");
      setPaying(null);
    }
  };

  const stopAutoRenew = async () => {
    if (!data?.autoRenew) return;
    const until = date(data.autoRenew.nextChargeAt);
    if (!confirm(`Turn off auto-renew? You keep the Church plan until ${until}, then you can pay again by hand.`)) return;
    setStopping(true);
    setError(null);
    try {
      await billingApi.cancelAutoRenew();
      await load();
      setResult({ ok: true, text: `Auto-renew is off. You're on the Church plan until ${until}.` });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't turn off auto-renew. Try again.");
    } finally {
      setStopping(false);
    }
  };

  const plan = data?.plan;
  const church = data?.plans.church;
  const free = data?.plans.free;
  const onChurch = plan?.key === "CHURCH";
  const yearlySaving = church ? church.monthlyPrice * 12 - church.yearlyPrice : 0;

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
            <p className="font-semibold leading-tight">Plan</p>
            <p className="text-xs text-muted-foreground">Your Service Timer plan and payments</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        {result ? (
          <p
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              result.ok ? "border-success-100 bg-success-50 text-success-700" : "border-destructive-100 bg-destructive-50 text-destructive-700",
            )}
            role="status"
          >
            {result.text}
          </p>
        ) : null}
        <FormError message={error} />

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

        {data && plan && church && free ? (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
                  <h2 className="mt-1 text-xl font-semibold leading-tight">{plan.name}</h2>
                  {onChurch && plan.periodEnd ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {data.autoRenew ? `Renews on ${date(data.autoRenew.nextChargeAt)}` : `Paid until ${date(plan.periodEnd)}`}
                    </p>
                  ) : null}
                </div>
                <Badge variant={plan.key === "FREE" ? "outline" : "default"} shape="pill">
                  {plan.key === "CHURCH_WORKFLOW" ? "Included" : plan.key === "FREE" ? "Free" : "Paid"}
                </Badge>
              </div>
              <div className="mt-4 divide-y border-t">
                <Usage label="People using the timer" used={data.usage.seats} limit={plan.userLimit} />
                <Usage label="Smart imports this month" used={data.usage.imports} limit={plan.importLimit} />
                <Usage label="Branches" used={data.usage.branches} limit={plan.branchLimit} />
                <div className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-muted-foreground">Own logo and colours</span>
                  <span className="font-medium">{plan.customBranding ? "Yes" : "Colour presets only"}</span>
                </div>
              </div>
            </Card>

            {data.canPay ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className={cn("p-6", plan.key === "FREE" && "border-primary")}>
                  <h3 className="font-semibold">{free.name}</h3>
                  <p className="mt-1 text-2xl font-semibold">{naira(0)}</p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />The full timer, templates and phone control</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{limitText(free.users)} people</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{limitText(free.imports)} smart import a month</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />Colour presets, with a small Service Timer mark</li>
                  </ul>
                </Card>
                <Card className={cn("p-6", onChurch && "border-primary")}>
                  <h3 className="font-semibold">{church.name}</h3>
                  <p className="mt-1 text-2xl font-semibold">
                    {naira(church.monthlyPrice)}
                    <span className="text-sm font-normal text-muted-foreground"> a month</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />Everything in Free</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{limitText(church.users)} people</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{limitText(church.imports)} smart imports a month</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{limitText(church.branches)} branches, each with its own timer</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />Service reports</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />Your own logo and colours, no mark</li>
                  </ul>
                  <div className="mt-5 flex flex-col gap-2">
                    <Button onClick={() => pay("monthly")} disabled={!!paying}>
                      {paying === "monthly" ? <Loader2 className="animate-spin" /> : <CreditCard />}
                      {onChurch ? "Add a month" : "Pay for a month"} · {naira(church.monthlyPrice)}
                    </Button>
                    <Button variant="outline" onClick={() => pay("yearly")} disabled={!!paying}>
                      {paying === "yearly" ? <Loader2 className="animate-spin" /> : <CreditCard />}
                      {onChurch ? "Add a year" : "Pay for a year"} · {naira(church.yearlyPrice)}
                      {yearlySaving > 0 ? <span className="text-xs font-normal">(save {naira(yearlySaving)})</span> : null}
                    </Button>
                    <label className="mt-1 flex items-start gap-3 rounded-md border p-3 text-sm">
                      <Switch
                        checked={autoRenew}
                        onCheckedChange={setAutoRenew}
                        disabled={!!paying}
                        aria-describedby="auto-renew-help"
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">Renew automatically</span>
                        <span id="auto-renew-help" className="block text-xs text-muted-foreground">
                          Paystack charges the same card when each month or year you pay for ends. Turn it off here any
                          time.
                        </span>
                      </span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Paid securely with Paystack.
                      {autoRenew ? "" : " Without auto-renew, pay again to extend."}
                    </p>
                  </div>
                </Card>
              </div>
            ) : data.autoRenew ? (
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <RefreshCw className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">Auto-renew is on</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Paystack will charge{" "}
                      {naira(data.autoRenew.cycle === "yearly" ? church.yearlyPrice : church.monthlyPrice)} to the card you
                      paid with on {date(data.autoRenew.nextChargeAt)}, for another{" "}
                      {data.autoRenew.cycle === "yearly" ? "year" : "month"}.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={stopAutoRenew} disabled={stopping}>
                      {stopping ? <Loader2 className="animate-spin" /> : null}
                      Turn off auto-renew
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-sm text-muted-foreground">
                The Service Timer is included in your Church Workflow plan, so there&apos;s nothing extra to pay.
              </Card>
            )}

            {data.payments.length ? (
              <Card>
                <h3 className="p-6 pb-2 font-semibold">Payments</h3>
                <ul className="divide-y px-6 pb-2 text-sm">
                  {data.payments.map((p) => (
                    <li key={p.reference} className="flex flex-wrap justify-between gap-2 py-3">
                      <span>
                        {date(p.paidAt)} · {p.cycle === "yearly" ? "A year" : "A month"}
                        {p.renewal ? <span className="text-muted-foreground"> · renewed automatically</span> : null}
                      </span>
                      <span className="font-medium tabular-nums">{naira(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
