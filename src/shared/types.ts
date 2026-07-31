export type Pace = "on-track" | "at-risk" | "off-track";
export type AnnotationStatus = "on-track" | "at-risk" | "needs-attention";
export type Confidence = "low" | "medium" | "high";

export interface IssueRollup {
  total: number;
  completed: number;
  totalEstimate: number;
  completedEstimate: number;
  progress: number;
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: string | null;
  rollup: IssueRollup;
}

export interface ActivityItem {
  id: string;
  identifier: string;
  title: string;
  state: string;
  updatedAt: string;
}

export interface SkyProject {
  id: string;
  name: string;
  state: string;
  statusName: string;
  startDate: string | null;
  targetDate: string | null;
  color: string;
  url: string | null;
  updatedAt: string;
  latestActivityAt: string;
  rollup: IssueRollup;
  milestones: Milestone[];
  recentActivity: ActivityItem[];
}

export interface SkySnapshot {
  version: 1;
  workspace: {
    id: string;
    name: string;
    urlKey: string;
  };
  pulledAt: string;
  projects: SkyProject[];
}

export interface Annotation {
  filename: string;
  project: string;
  status: AnnotationStatus;
  confidence: Confidence;
  sources: string[];
  updated: string;
  by: string;
  body: string;
}

export interface AnnotationWarning {
  filename: string;
  message: string;
}

export interface SkyData {
  snapshot: SkySnapshot;
  annotations: Annotation[];
  annotationWarnings: AnnotationWarning[];
}

declare global {
  interface Window {
    __LINEARSKY_DATA__?: SkyData;
  }
}
