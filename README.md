# Event RSVP Calling Campaign Manager

A production-minded prototype for a non-technical business user to manage an event
invitee list, run a **simulated AI-calling campaign** that collects RSVPs, and watch
the results roll in live.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL (Neon).
No queue, no cron, no extra infrastructure: a batch-worker API route driven by client polling.
Deploys to Vercel with zero extra configuration.

---

## 1. Running locally

```bash
# 1. Install (also runs `prisma generate` via postinstall)
npm install

# 2. Configure the database
cp .env.example .env          # then paste your Neon DATABASE_URL

# 3. Create the schema (applies prisma/migrations/*)
npm run prisma:migrate        # dev: prisma migrate dev
#   or, on a fresh DB without wanting a migration history:
#   npx prisma migrate deploy

# 4. Seed a demo campaign with 10 invitees (idempotent)
npm run seed

# 5. Start
npm run dev                   # http://localhost:3000
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm run test:csv` | DB-free smoke test of the streaming CSV importer (sample file + generated 10k rows) |
| `npm run prisma:deploy` | `prisma migrate deploy` (used on Vercel) |
| `npm run prisma:studio` | Browse the DB |

### Demo walkthrough (about 2 minutes)

1. Open `/` - the seeded **"Q4 Product Launch"** campaign is listed. Open it.
2. Click **Start Campaign**. The 10 seeded invitees get dialled in one batch; stats,
   progress bar and the table update live. Some will fail/no-answer and be retried automatically.
3. Drag `public/sample-invitees.csv` (also linked as "Download sample" / "Sample CSV" in the nav)
   onto the dropzone and click **Upload & validate**. You get `25 imported / 5 skipped` with a
   row-by-row reason table (missing name, short phone, bad email, duplicate phone, non-numeric phone).
   Row numbers match the spreadsheet (header = row 1).
4. Click **Start new run** - only the 25 new invitees are dialled.
5. Click any name for the full call record (attempts, last error, per-attempt transcript notes).

### Deploying to Vercel

1. Import the repo in Vercel (framework preset: Next.js is auto-detected).
2. Add the `DATABASE_URL` environment variable.
3. Deploy. The `vercel-build` script runs `prisma migrate deploy && next build`, so the schema
   is created/updated on every deploy. Run `npm run seed` locally against the same URL if you
   want the demo campaign in production.

> **Neon tip:** use the *direct* (non-pooled) connection string for `DATABASE_URL`. It works
> for both queries and migrations. If you switch to the pooled URL (`-pooler` host) for runtime,
> keep a direct URL around for migrations.

---

## 2. Architecture

```
Browser (React client components)
  |  create campaign / upload CSV / start / poll every 1.5s / list invitees
  v
Next.js App Router (Vercel serverless functions)
  /api/campaigns               POST create, GET list
  /api/campaigns/:id           GET campaign + stats
  /api/campaigns/:id/import    POST multipart CSV  -> lib/csvImport.ts (stream, validate, chunk 500)
  /api/campaigns/:id/start     POST draft|completed -> running
  /api/campaigns/:id/process   POST batch worker    -> lib/campaignWorker.ts (claim 25, dial, persist)
  /api/campaigns/:id/stats     GET  counts by status
  /api/campaigns/:id/invitees  GET  paginated (50) + search + status filter
  |
  v
Prisma -> PostgreSQL (Neon)      lib/callingService.ts = the *only* place with randomness
```

**Pages**

- `/` - campaign list + "New campaign" form (server-rendered list, client form).
- `/campaigns/[id]` - the command centre. Server component fetches campaign + initial stats;
  `CommandCenter` (client) owns the live state: CSV upload, Start/Pause, stats cards, progress bar,
  invitee table.
- `/campaigns/[id]/invitees/[inviteeId]` - full call record for one invitee.

**The calling loop**

1. **Start** flips the campaign to `running` (400 if there is nobody actionable to call).
2. The dashboard calls **`/process`** in a *sequential* loop (`await` -> sleep 1.5s -> repeat),
   so requests never overlap even if one is slow.
3. Each `/process` call:
   - **claims** up to `BATCH_SIZE = 25` actionable invitees in **one atomic SQL statement**
     (`UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING ...`), setting them to
     `calling` and stamping `lastCalledAt`;
   - dials them in parallel (`Promise.all`) through `callingService.simulateCall`;
   - persists each result individually, never letting one invitee's failure affect another;
   - recomputes stats, and if nothing is actionable and nothing is in flight, marks the campaign
     `completed` (server-authoritative, guarded `updateMany` so concurrent workers can't fight).
4. The client stops polling when `remaining === 0 && inFlight === 0` or the server reports `completed`.

**Actionable** (the single definition used by the worker, the stats and the Start button):

| Status | Condition | Why |
| --- | --- | --- |
| `pending` | always | never dialled, or `no_answer` and will be retried |
| `failed` | `attempts < 3` | provider threw (e.g. timeout) - retry |
| `calling` | `lastCalledAt` older than 2 min (or null) | a worker died mid-batch - reclaim the row |

Terminal states: `confirmed`, `declined`, `undecided`, and `failed` with 3 attempts
(including "no answer after 3 attempts").

---

## 3. Key technical decisions

- **`UPDATE ... FOR UPDATE SKIP LOCKED RETURNING` instead of `findMany` + `updateMany`.**
  `updateMany` returns only a count, so with two concurrent workers you cannot tell *which* rows you
  won - the second worker would happily dial rows the first one already owns. The single-statement
  claim is atomic, non-blocking under concurrency, and returns exactly the rows this invocation owns.
  Result: re-invoking `/process` (retries, double clicks, two open tabs) can never double-dial anyone.
- **Stale-claim recovery with no extra columns.** `lastCalledAt` is stamped at claim time, so a row
  stuck in `calling` for 2+ minutes (function timeout, crash) is automatically claimable again.
  Nothing is ever permanently wedged.
- **Retry policy is bounded.** `MAX_ATTEMPTS = 3` for provider errors *and* no-answers; after three
  no-answers the invitee becomes `failed` with a clear `lastError`, so a campaign always terminates.
- **Streaming CSV import.** The upload is piped through papaparse as a Node stream with a `step`
  callback; validated rows are buffered up to 500, then the parser is **paused** while a
  `findMany` (to name duplicates by row) + `createMany({ skipDuplicates })` runs, then resumed.
  Memory is bounded by the chunk, not the file. Verified with `npm run test:csv` (10k rows in ~300ms
  of parse time, 20 batches of exactly 500).
- **Three layers of dedupe:** in-file `Set<phone>` -> per-batch DB lookup (so the report names the
  row) -> the `@@unique([campaignId, phone])` index via `skipDuplicates` as a race-proof safety net.
- **Server-authoritative completion.** The worker, not the browser, decides when a campaign is done.
  Closing the tab mid-run is harmless: reopening auto-resumes polling because the campaign is
  still `running`.
- **Every API route is wrapped by `withApiHandler`**: `HttpError` -> its status, Prisma
  `P2025/P2002/P2003` -> 404/409/400, DB-unreachable -> 503, malformed JSON -> 400, anything else
  -> 500 with a JSON body. No route can return an HTML error page.
- **All routes are `force-dynamic` + Node runtime**, so `next build` never touches the database
  and Prisma runs on the Node (not Edge) runtime on Vercel.
- **No UI library, no form/toast/table dependency.** ~10 small Tailwind components keep the bundle
  at ~100 kB first-load and leave nothing to fight with on Vercel.

---

## 4. Assumptions

- One phone number = one invitee per campaign. Phones are stored as given (after stripping spaces,
  dashes, dots, parentheses); `+91 98765 00011` and `+919876500011` dedupe together, but
  `919876500011` (no `+`) is treated as a different number. The `id` CSV column is accepted and ignored.
- A no-answer is retried on the *next* batch (no cool-down), which is right for a demo; a real
  campaign would space retries by hours.
- Only one campaign runs per browser tab at a time; several tabs or users on the same campaign are safe.
- The event date entered in the form is in the user's browser timezone and stored as an instant (UTC).
- No authentication: the assessment scope is a single-tenant internal tool.

## 5. Known limitations

- **Upload size is capped at 4 MB** (~40k rows) because Vercel serverless request bodies are limited
  to 4.5 MB. Bigger lists must be split. The parser itself is streaming and has no row limit.
- **Search uses `ILIKE '%term%'`** which is a sequential scan on very large campaigns; fine for
  100k rows, would want a `pg_trgm` index beyond that.
- **Offset pagination** (`skip/take`) gets slower on deep pages of 100k+ rows; keyset pagination
  on `(createdAt, id)` is the fix.
- **Throughput is bounded by polling:** 25 calls per ~3-4 s (call latency + 1.5 s interval), i.e.
  roughly 25k invitees/hour. Fine for a demo; a real system would fan out workers.
- `attempts` counts *completed* attempts only. A batch interrupted mid-flight (function timeout)
  is re-dialled after the 2-minute stale window without counting the lost attempt.
- The campaign list on `/` is server-rendered and does not auto-refresh while a campaign runs
  elsewhere.

## 6. What I would improve with more time

1. **Real provider adapter** behind `CallingService` (Twilio/Vapi) with webhooks writing results
   back, replacing the synchronous `simulateCall` while keeping the worker unchanged.
2. **Scheduled worker** (Vercel Cron -> `/process`) so campaigns progress without a browser open,
   plus per-invitee retry back-off (`nextAttemptAt`).
3. **Keyset pagination and a `pg_trgm` index** for the invitee table.
4. **Export results as CSV** and a per-campaign activity log (who started/paused, imports).
5. **Auth + multi-tenancy** (organisation on `Campaign`, row-level scoping in every query).
6. **Tests:** Vitest unit tests for `validation.ts` and the worker state machine, and a Playwright
   run of the demo walkthrough against a Neon branch in CI.
7. **Import UX:** column mapping for CSVs with different headers, downloadable "skipped rows" file.
8. **Observability:** structured logs per batch, Sentry, and a `/health` route.

---

## 7. AI Usage

- **Tools:** Claude (via Claude Code in the terminal) as a coding assistant, and Claude
  in chat for planning, deployment guidance, and reviewing decisions.

- **What I used it for:** I directed the build — I chose the stack (Next.js + Prisma +
  Neon on Vercel), decided to keep the caller simulated per the brief and isolate it
  behind one interface, and made the product/scale trade-offs documented above. The AI
  accelerated the implementation: scaffolding, route handlers, the streaming CSV
  importer, and a first draft of this README. I reviewed every file, ran the build and
  tests myself, and drove deployment and debugging.

- **One genuinely useful contribution:** the concurrency-safe claim in
  `src/lib/campaignWorker.ts`. My initial approach was `updateMany` with a where-guard;
  the AI pointed out `updateMany` only returns a count, so a second concurrent worker
  can't know which rows it won. We moved to a single
  `UPDATE ... FOR UPDATE SKIP LOCKED ... RETURNING` statement, stamping `lastCalledAt`
  at claim time so orphaned `calling` rows self-heal without adding a column. I verified
  this with three concurrent `/process` calls claiming 75 distinct rows, none double-dialled.

- **Where I verified / modified / rejected AI output:**
  - **404s returned 200.** The AI first placed `notFound()` in page components; testing
    the deployed URLs showed they returned 200 with not-found UI, because a root
    `loading.tsx` streamed the shell first. I rejected that structure and it was
    reworked with route groups so the existence check lives in a segment `layout.tsx`.
    Re-tested: unknown URLs now return a real 404.
  - **Deployment failure I debugged myself.** The first Vercel build failed with Prisma
    `P1012` — `DATABASE_URL` wasn't a valid connection string. I traced it to the env
    var holding a placeholder value, corrected it to the direct Neon URL, and redeployed
    successfully. (Documented because it's a real part of how this shipped.)
  - **CSV importer.** The papaparse pause/resume-with-async-batches pattern is easy to
    get subtly wrong, so I didn't trust it — it was split into a DB-free parser and
    exercised with a 10k-row test (batches of exactly 500, correct spreadsheet row numbers).
  - Minor build/type fixes caught by `tsc` / `next build`: a non-handler export moved out
    of a route module, and an over-narrowed return type in the process route.

- **Ownership:** I'm responsible for the final solution. I can explain every architectural
  decision, the concurrency model, the failure/retry handling, and the scale trade-offs.
