import assert from "node:assert/strict";
import test from "node:test";

import { buildRenderDashboardEnvTemplate } from "../scripts/render-dashboard-env-template.mjs";

const inspection = {
  serviceName: "finance-ai-assistant-web",
  blueprintReady: true,
  secretsSafe: true,
  checks: [
    {
      id: "env-FINANCE_AI_PUBLIC_HOST",
      details: { expected: "0.0.0.0" },
    },
    {
      id: "env-FINANCE_AI_MARKET_DATA_PROVIDER",
      details: { expected: "multi-free" },
    },
  ],
  requiredDashboardSecretKeys: ["FINANCE_AI_MODEL_API_KEY"],
};

test("render dashboard env template keeps secret values blank", () => {
  const template = buildRenderDashboardEnvTemplate({ inspection });

  assert.equal(template.serviceName, "finance-ai-assistant-web");
  assert.equal(template.rowCount, 3);
  assert.equal(template.secretCount, 1);
  assert.deepEqual(
    template.rows.map((row) => [row.key, row.value, row.secret]),
    [
      ["FINANCE_AI_PUBLIC_HOST", "0.0.0.0", false],
      ["FINANCE_AI_MARKET_DATA_PROVIDER", "multi-free", false],
      ["FINANCE_AI_MODEL_API_KEY", "", true],
    ],
  );
  assert.match(template.envExample, /FINANCE_AI_MODEL_API_KEY= # Render Dashboard secret/);
  assert.doesNotMatch(JSON.stringify(template), /sk-proj|sk-or-v1|gsk_|AQ\./);
});

test("render dashboard env template can parse render yaml rows", () => {
  const template = buildRenderDashboardEnvTemplate({
    inspection,
    renderYaml: `
services:
  - type: web
    name: finance-ai-assistant-web
    envVars:
      - key: NODE_ENV
        value: production
      - key: FINANCE_AI_MODEL_API_KEY
        sync: false
`,
  });

  assert.deepEqual(
    template.rows.map((row) => [row.key, row.value, row.secret]),
    [
      ["NODE_ENV", "production", false],
      ["FINANCE_AI_MODEL_API_KEY", "", true],
    ],
  );
  assert.equal(template.envExample, "NODE_ENV=production\nFINANCE_AI_MODEL_API_KEY= # Render Dashboard secret; paste manually");
});
