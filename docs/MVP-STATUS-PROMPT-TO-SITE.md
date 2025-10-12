You are a senior full-stack engineer operating inside the CodeMate Studio repo. Implement the following incremental improvements to the already-working “Prompt → Site” MVP. Follow these guardrails and acceptance checks exactly:

Guardrails:
- Plan then implement; after each step, STOP and show a unified diff and the exact commands to run. 
- No secrets: stub env values and document placeholders.
- Tokens only in components (no raw hex); import from /src/styles/tokens.ts if relevant.
- Accessibility: proper labels, focus order; if you add a modal/form, include an a11y test.
- Testing: Vitest/RTL for units, Playwright for happy-path E2E.
- Keep components ≤200 LoC; extract hooks where helpful.

Acceptance checklist (must be green before you move from one step to the next):
- `npm run check` passes (TypeScript)
- `npm test` passes (unit & e2e where applicable)
- No console errors on route render
- No raw hex; tokens imported
- a11y checks pass on any UI you add
- README/docs updated when behavior changes

Tasks (do these in order; after each step, pause with diffs + commands):

STEP 1 — API smoke test route + docs:
- Add a minimal “/api/healthz” GET route returning `{ ok: true }`.
- In /docs/PROMPT-TO-SITE-MVP.md append a short “API Smoke Test” section with a `curl` example for /api/generate and /api/healthz.
- Output diffs + commands to run the server and test via curl.

STEP 2 — Fix the pre-existing TS error in spec-editor.tsx:
- Resolve JSX/syntax/type issues WITHOUT changing behavior.
- Add a narrow unit test that renders the component and asserts it mounts.
- Output diffs + `npm run check` + `npm test` commands.

STEP 3 — Unskip a minimal Playwright E2E:
- In /e2e/generation.spec.ts, keep it fast and deterministic:
  - POST /api/generate with prompt “create a blog” (skip build validation flag).
  - Assert JSON contains `success: true`, a `recipeName`, and a non-empty `outputPath`.
- Add Playwright config if missing; keep timeouts strict.
- Output diffs + `npx playwright test` commands.

STEP 4 — Logging & error-paths:
- Wrap /api/generate with try/catch logging. On bad prompts (no template), return 400 with a clear message.
- Add a unit test for the 400 path (e.g., prompt: “make a website”).
- Output diffs + commands.

STEP 5 — Build validation flag verification:
- Add a small CLI test (Vitest) that spawns `tsx scripts/generate-site.ts --prompt "create a blog" --skip-validation` and asserts exit code 0.
- Output diffs + commands.

Constraints:
- Do NOT invent env secrets or external services.
- Keep each step’s changes focused; prefer multiple small commits over one big one.

At the end, produce:
1) A compact changelog of the 5 steps.
2) The exact command block to run the full test suite locally.
3) Any TODOs you recommend for Phase 2 (portfolio/e-commerce recipes, package.json generation, etc.).

Begin with STEP 1 only. Plan briefly, then show diffs and commands. Stop after STEP 1 output.