import type { Metadata } from "next";
import { DisplayScreen } from "@/components/display/display-screen";

export const metadata: Metadata = { title: "Display" };

/** The extended-screen window opened from the control laptop. Works with no internet. */
export default function DisplayPage() {
  return <DisplayScreen source={{ kind: "local" }} />;
}
