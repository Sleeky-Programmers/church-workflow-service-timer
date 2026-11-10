import type { Metadata } from "next";
import { TeamPage } from "@/components/team/team-page";

export const metadata: Metadata = { title: "Team" };

export default function Team() {
  return <TeamPage />;
}
