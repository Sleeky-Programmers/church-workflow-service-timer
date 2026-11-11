"use client";

import { ApiError, tokens } from "@/lib/api/client";
import { authApi, type Profile } from "@/lib/api/endpoints";

const PROFILE = "serviceTimer.profile";
const LOCAL_MODE = "serviceTimer.localMode";
const CAN_MANAGE = "serviceTimer.canManage";

const ONLINE = "serviceTimer.online.v1";

/** The branch the signed-in session is on (from the access token), if it says. */
export function activeBranchId(): string | null {
  const jwt = tokens.access();
  if (!jwt) return null;
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.activeBranchId === "string" ? payload.activeBranchId : null;
  } catch {
    return null;
  }
}

/** Where each kind of device keeps its copy of the timer. */
export const storageKeys = {
  /** Each branch has its own timer, so its own copy (and unsent changes). */
  online: (branchId: string | null = activeBranchId()) => (branchId ? `${ONLINE}:${branchId}` : ONLINE),
  operator: (displayToken: string) => `serviceTimer.op.v1:${displayToken}`,
  screen: (displayToken: string) => `serviceTimer.screen.v1:${displayToken}`,
  pending: (key: string) => `${key}:pending`,
};

function get(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function put(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked.
  }
}

export const isSignedIn = () => !!tokens.refresh();

/** Local mode: the timer on this computer only, with no account. */
export const localMode = {
  get: () => get(LOCAL_MODE) === "1",
  set: (on: boolean) => put(LOCAL_MODE, on ? "1" : null),
};

export function cachedProfile(): Profile | null {
  try {
    return JSON.parse(get(PROFILE) || "null");
  } catch {
    return null;
  }
}

/**
 * The signed-in user. Offline, the last known profile is used, so the
 * laptop still opens the timer when the internet is down.
 */
export async function loadProfile(): Promise<Profile | null> {
  try {
    const p = await authApi.profile();
    put(PROFILE, JSON.stringify(p));
    return p;
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) return cachedProfile();
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/**
 * Whether the user was a timer admin when the server last said (it says so
 * when the timer connects). The sidebar uses it on pages that open
 * straight from a link, before the timer has connected.
 */
export const lastCanManage = {
  get: () => get(CAN_MANAGE) === "1",
  set: (on: boolean) => put(CAN_MANAGE, on ? "1" : null),
};

export function signIn(t: { accessToken: string; refreshToken: string }) {
  tokens.set(t);
  localMode.set(false);
}

export function signOut() {
  tokens.clear();
  put(PROFILE, null);
  put(CAN_MANAGE, null);
  // Every branch's copy, and its unsent changes.
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(ONLINE))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Storage blocked: nothing was kept.
  }
}

/** Operator tokens from the PIN screen, one per display link. */
export const operatorTokens = {
  get: (displayToken: string) => get(`serviceTimer.opToken:${displayToken}`),
  set: (displayToken: string, token: string | null) => put(`serviceTimer.opToken:${displayToken}`, token),
};
