---
description: Run one autonomous development cycle (orient, research, plan, build, test, review, commit, save)
argument-hint: [optional focus, e.g. "prioritize the dedup-log refactor"]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Autonomous Development Cycle

## Current state (auto-loaded)
- Current branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no git"`
- Recent history: !`git log --oneline -20 2>/dev/null || echo "no git history yet"`
- Working tree: !`git status --short 2>/dev/null || echo "not a git repo"`
- Progress file: @PROGRESS.md

## Your job this run
Run EXACTLY ONE full development cycle on this project, then stop and report.
The canonical loop, stop conditions, and guardrails live in CLAUDE.md; follow
them. A compact version is restated below so this command also works on its own.

Optional steering hint from the operator: $ARGUMENTS
If provided, treat it as guidance on which roadmap task to prioritize this
cycle. If empty, pick the single highest-value task yourself.

## Branch discipline (project-specific, critical)
Pushing `master` auto-deploys to the LIVE production site (r2ftrading.com). Do
all work on the `dev-loop` branch (create it with `git checkout -b dev-loop` if
it does not exist). Commit and push only that branch; its Vercel preview deploy
is the staging environment. Never commit to or push `master` — production is a
human merge.

## The cycle (do all seven, in order, once)
1. ORIENT — reconstruct project state from PROGRESS.md and the git history
   above. The file is the source of truth, not your memory. Make sure you are on
   the `dev-loop` branch.
2. RESEARCH — for the chosen task only, read the relevant code and verify any
   external interface you are unsure about. No guessing.
3. PLAN — write a short ordered list of atomic steps into PROGRESS.md under the
   current task before writing code. If it cannot finish and be verified in one
   cycle, split it and put the rest back on the roadmap.
4. BUILD — implement the plan, matching existing style. No stubs, no TODOs left
   behind, no commented-out experiments.
5. TEST — write or extend tests, then run the full suite, the linter, the
   typecheck (`npx tsc --noEmit`), and the build (`npm run build`). If no test
   setup exists, creating one IS this cycle's task. Not done until everything is
   green. Fix the cause, never the test.
6. REVIEW — re-read your diff against the acceptance criteria. Check edge cases,
   error handling, validation, security around secrets and user data, and
   leftover debug output. Fix before committing.
7. INTEGRATE — commit to `dev-loop` with a clear message, push the branch, then
   update PROGRESS.md: mark the task done, record decisions, note what the next
   cycle needs. Then STOP.

## Stop instead, and report, if
- The roadmap is empty (current definition of done is reached).
- You are blocked on an owner-only decision (direction, money, naming, a
  trade-off with no clear winner).
- The chosen task has failed verification three times this cycle.
- The next action is destructive or irreversible, or touches production, real
  payments, live customer data, or credentials, or would require committing to
  `master`.

## Never do without explicit approval
Commit to or push `master`, deploy to production, commit secrets or .env,
force-push or rewrite shared history, delete or migrate real data (the datastore
is the live GitHub repo's data/*.json) without a backup, or work outside the
project directory.

End the run with a short summary: what shipped this cycle, what the next task is,
and anything you need from the owner.
