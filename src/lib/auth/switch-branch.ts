"use client";

import { tokens } from "@/lib/api/client";
import { branchesApi } from "@/lib/api/endpoints";

/**
 * Moves this device to another branch's timer. Each branch keeps its own
 * copy and unsent changes on the device (see storageKeys.online), so
 * anything not yet sent from this branch goes out when it comes back.
 */
export async function switchBranch(branchId: string, then = "/control") {
  tokens.set(await branchesApi.switchTo(branchId));
  // A full load restarts the timer and its connection on the new branch.
  window.location.assign(then);
}
