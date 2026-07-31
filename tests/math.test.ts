import { describe, expect, it } from "vitest";
import { progressFromRollup, projectPace, timeElapsed } from "../src/shared/math.js";

describe("progress and pace math", () => {
  it("uses issue counts when estimates are absent", () => {
    expect(progressFromRollup({ total: 8, completed: 3, totalEstimate: 0, completedEstimate: 0, unestimated: 8, completedUnestimated: 3 })).toBe(0.375);
  });

  it("uses estimate weight when estimates are present", () => {
    expect(progressFromRollup({ total: 4, completed: 2, totalEstimate: 13, completedEstimate: 8, unestimated: 0, completedUnestimated: 0 })).toBeCloseTo(8 / 13);
  });

  it("gives unestimated issues one unit in mixed rollups", () => {
    expect(progressFromRollup({ total: 3, completed: 2, totalEstimate: 5, completedEstimate: 5, unestimated: 2, completedUnestimated: 1 })).toBeCloseTo(6 / 7);
  });

  it("clamps elapsed time to the project window", () => {
    expect(timeElapsed("2026-07-01", "2026-07-11", new Date("2026-06-01T00:00:00Z"))).toBe(0);
    expect(timeElapsed("2026-07-01", "2026-07-11", new Date("2026-07-06T00:00:00Z"))).toBe(0.5);
    expect(timeElapsed("2026-07-01", "2026-07-11", new Date("2026-08-01T00:00:00Z"))).toBe(1);
  });

  it("classifies schedule lag using the shared thresholds", () => {
    const base = { startDate: "2026-07-01", targetDate: "2026-07-11" };
    const rollup = { total: 10, completed: 5, totalEstimate: 0, completedEstimate: 0, unestimated: 10, completedUnestimated: 5 };
    expect(projectPace({ ...base, rollup: { ...rollup, progress: 0.5 } }, new Date("2026-07-06T00:00:00Z"))).toBe("on-track");
    expect(projectPace({ ...base, rollup: { ...rollup, progress: 0.3 } }, new Date("2026-07-06T00:00:00Z"))).toBe("at-risk");
    expect(projectPace({ ...base, rollup: { ...rollup, progress: 0.1 } }, new Date("2026-07-06T00:00:00Z"))).toBe("off-track");
  });

  it("does not classify projects without a complete schedule", () => {
    const rollup = { total: 1, completed: 0, totalEstimate: 0, completedEstimate: 0, unestimated: 1, completedUnestimated: 0, progress: 0 };
    expect(projectPace({ startDate: null, targetDate: "2026-07-11", rollup })).toBeNull();
    expect(projectPace({ startDate: "2026-07-01", targetDate: null, rollup })).toBeNull();
  });
});
