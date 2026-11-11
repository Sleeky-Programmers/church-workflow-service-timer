import { describe, expect, it } from "vitest";
import { dayLabel } from "@/components/control/church-workflow-card";

describe("Church Workflow services in the timer", () => {
  const today = new Date("2026-11-11T08:00:00");

  it("says Today and Tomorrow, then the day and date", () => {
    expect(dayLabel("2026-11-11", today)).toBe("Today");
    expect(dayLabel("2026-11-12", today)).toBe("Tomorrow");
    const later = dayLabel("2026-11-15", today);
    expect(later).toMatch(/15/);
    expect(later).not.toBe("Today");
  });
});
