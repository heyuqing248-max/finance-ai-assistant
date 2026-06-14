import test from "node:test";
import assert from "node:assert/strict";

import { summarizePublicPreviewStatus } from "../scripts/public-preview-status.mjs";

test("public preview status reports fresh healthy URL and fallback", () => {
  const now = Date.parse("2026-06-14T10:03:00.000Z");
  const summary = summarizePublicPreviewStatus({
    now: () => now,
    staleAfterMs: 4 * 60 * 1000,
    readFile: () =>
      JSON.stringify({
        status: "healthy",
        publicUrl: "https://demo.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:30.000Z",
        healthCycleCount: 2,
        healthMaxConsecutiveFailures: 2,
        healthWindowMs: 180000,
        healthIntervalMs: 15000,
        healthTimeoutMs: 15000,
        healthRequiredEndpoints: ["/", "/health", "/api/health"],
        healthIterationCount: 12,
        healthStartedAt: "2026-06-14T09:57:30.000Z",
        healthEndedAt: "2026-06-14T10:00:30.000Z",
        restartCount: 1,
        standbyPromotionCount: 1,
        standbyPublicUrls: [
          {
            url: "https://standby.lhr.life",
            status: "healthy",
            role: "standby",
            checkedAt: "2026-06-14T10:00:20.000Z",
            healthWindowMs: 15000,
            healthIterationCount: 1,
            transientFailureCount: 0,
            localFallbackOk: true,
          },
        ],
        transientFailureCount: 1,
        localFallbackOk: true,
      }),
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.publicUrl, "https://demo.lhr.life");
  assert.equal(summary.localFallbackUrl, "http://127.0.0.1:4192");
  assert.equal(summary.stale, false);
  assert.equal(summary.healthCycleCount, 2);
  assert.equal(summary.healthMaxConsecutiveFailures, 2);
  assert.equal(summary.healthWindowSeconds, 180);
  assert.equal(summary.healthIntervalSeconds, 15);
  assert.equal(summary.healthTimeoutSeconds, 15);
  assert.deepEqual(summary.healthRequiredEndpoints, ["/", "/health", "/api/health"]);
  assert.equal(summary.healthIterationCount, 12);
  assert.equal(summary.healthStartedAt, "2026-06-14T09:57:30.000Z");
  assert.equal(summary.healthEndedAt, "2026-06-14T10:00:30.000Z");
  assert.equal(summary.standbyPromotionCount, 1);
  assert.deepEqual(summary.standbyPublicUrls, [
    {
      url: "https://standby.lhr.life",
      status: "healthy",
      role: "standby",
      checkedAt: "2026-06-14T10:00:20.000Z",
      healthWindowSeconds: 15,
      healthIterationCount: 1,
      transientFailureCount: 0,
      lastFailure: null,
      localFallbackOk: true,
      guidance: "",
    },
  ]);
  assert.equal(summary.transientFailureCount, 1);
  assert.equal(summary.localFallbackOk, true);
});

test("public preview status warns when watchdog state is stale", () => {
  const now = Date.parse("2026-06-14T10:10:00.000Z");
  const summary = summarizePublicPreviewStatus({
    now: () => now,
    staleAfterMs: 4 * 60 * 1000,
    readFile: () =>
      JSON.stringify({
        status: "healthy",
        publicUrl: "https://old.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:00.000Z",
      }),
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.stale, true);
  assert.equal(summary.healthMaxConsecutiveFailures, 2);
  assert.match(summary.guidance, /状态记录已过期/);
  assert.equal(summary.localFallbackUrl, "http://127.0.0.1:4192");
});

test("public preview status preserves unknown local fallback during active checking", () => {
  const now = Date.parse("2026-06-14T10:01:00.000Z");
  const summary = summarizePublicPreviewStatus({
    now: () => now,
    staleAfterMs: 4 * 60 * 1000,
    readFile: () =>
      JSON.stringify({
        status: "checking",
        publicUrl: "https://checking.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:00:00.000Z",
        healthWindowMs: 180000,
        healthRequiredEndpoints: ["/", "/health"],
        localFallbackOk: null,
      }),
  });

  assert.equal(summary.status, "checking");
  assert.equal(summary.localFallbackOk, null);
  assert.equal(summary.healthWindowSeconds, 180);
});

test("public preview status treats checking state with completed gate evidence as temporarily healthy", () => {
  const now = Date.parse("2026-06-14T10:04:00.000Z");
  const summary = summarizePublicPreviewStatus({
    now: () => now,
    staleAfterMs: 4 * 60 * 1000,
    readFile: () =>
      JSON.stringify({
        status: "checking",
        publicUrl: "https://checking-healthy.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
        updatedAt: "2026-06-14T10:03:30.000Z",
        healthWindowMs: 180000,
        healthRequiredEndpoints: ["/", "/health", "/api/health"],
        healthIterationCount: 8,
        healthStartedAt: "2026-06-14T10:00:00.000Z",
        healthEndedAt: "2026-06-14T10:03:00.000Z",
        lastFailure: null,
        localFallbackOk: true,
      }),
  });

  assert.equal(summary.status, "checking");
  assert.equal(summary.ok, true);
  assert.equal(summary.healthIterationCount, 8);
  assert.equal(summary.localFallbackOk, true);
});
