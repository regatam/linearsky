# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Read `docs/design.md` before changing product scope; its local-first, read-only, zero-LLM boundaries are locked for v1.
- The snapshot shape is defined by `src/shared/types.ts`; the annotation contract is documented by `skills/sky-assess/SKILL.md` and enforced by `src/server/annotations.ts`. Runtime data belongs under the caller's `.linearsky/`, while auth belongs in the global config path implemented by `src/cli/auth.ts`.
- Keep delivery-signal constants centralized in `src/shared/config.ts` and verify changes with `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`.
- `LINEARSKY_FIXTURE=1 npx . start` is the credential-free end-to-end demo and acceptance path.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
