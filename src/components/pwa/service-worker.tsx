"use client";

import { useEffect } from "react";

/** Pages a device needs to run the timer offline, plus whatever page this is. */
const CORE_PAGES = ["/control", "/display", "/login"];

/**
 * Registers the service worker (production only) and asks it to save the
 * timer's pages, so the laptop can reload or reopen the timer with no
 * internet (Product Plan, section 6.1).
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (cancelled || !navigator.onLine) return;
        reg.active?.postMessage({ type: "warm", urls: [...CORE_PAGES, window.location.pathname] });
      })
      .catch(() => {
        // No service worker: the app still works, it just needs the internet to open.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
