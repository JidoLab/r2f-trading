# PROGRESS.md

The single source of truth for this project's state. Claude reads this at the
start of every development cycle and updates it at the end. Keep it current and
honest. If this file and your memory disagree, this file wins.

## Project
R2F Trading (r2ftrading.com): a Next.js 16 marketing site plus a content and
growth automation engine for an ICT trading coaching business, deployed on
Vercel with the GitHub Contents API as its datastore. The autonomous loop's job
is to raise the engineering quality and reliability of this codebase (tests, CI,
shared utilities, guardrails) without touching production. "Done" for now means
this roadmap is empty. Production deploys are a human merge from `dev-loop` to
`master`.

## Roadmap (ordered by priority, top item is next)
- [ ] Establish a green ESLint baseline — acceptance: `npm run lint` exits 0.
      DISCOVERED 2026-06-17: lint is already red on master with 153 errors
      (mostly `@typescript-eslint/no-explicit-any` in src/lib/youtube-analytics.ts,
      mdx-components.tsx, and others) plus 81 warnings, all pre-existing and
      unrelated to the test harness. Until this is green the loop's lint gate is
      not trustworthy. This is likely too big for one cycle: split by file/rule,
      or decide to scope the gate to changed files. Owner input welcome on which
      approach (see blockers).
- [ ] Unit-test the pure helpers that just shipped and are easy to break —
      acceptance: tests cover `sanitizeComment` (em/en dash stripping +
      punctuation tidy) in reddit-engage, the Pinterest dedup `buildQueue`
      ordering + merge-on-save dedup, and `slugify` in generate-glossary. All
      green.
- [ ] Extract the duplicated dedup-log pattern (load + merge-on-save, used by
      reddit-engage and pinterest-pin) into `src/lib/dedup-log.ts` and reuse it
      in both crons — acceptance: both crons import the shared util, behaviour
      unchanged, unit tests for the util pass, build green.
- [ ] Add a cron-auth guard test — acceptance: a test asserts representative
      cron routes return 401 when the `CRON_SECRET` bearer is missing or wrong.
- [ ] Add CI on pull requests to master — acceptance: a GitHub Actions workflow
      runs lint + typecheck + build + tests and passes on the `dev-loop` branch.

## Current task
Task: [none active; next cycle picks the top roadmap item — the ESLint baseline]
Plan:
  1.
Research notes:

## Done
- (2026-06-17) Set up the test harness. Vitest 4.1.9 added as devDependency,
  `vitest.config.ts` (node env, `@ -> ./src` alias), `test`/`test:watch` scripts,
  and `tests/date-context.test.ts` (6 assertions over the pure date helpers).
  Green: `npx vitest run` (6/6), `npx tsc --noEmit`, `npm run build` (281 pages).
  Lint NOT green, but only due to the pre-existing baseline (see roadmap item 1);
  the two new files lint clean. Commit on `dev-loop`.

## Decisions and trade-offs
- (2026-06-17) Test runner uses the node environment and no jsdom yet, since the
  first tests cover server-side pure helpers. Add jsdom + @testing-library when
  the first component test arrives, not before (avoid unused deps).
- (2026-06-17) Did not fix the 153 pre-existing lint errors during the harness
  task — out of scope, and large enough to need its own cycle. Logged as the new
  top roadmap item instead of silently letting the gate stay red.
- (2026-06-17) Loop runs on the `dev-loop` branch, never `master`, because
  pushing master auto-deploys to the live production site. Vercel preview
  deployments on the branch serve as staging. Production is promoted by a human
  merge.
- (2026-06-17) Chose Vitest as the test runner (over Jest) for first-class ESM +
  TypeScript support, which fits a Next 16 / React 19 / TS 5 project with the
  least config. Revisit if a Next-specific need argues otherwise.

## Blockers / open questions for the owner
- Vercel git author caveat: per project memory, Vercel deploys can silently fail
  if the commit author email is not a Vercel team member (Harvest's Vercel email
  is tradinggrace87@gmail.com). The loop commits with the local git config. If
  `dev-loop` preview deploys do not appear, this is the first thing to check.
- ESLint baseline approach (relates to roadmap item 1): the repo has 153 pre-
  existing lint errors. Prefer (a) fix them properly over several cycles, or
  (b) keep the full-project gate but tolerate the baseline, or (c) scope the
  loop's lint gate to changed files only? Default if no answer: fix in batches by
  rule, starting with the safe `no-unused-vars` and `prefer-const` ones, leaving
  the judgement-heavy `no-explicit-any` for later.
