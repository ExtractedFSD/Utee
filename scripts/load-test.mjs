#!/usr/bin/env node
/**
 * Load test: hammers the public surfaces (login page, QR landing, tracking
 * webhook) with concurrent requests and reports throughput and latency
 * percentiles. No data is written: the QR scan is unauthenticated (it
 * redirects to login) and the tracking events name a parcel that doesn't
 * exist, so they're matched and dropped.
 *
 *   node scripts/load-test.mjs [--url http://localhost:3000] [--concurrency 20] [--seconds 15]
 *
 * TRACKING_WEBHOOK_SECRET is read from the environment (or .env.local).
 */
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : [])).filter((p) => p.length)
);
const BASE = (args.url ?? process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const CONCURRENCY = Number(args.concurrency ?? 20);
const SECONDS = Number(args.seconds ?? 15);

// .env.local fallback for the webhook secret
if (!process.env.TRACKING_WEBHOOK_SECRET) {
  const envFile = path.resolve(".env.local");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
      const m = /^TRACKING_WEBHOOK_SECRET=(.*)$/.exec(line.trim());
      if (m) process.env.TRACKING_WEBHOOK_SECRET = m[1].replace(/^"|"$/g, "");
    }
  }
}
const SECRET = process.env.TRACKING_WEBHOOK_SECRET;

const targets = [
  { name: "GET /login", run: () => fetch(`${BASE}/login`), ok: (r) => r.status === 200 },
  {
    name: "GET /k/<code> (signed out → login)",
    run: () => fetch(`${BASE}/k/UT-LOADTS`, { redirect: "manual" }),
    ok: (r) => r.status === 307 || r.status === 302,
  },
  {
    name: "POST /api/webhooks/tracking (unknown parcel)",
    run: () =>
      fetch(`${BASE}/api/webhooks/tracking`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-tracking-secret": SECRET ?? "" },
        body: JSON.stringify({ trackingNumber: "LOAD-TEST-000", status: "in_transit", description: "load" }),
      }),
    ok: (r) => r.status === 200,
    skip: !SECRET && "TRACKING_WEBHOOK_SECRET not set",
  },
  {
    name: "POST /api/webhooks/tracking (bad secret)",
    run: () =>
      fetch(`${BASE}/api/webhooks/tracking`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-tracking-secret": "nope" },
        body: "{}",
      }),
    ok: (r) => r.status === 401,
  },
];

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function runTarget(target) {
  if (target.skip) return { name: target.name, skipped: target.skip };
  const latencies = [];
  let failures = 0;
  let errors = 0;
  const deadline = Date.now() + SECONDS * 1000;
  async function worker() {
    while (Date.now() < deadline) {
      const t0 = performance.now();
      try {
        const res = await target.run();
        await res.arrayBuffer();
        if (!target.ok(res)) failures++;
      } catch {
        errors++;
      }
      latencies.push(performance.now() - t0);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  latencies.sort((a, b) => a - b);
  return {
    name: target.name,
    requests: latencies.length,
    rps: latencies.length / SECONDS,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] ?? 0,
    failures,
    errors,
  };
}

console.log(`Load test against ${BASE} — ${CONCURRENCY} concurrent workers × ${SECONDS}s per target\n`);
const rows = [];
for (const target of targets) {
  process.stdout.write(`${target.name} … `);
  const r = await runTarget(target);
  rows.push(r);
  console.log(r.skipped ? `skipped (${r.skipped})` : `${r.requests} req, ${r.rps.toFixed(1)} req/s`);
}
console.log();
console.table(
  rows
    .filter((r) => !r.skipped)
    .map((r) => ({
      target: r.name,
      requests: r.requests,
      "req/s": Number(r.rps.toFixed(1)),
      "p50 ms": Math.round(r.p50),
      "p95 ms": Math.round(r.p95),
      "p99 ms": Math.round(r.p99),
      "max ms": Math.round(r.max),
      "wrong status": r.failures,
      "network errors": r.errors,
    }))
);
const bad = rows.some((r) => !r.skipped && (r.failures || r.errors));
process.exit(bad ? 1 : 0);
