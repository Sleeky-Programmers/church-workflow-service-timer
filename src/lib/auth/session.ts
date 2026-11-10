"use client";

import { ApiError, tokens } from "@/lib/api/client";
import { authApi, type Profile } from "@/lib/api/endpoints";

const PROFILE = "serviceTimer.profile";
const LOCAL_MODE = "serviceTimer.localMode";

/** Where each kind of device keeps its copy of the timer. */
export const storageKeys = {
  online: "serviceTimer.online.v1",
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

export function signIn(t: { accessToken: string; refreshToken: string }) {
  tokens.set(t);
  localMode.set(false);
}

export function signOut() {
  tokens.clear();
  put(PROFILE, null);
  put(storageKeys.online, null);
  put(storageKeys.pending(storageKeys.online), null);
}

/** Operator tokens from the PIN screen, one per display link. */
export const operatorTokens = {
  get: (displayToken: string) => get(`serviceTimer.opToken:${displayToken}`),
  set: (displayToken: string, token: string | null) => put(`serviceTimer.opToken:${displayToken}`, token),
};
