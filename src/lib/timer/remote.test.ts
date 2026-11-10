import { describe, expect, it } from "vitest";
import { defaultState } from "./defaults";
import {
  applySession,
  applySettings,
  emptyState,
  overlaySettings,
  sessionChanged,
  sessionPayload,
  settingsDiff,
  type ServerSettings,
} from "./remote";

const serverSettings = (over: Partial<ServerSettings> = {}): ServerSettings => ({
  churchName: "KingsWord Victoria Island",
  churchNameOverride: null,
  serviceStart: "08:00",
  warnMin: 3,
  keepRunning: false,
  shortcuts: false,
  font: "serif",
  colors: { bg: "#000000", text: "#ffffff", accent: "#4169e1", warn: "#f2c14e", over: "#ff3b3b" },
  show: { ...defaultState().settings.show, clock: false },
  logoUrl: "https://res.cloudinary.com/x/logo.png",
  hasOwnLogo: true,
  hasPin: false,
  ...over,
});

describe("applying server data", () => {
  it("takes the server's settings but keeps the session's start time", () => {
    const s = defaultState();
    s.settings.serviceStart = "10:30";
    const next = applySettings(s, serverSettings());
    expect(next.settings.serviceStart).toBe("10:30");
    expect(next.settings.churchName).toBe("KingsWord Victoria Island");
    expect(next.settings.logo).toBe("https://res.cloudinary.com/x/logo.png");
    expect(next.settings.show.clock).toBe(false);
    expect(next.settings.font).toBe("serif");
  });

  it("takes the session's start time from the session", () => {
    const next = applySession(emptyState(), {
      items: [{ id: "a", name: "Prayer", person: "", minutes: 8 }],
      index: 0,
      timer: { running: true, startedAt: 1, elapsedBefore: 0, extraMs: 0 },
      message: { text: "", shown: false },
      serviceStart: "07:45",
      version: 3,
      origin: "phone",
    });
    expect(next.settings.serviceStart).toBe("07:45");
    expect(next.items).toHaveLength(1);
    expect(next.origin).toBe("phone");
  });
});

describe("what gets sent", () => {
  it("trims the session to what the API accepts", () => {
    const s = defaultState();
    s.items = [{ id: "x".repeat(60), name: "n".repeat(200), person: "p".repeat(100), minutes: 9000 }];
    s.message = { text: "m".repeat(120), shown: true };
    s.timer = { running: false, startedAt: 123, elapsedBefore: -5, extraMs: 0 };
    const p = sessionPayload(s, "laptop");
    expect(p.items[0].id).toHaveLength(40);
    expect(p.items[0].name).toHaveLength(120);
    expect(p.items[0].person).toHaveLength(80);
    expect(p.items[0].minutes).toBe(600);
    expect(p.message.text).toHaveLength(80);
    expect(p.timer.startedAt).toBeNull();
    expect(p.timer.elapsedBefore).toBe(0);
    expect(p.origin).toBe("laptop");
  });

  it("tells session changes from settings changes", () => {
    const a = defaultState();
    const b = structuredClone(a);
    b.settings.colors.bg = "#123456";
    expect(sessionChanged(a, b)).toBe(false);
    expect(settingsDiff(a.settings, b.settings)).toEqual({ colors: b.settings.colors });

    const c = structuredClone(a);
    c.settings.serviceStart = "11:00";
    expect(sessionChanged(a, c)).toBe(true);
    expect(settingsDiff(a.settings, c.settings)).toBeNull();
  });

  it("keeps unsent setting changes on top of what the server sends", () => {
    const s = applySettings(defaultState(), serverSettings({ warnMin: 2 }));
    expect(overlaySettings(s, { warnMin: 5 }).settings.warnMin).toBe(5);
    expect(overlaySettings(s, null)).toBe(s);
  });
});
