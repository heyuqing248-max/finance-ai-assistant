import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  defaultStablePreviewMonitorDurationMs,
  defaultStablePreviewMonitorIntervalMs,
  defaultStablePreviewMonitorTimeoutMs,
  inspectStableHostingBlueprint,
  requiredStableHostingEndpoints,
  runStableHostingPreflight,
} from "../scripts/stable-hosting-preflight.mjs";

const renderYaml = readFileSync(new URL("../render.yaml", import.meta.url), "utf8");
const packageJsonText = readFileSync(new URL("../package.json", import.meta.url), "utf8");

test("stable hosting preflight accepts the Render blueprint and required health endpoints", () => {
  const result = inspectStableHostingBlueprint({ renderYaml, packageJsonText });

  assert.equal(result.ok, true);
  assert.equal(result.blueprintReady, true);
  assert.equal(result.secretsSafe, true);
  assert.equal(result.serviceType, "web");
  assert.equal(result.runtime, "node");
  assert.equal(result.startCommand, "npm start");
  assert.equal(result.healthCheckPath, "/health");
  assert.deepEqual(result.requiredEndpoints, requiredStableHostingEndpoints);
  assert.ok(result.requiredEndpoints.includes("/api/analysis?symbol=MSFT&riskProfile=balanced"));
  assert.ok(result.requiredEndpoints.includes("/api/stocks/search?q=Microsoft"));

  const failedChecks = result.checks.filter((check) => !check.ok);
  assert.deepEqual(failedChecks, []);
});

test("stable hosting preflight rejects hardcoded provider secrets", () => {
  const unsafeYaml = renderYaml.replace(
    /key:\s*FINANCE_AI_MODEL_API_KEY\s*\n\s*sync:\s*false/,
    `key: FINANCE_AI_MODEL_API_KEY\n        value: ${["sk", "proj"].join("-")}-committed-test-secret`,
  );
  const result = inspectStableHostingBlueprint({ renderYaml: unsafeYaml, packageJsonText });

  assert.equal(result.ok, false);
  assert.equal(result.secretsSafe, false);
  assert.equal(
    result.checks.find((check) => check.id === "secret-FINANCE_AI_MODEL_API_KEY").ok,
    false,
  );
  assert.deepEqual(result.checks.find((check) => check.id === "no-hardcoded-secrets").details.hardcodedSecrets, [
    "FINANCE_AI_MODEL_API_KEY",
  ]);
  assert.deepEqual(result.checks.find((check) => check.id === "no-raw-provider-keys").details.committedSecretNeedles, [
    "sk-proj",
  ]);
});

test("stable hosting preflight does not mark external access ready without a fixed URL", async () => {
  const result = await runStableHostingPreflight({
    renderYaml,
    packageJsonText,
  });

  assert.equal(result.ok, false);
  assert.equal(result.blueprintReady, true);
  assert.equal(result.secretsSafe, true);
  assert.equal(result.stabilityGate.externalUseReady, false);
  assert.equal(result.stabilityGate.fixedHostingConfigured, false);
  assert.match(result.guidance, /稳定外部访问门禁未通过/);
});

test("stable hosting preflight runs fixed URL smoke checks when a stable URL is supplied", async () => {
  const calls = [];
  const result = await runStableHostingPreflight({
    renderYaml,
    packageJsonText,
    stableUrl: "https://finance-ai-test.onrender.com/",
    durationMs: 1000,
    intervalMs: 1000,
    timeoutMs: 1000,
    healthCheckImpl: async (options) => {
      calls.push(options);
      return {
        ok: true,
        publicUrl: options.publicUrl,
        checkedEndpoints: options.checks.map((check) => check.path),
        iterationCount: 1,
        lastFailure: null,
        guidance: "公网预览在监控窗口内持续可用。",
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.smokeReady, true);
  assert.equal(result.stabilityGate.externalUseReady, true);
  assert.equal(result.stabilityGate.fixedHostingConfigured, true);
  assert.equal(result.stabilityGate.continuousHealthPassed, true);
  assert.deepEqual(result.stabilityGate.blockers, []);
  assert.equal(result.stableUrl, "https://finance-ai-test.onrender.com");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].publicUrl, "https://finance-ai-test.onrender.com");
  assert.equal(calls[0].durationMs, 1000);
  assert.deepEqual(result.smokeSummary.checkedEndpoints, requiredStableHostingEndpoints);
});

test("stable hosting preflight defaults to the 180-second public stability gate", async () => {
  const calls = [];
  const result = await runStableHostingPreflight({
    renderYaml,
    packageJsonText,
    stableUrl: "https://finance-ai-test.onrender.com/",
    healthCheckImpl: async (options) => {
      calls.push(options);
      return {
        ok: true,
        publicUrl: options.publicUrl,
        checkedEndpoints: options.checks.map((check) => check.path),
        iterationCount: 5,
        lastFailure: null,
        guidance: "公网预览在监控窗口内持续可用。",
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].durationMs, defaultStablePreviewMonitorDurationMs);
  assert.equal(calls[0].intervalMs, defaultStablePreviewMonitorIntervalMs);
  assert.equal(calls[0].timeoutMs, defaultStablePreviewMonitorTimeoutMs);
  assert.equal(result.stabilityGate.requiredDurationSeconds, 180);
});
