import type { Metadata } from "next";
import { DisplayScreen } from "@/components/display/display-screen";

export const metadata: Metadata = { title: "Service timer display" };

export default function DisplayPage() {
  return <DisplayScreen />;
}
