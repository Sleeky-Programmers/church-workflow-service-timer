/**
 * Talks to the Church Workflow API. Same accounts and tokens as Church
 * Workflow: access + refresh token in localStorage, refreshed on a 401.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

/** The API's origin, for the Socket.IO connection (the REST base includes /api/v1). */
export function apiOrigin(): string {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const ACCESS = "accessToken";
const REFRESH = "refreshToken";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const tokens = {
  access: () => read(ACCESS),
  refresh: () => read(REFRESH),
  set(t: { accessToken: string; refreshToken: string }) {
    try {
      localStorage.setItem(ACCESS, t.accessToken);
      localStorage.setItem(REFRESH, t.refreshToken);
    } catch {
      // Storage blocked: the session lasts until the page closes.
    }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS);
      localStorage.removeItem(REFRESH);
    } catch {
      // Nothing to clear.
    }
  },
};

/** Seconds until a JWT expires (negative once expired), or null if unreadable. */
function secondsLeft(jwt: string): number | null {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp - Date.now() / 1000 : null;
  } catch {
    return null;
  }
}

// One refresh at a time: the refresh token rotates, so parallel refreshes
// would invalidate each other.
let inFlight: Promise<string> | null = null;

async function refreshAccess(): Promise<string> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const refreshToken = tokens.refresh();
    if (!refreshToken) throw new ApiError(401, "Please sign in.");
    const res = await fetch(`${API_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      tokens.clear();
      throw new ApiError(401, "Your session has ended. Please sign in again.");
    }
    const t = await res.json();
    tokens.set(t);
    return t.accessToken as string;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** An access token with at least a minute left, refreshing it if needed. */
export async function freshAccessToken(): Promise<string> {
  const t = tokens.access();
  if (t && (secondsLeft(t) ?? 0) > 60) return t;
  return refreshAccess();
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = `Something went wrong (${res.status}).`;
  try {
    const body = await res.json();
    const m = body?.message;
    if (Array.isArray(m)) message = m.join(", ");
    else if (typeof m === "string") message = m;
  } catch {
    // Not JSON: keep the generic message.
  }
  return new ApiError(res.status, message);
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean };

/** Fetches from the API. JSON bodies are encoded; FormData is sent as is. */
export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = opts;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const send = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });

  let res: Response;
  try {
    res = await send(auth ? tokens.access() : null);
    if (res.status === 401 && auth && tokens.refresh()) {
      res = await send(await refreshAccess());
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "Could not reach the server. Check your internet connection.");
  }
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
