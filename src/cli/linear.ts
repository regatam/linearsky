import { LINEAR_API_URL } from "../shared/config.js";
import { progressFromRollup } from "../shared/math.js";
import type { IssueRollup, SkyProject, SkySnapshot } from "../shared/types.js";

export class LinearAuthError extends Error {}

interface RawStatus { name?: string | null; type?: string | null }
interface RawMilestone { id: string; name: string; targetDate?: string | null }
interface RawIssue {
  id: string;
  identifier?: string | null;
  title?: string | null;
  estimate?: number | null;
  completedAt?: string | null;
  updatedAt: string;
  state?: RawStatus | null;
  projectMilestone?: { id: string } | null;
}
export interface RawProject {
  id: string;
  name: string;
  status?: RawStatus | null;
  startDate?: string | null;
  targetDate?: string | null;
  color?: string | null;
  url?: string | null;
  updatedAt: string;
  issues?: { nodes?: RawIssue[] } | null;
  projectMilestones?: { nodes?: RawMilestone[] } | null;
}
export interface RawLinearData {
  viewer?: { organization?: { id: string; name: string; urlKey: string } | null } | null;
  projects: { nodes: RawProject[] };
}

interface ProjectsPage {
  viewer: RawLinearData["viewer"];
  projects: { nodes: RawProject[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
}

interface ProjectDetailPage {
  project: {
    projectMilestones: { nodes: RawMilestone[] };
    issues: { nodes: RawIssue[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  } | null;
}

const PROJECTS_QUERY = `
  query LinearskyProjects($first: Int!, $after: String) {
    viewer { organization { id name urlKey } }
    projects(first: $first, after: $after) {
      nodes { id name status { name type } startDate targetDate color url updatedAt }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PROJECT_DETAIL_QUERY = `
  query LinearskyProjectDetail($id: String!, $first: Int!, $after: String) {
    project(id: $id) {
      projectMilestones(first: 250) { nodes { id name targetDate } }
      issues(first: $first, after: $after) {
        nodes {
          id identifier title estimate completedAt updatedAt
          state { name type }
          projectMilestone { id }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export async function pullLinearSnapshot(apiKey: string): Promise<SkySnapshot> {
  const projects: RawProject[] = [];
  let after: string | null = null;
  let workspace: RawLinearData["viewer"];

  do {
    const response: ProjectsPage = await graphQL<ProjectsPage>(apiKey, PROJECTS_QUERY, { first: 100, after });
    workspace ??= response.viewer;
    projects.push(...response.projects.nodes);
    after = response.projects.pageInfo.hasNextPage ? response.projects.pageInfo.endCursor : null;
  } while (after);

  const activeProjects = projects.filter(isActiveProject);
  const hydrated = await mapLimit(activeProjects, 4, async (project) => ({
    ...project,
    ...(await fetchProjectDetails(apiKey, project.id)),
  }));

  return normalizeLinearData({ viewer: workspace, projects: { nodes: hydrated } });
}

export function normalizeLinearData(raw: RawLinearData, pulledAt = new Date().toISOString()): SkySnapshot {
  const organization = raw.viewer?.organization;
  if (!organization) throw new Error("Linear returned no workspace for the authenticated user.");

  return {
    version: 1,
    workspace: organization,
    pulledAt,
    projects: raw.projects.nodes.filter(isActiveProject).map(normalizeProject),
  };
}

async function fetchProjectDetails(apiKey: string, id: string): Promise<Pick<RawProject, "issues" | "projectMilestones">> {
  const issues: RawIssue[] = [];
  let milestones: RawMilestone[] = [];
  let after: string | null = null;
  do {
    const response: ProjectDetailPage = await graphQL<ProjectDetailPage>(apiKey, PROJECT_DETAIL_QUERY, { id, first: 250, after });
    if (!response.project) break;
    milestones = response.project.projectMilestones.nodes;
    issues.push(...response.project.issues.nodes);
    after = response.project.issues.pageInfo.hasNextPage ? response.project.issues.pageInfo.endCursor : null;
  } while (after);
  return { issues: { nodes: issues }, projectMilestones: { nodes: milestones } };
}

function normalizeProject(project: RawProject): SkyProject {
  const issues = (project.issues?.nodes ?? []).filter((issue) => !["canceled", "duplicate"].includes(issue.state?.type ?? ""));
  const rollup = rollupIssues(issues);
  const latestActivityAt = issues.reduce(
    (latest, issue) => new Date(issue.updatedAt) > new Date(latest) ? issue.updatedAt : latest,
    project.updatedAt,
  );

  return {
    id: project.id,
    name: project.name,
    state: project.status?.type ?? "unknown",
    statusName: project.status?.name ?? "Unknown",
    startDate: project.startDate ?? null,
    targetDate: project.targetDate ?? null,
    color: normalizeColor(project.color),
    url: project.url ?? null,
    updatedAt: project.updatedAt,
    latestActivityAt,
    rollup,
    milestones: (project.projectMilestones?.nodes ?? []).map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      targetDate: milestone.targetDate ?? null,
      rollup: rollupIssues(issues.filter((issue) => issue.projectMilestone?.id === milestone.id)),
    })),
    recentActivity: [...issues]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map((issue) => ({
        id: issue.id,
        identifier: issue.identifier ?? issue.id.slice(0, 8),
        title: issue.title ?? "Untitled issue",
        state: issue.state?.name ?? "Unknown",
        updatedAt: issue.updatedAt,
      })),
  };
}

function rollupIssues(issues: RawIssue[]): IssueRollup {
  const base = issues.reduce<Omit<IssueRollup, "progress">>((result, issue) => {
    const estimate = Math.max(0, issue.estimate ?? 0);
    const completed = Boolean(issue.completedAt) || issue.state?.type === "completed";
    result.total += 1;
    result.totalEstimate += estimate;
    if (completed) {
      result.completed += 1;
      result.completedEstimate += estimate;
    }
    return result;
  }, { total: 0, completed: 0, totalEstimate: 0, completedEstimate: 0 });
  return { ...base, progress: progressFromRollup(base) };
}

function isActiveProject(project: RawProject): boolean {
  return !["completed", "canceled"].includes(project.status?.type ?? "");
}

function normalizeColor(color?: string | null): string {
  if (color && /^#[0-9a-f]{6}$/i.test(color)) return color;
  return "#7c6cf2";
}

async function graphQL<T>(apiKey: string, query: string, variables: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    throw new Error(`Could not reach Linear: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (response.status === 401 || response.status === 403) throw new LinearAuthError("Linear rejected the API key.");
  if (!response.ok) throw new Error(`Linear API returned HTTP ${response.status}.`);
  const payload = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (payload.errors?.length) {
    const message = payload.errors.map((entry) => entry.message).join("; ");
    if (/auth|unauthor|api key/i.test(message)) throw new LinearAuthError(message);
    throw new Error(`Linear GraphQL error: ${message}`);
  }
  if (!payload.data) throw new Error("Linear returned no data.");
  return payload.data;
}

async function mapLimit<T, R>(values: T[], concurrency: number, map: (value: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(values.length);
  let index = 0;
  async function worker(): Promise<void> {
    while (index < values.length) {
      const current = index++;
      output[current] = await map(values[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return output;
}
