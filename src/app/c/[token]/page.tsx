import type { Metadata } from "next";
import { OperatorGate } from "@/components/control/operator-gate";

export const metadata: Metadata = { title: "Run the timer", robots: { index: false } };

export default async function OperatorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OperatorGate displayToken={token} />;
}
