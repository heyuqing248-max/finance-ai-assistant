import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderYaml = readFileSync(new URL("../render.yaml", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("Render blueprint exposes same-origin production start and health check", () => {
  assert.match(renderYaml, /runtime:\s*node/);
  assert.match(renderYaml, /startCommand:\s*npm start/);
  assert.match(renderYaml, /healthCheckPath:\s*\/health/);
  assert.match(renderYaml, /key:\s*FINANCE_AI_PUBLIC_HOST\s*\n\s*value:\s*0\.0\.0\.0/);
  assert.equal(packageJson.scripts.start, "node scripts/production-start.mjs");
});

test("Render blueprint stores provider secrets as dashboard-only placeholders", () => {
  const requiredSecretKeys = [
    "FINANCE_AI_TWELVE_DATA_API_KEY",
    "FINANCE_AI_ALPHA_VANTAGE_API_KEY",
    "FINANCE_AI_NEWS_API_KEY",
    "FINANCE_AI_MODEL_API_KEY",
    "FINANCE_AI_MODEL_FALLBACK_API_KEY",
    "FINANCE_AI_MODEL_FALLBACK2_API_KEY",
    "FINANCE_AI_MODEL_FALLBACK3_API_KEY",
  ];

  for (const key of requiredSecretKeys) {
    const secretPlaceholder = new RegExp(`key:\\s*${key}\\s*\\n\\s*sync:\\s*false`);
    assert.match(renderYaml, secretPlaceholder, `${key} must use sync: false`);
  }

  const secretNeedles = [
    ["sk", "proj"].join("-"),
    ["sk", "or", "v1"].join("-"),
    ["g", "sk_"].join(""),
    ["A", "Q."].join(""),
  ];
  for (const needle of secretNeedles) {
    assert.equal(renderYaml.includes(needle), false, `${needle} must not appear in render.yaml`);
  }
});
