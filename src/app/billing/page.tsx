import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingPage } from "@/components/billing/billing-page";

export const metadata: Metadata = { title: "Plan" };

export default function Billing() {
  return (
    <Suspense>
      <BillingPage />
    </Suspense>
  );
}
