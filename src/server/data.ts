import { promises as fs } from "node:fs";
import path from "node:path";
import { readAnnotations } from "./annotations.js";
import type { SkyData, SkySnapshot } from "../shared/types.js";

export function snapshotPath(root: string): string {
  return path.join(root, ".linearsky", "snapshot.json");
}

export async function readSkyData(root: string): Promise<SkyData> {
  const snapshot = JSON.parse(await fs.readFile(snapshotPath(root), "utf8")) as SkySnapshot;
  const { annotations, warnings } = await readAnnotations(root);
  return { snapshot, annotations, annotationWarnings: warnings };
}

export async function writeSnapshot(root: string, snapshot: SkySnapshot): Promise<void> {
  const directory = path.join(root, ".linearsky");
  const destination = snapshotPath(root);
  const temporary = `${destination}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, destination);
}

export async function hasSnapshot(root: string): Promise<boolean> {
  try {
    await fs.access(snapshotPath(root));
    return true;
  } catch {
    return false;
  }
}
