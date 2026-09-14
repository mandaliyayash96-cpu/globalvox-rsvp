/**
 * DB-free smoke test for the streaming CSV importer.
 * Run: npm run test:csv
 *
 * Feeds parseInviteeCsv a real Node stream (same code path as the API route)
 * with (1) the bundled sample file and (2) a generated 10k-row file, and checks
 * the counts. The onBatch handler sleeps to prove the parser really pauses
 * while a batch is being persisted.
 */
import { Readable } from "node:stream";
import { readFileSync } from "node:fs";
import { CHUNK_SIZE, parseInviteeCsv } from "../src/lib/csvImport";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function run(label: string, csv: string) {
  const batches: number[] = [];
  const started = Date.now();
  const summary = await parseInviteeCsv(Readable.from([csv]), {
    async onBatch(rows) {
      batches.push(rows.length);
      await new Promise((r) => setTimeout(r, 5)); // simulate DB latency while the parser is paused
      return { inserted: rows.length, rejected: [] };
    },
  });
  console.log(`\n== ${label} (${Date.now() - started}ms)`);
  console.log({ ...summary, errors: summary.errors.slice(0, 6) });
  console.log(`batches: ${batches.length}, largest: ${Math.max(0, ...batches)}, sum: ${batches.reduce((a, b) => a + b, 0)}`);
  assert(Math.max(0, ...batches) <= CHUNK_SIZE, "batch never exceeds CHUNK_SIZE");
  return summary;
}

(async () => {
  // 1. Bundled sample: 30 rows, 25 valid, 5 invalid (missing name, short phone, bad email, dup phone, bad phone).
  const sample = readFileSync("public/sample-invitees.csv", "utf8");
  const s1 = await run("public/sample-invitees.csv", sample);
  assert(s1.totalRows === 30, "30 data rows");
  assert(s1.imported === 25 && s1.skipped === 5, "25 imported / 5 skipped");

  // 2. Generated 10k rows with a sprinkling of invalid phones and one in-file duplicate.
  const N = 10_000;
  const lines = ["id,name,phone,email"];
  for (let i = 0; i < N; i++) {
    const bad = i % 997 === 0;
    lines.push(`${i},User ${i},${bad ? "12" : "+9198" + String(10_000_000 + i)},user${i}@example.com`);
  }
  lines.push(`dup,User dup,+9198${String(10_000_000 + 5)},dup@example.com`);
  const s2 = await run("generated 10k rows", lines.join("\n"));
  const expectedBad = Math.ceil(N / 997) + 1;
  assert(s2.totalRows === N + 1, "all rows read");
  assert(s2.skipped === expectedBad, `skipped ${expectedBad}`);
  assert(s2.imported === N + 1 - expectedBad, "rest imported");

  // 3. Missing required column -> rejects with a 400 HttpError.
  let rejected = false;
  try {
    await run("missing column", "name,mobile\nA,+919876500001");
  } catch (e) {
    rejected = true;
    console.log("\n== missing column ->", (e as Error).message);
  }
  assert(rejected, "missing column rejects");

  console.log("\nALL CSV IMPORT TESTS PASSED");
})().catch((e) => {
  console.error("\nFAILED:", e);
  process.exit(1);
});
