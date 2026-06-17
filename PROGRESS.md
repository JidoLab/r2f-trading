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
- [ ] Establish a green ESLint baseline (IN PROGRESS) — fix in batches, safe
      rules first. Progress:
      [x] Batch 1a (cycle 2): all `prefer-const` (9) + unused imports in `src/`
          (16). src `no-unused-vars` down 35 -> 20.
      [x] Batch 1b (cycle 3): unused local vars + catch bindings + unused route
          `req` params in `src/` (14 fixes). src `no-unused-vars` 20 -> 6.
      [x] Batch 1b-ii (cycle 4): all 6 leftovers. Removed dead code (bangkokDay,
          staleCategories, market-brief title+titleMatch), dropped the unused
          `shouldMentionR2F` PARAM from generateComment (the GET-level var +
          mentionedR2F logging stay), and removed the unused stub params
          `url` (indexnow, zero callers) / `title` (syndication buildCanonicalNote
          + its one caller). NOTE: `_`-prefix does NOT silence no-unused-vars in
          this config (no argsIgnorePattern), so params were removed outright.
          ===> src/ no-unused-vars now 0 (was 35 at discovery). <===
      [x] Batch 1c (cycle 5): owner chose to ESLint-ignore scripts/ +
          render-service/ (standalone render infra, not app code). Added to
          globalIgnores. tsc still typechecks them.
      Remaining to reach green (full-project lint now 69 problems: 52 err / 17
      warn, down from 234 at discovery):
      [x] Batch 2a (cycle 6): `react/no-unescaped-entities` (8) — escaped JSX
          quotes with &ldquo;/&rdquo; in admin outreach + syndication pages.
      [~] Batch 2b (cycle 7): converted the 5 beneficial PUBLIC content images
          to next/image (about mentor, results achievements, RelatedArticles +
          trading-insights list = fill; blog-post cover [slug] = width/height +
          priority since it's the LCP). no-img-element 15 -> 10. Verified: build
          (281 pages) + live /about renders via /_next/image at correct size.
          REMAINING 10 are intentional keeps, handle next:
          [ ] layout.tsx FB tracking pixel (1x1 beacon) -> keep <img>, inline
              eslint-disable (next/image would be wrong).
          [ ] review/page.tsx blob-URL upload preview -> keep <img>, disable.
          [ ] mdx-components.tsx blog-body images (2 incl. the 1 alt-text) ->
              convert with a wrapper/known dims, or a custom MDX <img> component.
          [ ] admin pages (competitors, image-library, signature = 7) -> ESLint
              override off for src/app/admin/** (internal, auth-gated, no perf
              benefit, often dynamic images).
      [ ] Batch 3: `@typescript-eslint/no-explicit-any` (22) — type properly;
          several cycles by file.
      [ ] Batch 4: react-hooks rules — `set-state-in-effect` (18), `immutability`
          (3), `purity` (1), `exhaustive-deps` (1). Judgement-heavy React
          refactors; do last and carefully (these are correctness-adjacent).
      Final acceptance for the whole item: `npm run lint` exits 0.
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
- [ ] Investigate the do-server-*.js trio (owner approved investigating) — diff
      scripts/do-server-current.js / -patched.js / -live.js vs
      render-service/server.js, identify the canonical/deployed one, and propose
      deleting the dead variants. ACCEPTANCE: a short written comparison + a
      deletion proposal. DO NOT delete without explicit owner approval (touches
      render infra).

## Current task
Task: [BLOCKED — batch 1c needs an owner decision (see blockers). Unblocked
       alternatives available: batch 2 (jsx-a11y/img warnings, src) or the
       unit-test roadmap items.]
Plan:
  1.
Research notes:
  - eslint --fix only touches fixable rules; among currently-firing rules only
    prefer-const is auto-fixable, so `eslint src --fix` is safe to reuse. It also
    removes unused eslint-disable directives (reportUnusedDisableDirectives),
    which can leave stray whitespace — check the diff after running it.
  - Files have CRLF line endings: `$`-anchored perl line-match fails; use
    unanchored substring matches or \R.
  - Do NOT use a global (/g) regex to rewrite `catch (e: any)`: some catches use
    `e` in the body (e.g. shorts/webhook line 76 uses e.message). Only rewrite
    the ones lint flags as unused.
  - Removing a local var/usage can orphan its import (e.g. router -> useRouter).
    After any removal, re-run eslint to catch the cascade in the same cycle.

## Done
- (2026-06-17) ESLint baseline batch 2b (partial). Converted the 5 beneficial
  public <img> to next/image: about mentor + results + RelatedArticles +
  trading-insights list (fill, with `relative` added to each parent) and the
  blog-post cover (width/height + priority, it's the LCP). Benefit: auto
  AVIF/WebP + right-sized + lazy/priority + no layout shift on public pages.
  no-img-element 15 -> 10. The other 10 are intentional keeps (FB pixel, upload
  preview, MDX body imgs, admin) — see roadmap. Verified: next build (281) +
  live /about image serves via /_next/image at correct dimensions. Green:
  vitest 6/6, tsc.
- (2026-06-17) ESLint baseline batch 2a. Escaped 8 `react/no-unescaped-entities`
  (raw `"` in JSX) with &ldquo;/&rdquo; in admin/outreach + admin/syndication.
  Lint 69 -> 61 problems. Green: vitest 6/6, tsc, next build (281 pages).
- (2026-06-17) ESLint baseline batch 1c. Per owner decision, added scripts/ +
  render-service/ (standalone FFmpeg render infra, separate deploy) to ESLint
  globalIgnores rather than editing deployed code. Full-project lint 234 -> 69
  problems (153 -> 52 errors). tsc still typechecks those files. Logged a
  roadmap item to investigate the do-server-*.js duplicates (owner approved).
- (2026-06-17) ESLint baseline batch 1b-ii. Cleared the final 6 src
  no-unused-vars: removed dead code (bangkokDay, staleCategories, market-brief
  title+titleMatch), the unused shouldMentionR2F param (logging behavior kept),
  and unused stub params url/title. src no-unused-vars 6 -> 0 (35 -> 0 total).
  Green: vitest 6/6, tsc, next build (281 pages).
- (2026-06-17) ESLint baseline batch 1b. Removed 12 unused local vars/imports
  (incl. cascade: dropped `useRouter` import after removing its `router`),
  converted 2 unused `catch (e: any)` to bindingless `catch` (also clears 2
  no-explicit-any), and dropped 2 unused route `req` params. src no-unused-vars
  20 -> 6. CAUGHT IN REVIEW: the initial global catch-rewrite also stripped the
  binding from a third catch that DOES use `e.message` (broke the build);
  restored that one. Lesson: scope catch rewrites, do not /g blindly. Green:
  vitest 6/6, tsc, next build (281 pages). Commit on dev-loop.
- (2026-06-17) ESLint baseline batch 1a. Auto-fixed all `prefer-const` (9
  let->const) and removed 16 unused imports across src/. Also dropped a stale
  `eslint-disable no-unreachable` directive the fixer flagged (Next's config has
  no-unreachable off) and cleaned the leftover whitespace. src `no-unused-vars`
  35 -> 20. Green: vitest 6/6, tsc, next build (281 pages). Commit on dev-loop.
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
- (2026-06-17) Owner approved fixing the lint baseline IN BATCHES (safe rules
  first, then no-explicit-any) over multiple cycles, rather than scoping the gate
  to changed files. Next cycle starts batch 1 (no-unused-vars + prefer-const).
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
