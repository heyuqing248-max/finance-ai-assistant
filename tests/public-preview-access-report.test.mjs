import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicPreviewAccessReport } from "../scripts/public-preview-access-report.mjs";

function statusReadFile(payload) {
  return () => JSON.stringify(payload);
}

function response(status) {
  return { status };
}

test("public preview access report recommends public URL when all key endpoints are healthy", async () => {
  const requestedUrls = [];
  const report = await buildPublicPreviewAccessReport({
    timeoutMs: 1000,
    statusOptions: {
      now: () => Date.parse("2026-06-14T10:01:00.000Z"),
      readFile: statusReadFile({
        status: "healthy",
        publicUrl: "https://demo.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:00.000Z",
        healthCycleCount: 3,
        healthWindowMs: 180000,
        healthIntervalMs: 15000,
        healthRequiredEndpoints: [
          "/",
          "/api/health",
          "/api/analysis?symbol=MSFT&riskProfile=balanced",
          "/api/stocks/search?q=%E8%85%BE%E8%AE%AF%E6%8E%A7%E8%82%A1",
          "/api/ai-services",
        ],
        healthIterationCount: 12,
        standbyPublicUrls: [
          {
            url: "https://standby.lhr.life",
            status: "healthy",
            healthWindowMs: 15000,
            healthIterationCount: 1,
          },
        ],
        restartCount: 1,
      }),
    },
    fetchImpl: async (url) => {
      requestedUrls.push(url);
      return response(200);
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.recommendedAccess.mode, "public");
  assert.equal(report.recommendedAccess.url, "https://demo.lhr.life");
  assert.deepEqual(
    report.accessEntries.map((entry) => [entry.id, entry.status, entry.available]),
    [
      ["fixed-hosting", "missing", false],
      ["temporary-public", "ready-temporary", true],
      ["standby-public-1", "ready-standby", true],
      ["local-fallback", "healthy", true],
    ],
  );
  assert.equal(report.stabilityGate.externalUseReady, false);
  assert.equal(report.stabilityGate.temporaryAccessReady, true);
  assert.equal(report.stabilityGate.temporaryTunnel, true);
  assert.equal(report.stabilityGate.continuousHealthPassed, true);
  assert.equal(report.stabilityGate.requiredEndpointCoverage, true);
  assert.equal(report.stabilityGate.monitorWindowSeconds, 180);
  assert.equal(report.stabilityGate.monitorIterationCount, 12);
  assert.match(report.stabilityGate.userMessage, /短时间测试/);
  assert.equal(report.publicPreview.probe.ok, true);
  assert.equal(report.localFallback.probe.ok, true);
  assert.ok(requestedUrls.includes("https://demo.lhr.life/api/health"));
  assert.ok(requestedUrls.includes("http://127.0.0.1:4192/health"));
});

test("public preview access report requires full continuous monitor evidence", async () => {
  const report = await buildPublicPreviewAccessReport({
    timeoutMs: 1000,
    statusOptions: {
      now: () => Date.parse("2026-06-14T10:01:00.000Z"),
      readFile: statusReadFile({
        status: "healthy",
        publicUrl: "https://fixed-demo.example.com",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:00.000Z",
        healthCycleCount: 3,
        healthWindowMs: 60000,
        healthRequiredEndpoints: ["/", "/health"],
        healthIterationCount: 4,
      }),
    },
    fetchImpl: async () => response(200),
  });

  assert.equal(report.recommendedAccess.mode, "public");
  assert.equal(report.stabilityGate.stableHostedUrl, true);
  assert.equal(report.stabilityGate.continuousHealthPassed, false);
  assert.equal(report.stabilityGate.externalUseReady, false);
  assert.equal(report.stabilityGate.requiredEndpointCoverage, false);
  assert.match(report.stabilityGate.blockers.join(" "), /覆盖关键端点/);
});

test("public preview access report recommends local fallback when public endpoints fail", async () => {
  const report = await buildPublicPreviewAccessReport({
    timeoutMs: 1000,
    statusOptions: {
      now: () => Date.parse("2026-06-14T10:01:00.000Z"),
      readFile: statusReadFile({
        status: "healthy",
        publicUrl: "https://broken.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:00.000Z",
      }),
    },
    fetchImpl: async (url) => {
      if (url === "http://127.0.0.1:4192/health") return response(200);
      return response(503);
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.recommendedAccess.mode, "local-fallback");
  assert.equal(report.recommendedAccess.url, "http://127.0.0.1:4192");
  assert.deepEqual(
    report.accessEntries.map((entry) => [entry.id, entry.status, entry.available]),
    [
      ["fixed-hosting", "missing", false],
      ["temporary-public", "unhealthy", false],
      ["local-fallback", "healthy", true],
    ],
  );
  assert.equal(report.stabilityGate.externalUseReady, false);
  assert.equal(report.stabilityGate.temporaryAccessReady, false);
  assert.equal(report.publicPreview.probe.ok, false);
  assert.equal(report.localFallback.probe.ok, true);
  assert.match(report.nextSteps.join(" "), /重启 public-preview supervisor/);
});

test("public preview access report reports no confirmed entry when public and local fail", async () => {
  const report = await buildPublicPreviewAccessReport({
    timeoutMs: 1000,
    statusOptions: {
      now: () => Date.parse("2026-06-14T10:01:00.000Z"),
      readFile: statusReadFile({
        status: "unhealthy",
        publicUrl: "https://broken.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:00.000Z",
      }),
    },
    fetchImpl: async () => response(503),
  });

  assert.equal(report.ok, false);
  assert.equal(report.recommendedAccess.mode, "none");
  assert.equal(report.recommendedAccess.url, "");
  assert.equal(report.stabilityGate.externalUseReady, false);
  assert.match(report.nextSteps.join(" "), /启动本机 public preview/);
});

test("public preview access report uses curl fallback after fetch transport failure", async () => {
  const report = await buildPublicPreviewAccessReport({
    timeoutMs: 1000,
    statusOptions: {
      now: () => Date.parse("2026-06-14T10:01:00.000Z"),
      readFile: statusReadFile({
        status: "healthy",
        publicUrl: "https://demo.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:00.000Z",
      }),
    },
    allowCurlFallback: true,
    fetchImpl: async () => {
      throw new Error("fetch failed");
    },
    execFileImpl: (_binary, args, callback) => {
      assert.ok(args.includes("%{http_code}"));
      callback(null, "200");
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.recommendedAccess.mode, "public");
  assert.equal(report.stabilityGate.externalUseReady, false);
  assert.equal(report.publicPreview.results[0].transport, "curl-fallback");
  assert.equal(report.localFallback.probe.transport, "curl-fallback");
});
