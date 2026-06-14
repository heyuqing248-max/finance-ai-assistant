#!/usr/bin/env node

import { readFileSync } from "node:fs";

const DEFAULT_STATUS_FILE = "/private/tmp/finance_ai_public_preview_status.json";
const DEFAULT_STALE_AFTER_MS = 4 * 60 * 1000;
const DEFAULT_HEALTH_MAX_CONSECUTIVE_FAILURES = 2;

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readJsonFile(path, readFile = readFileSync) {
  return JSON.parse(readFile(path, "utf8"));
}

function sanitizeStandbyPublicUrls(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      url: typeof item.url === "string" ? item.url : "",
      status: typeof item.status === "string" ? item.status : "unknown",
      role: typeof item.role === "string" ? item.role : "standby",
      checkedAt: typeof item.checkedAt === "string" ? item.checkedAt : "",
      healthWindowSeconds: Number(item.healthWindowMs) ? Math.round(Number(item.healthWindowMs) / 1000) : 0,
      healthIterationCount: Number(item.healthIterationCount) || 0,
      transientFailureCount: Number(item.transientFailureCount) || 0,
      lastFailure: item.lastFailure || null,
      localFallbackOk:
        item.localFallbackOk === undefined || item.localFallbackOk === null ? null : Boolean(item.localFallbackOk),
      guidance: typeof item.guidance === "string" ? item.guidance : "",
    }))
    .slice(0, 3);
}

export function summarizePublicPreviewStatus(options = {}) {
  const statusFile = options.statusFile || DEFAULT_STATUS_FILE;
  const staleAfterMs = parseNumber(options.staleAfterMs, DEFAULT_STALE_AFTER_MS);
  const now = options.now || Date.now;
  const readFile = options.readFile || readFileSync;

  try {
    const payload = readJsonFile(statusFile, readFile);
    const updatedAtMs = Date.parse(payload.updatedAt || "");
    const ageMs = Number.isFinite(updatedAtMs) ? Math.max(0, now() - updatedAtMs) : Number.POSITIVE_INFINITY;
    const stale = ageMs > staleAfterMs;
    const publicUrl = typeof payload.publicUrl === "string" ? payload.publicUrl : "";
    const localFallbackUrl =
      typeof payload.localFallbackUrl === "string" ? payload.localFallbackUrl : "http://127.0.0.1:4192";
    const carriesRecentHealthyEvidence =
      payload.status === "checking" &&
      Number(payload.healthWindowMs) >= 180000 &&
      Number(payload.healthIterationCount) > 0 &&
      Boolean(payload.healthEndedAt) &&
      !payload.lastFailure;
    const ok =
      ((payload.status === "healthy" && Boolean(publicUrl)) ||
        (carriesRecentHealthyEvidence && Boolean(publicUrl))) &&
      !stale;

    return {
      ok,
      status: payload.status || "unknown",
      publicUrl,
      localFallbackUrl,
      updatedAt: payload.updatedAt || "",
      stale,
      ageSeconds: Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null,
      healthCycleCount: Number(payload.healthCycleCount) || 0,
      healthMaxConsecutiveFailures:
        Number(payload.healthMaxConsecutiveFailures) || DEFAULT_HEALTH_MAX_CONSECUTIVE_FAILURES,
      healthWindowSeconds: Number(payload.healthWindowMs) ? Math.round(Number(payload.healthWindowMs) / 1000) : 0,
      healthIntervalSeconds: Number(payload.healthIntervalMs) ? Math.round(Number(payload.healthIntervalMs) / 1000) : 0,
      healthTimeoutSeconds: Number(payload.healthTimeoutMs) ? Math.round(Number(payload.healthTimeoutMs) / 1000) : 0,
      healthRequiredEndpoints: Array.isArray(payload.healthRequiredEndpoints)
        ? payload.healthRequiredEndpoints.filter((item) => typeof item === "string")
        : [],
      healthIterationCount: Number(payload.healthIterationCount) || 0,
      healthStartedAt: payload.healthStartedAt || "",
      healthEndedAt: payload.healthEndedAt || "",
      restartCount: Number(payload.restartCount) || 0,
      standbyPromotionCount: Number(payload.standbyPromotionCount) || 0,
      standbyPublicUrls: sanitizeStandbyPublicUrls(payload.standbyPublicUrls),
      lastFailure: payload.lastFailure || null,
      transientFailureCount: Number(payload.transientFailureCount) || 0,
      localFallbackOk:
        payload.localFallbackOk === undefined || payload.localFallbackOk === null
          ? null
          : Boolean(payload.localFallbackOk),
      guidance: ok
        ? "当前公网预览状态新鲜且健康。"
        : stale
          ? "公网状态记录已过期，请确认前台 watchdog 仍在运行，或使用本机备用地址。"
          : payload.guidance || "公网状态未确认，请运行 npm run dev:public-preview:watch。",
    };
  } catch (error) {
    return {
      ok: false,
      status: "missing",
      publicUrl: "",
      localFallbackUrl: "http://127.0.0.1:4192",
      updatedAt: "",
      stale: true,
      ageSeconds: null,
      healthCycleCount: 0,
      healthMaxConsecutiveFailures: DEFAULT_HEALTH_MAX_CONSECUTIVE_FAILURES,
      healthWindowSeconds: 0,
      healthIntervalSeconds: 0,
      healthTimeoutSeconds: 0,
      healthRequiredEndpoints: [],
      healthIterationCount: 0,
      healthStartedAt: "",
      healthEndedAt: "",
      restartCount: 0,
      standbyPromotionCount: 0,
      standbyPublicUrls: [],
      lastFailure: null,
      transientFailureCount: 0,
      localFallbackOk: null,
      guidance: `未找到可用公网状态文件：${error?.message || error}。请运行 npm run dev:public-preview:watch。`,
    };
  }
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
    statusFile: args.get("status-file") || env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE,
    staleAfterMs: args.get("stale-after-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_STALE_AFTER_MS,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = summarizePublicPreviewStatus(parseCliArgs());
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.ok ? 0 : 1;
}
