#!/usr/bin/env node
/**
 * Build a Markdown table from k6 --summary-export JSON files (issue #117).
 */
import fs from "fs";
import path from "path";

const outDir = process.env.LOAD_TEST_OUTPUT_DIR || "./load-results";
const scripts = ["marketplace", "otp-burst", "trade-create"];

function readMetrics(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const metrics = raw.metrics ?? raw;
  const p95 = metrics.http_req_duration?.values?.["p(95)"] ?? null;
  const failRate = metrics.http_req_failed?.values?.rate ?? null;
  return {
    p95Ms: p95 != null ? Math.round(p95) : "—",
    errorRate:
      failRate != null ? `${(failRate * 100).toFixed(2)}%` : "—",
  };
}

let md = "| Scenario | p95 (ms) | Error rate |\n| --- | ---: | ---: |\n";

for (const name of scripts) {
  const file = path.join(outDir, `${name}-summary.json`);
  if (!fs.existsSync(file)) {
    md += `| ${name} | — | missing |\n`;
    continue;
  }
  const { p95Ms, errorRate } = readMetrics(file);
  md += `| ${name} | ${p95Ms} | ${errorRate} |\n`;
}

console.log(md);
