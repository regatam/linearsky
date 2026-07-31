---
name: sky-assess
description: Assess projects in a local linearsky snapshot and write evidence-based Markdown annotations for the sky UI.
---

# Assess a linearsky snapshot

Use this skill when asked to assess delivery health, add judgment to linearsky, or review the company sky. linearsky itself makes no model calls; your annotation is an external, on-demand analysis saved through a plain file contract.

## Safety and source boundaries

- Treat `.linearsky/snapshot.json` in the current directory as the required source.
- You may cross-check Linear, Slack, or other tools through connections already available to you, but do not require them.
- This skill is read-only toward Linear and every external system. Never update issues, send messages, or dispatch work.
- Write only `.linearsky/annotations/*.md` files.
- Never claim a project is on track from status labels or intuition alone. Cite concrete schedule, completion, milestone, activity, or blocker evidence in the prose.

## Workflow

1. Read `.linearsky/snapshot.json` and confirm `pulledAt`. If it is stale, say so in the assessment and lower confidence where appropriate.
2. Select the requested project by its exact `id`. Review dates, issue/estimate rollup, milestones, latest activity, and recent activity.
3. Optionally cross-check connected sources. Record only source names in frontmatter; put useful evidence or links in the prose.
4. Choose one status:
   - `on-track`: schedule and work evidence support the current target with no material unresolved risk.
   - `at-risk`: delivery is still credible, but one or more specific risks threaten the target.
   - `needs-attention`: evidence indicates the target or plan needs an explicit intervention or decision.
5. Choose confidence based on evidence coverage: `low`, `medium`, or `high`.
6. Write one file named for a readable project slug, such as `.linearsky/annotations/nimbus-mobile-beta.md`, using the exact schema below.
7. Re-read the file. Confirm the `project` value is the snapshot's exact project ID and the prose explains why a reasonable operator should believe the status.

## Required schema

```markdown
---
project: <exact Linear project id from snapshot.json>
status: on-track | at-risk | needs-attention
confidence: low | medium | high
sources: [linear, slack]
updated: <current ISO 8601 timestamp>
by: <your agent/model name>
---
Concise assessment with specific evidence, links when available, key uncertainty,
and the next decision or signal worth watching.
```

`sources` must be a YAML array of source names. Use `[linear]` when the snapshot is the only source. Do not add custom frontmatter values in place of the required enums.

## Quality bar

A useful note distinguishes facts from inference, names the critical evidence, and admits missing context. “The project looks on track” is not an assessment. “Seven of nine estimated points remain with four working days left, and the beta milestone has no completed issues” is.
