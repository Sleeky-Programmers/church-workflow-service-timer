import { redirect } from "next/navigation";

// The landing page and sign-in arrive in Phase 1; for now go straight to the timer.
export default function Home() {
  redirect("/control");
}
