# linearsky — v1 design

Status: implemented v1 baseline. This document owns the product boundaries and architecture; the README owns installation and common usage.

## Problem

Linear has no company-level bird's-eye view. linearsky provides a flight-search-style calendar: every active project as a colored span across its dates, seen at a glance, with honest signals about whether each is actually on track — and a way for external CLI agents to add judgment.

## Product decisions (locked)

- **Audience:** public, open-source npm package; `LICENSE` owns the license terms.
- **Form:** local-first app, `npx linearsky`. No hosted mode in v1.
- **Intelligence:** the app contains **zero LLM**. All judgment comes from whatever CLI agent the user already runs, through disk-file contracts. No model keys, no inference billing in the app.
- **Default scene:** "company sky" — all active projects on one calendar.
- **DX bar:** stranger to working sky in under 5 minutes; agent-agnostic; no lock-in (Linear stays the database; local files are plain markdown/JSON).

## Architecture

```
CLI + local server  →  snapshot on disk  ←  user's CLI agent (any model)
        ↓                     ↓                      ↓
   React UI  ←──  renders sky + annotations  ←──  annotations on disk
```

The app is a deterministic viewer. The agent is a guest analyst. Disk files are the only contract.

## Components

### CLI (`npx linearsky`)
- `start` — ensure auth, pull snapshot, serve UI, open browser.
- `pull` — refresh snapshot only.
- `export` — render a self-contained static HTML file of the current sky.
- First run: prompt for a Linear personal API key; store it in the user's global config directory; never transmit it anywhere but api.linear.app. The README owns the exact user-facing path and environment override.

### Snapshot (`.linearsky/snapshot.json`)
Lives in the directory where the user runs the CLI (their chosen "sky workspace" folder), so agents launched in that same directory find snapshot and annotations in cwd by convention. Auth stays in the user's global config directory; data stays local to the folder.
Pulled via Linear GraphQL: projects (id, name, state, startDate, targetDate, color), milestones (name, targetDate, issue rollup), per-project issue counts by state, estimates when present, latest activity timestamps. Read-only mirror with a `pulledAt` stamp.

### UI — the sky
- Horizontal calendar, weeks/months header, vertical today-line.
- One row per active project: span from startDate→targetDate.
  - **Progress fill:** completed/total issues (estimate-weighted when estimates exist).
  - **Pace tint:** % time elapsed vs % work done → green/amber/red shift.
  - **Milestone ticks:** at each milestone targetDate, filled when its issues are done.
  - **Staleness dot:** computed from the threshold centralized in `src/shared/config.ts`; the README owns the user-facing semantics.
- Click a span → highlight its date range (flight-picker moment); side panel with milestones, recent activity, and agent annotations.
- Projects without dates render on an "undated" shelf below the calendar — visible, never silently dropped.
- Aesthetic bar is portfolio-grade; this is a public showpiece.

### Annotations (`.linearsky/annotations/*.md`)
The `sky-assess` skill owns the required Markdown and frontmatter schema, which `src/server/annotations.ts` enforces. The UI file-watches the folder, renders the assessment in the side panel and a subtle marker on the span, and surfaces malformed files as warnings without crashing.

### Skills (`skills/` in repo)
- **v1 ships one:** `sky-assess` — instructions for any CLI agent: read snapshot, optionally cross-check Slack/Linear through the agent's own MCP connections, write annotations using the skill-owned schema, and be honest (no vibes-only "on-track").
- Named future slots, not built: `sky-nudge` (draft Slack bumps for human approval), `sky-dispatch` (hand a doable ticket to an agent).

## Data flow

`start` → GraphQL pull → snapshot.json → UI renders (<2s target) → user runs their agent with `sky-assess` on demand → annotations appear live via file-watch. Refresh is manual (`pull` or ⟳ button). No daemons, no polling in v1.

## Error handling

- Bad/expired API key → clear message + re-auth prompt; never a blank sky.
- Linear unreachable → render last snapshot with "stale as of <pulledAt>" banner.
- Malformed annotation → skip file, small warning chip, view never crashes.
- Missing dates → undated shelf (a finding, not an error).

## Testing

- Unit: pace/progress math; GraphQL→snapshot normalization (fixtures).
- Playwright: sky renders correctly from a fixture snapshot (spans, ticks, tints, undated shelf, annotation badge).
- Skills: dogfood on Rene's workspace.

## Explicitly out of v1

Hosted mode, OAuth, Slack sending, agent dispatching, Linear write-back, auto-polling, per-person workload lanes. Each is a socket, not a feature.
