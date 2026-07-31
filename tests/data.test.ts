import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readSkyData, writeSnapshot } from "../src/server/data.js";
import { createFixtureSnapshot } from "../src/shared/fixture.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe("server sky data", () => {
  it("threads failed refresh state into the UI payload", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "linearsky-data-"));
    temporaryRoots.push(root);
    await writeSnapshot(root, createFixtureSnapshot());

    expect((await readSkyData(root)).refreshFailed).toBe(false);
    expect((await readSkyData(root, true)).refreshFailed).toBe(true);
  });
});
