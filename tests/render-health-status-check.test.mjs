import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runRenderHealthStatusCheck } from "../scripts/render-health-status-check.mjs";

function createClock() {
  let value = Date.UTC(2026, 5, 15, 9, 0, 0);
  return {
    now: () => value,
    sleep: async (ms) => {
      value += ms;
    },
  };
}

test("render health status check writes stable gate JSON and HTML", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "finance-ai-render-health-"));
  const clock = createClock();
  const requestedUrls = [];
  const result = await runRenderHealthStatusCheck({
    url: "https://finance-ai-assistant-web.onrender.com",
    outputDir,
    durationMs: 180_000,
    intervalMs: 60_000,
    timeoutMs: 1_000,
    now: clock.now,
    sleep: clock.sleep,
    fetchImpl: async (url) => {
      requestedUrls.push(url);
      return { status: 200 };
    },
  });

  assert.equal(result.status.ok, true);
  assert.equal(result.status.stabilityGate.continuousHealthPassed, true);
  assert.equal(result.status.healthWindowMs, 180_000);
  assert.equal(result.status.healthIterationCount, 3);
  assert.deepEqual(result.status.healthRequiredEndpoints, [
    "/",
    "/api/health",
    "/api/analysis?symbol=MSFT&riskProfile=balanced",
    "/api/stocks/search?q=%E8%85%BE%E8%AE%AF%E6%8E%A7%E8%82%A1",
    "/api/ai-services",
  ]);
  assert.ok(requestedUrls.includes("https://finance-ai-assistant-web.onrender.com/api/ai-services"));
  assert.ok(
    requestedUrls.includes(
      "https://finance-ai-assistant-web.onrender.com/api/stocks/search?q=%E8%85%BE%E8%AE%AF%E6%8E%A7%E8%82%A1",
    ),
  );

  const json = JSON.parse(await readFile(result.jsonPath, "utf8"));
  const html = await readFile(result.htmlPath, "utf8");
  assert.equal(json.ok, true);
  assert.match(html, /Finance AI Render Health/);
  assert.doesNotMatch(JSON.stringify(json), /sk-proj|sk-or-v1|gsk_|AQ\./);
});
