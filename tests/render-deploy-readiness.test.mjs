import assert from "node:assert/strict";
import test from "node:test";

import { buildRenderDeployReadiness } from "../scripts/render-deploy-readiness.mjs";

const blueprint = {
  ok: true,
  blueprintReady: true,
  secretsSafe: true,
  serviceName: "finance-ai-assistant-web",
  runtime: "node",
  startCommand: "npm start",
  healthCheckPath: "/health",
};

const secretKeys = [
  "FINANCE_AI_MODEL_API_KEY",
  "FINANCE_AI_MODEL_FALLBACK_API_KEY",
];

test("render deploy readiness reports missing dashboard secrets without leaking values", () => {
  const result = buildRenderDeployReadiness({
    blueprint,
    secretKeys,
    env: {
      FINANCE_AI_MODEL_API_KEY: "configured-primary-secret",
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.mode, "strict-secrets-required");
  assert.deepEqual(result.missingSecretKeys, ["FINANCE_AI_MODEL_FALLBACK_API_KEY"]);
  assert.equal(result.dashboardSecrets[0].present, true);
  assert.equal(result.dashboardSecrets[0].valuePreview, "[configured-redacted]");
  assert.equal(result.dashboardSecrets[1].present, false);
  assert.doesNotMatch(JSON.stringify(result), /configured-primary-secret/);
  assert.match(result.blockers.join(" "), /缺少 1 个密钥变量/);
});

test("render deploy readiness can audit local runtime secret sources without treating them as dashboard-ready", () => {
  const result = buildRenderDeployReadiness({
    blueprint,
    secretKeys,
    env: {},
    includeRuntimeFiles: true,
    runtimeSecretFiles: {
      FINANCE_AI_MODEL_API_KEY: ["/private/tmp/test-primary-key"],
      FINANCE_AI_MODEL_FALLBACK_API_KEY: ["/private/tmp/test-fallback-key"],
    },
    fileExistsImpl: (file) => file === "/private/tmp/test-primary-key",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingSecretKeys, secretKeys);
  assert.deepEqual(result.localRuntimeSecretSourceKeys, ["FINANCE_AI_MODEL_API_KEY"]);
  assert.deepEqual(result.unavailableSecretSourceKeys, ["FINANCE_AI_MODEL_FALLBACK_API_KEY"]);
  assert.equal(result.runtimeFileAudit.enabled, true);
  assert.equal(result.dashboardSecrets[0].present, false);
  assert.equal(result.dashboardSecrets[0].localRuntimeSourceAvailable, true);
  assert.equal(result.dashboardSecrets[0].localRuntimeSource, "[runtime-file-present-redacted]");
  assert.equal(result.dashboardSecrets[0].dashboardStatus, "available-locally-paste-manually");
  assert.equal(result.dashboardSecrets[1].dashboardStatus, "missing");
  assert.doesNotMatch(JSON.stringify(result), /test-primary-key|secret-value|configured-primary-secret/);
  assert.match(result.nextSteps.join(" "), /本机检测到 1 个运行时密钥来源/);
});

test("render deploy readiness can run blueprint-only without requiring local secret values", () => {
  const result = buildRenderDeployReadiness({
    blueprint,
    secretKeys,
    strictSecrets: false,
    env: {},
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "blueprint-only");
  assert.deepEqual(result.missingSecretKeys, secretKeys);
  assert.equal(result.secretsSafeInRepo, true);
  assert.match(result.acceptanceCriteria.command, /FINANCE_AI_STABLE_PREVIEW_URL=/);
});

test("render deploy readiness fails when blueprint is unsafe", () => {
  const result = buildRenderDeployReadiness({
    blueprint: { ...blueprint, ok: false, blueprintReady: false },
    secretKeys: [],
    env: {},
  });

  assert.equal(result.ok, false);
  assert.match(result.blockers.join(" "), /Render 蓝图/);
});
