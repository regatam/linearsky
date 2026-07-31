import { describe, expect, it } from "vitest";
import { progressFromRollup, projectPace, timeElapsed } from "../src/shared/math.js";

describe("progress and pace math", () => {
  it("uses issue counts when estimates are absent", () => {
    expect(progressFromRollup({ total: 8, completed: 3, totalEstimate: 0, completedEstimate: 0 })).toBe(0.375);
  });

  it("uses estimate weight when estimates are present", () => {
    expect(progressFromRollup({ total: 4, completed: 2, totalEstimate: 13, completedEstimate: 8 })).toBeCloseTo(8 / 13);
  });

  it("clamps elapsed time to the project window", () => {
    expect(timeElapsed("2026-07-01", "2026-07-11", new Date("2026-06-01T00:00:00Z"))).toBe(0);
    expect(timeElapsed("2026-07-01", "2026-07-11", new Date("2026-07-06T00:00:00Z"))).toBe(0.5);
    expect(timeElapsed("2026-07-01", "2026-07-11", new Date("2026-08-01T00:00:00Z"))).toBe(1);
  });

  it("classifies schedule lag using the shared thresholds", () => {
    const base = { startDate: "2026-07-01", targetDate: "2026-07-11" };
    expect(projectPace({ ...base, rollup: { total: 10, completed: 5, totalEstimate: 0, completedEstimate: 0, progress: 0.5 } }, new Date("2026-07-06T00:00:00Z"))).toBe("on-track");
    expect(projectPace({ ...base, rollup: { total: 10, completed: 3, totalEstimate: 0, completedEstimate: 0, progress: 0.3 } }, new Date("2026-07-06T00:00:00Z"))).toBe("at-risk");
    expect(projectPace({ ...base, rollup: { total: 10, completed: 1, totalEstimate: 0, completedEstimate: 0, progress: 0.1 } }, new Date("2026-07-06T00:00:00Z"))).toBe("off-track");
  });
});
