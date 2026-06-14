#!/usr/bin/env node

import { readFileSync } from "node:fs";

import {
  defaultPublicPreviewChecks,
  runPublicPreviewHealthCheck,
} from "./public-preview-health-check.mjs";

const DEFAULT_RENDER_YAML_URL = new URL("../render.yaml", import.meta.url);
const DEFAULT_PACKAGE_JSON_URL = new URL("../package.json", import.meta.url);

export const requiredStableHostingEndpoints = defaultPublicPreviewChecks.map((check) => check.path);

export const requiredDashboardSecretKeys = [
  "FINANCE_AI_TWELVE_DATA_API_KEY",
  "FINANCE_AI_ALPHA_VANTAGE_API_KEY",
  "FINANCE_AI_NEWS_API_KEY",
  "FINANCE_AI_MODEL_API_KEY",
  "FINANCE_AI_MODEL_FALLBACK_API_KEY",
  "FINANCE_AI_MODEL_FALLBACK2_API_KEY",
  "FINANCE_AI_MODEL_FALLBACK3_API_KEY",
];

export const requiredRuntimeEnvVars = {
  FINANCE_AI_PUBLIC_HOST: "0.0.0.0",
  FINANCE_AI_MARKET_DATA_PROVIDER: "multi-free",
  FINANCE_AI_NEWS_PROVIDER: "multi-free-news",
  FINANCE_AI_FILINGS_PROVIDER: "multi-free-filings",
  FINANCE_AI_MACRO_PROVIDER: "world-bank-open-data",
};

function stripYamlValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function findYamlScalar(yaml, key) {
  const match = String(yaml).match(new RegExp(`(^|\\n)\\s*(?:-\\s+)?${key}:\\s*([^\\n#]+)`));
  return match ? stripYamlValue(match[2]) : "";
}

export function parseRenderBlueprint(renderYaml) {
  const yaml = String(renderYaml || "");
  const envVars = [];
  let currentEnvVar = null;

  for (const line of yaml.split(/\r?\n/)) {
    const keyMatch = line.match(/^\s*-\s+key:\s*([^\s#]+)/);
    if (keyMatch) {
      currentEnvVar = { key: stripYamlValue(keyMatch[1]), value: "", sync: "" };
      envVars.push(currentEnvVar);
      continue;
    }

    if (!currentEnvVar) continue;

    const valueMatch = line.match(/^\s+value:\s*(.+?)\s*$/);
    if (valueMatch) {
      currentEnvVar.value = stripYamlValue(valueMatch[1]);
      continue;
    }

    const syncMatch = line.match(/^\s+sync:\s*(.+?)\s*$/);
    if (syncMatch) {
      currentEnvVar.sync = stripYamlValue(syncMatch[1]);
    }
  }

  return {
    type: findYamlScalar(yaml, "type"),
    name: findYamlScalar(yaml, "name"),
    runtime: findYamlScalar(yaml, "runtime"),
    buildCommand: findYamlScalar(yaml, "buildCommand"),
    startCommand: findYamlScalar(yaml, "startCommand"),
    healthCheckPath: findYamlScalar(yaml, "healthCheckPath"),
    autoDeploy: findYamlScalar(yaml, "autoDeploy"),
    envVars,
  };
}

function envVarByKey(blueprint, key) {
  return blueprint.envVars.find((envVar) => envVar.key === key) || null;
}

function isSecretKey(key) {
  return /(^|_)(API_KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL|DB_URL|CONNECTION_STRING)$/i.test(key);
}

function hasHardcodedSecretValue(envVar) {
  if (!isSecretKey(envVar.key)) return false;
  return Boolean(envVar.value);
}

function makeCheck(id, ok, message, details = {}) {
  return { id, ok: Boolean(ok), message, details };
}

export function inspectStableHostingBlueprint(options = {}) {
  const renderYaml =
    options.renderYaml ?? readFileSync(options.renderYamlUrl || DEFAULT_RENDER_YAML_URL, "utf8");
  const packageJsonText =
    options.packageJsonText ?? readFileSync(options.packageJsonUrl || DEFAULT_PACKAGE_JSON_URL, "utf8");
  const packageJson = typeof packageJsonText === "string" ? JSON.parse(packageJsonText) : packageJsonText;
  const blueprint = parseRenderBlueprint(renderYaml);
  const checks = [];

  checks.push(makeCheck("service-type", blueprint.type === "web", "Render service must be a web service.", {
    actual: blueprint.type,
  }));
  checks.push(makeCheck("runtime-node", blueprint.runtime === "node", "Render runtime must be Node.", {
    actual: blueprint.runtime,
  }));
  checks.push(makeCheck("start-command", blueprint.startCommand === "npm start", "Render must use npm start.", {
    actual: blueprint.startCommand,
  }));
  checks.push(
    makeCheck(
      "package-start",
      packageJson?.scripts?.start === "node scripts/production-start.mjs",
      "package.json start script must run production-start.",
      { actual: packageJson?.scripts?.start || "" },
    ),
  );
  checks.push(makeCheck("health-check", blueprint.healthCheckPath === "/health", "Health check must use /health.", {
    actual: blueprint.healthCheckPath,
  }));

  for (const [key, expectedValue] of Object.entries(requiredRuntimeEnvVars)) {
    const envVar = envVarByKey(blueprint, key);
    checks.push(
      makeCheck(
        `env-${key}`,
        envVar?.value === expectedValue,
        `${key} must be ${expectedValue}.`,
        { actual: envVar?.value || "", expected: expectedValue },
      ),
    );
  }

  for (const key of requiredDashboardSecretKeys) {
    const envVar = envVarByKey(blueprint, key);
    checks.push(
      makeCheck(
        `secret-${key}`,
        envVar?.sync === "false" && !envVar?.value,
        `${key} must be configured in the hosting dashboard with sync: false.`,
        { sync: envVar?.sync || "", hasValue: Boolean(envVar?.value) },
      ),
    );
  }

  const hardcodedSecrets = blueprint.envVars.filter(hasHardcodedSecretValue).map((envVar) => envVar.key);
  checks.push(
    makeCheck(
      "no-hardcoded-secrets",
      hardcodedSecrets.length === 0,
      "No secret-like env var may contain a committed value.",
      { hardcodedSecrets },
    ),
  );

  const forbiddenNeedles = [
    ["sk", "proj"].join("-"),
    ["sk", "or", "v1"].join("-"),
    ["g", "sk_"].join(""),
    ["A", "Q."].join(""),
  ];
  const committedSecretNeedles = forbiddenNeedles.filter((needle) => String(renderYaml).includes(needle));
  checks.push(
    makeCheck(
      "no-raw-provider-keys",
      committedSecretNeedles.length === 0,
      "Provider key prefixes must not appear in render.yaml.",
      { committedSecretNeedles },
    ),
  );

  const blueprintReady = checks
    .filter((check) => !check.id.startsWith("secret-") && !check.id.startsWith("no-"))
    .every((check) => check.ok);
  const secretsSafe = checks
    .filter((check) => check.id.startsWith("secret-") || check.id.startsWith("no-"))
    .every((check) => check.ok);

  return {
    ok: blueprintReady && secretsSafe,
    blueprintReady,
    secretsSafe,
    serviceName: blueprint.name,
    serviceType: blueprint.type,
    runtime: blueprint.runtime,
    startCommand: blueprint.startCommand,
    healthCheckPath: blueprint.healthCheckPath,
    autoDeploy: blueprint.autoDeploy,
    requiredEndpoints: requiredStableHostingEndpoints,
    requiredDashboardSecretKeys,
    checks,
  };
}

function parseCliArgs(argv = process.argv.slice(2), env = process.env) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const [key, inlineValue] = item.slice(2).split("=");
    const value = inlineValue !== undefined ? inlineValue : argv[index + 1];
    args.set(key, value);
    if (inlineValue === undefined) index += 1;
  }
  return {
    stableUrl: args.get("url") || env.FINANCE_AI_STABLE_PREVIEW_URL || "",
    durationMs: args.get("duration-ms") || env.FINANCE_AI_STABLE_PREVIEW_MONITOR_DURATION_MS || "180000",
    intervalMs: args.get("interval-ms") || env.FINANCE_AI_STABLE_PREVIEW_MONITOR_INTERVAL_MS || "15000",
    timeoutMs: args.get("timeout-ms") || env.FINANCE_AI_STABLE_PREVIEW_MONITOR_TIMEOUT_MS || "15000",
  };
}

export async function runStableHostingPreflight(options = {}) {
  const blueprint = inspectStableHostingBlueprint(options);
  const stableUrl = String(options.stableUrl || "").trim().replace(/\/+$/, "");
  let smoke = null;

  if (stableUrl) {
    smoke = await (options.healthCheckImpl || runPublicPreviewHealthCheck)({
      publicUrl: stableUrl,
      durationMs: options.durationMs,
      intervalMs: options.intervalMs,
      timeoutMs: options.timeoutMs,
      checks: options.checks || defaultPublicPreviewChecks,
      localFallbackUrl: options.localFallbackUrl || "http://127.0.0.1:4192",
    });
  }

  const externalUseReady = blueprint.ok && Boolean(stableUrl) && Boolean(smoke?.ok);
  const ok = externalUseReady;
  const stabilityGateBlockers = [];
  if (!stableUrl) stabilityGateBlockers.push("尚未提供固定线上测试网址。");
  if (!blueprint.ok) stabilityGateBlockers.push("固定托管蓝图或密钥安全预检未通过。");
  if (stableUrl && !smoke?.ok) stabilityGateBlockers.push("固定网址尚未通过连续健康检查。");
  const nextSteps = [];
  if (!blueprint.blueprintReady) {
    nextSteps.push("修复 render.yaml 的服务类型、Node 运行时、启动命令、健康检查或生产绑定地址。");
  }
  if (!blueprint.secretsSafe) {
    nextSteps.push("删除仓库中的硬编码密钥，只在托管平台 Dashboard 中填写 API key。");
  }
  if (!stableUrl) {
    nextSteps.push("在 Render 或同类平台创建固定 Web Service 后，用 --url 或 FINANCE_AI_STABLE_PREVIEW_URL 运行连续验收。");
  } else if (!smoke?.ok) {
    nextSteps.push("固定网址连续验收失败，先查看健康检查失败端点，再检查托管平台日志和环境变量。");
  } else {
    nextSteps.push("固定网址已通过连续验收，可以作为当前外部测试链接。");
  }

  return {
    ok,
    blueprintReady: blueprint.blueprintReady,
    secretsSafe: blueprint.secretsSafe,
    stableUrl: stableUrl || "",
    smokeReady: Boolean(smoke?.ok),
    requiredEndpoints: blueprint.requiredEndpoints,
    checks: blueprint.checks,
    smokeSummary: smoke
      ? {
          ok: smoke.ok,
          publicUrl: smoke.publicUrl,
          checkedEndpoints: smoke.checkedEndpoints,
          iterationCount: smoke.iterationCount,
          lastFailure: smoke.lastFailure,
          guidance: smoke.guidance,
        }
      : null,
    stabilityGate: {
      externalUseReady,
      fixedHostingConfigured: Boolean(stableUrl),
      blueprintReady: blueprint.blueprintReady,
      secretsSafe: blueprint.secretsSafe,
      continuousHealthPassed: Boolean(smoke?.ok),
      requiredDurationSeconds: Number(options.durationMs || 180000) / 1000,
      temporaryTunnelAccepted: false,
      blockers: stabilityGateBlockers,
      userMessage: externalUseReady
        ? "固定网址已通过蓝图、密钥安全和连续健康门禁，可作为当前外部测试链接。"
        : "固定网址还没有通过完整稳定访问门禁，不能替代临时隧道作为稳定公开入口。",
    },
    nextSteps,
    guidance: externalUseReady
      ? "固定托管和连续健康门禁已通过，可以把该固定网址作为当前外部测试链接。"
      : "稳定外部访问门禁未通过。蓝图通过不等于已有固定可用网址，请先处理 nextSteps 中的问题。",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runStableHostingPreflight(parseCliArgs());
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 2;
  }
}
