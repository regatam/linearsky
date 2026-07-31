import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Annotation, AnnotationStatus, AnnotationWarning, Confidence } from "../shared/types.js";

const STATUSES = new Set<AnnotationStatus>(["on-track", "at-risk", "needs-attention"]);
const CONFIDENCES = new Set<Confidence>(["low", "medium", "high"]);

export async function readAnnotations(root: string): Promise<{ annotations: Annotation[]; warnings: AnnotationWarning[] }> {
  const directory = path.join(root, ".linearsky", "annotations");
  await fs.mkdir(directory, { recursive: true });
  const filenames = (await fs.readdir(directory)).filter((name) => name.endsWith(".md")).sort();
  const annotations: Annotation[] = [];
  const warnings: AnnotationWarning[] = [];

  await Promise.all(filenames.map(async (filename) => {
    try {
      annotations.push(parseAnnotation(filename, await fs.readFile(path.join(directory, filename), "utf8")));
    } catch (error) {
      warnings.push({ filename, message: error instanceof Error ? error.message : String(error) });
    }
  }));

  annotations.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
  return { annotations, warnings };
}

export function parseAnnotation(filename: string, source: string): Annotation {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) throw new Error("missing YAML frontmatter");
  const data = YAML.parse(match[1]) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") throw new Error("frontmatter must be an object");

  const project = requiredString(data, "project");
  const status = requiredString(data, "status") as AnnotationStatus;
  const confidence = requiredString(data, "confidence") as Confidence;
  const updated = requiredString(data, "updated");
  const by = requiredString(data, "by");
  if (!STATUSES.has(status)) throw new Error("status must be on-track, at-risk, or needs-attention");
  if (!CONFIDENCES.has(confidence)) throw new Error("confidence must be low, medium, or high");
  if (Number.isNaN(Date.parse(updated))) throw new Error("updated must be an ISO timestamp");
  if (!Array.isArray(data.sources) || !data.sources.every((value) => typeof value === "string")) {
    throw new Error("sources must be a string array");
  }
  const body = match[2].trim();
  if (!body) throw new Error("assessment body is empty");

  return { filename, project, status, confidence, sources: data.sources, updated, by, body };
}

function requiredString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required`);
  return value.trim();
}
