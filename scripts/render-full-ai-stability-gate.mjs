#!/usr/bin/env node

import { buildRenderLiveStatus } from "./render-live-status.mjs";

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_INTERVAL_MS = 10000;
const DEFAULT_ANALYSIS_TIMEOUT_MS = 60000;

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeRun(status = {}, index = 0) {
  const analysis = status.analysis || {};
  const cooldown = analysis.cooldown || {};
  const endpoints = Object.fromEntries(
    Object.entries(status.endpoints || {}).map(([key, endpoint]) => [
      key,
      {
        ok: endpoint?.ok === true,
        status: Number(endpoint?.status) || 0,
        durationMs: Number(endpoint?.durationMs) || 0,
        error: endpoint?.error || "",
      },
    ]),
  );
  return {
    attempt: index + 1,
    ok: Boolean(status.ok && analysis.fullAiOutputReady),
    deployedLatest: status.deployedLatest === true,
    endpointsOk: Object.values(endpoints).every((endpoint) => endpoint?.ok === true),
    endpoints,
    liveAppVersion: status.liveAppVersion ?? null,
    expectedAppVersion: status.expectedAppVersion ?? null,
    analysisMode: analysis.analysisMode || "",
    fullAiOutputReady: analysis.fullAiOutputReady === true,
    successfulRelayModel: analysis.successfulRelayModel || "",
    modelIssueCode: analysis.modelIssueCode || "",
    cooldownActive: cooldown.cooldownActive === true,
    soonestRetryAt: cooldown.soonestRetryAt || "",
    immediateFallbackAvailable: cooldown.immediateFallbackAvailable === true,
    guidance: analysis.guidance || status.guidance || "",
    nextSteps: Array.isArray(status.nextSteps) ? status.nextSteps : [],
  };
}

function buildGateSummary(runs = [], options = {}) {
  const requiredAttempts = parsePositiveInteger(options.attempts, DEFAULT_ATTEMPTS);
  const passedRuns = runs.filter((run) => run.ok);
  const firstFailure = runs.find((run) => !run.ok) || null;
  const cooldownRuns = runs.filter((run) => run.cooldownActive);
  const allAttemptsCompleted = runs.length >= requiredAttempts;
  const ok = allAttemptsCompleted && passedRuns.length === requiredAttempts;
  const retryTimes = cooldownRuns
    .map((run) => Date.parse(run.soonestRetryAt))
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => a - b);

  return {
    ok,
    requiredAttempts,
    completedAttempts: runs.length,
    passedAttempts: passedRuns.length,
    failedAttempts: runs.length - passedRuns.length,
    fullAiStable: ok,
    firstFailure,
    soonestRetryAt: retryTimes.length ? new Date(retryTimes[0]).toISOString() : "",
    immediateFallbackAvailable: runs.some((run) => run.immediateFallbackAvailable),
    nextStep: ok
      ? "完整真实 AI 已连续通过稳定性门禁。"
      : firstFailure?.cooldownActive
        ? "完整 AI 未连续通过；provider 正在冷却或限流，建议等到最早重试时间后再跑本门禁。"
        : "完整 AI 未连续通过；请检查 Render key、provider 额度、结构化 JSON 输出和安全校验失败原因。",
    runs,
  };
}

export async function runFullAiStabilityGate(options = {}) {
  const attempts = parsePositiveInteger(options.attempts, DEFAULT_ATTEMPTS);
  const intervalMs = parsePositiveInteger(options.intervalMs, DEFAULT_INTERVAL_MS);
  const statusBuilder = options.statusBuilder || buildRenderLiveStatus;
  const runs = [];

  for (let index = 0; index < attempts; index += 1) {
    const status = await statusBuilder({
      ...options,
      analysisTimeoutMs: parsePositiveInteger(options.analysisTimeoutMs, DEFAULT_ANALYSIS_TIMEOUT_MS),
    });
    runs.push(summarizeRun(status, index));
    if (index < attempts - 1 && options.skipWait !== true) {
      await wait(intervalMs);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    stableUrl: options.stableUrl || options.url || process.env.FINANCE_AI_STABLE_PREVIEW_URL || "",
    intervalMs,
    analysisTimeoutMs: parsePositiveInteger(options.analysisTimeoutMs, DEFAULT_ANALYSIS_TIMEOUT_MS),
    ...buildGateSummary(runs, { attempts }),
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
    stableUrl: args.get("url") || env.FINANCE_AI_STABLE_PREVIEW_URL,
    attempts: args.get("attempts") || env.FINANCE_AI_FULL_AI_GATE_ATTEMPTS,
    intervalMs: args.get("interval-ms") || env.FINANCE_AI_FULL_AI_GATE_INTERVAL_MS,
    timeoutMs: args.get("timeout-ms") || env.FINANCE_AI_RENDER_LIVE_STATUS_TIMEOUT_MS,
    analysisTimeoutMs:
      args.get("analysis-timeout-ms") || env.FINANCE_AI_RENDER_LIVE_STATUS_ANALYSIS_TIMEOUT_MS,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runFullAiStabilityGate(parseCliArgs());
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 2;
  }
}
