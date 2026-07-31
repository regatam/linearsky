import { describe, expect, it } from "vitest";
import { parseAnnotation } from "../src/server/annotations.js";

describe("annotation parsing", () => {
  it("parses the public frontmatter contract", () => {
    const annotation = parseAnnotation("atlas.md", `---
project: project-atlas
status: on-track
confidence: medium
sources: [linear]
updated: 2026-07-31T18:00:00Z
by: test agent
---
Delivery evidence supports the date.`);
    expect(annotation.project).toBe("project-atlas");
    expect(annotation.sources).toEqual(["linear"]);
  });

  it("rejects malformed enums without crashing the reader", () => {
    expect(() => parseAnnotation("bad.md", `---
project: project-atlas
status: vibes
confidence: medium
sources: [linear]
updated: 2026-07-31T18:00:00Z
by: test agent
---
No evidence.`)).toThrow(/status must be/);
  });
});
