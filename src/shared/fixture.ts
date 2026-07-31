import type { SkySnapshot } from "./types.js";

const projects: SkySnapshot["projects"] = [
  {
    id: "project-atlas",
    name: "Atlas migration",
    state: "started",
    statusName: "In progress",
    startDate: "2026-07-01",
    targetDate: "2026-08-20",
    color: "#7c6cf2",
    url: "https://linear.app/acme/project/atlas-migration",
    updatedAt: "2026-07-30T16:12:00.000Z",
    latestActivityAt: "2026-07-30T16:12:00.000Z",
    rollup: { total: 24, completed: 17, totalEstimate: 72, completedEstimate: 54, progress: 0.75 },
    milestones: [
      { id: "atlas-m1", name: "Data freeze", targetDate: "2026-07-18", rollup: { total: 8, completed: 8, totalEstimate: 21, completedEstimate: 21, progress: 1 } },
      { id: "atlas-m2", name: "Parallel run", targetDate: "2026-08-07", rollup: { total: 9, completed: 5, totalEstimate: 29, completedEstimate: 18, progress: 0.62 } },
    ],
    recentActivity: [
      { id: "ATL-42", identifier: "ATL-42", title: "Verify customer ledger totals", state: "In Review", updatedAt: "2026-07-30T16:12:00.000Z" },
      { id: "ATL-39", identifier: "ATL-39", title: "Backfill workspace metadata", state: "Done", updatedAt: "2026-07-29T11:20:00.000Z" },
    ],
  },
  {
    id: "project-nimbus",
    name: "Nimbus mobile beta",
    state: "started",
    statusName: "In progress",
    startDate: "2026-07-10",
    targetDate: "2026-08-15",
    color: "#3ca6c8",
    url: "https://linear.app/acme/project/nimbus-mobile-beta",
    updatedAt: "2026-07-29T18:40:00.000Z",
    latestActivityAt: "2026-07-29T18:40:00.000Z",
    rollup: { total: 32, completed: 15, totalEstimate: 89, completedEstimate: 43, progress: 0.483 },
    milestones: [
      { id: "nimbus-m1", name: "Internal flight", targetDate: "2026-07-28", rollup: { total: 10, completed: 10, totalEstimate: 26, completedEstimate: 26, progress: 1 } },
      { id: "nimbus-m2", name: "TestFlight beta", targetDate: "2026-08-11", rollup: { total: 14, completed: 4, totalEstimate: 42, completedEstimate: 13, progress: 0.31 } },
    ],
    recentActivity: [
      { id: "NIM-88", identifier: "NIM-88", title: "Resolve offline sync conflicts", state: "In Progress", updatedAt: "2026-07-29T18:40:00.000Z" },
      { id: "NIM-73", identifier: "NIM-73", title: "Instrument beta crash reports", state: "Todo", updatedAt: "2026-07-28T14:05:00.000Z" },
    ],
  },
  {
    id: "project-horizon",
    name: "Horizon billing cutover",
    state: "started",
    statusName: "In progress",
    startDate: "2026-06-23",
    targetDate: "2026-08-05",
    color: "#e36d8c",
    url: "https://linear.app/acme/project/horizon-billing-cutover",
    updatedAt: "2026-07-18T09:30:00.000Z",
    latestActivityAt: "2026-07-18T09:30:00.000Z",
    rollup: { total: 20, completed: 5, totalEstimate: 61, completedEstimate: 15, progress: 0.246 },
    milestones: [
      { id: "horizon-m1", name: "Sandbox signoff", targetDate: "2026-07-12", rollup: { total: 6, completed: 5, totalEstimate: 18, completedEstimate: 15, progress: 0.83 } },
      { id: "horizon-m2", name: "Production cutover", targetDate: "2026-08-03", rollup: { total: 8, completed: 0, totalEstimate: 25, completedEstimate: 0, progress: 0 } },
    ],
    recentActivity: [
      { id: "HOR-61", identifier: "HOR-61", title: "Reconcile tax provider edge cases", state: "Blocked", updatedAt: "2026-07-18T09:30:00.000Z" },
    ],
  },
  {
    id: "project-orbit",
    name: "Orbit design system",
    state: "planned",
    statusName: "Planned",
    startDate: "2026-08-03",
    targetDate: "2026-09-18",
    color: "#dda646",
    url: "https://linear.app/acme/project/orbit-design-system",
    updatedAt: "2026-07-30T20:00:00.000Z",
    latestActivityAt: "2026-07-30T20:00:00.000Z",
    rollup: { total: 18, completed: 1, totalEstimate: 53, completedEstimate: 2, progress: 0.038 },
    milestones: [
      { id: "orbit-m1", name: "Foundations", targetDate: "2026-08-21", rollup: { total: 6, completed: 1, totalEstimate: 18, completedEstimate: 2, progress: 0.11 } },
    ],
    recentActivity: [
      { id: "ORB-12", identifier: "ORB-12", title: "Publish token naming RFC", state: "Done", updatedAt: "2026-07-30T20:00:00.000Z" },
    ],
  },
  {
    id: "project-compass",
    name: "Compass research sprint",
    state: "planned",
    statusName: "Planned",
    startDate: null,
    targetDate: null,
    color: "#7dc391",
    url: "https://linear.app/acme/project/compass-research-sprint",
    updatedAt: "2026-07-26T13:15:00.000Z",
    latestActivityAt: "2026-07-26T13:15:00.000Z",
    rollup: { total: 7, completed: 2, totalEstimate: 0, completedEstimate: 0, progress: 0.286 },
    milestones: [],
    recentActivity: [
      { id: "COM-7", identifier: "COM-7", title: "Synthesize discovery calls", state: "In Progress", updatedAt: "2026-07-26T13:15:00.000Z" },
    ],
  },
];

export function createFixtureSnapshot(now = new Date()): SkySnapshot {
  return {
    version: 1,
    workspace: { id: "workspace-acme", name: "Northstar Labs", urlKey: "acme" },
    pulledAt: now.toISOString(),
    projects: structuredClone(projects),
  };
}

export const FIXTURE_ANNOTATION = `---
project: project-nimbus
status: at-risk
confidence: high
sources: [linear, slack]
updated: 2026-07-31T18:00:00Z
by: sky-assess / fixture
---
The beta path is credible, but offline sync is carrying too much launch risk. The team should close the conflict-resolution spike before expanding the cohort.

Evidence: **NIM-88** is still in progress and the TestFlight milestone has only crossed 31%.
`;
