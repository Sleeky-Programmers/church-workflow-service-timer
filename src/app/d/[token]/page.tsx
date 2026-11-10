import type { Metadata } from "next";
import { DisplayScreen } from "@/components/display/display-screen";

export const metadata: Metadata = { title: "Display", robots: { index: false } };

/** A display link: any screen, no login (Product Plan, section 5.4). */
export default async function DisplayLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <DisplayScreen source={{ kind: "link", displayToken: token }} />;
}
