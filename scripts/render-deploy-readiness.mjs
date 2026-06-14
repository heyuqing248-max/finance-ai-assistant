#!/usr/bin/env node

import { existsSync } from "node:fs";

import {
  inspectStableHostingBlueprint,
  requiredDashboardSecretKeys,
  requiredRuntimeEnvVars,
  requiredStableHostingEndpoints,
} from "./stable-hosting-preflight.mjs";

export const defaultRuntimeSecretFiles = {
  FINANCE_AI_TWELVE_DATA_API_KEY: ["/private/tmp/finance_ai_twelve_data_key"],
  FINANCE_AI_ALPHA_VANTAGE_API_KEY: ["/private/tmp/finance_ai_alpha_vantage_key"],
  FINANCE_AI_NEWS_API_KEY: ["/private/tmp/finance_ai_news_key", "/private/tmp/finance_ai_alpha_vantage_key"],
  FINANCE_AI_MODEL_API_KEY: ["/private/tmp/finance_ai_model_key"],
  FINANCE_AI_MODEL_FALLBACK_API_KEY: ["/private/tmp/finance_ai_model_fallback_key"],
  FINANCE_AI_MODEL_FALLBACK2_API_KEY: ["/private/tmp/finance_ai_model_fallback2_key"],
  FINANCE_AI_MODEL_FALLBACK3_API_KEY: ["/private/tmp/finance_ai_model_fallback3_key"],
};

function hasRuntimeValue(env, key) {
  return typeof env?.[key] === "string" && env[key].trim().length > 0;
}

function detectRuntimeFileSource(key, options = {}) {
  if (!options.includeRuntimeFiles) {
    return {
      available: false,
      source: "",
      note: "Runtime file audit disabled. Pass --include-runtime-files to check local presence only.",
    };
  }
  const files = options.runtimeSecretFiles?.[key] || defaultRuntimeSecretFiles[key] || [];
  const fileExists = options.fileExistsImpl || existsSync;
  const source = files.find((file) => {
    try {
      return fileExists(file);
    } catch {
      return false;
    }
  });
  return {
    available: Boolean(source),
    source: source || "",
    note:
      key === "FINANCE_AI_NEWS_API_KEY" && source === "/private/tmp/finance_ai_alpha_vantage_key"
        ? "Alpha Vantage key can also serve the current Alpha Vantage news provider, but Render still needs the FINANCE_AI_NEWS_API_KEY variable filled manually."
        : "Local runtime file presence only; value is never read or printed.",
  };
}

function redactPresence(env, key, options = {}) {
  const runtimeFile = detectRuntimeFileSource(key, options);
  const presentInEnv = hasRuntimeValue(env, key);
  return {
    key,
    present: presentInEnv,
    valuePreview: presentInEnv ? "[configured-redacted]" : "",
    localRuntimeSourceAvailable: runtimeFile.available,
    localRuntimeSource: runtimeFile.source ? "[runtime-file-present-redacted]" : "",
    localRuntimeSourceNote: runtimeFile.note,
    dashboardStatus: presentInEnv
      ? "present-in-current-env"
      : runtimeFile.available
        ? "available-locally-paste-manually"
        : "missing",
    policy: "Configure in Render Dashboard; never commit or print the secret value.",
  };
}

function runtimeVariableRows() {
  return Object.entries(requiredRuntimeEnvVars).map(([key, expectedValue]) => ({
    key,
    expectedValue,
    source: "render.yaml",
    status: "blueprint-managed",
  }));
}

export function buildRenderDeployReadiness(options = {}) {
  const env = options.env || process.env;
  const blueprint = options.blueprint || inspectStableHostingBlueprint(options);
  const secretKeys = Array.isArray(options.secretKeys) ? options.secretKeys : requiredDashboardSecretKeys;
  const secretRows = secretKeys.map((key) => redactPresence(env, key, options));
  const missingSecretKeys = secretRows.filter((row) => !row.present).map((row) => row.key);
  const localRuntimeSecretSourceKeys = secretRows
    .filter((row) => row.localRuntimeSourceAvailable)
    .map((row) => row.key);
  const unavailableSecretSourceKeys = secretRows
    .filter((row) => !row.present && !row.localRuntimeSourceAvailable)
    .map((row) => row.key);
  const strictSecrets = options.strictSecrets !== false;
  const readyForDeploy = blueprint.ok && (!strictSecrets || missingSecretKeys.length === 0);

  return {
    generatedAt: new Date().toISOString(),
    ok: readyForDeploy,
    mode: strictSecrets ? "strict-secrets-required" : "blueprint-only",
    blueprintReady: blueprint.blueprintReady,
    secretsSafeInRepo: blueprint.secretsSafe,
    renderService: {
      name: blueprint.serviceName || "finance-ai-assistant-web",
      runtime: blueprint.runtime,
      startCommand: blueprint.startCommand,
      healthCheckPath: blueprint.healthCheckPath,
    },
    runtimeVariables: runtimeVariableRows(),
    dashboardSecrets: secretRows,
    missingSecretKeys,
    localRuntimeSecretSourceKeys,
    unavailableSecretSourceKeys,
    runtimeFileAudit: {
      enabled: Boolean(options.includeRuntimeFiles),
      policy: "Presence-only audit. The script does not read, print, copy, or persist secret values.",
    },
    acceptanceCriteria: {
      durationSeconds: 180,
      endpoints: requiredStableHostingEndpoints,
      command: "FINANCE_AI_STABLE_PREVIEW_URL=https://your-render-url.onrender.com npm run check:stable-hosting",
    },
    blockers: [
      ...(blueprint.ok ? [] : ["Render 蓝图或仓库密钥安全检查未通过。"]),
      ...(missingSecretKeys.length
        ? [`Render Dashboard 仍缺少 ${missingSecretKeys.length} 个密钥变量。`]
        : []),
    ],
    nextSteps: missingSecretKeys.length
      ? [
          "在 Render Dashboard 的 Environment 页面添加 missingSecretKeys 中列出的变量。",
          ...(localRuntimeSecretSourceKeys.length
            ? [`本机检测到 ${localRuntimeSecretSourceKeys.length} 个运行时密钥来源；只能用于人工核对，不能写入仓库或日志。`]
            : []),
          ...(unavailableSecretSourceKeys.length
            ? [`仍有 ${unavailableSecretSourceKeys.length} 个密钥没有在当前 env 或本机运行时文件中检测到。`]
            : []),
          "不要把真实 key 写入 render.yaml、文档、日志或浏览器存储。",
          "部署成功后运行 acceptanceCriteria.command，并确认 180 秒窗口内所有端点持续 200。",
        ]
      : [
          "密钥存在性检查通过；创建或更新 Render Web Service。",
          "部署成功后运行 acceptanceCriteria.command，并确认 180 秒窗口内所有端点持续 200。",
        ],
  };
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const args = new Set(argv);
  return {
    strictSecrets: !args.has("--blueprint-only"),
    includeRuntimeFiles: args.has("--include-runtime-files"),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = buildRenderDeployReadiness(parseCliArgs());
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 2;
  }
}
