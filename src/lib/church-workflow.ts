"use client";

import { ApiError } from "@/lib/api/client";
import { churchWorkflowApi, type ChurchWorkflowStatus } from "@/lib/api/endpoints";

/**
 * Opens Church Workflow in a new tab, already signed in as the same user
 * (Product Plan, 8.2). With `startTrial`, a timer church's Church Workflow
 * trial starts first (only the first time; later calls change nothing).
 *
 * The tab is opened straight away, inside the click, so browsers don't
 * block it as a pop-up; it's pointed at Church Workflow once the one-time
 * code is ready. The code goes in the #fragment, so no server logs it.
 */
export async function openChurchWorkflow(opts: { startTrial?: boolean } = {}): Promise<ChurchWorkflowStatus> {
  const tab = window.open("about:blank", "_blank");
  // The new tab mustn't be able to reach back into the timer.
  if (tab) tab.opener = null;
  try {
    const status = opts.startTrial ? await churchWorkflowApi.start() : await churchWorkflowApi.status();
    if (!status.url) throw new ApiError(503, "Church Workflow's address isn't set up on the server yet.");
    let target: string;
    try {
      const { code } = await churchWorkflowApi.handoff();
      target = `${status.url}/auth/handoff#code=${encodeURIComponent(code)}`;
    } catch {
      // Couldn't get a code: Church Workflow asks them to sign in instead.
      target = `${status.url}/auth/login`;
    }
    if (tab) tab.location.href = target;
    else window.location.assign(target); // Pop-ups blocked: go in this tab.
    return status;
  } catch (err) {
    tab?.close();
    throw err;
  }
}
