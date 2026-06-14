import assert from "node:assert/strict";
import test from "node:test";

import { buildStableAccessGate } from "../scripts/stable-access-gate.mjs";

const healthyTemporaryStatus = {
  ok: true,
  status: "checking",
  publicUrl: "https://temporary.lhr.life",
  localFallbackUrl: "http://127.0.0.1:4192",
  healthWindowSeconds: 180,
  healthIterationCount: 9,
  transientFailureCount: 0,
  localFallbackOk: true,
  standbyPublicUrls: [
    {
      url: "https://standby.lhr.life",
      status: "healthy",
      healthWindowSeconds: 15,
      healthIterationCount: 1,
    },
  ],
};

const renderReadiness = {
  ok: true,
  mode: "blueprint-only",
  renderService: {
    name: "finance-ai-assistant-web",
    runtime: "node",
    startCommand: "npm start",
    healthCheckPath: "/health",
  },
  dashboardSecrets: [
    {
      key: "FINANCE_AI_MODEL_API_KEY",
      present: false,
      valuePreview: "",
    },
  ],
  missingSecretKeys: ["FINANCE_AI_MODEL_API_KEY"],
  acceptanceCriteria: {
    durationSeconds: 180,
    endpoints: ["/", "/health", "/api/health"],
  },
};

test("stable access gate does not treat healthy temporary tunnel as stable external readiness", async () => {
  const result = await buildStableAccessGate({
    status: healthyTemporaryStatus,
    renderReadiness,
    stablePreflightImpl: async () => ({
      ok: false,
      blueprintReady: true,
      secretsSafe: true,
      requiredEndpoints: ["/", "/health", "/api/health"],
      stabilityGate: {
        continuousHealthPassed: false,
        requiredDurationSeconds: 180,
      },
      smokeSummary: null,
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.externalUseReady, false);
  assert.equal(result.recommendedAccess.mode, "temporary-public");
  assert.equal(result.temporaryAccess.ok, true);
  assert.equal(result.temporaryAccess.acceptedForStableExternalUse, false);
  assert.equal(result.localFallback.ok, true);
  assert.equal(result.temporaryAccess.standby[0].healthy, true);
  assert.equal(result.fixedAccess.configured, true);
  assert.equal(result.fixedAccess.url, "https://finance-ai-assistant-web.onrender.com");
  assert.match(result.blockers.join(" "), /固定 URL 尚未通过/);
  assert.match(result.blockers.join(" "), /临时 lhr\.life/);
  assert.doesNotMatch(JSON.stringify(result), /sk-proj|sk-or-v1|gsk_|AQ\./);
});

test("stable access gate marks external use ready only after fixed URL preflight passes", async () => {
  const result = await buildStableAccessGate({
    stableUrl: "https://finance-ai-test.onrender.com",
    status: healthyTemporaryStatus,
    renderReadiness,
    stablePreflightImpl: async ({ stableUrl }) => ({
      ok: true,
      stableUrl,
      blueprintReady: true,
      secretsSafe: true,
      requiredEndpoints: ["/", "/health", "/api/health"],
      stabilityGate: {
        continuousHealthPassed: true,
        requiredDurationSeconds: 180,
      },
      smokeSummary: {
        ok: true,
        publicUrl: stableUrl,
        iterationCount: 8,
        lastFailure: null,
      },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.externalUseReady, true);
  assert.equal(result.status, "stable-external-ready");
  assert.equal(result.recommendedAccess.mode, "fixed-hosting");
  assert.equal(result.fixedAccess.url, "https://finance-ai-test.onrender.com");
  assert.equal(result.fixedAccess.continuousHealthPassed, true);
  assert.equal(result.fixedAccess.smokeSummary.iterationCount, 8);
});
