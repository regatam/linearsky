import { useEffect, useMemo, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import { SKY_CONFIG } from "../shared/config.js";
import { addDays, dateOnly, daysBetween, isProjectStale, projectPace } from "../shared/math.js";
import type { Annotation, Pace, SkyData, SkyProject } from "../shared/types.js";

const DAY_MS = 86_400_000;

export default function App() {
  const [data, setData] = useState<SkyData | null>(window.__LINEARSKY_DATA__ ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (window.__LINEARSKY_DATA__) return;
    fetch("/api/data")
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Could not load the sky");
        return response.json() as Promise<SkyData>;
      })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
    const stream = new EventSource("/api/events");
    stream.addEventListener("sky-update", (event) => setData(JSON.parse((event as MessageEvent).data) as SkyData));
    return () => stream.close();
  }, []);

  const selected = data?.snapshot.projects.find((project) => project.id === selectedId) ?? null;
  const selectedAnnotations = data?.annotations.filter((annotation) => annotation.project === selectedId) ?? [];

  async function refresh() {
    if (window.__LINEARSKY_DATA__) return;
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const payload = await response.json() as SkyData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Refresh failed");
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setRefreshing(false);
    }
  }

  if (error && !data) return <EmptyState title="The sky could not load" message={error} />;
  if (!data) return <EmptyState title="Mapping your company sky…" message="Reading the local Linear snapshot." loading />;

  const dated = data.snapshot.projects.filter((project) => project.startDate && project.targetDate);
  const undated = data.snapshot.projects.filter((project) => !project.startDate || !project.targetDate);
  const completed = data.snapshot.projects.reduce((total, project) => total + project.rollup.completed, 0);
  const issues = data.snapshot.projects.reduce((total, project) => total + project.rollup.total, 0);
  const staleSnapshot = Date.now() - new Date(data.snapshot.pulledAt).getTime() > SKY_CONFIG.staleSnapshotAfterHours * 3_600_000;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="linearsky home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>linear<em>sky</em></span>
        </a>
        <div className="topbar-actions">
          <span className="local-pill"><span /> local snapshot</span>
          <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle color theme">
            {theme === "dark" ? "☼" : "◐"}
          </button>
          <button className="refresh-button" onClick={refresh} disabled={refreshing || Boolean(window.__LINEARSKY_DATA__)}>
            <span className={refreshing ? "spinning" : ""}>↻</span> {window.__LINEARSKY_DATA__ ? "Export" : refreshing ? "Pulling…" : "Pull Linear"}
          </button>
        </div>
      </header>

      <main id="top">
        {staleSnapshot && (
          <div className="stale-banner" role="status">
            <span>Stale as of {formatTimestamp(data.snapshot.pulledAt)}</span> Showing the last local snapshot; pull again when Linear is reachable.
          </div>
        )}
        {error && <div className="error-banner" role="alert">{error}</div>}

        <section className="intro">
          <div>
            <div className="eyebrow"><span>{data.snapshot.workspace.name}</span><b>Company sky</b></div>
            <h1>Everything in flight,<br /><span>seen from above.</span></h1>
            <p>Every active project across one shared horizon. Dates, delivery pace, milestones, and honest agent judgment—without another system to maintain.</p>
          </div>
          <dl className="summary-stats">
            <div><dt>In flight</dt><dd>{dated.length}<small>projects</small></dd></div>
            <div><dt>Work closed</dt><dd>{issues ? Math.round((completed / issues) * 100) : 0}<small>%</small></dd></div>
            <div><dt>Need dates</dt><dd>{undated.length}<small>projects</small></dd></div>
          </dl>
        </section>

        <div className={`workspace ${selected ? "panel-open" : ""}`}>
          <section className="sky-card" aria-label="Project calendar">
            <div className="card-heading">
              <div><span className="section-kicker">Flight plan</span><h2>Active projects</h2></div>
              <div className="legend" aria-label="Pace legend">
                <span><i className="pace-on-track" />On pace</span>
                <span><i className="pace-at-risk" />Watch</span>
                <span><i className="pace-off-track" />Off pace</span>
              </div>
            </div>
            <SkyTimeline
              projects={dated}
              annotations={data.annotations}
              selectedId={selectedId}
              onSelect={(project) => setSelectedId(project.id)}
            />
            <UndatedShelf projects={undated} selectedId={selectedId} onSelect={(project) => setSelectedId(project.id)} />
          </section>
          <ProjectPanel project={selected} annotations={selectedAnnotations} onClose={() => setSelectedId(null)} />
        </div>

        <footer>
          <span>Snapshot pulled {relativeTime(data.snapshot.pulledAt)}</span>
          <span>Linear stays the source of truth · annotations stay on disk</span>
          {data.annotationWarnings.length > 0 && (
            <span className="warning-chip" title={data.annotationWarnings.map((warning) => `${warning.filename}: ${warning.message}`).join("\n")}>⚠ {data.annotationWarnings.length} malformed annotation{data.annotationWarnings.length === 1 ? "" : "s"}</span>
          )}
        </footer>
      </main>
    </div>
  );
}

function SkyTimeline({ projects, annotations, selectedId, onSelect }: {
  projects: SkyProject[];
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (project: SkyProject) => void;
}) {
  const now = dateOnly(new Date());
  const range = useMemo(() => timelineRange(projects, now), [projects]);
  const totalDays = daysBetween(range.start, range.end) + 1;
  const timelineWidth = Math.max(760, totalDays * SKY_CONFIG.dayWidthPx);
  const widthPerDay = timelineWidth / totalDays;
  const months = monthSegments(range.start, totalDays);
  const weeks = weekMarkers(range.start, totalDays);
  const todayOffset = daysBetween(range.start, now) * widthPerDay;
  const style = { "--timeline-width": `${timelineWidth}px` } as CSSProperties;

  return (
    <div className="timeline-scroll" style={style}>
      <div className="timeline-inner">
        <div className="timeline-header">
          <div className="sticky-label header-label">Project <span>{projects.length}</span></div>
          <div className="calendar-header">
            <div className="months-row">
              {months.map((month) => <span key={month.label} style={{ left: month.offset * widthPerDay, width: month.days * widthPerDay }}>{month.label}</span>)}
            </div>
            <div className="weeks-row">
              {weeks.map((week) => <span key={week.date.toISOString()} style={{ left: week.offset * widthPerDay }}>{week.label}</span>)}
            </div>
            {todayOffset >= 0 && todayOffset <= timelineWidth && <div className="today-head" style={{ left: todayOffset }}><b>Today</b></div>}
          </div>
        </div>

        <div className="timeline-body">
          {projects.map((project) => {
            const start = new Date(`${project.startDate}T00:00:00Z`);
            const target = new Date(`${project.targetDate}T00:00:00Z`);
            const left = daysBetween(range.start, start) * widthPerDay;
            const width = Math.max(widthPerDay, (daysBetween(start, target) + 1) * widthPerDay);
            const pace = projectPace(project);
            const annotation = annotations.find((entry) => entry.project === project.id);
            return (
              <button
                type="button"
                className={`project-row ${selectedId === project.id ? "selected" : ""}`}
                key={project.id}
                onClick={() => onSelect(project)}
                aria-label={`Open ${project.name}`}
              >
                <span className="sticky-label project-label">
                  <i style={{ background: project.color }} />
                  <span><b>{project.name}</b><small>{project.statusName}</small></span>
                  {isProjectStale(project) && <em className="stale-dot" title={`No activity in ${SKY_CONFIG.staleAfterDays}+ days`} />}
                </span>
                <span className="project-track">
                  {weeks.map((week) => <i className="gridline" key={week.date.toISOString()} style={{ left: week.offset * widthPerDay }} />)}
                  {todayOffset >= 0 && todayOffset <= timelineWidth && <i className="today-line" style={{ left: todayOffset }} />}
                  <span
                    className={`project-span pace-${pace}`}
                    data-testid="project-span"
                    data-project={project.id}
                    data-pace={pace}
                    style={{ left, width, "--project-color": project.color } as CSSProperties}
                  >
                    <span className="progress-fill" style={{ width: `${Math.round(project.rollup.progress * 100)}%` }} />
                    <span className="span-content">
                      <b>{Math.round(project.rollup.progress * 100)}%</b>
                      <small>{formatShortDate(project.startDate!)} → {formatShortDate(project.targetDate!)}</small>
                    </span>
                    {project.milestones.filter((milestone) => milestone.targetDate).map((milestone) => {
                      const milestoneOffset = (daysBetween(start, new Date(`${milestone.targetDate}T00:00:00Z`)) / Math.max(1, daysBetween(start, target))) * 100;
                      return <i
                        className={`milestone-tick ${milestone.rollup.progress >= 1 ? "complete" : ""}`}
                        data-testid="milestone-tick"
                        key={milestone.id}
                        style={{ left: `${Math.max(0, Math.min(100, milestoneOffset))}%` }}
                        title={`${milestone.name} · ${Math.round(milestone.rollup.progress * 100)}%`}
                      />;
                    })}
                    {annotation && <i className={`annotation-marker annotation-${annotation.status}`} data-testid="annotation-marker" title={`${annotation.status} · ${annotation.by}`} />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UndatedShelf({ projects, selectedId, onSelect }: { projects: SkyProject[]; selectedId: string | null; onSelect: (project: SkyProject) => void }) {
  if (!projects.length) return null;
  return (
    <div className="undated-shelf" data-testid="undated-shelf">
      <div className="shelf-heading"><span>Holding pattern</span><p>These active projects need a start or target date.</p></div>
      <div className="undated-grid">
        {projects.map((project) => (
          <button type="button" key={project.id} className={selectedId === project.id ? "selected" : ""} onClick={() => onSelect(project)}>
            <i style={{ background: project.color }} />
            <span><b>{project.name}</b><small>{project.rollup.total} issues · {Math.round(project.rollup.progress * 100)}% closed</small></span>
            <em>Set dates ↗</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProjectPanel({ project, annotations, onClose }: { project: SkyProject | null; annotations: Annotation[]; onClose: () => void }) {
  if (!project) {
    return (
      <aside className="project-panel panel-empty">
        <div className="panel-orbit" aria-hidden="true"><i /><i /><b /></div>
        <span className="section-kicker">Project detail</span>
        <h3>Pick a flight path</h3>
        <p>Select any project span to inspect milestones, recent movement, and outside judgment from your agents.</p>
        <div className="panel-hint"><kbd>↵</kbd><span>All context comes from local JSON and Markdown. Nothing leaves this machine.</span></div>
      </aside>
    );
  }
  const pace = projectPace(project);
  return (
    <aside className="project-panel project-detail" data-testid="project-panel">
      <button className="panel-close" onClick={onClose} aria-label="Close project detail">×</button>
      <div className="panel-project-heading">
        <i style={{ background: project.color }} />
        <span className={`pace-badge pace-${pace}`}>{pace.replace("-", " ")}</span>
        <h3>{project.name}</h3>
        <p>{formatLongDate(project.startDate)} — {formatLongDate(project.targetDate)}</p>
      </div>
      <div className="panel-progress">
        <div><span>Delivery progress</span><b>{Math.round(project.rollup.progress * 100)}%</b></div>
        <i><b style={{ width: `${Math.round(project.rollup.progress * 100)}%`, background: project.color }} /></i>
        <small>{project.rollup.completed} of {project.rollup.total} issues closed</small>
      </div>

      <PanelSection title="Milestones" count={project.milestones.length}>
        {project.milestones.length ? project.milestones.map((milestone) => (
          <div className="milestone-item" key={milestone.id}>
            <i className={milestone.rollup.progress >= 1 ? "complete" : ""}>◆</i>
            <span><b>{milestone.name}</b><small>{formatLongDate(milestone.targetDate)}</small></span>
            <em>{Math.round(milestone.rollup.progress * 100)}%</em>
          </div>
        )) : <p className="panel-muted">No milestones yet.</p>}
      </PanelSection>

      <PanelSection title="Recent movement" count={project.recentActivity.length}>
        {project.recentActivity.length ? project.recentActivity.slice(0, 4).map((activity) => (
          <div className="activity-item" key={activity.id}>
            <span><b>{activity.identifier}</b>{activity.title}</span>
            <small>{relativeTime(activity.updatedAt)} · {activity.state}</small>
          </div>
        )) : <p className="panel-muted">No issue activity in this snapshot.</p>}
      </PanelSection>

      <PanelSection title="Agent judgment" count={annotations.length} accent>
        {annotations.length ? annotations.map((annotation) => (
          <article className="annotation-card" key={annotation.filename}>
            <header><span className={`annotation-status annotation-${annotation.status}`}>{annotation.status.replace("-", " ")}</span><small>{annotation.confidence} confidence</small></header>
            <ReactMarkdown>{annotation.body}</ReactMarkdown>
            <footer><span>by {annotation.by}</span><span>{annotation.sources.join(" + ")}</span></footer>
          </article>
        )) : <p className="panel-muted">No agent assessment yet. Run the <code>sky-assess</code> skill from this folder.</p>}
      </PanelSection>
      {project.url && <a className="linear-link" href={project.url} target="_blank" rel="noreferrer">Open in Linear <span>↗</span></a>}
    </aside>
  );
}

function PanelSection({ title, count, accent = false, children }: { title: string; count: number; accent?: boolean; children: React.ReactNode }) {
  return <section className={`panel-section ${accent ? "accent" : ""}`}><h4>{title}<span>{count}</span></h4>{children}</section>;
}

function EmptyState({ title, message, loading = false }: { title: string; message: string; loading?: boolean }) {
  return <main className="empty-state"><div className={loading ? "loader" : "empty-mark"} /><h1>{title}</h1><p>{message}</p></main>;
}

function timelineRange(projects: SkyProject[], today: Date) {
  const dates = projects.flatMap((project) => [project.startDate, project.targetDate]).filter(Boolean).map((value) => new Date(`${value}T00:00:00Z`));
  const min = new Date(Math.min(today.getTime(), ...dates.map((date) => date.getTime())));
  const max = new Date(Math.max(today.getTime(), ...dates.map((date) => date.getTime())));
  return { start: addDays(min, -SKY_CONFIG.timelinePaddingDays), end: addDays(max, SKY_CONFIG.timelinePaddingDays) };
}

function monthSegments(start: Date, totalDays: number) {
  const segments: Array<{ label: string; offset: number; days: number }> = [];
  for (let offset = 0; offset < totalDays;) {
    const date = addDays(start, offset);
    const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const days = Math.min(totalDays - offset, daysBetween(date, nextMonth));
    segments.push({ label: date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }), offset, days });
    offset += Math.max(1, days);
  }
  return segments;
}

function weekMarkers(start: Date, totalDays: number) {
  const markers: Array<{ date: Date; offset: number; label: string }> = [];
  for (let offset = 0; offset < totalDays; offset += 7) {
    const date = addDays(start, offset);
    markers.push({ date, offset, label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) });
  }
  return markers;
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatLongDate(value: string | null) {
  if (!value) return "No date";
  const date = value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function relativeTime(value: string) {
  const distance = Date.now() - new Date(value).getTime();
  const abs = Math.abs(distance);
  const suffix = distance >= 0 ? "ago" : "from now";
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)}m ${suffix}`;
  if (abs < DAY_MS) return `${Math.round(abs / 3_600_000)}h ${suffix}`;
  return `${Math.round(abs / DAY_MS)}d ${suffix}`;
}
