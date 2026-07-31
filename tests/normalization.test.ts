import { describe, expect, it } from "vitest";
import response from "./fixtures/linear-response.json";
import { normalizeLinearData, type RawLinearData } from "../src/cli/linear.js";

describe("Linear GraphQL normalization", () => {
  it("normalizes active projects, weighted rollups, milestones, and activity", () => {
    const snapshot = normalizeLinearData(response as RawLinearData, "2026-07-31T18:00:00Z");
    expect(snapshot.workspace.name).toBe("Acme");
    expect(snapshot.projects).toHaveLength(1);
    expect(snapshot.projects[0]).toMatchObject({
      id: "project-1",
      state: "started",
      latestActivityAt: "2026-07-22T09:00:00Z",
      rollup: { total: 3, completed: 1, totalEstimate: 8, completedEstimate: 5, unestimated: 1, completedUnestimated: 0 },
    });
    expect(snapshot.projects[0].rollup.progress).toBeCloseTo(5 / 9);
    expect(snapshot.projects[0].milestones[0].rollup.progress).toBeCloseTo(5 / 9);
    expect(snapshot.projects[0].recentActivity[0].identifier).toBe("ACM-2");
  });
});
