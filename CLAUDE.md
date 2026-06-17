@AGENTS.md

# CLAUDE.md

This file is auto-loaded at the start of every Claude Code session in this repo.
It defines what the project is and how the autonomous development loop operates.
PROGRESS.md holds the live state.

> Note: detailed project memory (architecture, env vars, cron schedule, known
> issues) lives in `.claude/CLAUDE.md` and is also auto-loaded. The line above
> imports `AGENTS.md` (the "this Next.js has breaking changes, read the local
> docs" warning). Both still apply. This file adds the dev-loop layer on top.

## Project
R2F Trading (r2ftrading.com) is a fully automated ICT trading coaching business:
a Next.js marketing site plus a large content-automation engine (blog, YouTube
shorts, multi-platform social syndication, email drips, Reddit/Twitter
engagement, Pinterest pinning, programmatic SEO) deployed on Vercel, using the
GitHub Contents API as its datastore because the Vercel filesystem is read-only.
The audience is retail forex and futures traders. This is an ongoing product
with no fixed finish line: "done" for the loop means the PROGRESS.md roadmap is
empty, at which point it stops and asks for more direction.

- Stack: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + MDX.
  Data via GitHub Contents API (`src/lib/github.ts`). AI: Anthropic Claude
  (content), Google Gemini (images), ElevenLabs (voice), OpenAI Whisper
  (captions). Email: Resend. Hosting: Vercel.
- Run locally: `npm run dev` (Next dev server on http://localhost:3000)
- Test: none yet — no test framework is installed. Setting one up (Vitest) is
  the first roadmap task. Until then, "tests pass" means the typecheck below.
- Lint: `npm run lint` (ESLint, eslint-config-next)
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Deploy staging: push the working branch to origin; Vercel auto-creates a
  preview deployment for it. There is no separate staging command.

## Branch discipline (READ THIS — production is live)
Pushing to `master` triggers an automatic PRODUCTION deploy to r2ftrading.com.
Therefore the loop must never commit to or push `master`.

- The loop works on a branch named `dev-loop` (create it if missing:
  `git checkout -b dev-loop`). Commits there create Vercel PREVIEW deploys,
  which is the staging environment for this project.
- Promoting to production is a human action: the owner reviews the branch and
  merges it to `master` themselves. Do not open or merge that PR automatically.
- The global "auto-push after commit" preference applies to the `dev-loop`
  branch only, never to `master`.

## Source of truth
PROGRESS.md is the single source of truth for project state: roadmap, current
task, decisions, and blockers. Read it at the start of every cycle and update it
at the end. Never rely on memory of earlier cycles. Assume your context may have
been reset between cycles, and that the file plus git history is all you have.

Git history is the set of save points. One commit per completed task.

## The development loop
Work in cycles. Each cycle advances the project by exactly one verifiable
increment, then saves progress so the next cycle can resume cleanly from a cold
start. Trigger a cycle with /dev-loop.

0. ORIENT. Read PROGRESS.md end to end and run `git log --oneline -20`.
   Reconstruct where the project is and what the next task is. The file is the
   truth, not your memory. Confirm you are on the `dev-loop` branch.

1. RESEARCH. For the current task only: read the relevant existing code, see how
   similar things are already done in this repo, and look up any external API or
   library you are not certain about. Do not guess at interfaces you can verify.
   Record what you learned in the task notes.

2. PLAN. Break the task into a short ordered list of atomic steps and write it
   into PROGRESS.md under the current task before touching code. Keep it small
   enough to finish and verify in one cycle. If it cannot fit, the task is too
   big: split it and put the rest back on the roadmap.

3. BUILD. Implement the plan one step at a time. Match the existing style and
   structure. No placeholder code, no TODO stubs left behind, no commented-out
   experiments.

4. TEST. Write or extend tests that prove the increment works, then run the full
   test suite, the linter, the typecheck, and the build. If there is no test
   setup yet, your first task is to create one. A task is not done until
   everything passes. When a test fails, fix the cause, not the test.

5. REVIEW. Re-read your own diff with fresh eyes against the task's acceptance
   criteria. Check the things that commonly go wrong: edge cases, error
   handling, input validation, security around anything touching secrets or user
   data, leftover debug output, and whether you solved the task or just hid the
   symptom. Fix what you find before moving on.

6. INTEGRATE. Commit to the `dev-loop` branch with a clear message describing
   what changed and why, then push the branch. Update PROGRESS.md: mark the task
   done, record any decision or trade-off, and note anything the next cycle
   needs to know.

7. CHOOSE NEXT. Pick the single highest-value task left on the roadmap, make it
   the current task, and start a new cycle at step 0.

## Stop and ask the owner when
- The roadmap is empty (project has reached its current definition of done).
- You are blocked on a decision only the owner can make: product direction,
  spending money, naming, or a trade-off with no clear winner.
- The same task has failed verification three times. Stop thrashing and report
  what you tried.
- The next action is destructive or irreversible: deleting data, force-pushing,
  rewriting history, changing access.
- The next action touches production, real payments, live customer data, or
  credentials, OR would require committing to `master`.
When you stop, write a clear summary of the current state and the specific
question or approval you need, then halt.

## Guardrails (never cross without explicit approval)
- Never commit to or push the `master` branch — it auto-deploys to production.
  Work on `dev-loop`; production promotion is a human merge.
- Never deploy to production automatically.
- Never commit secrets, keys, or .env contents.
- Never force-push or rewrite shared history.
- Never delete or migrate real data without a backup and approval. Remember the
  datastore is the live GitHub repo (data/*.json), not a throwaway DB.
- Stay inside the project directory.

## Quality bar
Working is the floor, not the goal. Every increment should be something you
would be comfortable handing to a senior engineer to review: readable, tested,
consistent with the codebase, and honest in PROGRESS.md about its limitations.
