"use client";

import { useEffect, useState } from "react";
import { now } from "@/lib/timer/clock";

/** Re-renders about five times a second with the shared clock's time. */
export function useNow(intervalMs = 200): number {
  const [t, setT] = useState(() => now());
  useEffect(() => {
    const id = setInterval(() => setT(now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}
