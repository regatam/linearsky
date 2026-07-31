import { SKY_CONFIG } from "./config.js";
import type { IssueRollup, Pace, SkyProject } from "./types.js";

const DAY_MS = 86_400_000;

export function progressFromRollup(rollup: Omit<IssueRollup, "progress">): number {
  if (rollup.totalEstimate > 0) {
    return clamp(rollup.completedEstimate / rollup.totalEstimate);
  }
  return rollup.total > 0 ? clamp(rollup.completed / rollup.total) : 0;
}

export function timeElapsed(startDate: string | null, targetDate: string | null, now = new Date()): number {
  if (!startDate || !targetDate) return 0;
  const start = dateValue(startDate);
  const end = dateValue(targetDate);
  if (end <= start) return now.getTime() >= end ? 1 : 0;
  return clamp((now.getTime() - start) / (end - start));
}

export function projectPace(project: Pick<SkyProject, "startDate" | "targetDate" | "rollup">, now = new Date()): Pace {
  const elapsed = timeElapsed(project.startDate, project.targetDate, now) * 100;
  const completed = project.rollup.progress * 100;
  const lag = elapsed - completed;
  if (lag <= SKY_CONFIG.pace.onTrackLagPoints) return "on-track";
  if (lag <= SKY_CONFIG.pace.atRiskLagPoints) return "at-risk";
  return "off-track";
}

export function isProjectStale(project: Pick<SkyProject, "latestActivityAt">, now = new Date()): boolean {
  return now.getTime() - new Date(project.latestActivityAt).getTime() > SKY_CONFIG.staleAfterDays * DAY_MS;
}

export function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((dateOnly(end).getTime() - dateOnly(start).getTime()) / DAY_MS));
}

export function addDays(date: Date, days: number): Date {
  return new Date(dateOnly(date).getTime() + days * DAY_MS);
}

export function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateValue(value: string): number {
  return value.length === 10 ? new Date(`${value}T00:00:00Z`).getTime() : new Date(value).getTime();
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
