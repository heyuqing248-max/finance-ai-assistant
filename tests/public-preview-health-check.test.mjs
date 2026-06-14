import assert from "node:assert/strict";
import test from "node:test";

import { runPublicPreviewHealthCheck } from "../scripts/public-preview-health-check.mjs";

function createClock() {
  let value = Date.UTC(2026, 5, 14, 0, 0, 0);
  return {
    now: () => value,
    sleep: async (ms) => {
      value += ms;
    },
  };
}

test("public preview health check requires all public endpoints to stay 200", async () => {
  const clock = createClock();
  const requestedUrls = [];
  const result = await runPublicPreviewHealthCheck({
    publicUrl: "https://demo.example",
    durationMs: 30_000,
    intervalMs: 10_000,
    timeoutMs: 1000,
    now: clock.now,
    sleep: clock.sleep,
    fetchImpl: async (url) => {
      requestedUrls.push(url);
      return { status: 200 };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.iterationCount, 3);
  assert.ok(requestedUrls.includes("https://demo.example/"));
  assert.ok(requestedUrls.includes("https://demo.example/health"));
  assert.ok(requestedUrls.includes("https://demo.example/api/health"));
  assert.ok(
    requestedUrls.includes("https://demo.example/api/analysis?symbol=MSFT&riskProfile=balanced"),
  );
  assert.ok(requestedUrls.includes("https://demo.example/api/stocks/search?q=Microsoft"));
});

test("public preview health check reports tunnel failure and local fallback", async () => {
  const clock = createClock();
  const result = await runPublicPreviewHealthCheck({
    publicUrl: "https://broken.example",
    localFallbackUrl: "http://127.0.0.1:4192",
    durationMs: 60_000,
    intervalMs: 10_000,
    timeoutMs: 1000,
    now: clock.now,
    sleep: clock.sleep,
    fetchImpl: async (url) => {
      if (url === "http://127.0.0.1:4192/health") return { status: 200 };
      if (url.endsWith("/api/analysis?symbol=MSFT&riskProfile=balanced")) return { status: 503 };
      return { status: 200 };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.lastFailure.failed.length, 1);
  assert.equal(result.lastFailure.failed[0].id, "analysis-msft");
  assert.equal(result.localFallback.ok, true);
  assert.match(result.guidance, /公网预览不稳定/);
  assert.match(result.guidance, /本机备用地址可用/);
});

test("public preview health check treats recovered transient failures as non-fatal when threshold allows", async () => {
  const clock = createClock();
  const callsByUrl = new Map();
  const result = await runPublicPreviewHealthCheck({
    publicUrl: "https://flaky.example",
    durationMs: 30_000,
    intervalMs: 10_000,
    timeoutMs: 1000,
    maxConsecutiveFailures: 2,
    now: clock.now,
    sleep: clock.sleep,
    fetchImpl: async (url) => {
      const callCount = callsByUrl.get(url) || 0;
      callsByUrl.set(url, callCount + 1);
      if (callCount === 0 && url.endsWith("/api/analysis?symbol=MSFT&riskProfile=balanced")) {
        return { status: 503 };
      }
      return { status: 200 };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.transientFailureCount, 1);
  assert.equal(result.transientFailures[0].failureType, "tunnel-503");
  assert.equal(result.lastFailure, null);
  assert.match(result.guidance, /已恢复的短暂失败/);
});

test("public preview health check probes endpoints in parallel within each iteration", async () => {
  let activeRequests = 0;
  let maxActiveRequests = 0;
  let releaseRequests;
  const gate = new Promise((resolve) => {
    releaseRequests = resolve;
  });
  const fetchStartedUrls = [];

  const resultPromise = runPublicPreviewHealthCheck({
    publicUrl: "https://parallel.example",
    durationMs: 1,
    intervalMs: 1,
    timeoutMs: 1000,
    fetchImpl: async (url) => {
      fetchStartedUrls.push(url);
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      if (fetchStartedUrls.length === 5) releaseRequests();
      await gate;
      activeRequests -= 1;
      return { status: 200 };
    },
  });

  const result = await resultPromise;

  assert.equal(result.ok, true);
  assert.equal(result.iterationCount, 1);
  assert.equal(fetchStartedUrls.length, 5);
  assert.equal(maxActiveRequests, 5);
});

test("public preview health check can verify local fallback even when public URL is healthy", async () => {
  const requestedUrls = [];
  const result = await runPublicPreviewHealthCheck({
    publicUrl: "https://healthy.example",
    localFallbackUrl: "http://127.0.0.1:4192",
    durationMs: 1,
    intervalMs: 1,
    timeoutMs: 1000,
    alwaysCheckLocalFallback: true,
    fetchImpl: async (url) => {
      requestedUrls.push(url);
      return { status: 200 };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.localFallback.ok, true);
  assert.ok(requestedUrls.includes("http://127.0.0.1:4192/health"));
});

test("public preview health check uses curl fallback after fetch transport failure", async () => {
  const result = await runPublicPreviewHealthCheck({
    publicUrl: "https://demo.lhr.life",
    localFallbackUrl: "http://127.0.0.1:4192",
    durationMs: 1,
    intervalMs: 1,
    timeoutMs: 1000,
    allowCurlFallback: true,
    fetchImpl: async () => {
      throw new Error("fetch transport failed");
    },
    execFileImpl: (_binary, args, _options, callback) => {
      assert.ok(args.includes("%{http_code}"));
      callback(null, "200");
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.iterations[0].results[0].transport, "curl-fallback");
});
