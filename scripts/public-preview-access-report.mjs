#!/usr/bin/env node

import { execFile } from "node:child_process";

import { defaultPublicPreviewChecks } from "./public-preview-health-check.mjs";
import { summarizePublicPreviewStatus } from "./public-preview-status.mjs";

const DEFAULT_TIMEOUT_MS = 12 * 1000;

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildUrl(baseUrl, path) {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

function hostnameForUrl(value = "") {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function isTemporaryTunnelUrl(value = "") {
  return /\.lhr\.life$/i.test(hostnameForUrl(value));
}

async function probeUrl(url, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = parseNumber(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const allowCurlFallback =
    options.allowCurlFallback === undefined ? !options.fetchImpl : Boolean(options.allowCurlFallback);
  if (typeof fetchImpl !== "function") {
    if (allowCurlFallback) {
      return curlProbeUrl(url, timeoutMs, options);
    }
    return { ok: false, status: 0, url, error: "fetch unavailable" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    return {
      ok: response.status === 200,
      status: response.status,
      url,
      durationMs: Date.now() - startedAt,
      error: "",
    };
  } catch (error) {
    const failed = {
      ok: false,
      status: 0,
      url,
      durationMs: Date.now() - startedAt,
      error: error?.name === "AbortError" ? "timeout" : String(error?.message || error),
    };
    if (allowCurlFallback) {
      const curlFallback = await curlProbeUrl(url, timeoutMs, options);
      return curlFallback.ok ? curlFallback : { ...failed, curlFallback };
    }
    return failed;
  } finally {
    clearTimeout(timeout);
  }
}

function curlProbeUrl(url, timeoutMs, options = {}) {
  const execFileImpl = options.execFileImpl || execFile;
  const curlBinary = options.curlBinary || "curl";
  const startedAt = Date.now();
  const maxTimeSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  return new Promise((resolve) => {
    execFileImpl(
      curlBinary,
      ["-L", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", String(maxTimeSeconds), url],
      (error, stdout) => {
        const status = Number(String(stdout || "").trim());
        if (Number.isFinite(status) && status > 0) {
          resolve({
            ok: status === 200,
            status,
            url,
            durationMs: Date.now() - startedAt,
            error: "",
            transport: "curl-fallback",
          });
          return;
        }
        resolve({
          ok: false,
          status: 0,
          url,
          durationMs: Date.now() - startedAt,
          error: error?.message || String(error || "curl failed"),
          transport: "curl-fallback",
        });
      },
    );
  });
}

function summarizeProbeResults(results = []) {
  const failed = results.filter((result) => !result.ok);
  return {
    ok: results.length > 0 && failed.length === 0,
    checkedCount: results.length,
    failedCount: failed.length,
    failed,
  };
}

function chooseRecommendedAccess({ publicUrl, publicSummary, localFallbackUrl, localFallback }) {
  if (publicSummary.ok) {
    return {
      mode: "public",
      url: publicUrl,
      label: "公网临时链接",
      reason: "公网关键端点当前全部返回 200。",
    };
  }
  if (localFallback.ok) {
    return {
      mode: "local-fallback",
      url: localFallbackUrl,
      label: "本机备用地址",
      reason: "公网入口当前不可用或不完整，但本机备用地址可用。",
    };
  }
  return {
    mode: "none",
    url: "",
    label: "暂无可确认入口",
    reason: "公网入口和本机备用地址都未确认可用。",
  };
}

function buildNextSteps(recommendedAccess) {
  if (recommendedAccess.mode === "public") {
    return [
      "可以把当前公网临时链接用于短时间测试。",
      "正式演示前仍需运行 2-3 分钟连续健康检查。",
      "长期外部测试仍应迁移到 Render 或同类固定托管环境。",
    ];
  }
  if (recommendedAccess.mode === "local-fallback") {
    return [
      "先使用本机备用地址继续排查或演示。",
      "重启 public-preview supervisor 以恢复新的 lhr.life 公网链接。",
      "准备固定线上测试环境，避免临时隧道再次中断。",
    ];
  }
  return [
    "先启动本机 public preview 服务或 supervisor。",
    "确认 http://127.0.0.1:4192/health 返回 200。",
    "再启动公网 watchdog 或迁移到固定托管环境。",
  ];
}

function buildAccessEntries({ publicUrl, publicSummary, localFallbackUrl, localFallback, stabilityGate, standbyPublicUrls }) {
  const temporaryTunnel = isTemporaryTunnelUrl(publicUrl);
  const currentPublicStatus = publicSummary.ok
    ? temporaryTunnel
      ? "ready-temporary"
      : "ready-stable"
    : publicUrl
      ? "unhealthy"
      : "missing";
  const localStatus = localFallback.ok ? "healthy" : "unhealthy";
  const standbyEntries = (Array.isArray(standbyPublicUrls) ? standbyPublicUrls : [])
    .filter((entry) => entry?.url)
    .map((entry, index) => ({
      id: `standby-public-${index + 1}`,
      label: `备用公网临时入口 ${index + 1}`,
      url: entry.url,
      status: entry.status === "healthy" ? "ready-standby" : entry.status || "unknown",
      available: entry.status === "healthy",
      external: true,
      scope: "短时间外部备用",
      warning: "备用 lhr.life 仍是临时隧道，只用于主入口掉线后的短期恢复。",
      nextStep:
        entry.status === "healthy"
          ? "主公网入口掉线时可临时切换到这个备用链接。"
          : "等待 standby watchdog 重新检查或重建备用链接。",
    }));
  return [
    {
      id: "fixed-hosting",
      label: "固定线上测试环境",
      url: stabilityGate.stableHostedUrl ? publicUrl : "",
      status: stabilityGate.externalUseReady
        ? "ready"
        : stabilityGate.stableHostedUrl
          ? "needs-health-gate"
          : "missing",
      available: stabilityGate.externalUseReady,
      external: true,
      scope: "外部稳定测试",
      warning: stabilityGate.externalUseReady ? "" : "尚未完成固定托管和连续健康门禁。",
      nextStep: stabilityGate.externalUseReady
        ? "可作为外部稳定测试入口，仍需定期复测。"
        : "创建 Render/Vercel/Netlify 固定服务并运行 2-3 分钟连续验收。",
    },
    {
      id: "temporary-public",
      label: "当前公网临时入口",
      url: publicUrl,
      status: currentPublicStatus,
      available: publicSummary.ok,
      external: true,
      scope: "短时间外部测试",
      warning: temporaryTunnel ? "lhr.life 是临时隧道，可能轮换或返回 503 / no tunnel here :(。" : "",
      nextStep: publicSummary.ok
        ? "可短时间测试；正式演示前仍需连续健康检查。"
        : "重启 public-preview supervisor 获取新的临时公网链接。",
    },
    ...standbyEntries,
    {
      id: "local-fallback",
      label: "本机备用入口",
      url: localFallbackUrl,
      status: localStatus,
      available: localFallback.ok,
      external: false,
      scope: "仅本机/同一台电脑",
      warning: "外部用户不能访问 127.0.0.1。",
      nextStep: localFallback.ok
        ? "公网掉线时用于继续开发和排查。"
        : "先启动本机 public preview 服务，确认 /health 返回 200。",
    },
  ];
}

function buildStabilityGate({ recommendedAccess, publicUrl, status, publicSummary, checks }) {
  const temporaryTunnel = isTemporaryTunnelUrl(publicUrl);
  const requiredDurationSeconds = 180;
  const healthRequiredEndpoints = Array.isArray(status.healthRequiredEndpoints)
    ? status.healthRequiredEndpoints
    : [];
  const requiredEndpointPaths = (Array.isArray(checks) ? checks : defaultPublicPreviewChecks).map((check) => check.path);
  const requiredEndpointCoverage = requiredEndpointPaths.every((path) => healthRequiredEndpoints.includes(path));
  const monitorWindowSeconds = Number(status.healthWindowSeconds || 0);
  const monitorIterationCount = Number(status.healthIterationCount || 0);
  const watchdogFreshAndHealthy = status.ok && Number(status.healthCycleCount || 0) > 0;
  const continuousHealthPassed =
    publicSummary.ok &&
    watchdogFreshAndHealthy &&
    monitorWindowSeconds >= requiredDurationSeconds &&
    monitorIterationCount > 0 &&
    requiredEndpointCoverage &&
    !status.lastFailure;
  const stableHostedUrl = Boolean(publicUrl && !temporaryTunnel);
  const externalUseReady = recommendedAccess.mode === "public" && stableHostedUrl && continuousHealthPassed;
  const blockers = [];
  if (temporaryTunnel) blockers.push("当前公网入口仍是临时 lhr.life 隧道，可能轮换或返回 503。");
  if (!stableHostedUrl) blockers.push("尚未验证固定线上测试环境。");
  if (!continuousHealthPassed) blockers.push("尚未完成覆盖关键端点的 2-3 分钟连续健康检查证据。");
  if (status.lastFailure?.failureType) blockers.push(`最近公网失败类型：${status.lastFailure.failureType}。`);
  return {
    externalUseReady,
    temporaryAccessReady: recommendedAccess.mode === "public",
    stableHostedUrl,
    temporaryTunnel,
    continuousHealthPassed,
    requiredDurationSeconds,
    monitorWindowSeconds,
    monitorIterationCount,
    requiredEndpointCoverage,
    lastFailureType: status.lastFailure?.failureType || "",
    checkedEndpointCount: publicSummary.checkedCount,
    blockers,
    userMessage: externalUseReady
      ? "当前入口已通过固定托管和连续健康门禁，可作为外部测试链接。"
      : "当前入口只适合短时间测试；外部稳定演示仍需固定托管和连续健康门禁。",
  };
}

export async function buildPublicPreviewAccessReport(options = {}) {
  const timeoutMs = parseNumber(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const status = summarizePublicPreviewStatus(options.statusOptions || options);
  const publicUrl = normalizeBaseUrl(options.publicUrl || status.publicUrl);
  const localFallbackUrl = normalizeBaseUrl(
    options.localFallbackUrl || status.localFallbackUrl || "http://127.0.0.1:4192",
  );
  const checks = Array.isArray(options.checks) && options.checks.length
    ? options.checks
    : defaultPublicPreviewChecks;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const allowCurlFallback =
    options.allowCurlFallback === undefined ? !options.fetchImpl : Boolean(options.allowCurlFallback);
  const execFileImpl = options.execFileImpl || execFile;
  const curlBinary = options.curlBinary || "curl";
  const probeOptions = { fetchImpl, timeoutMs, allowCurlFallback, execFileImpl, curlBinary };

  const publicResults = publicUrl
    ? await Promise.all(
        checks.map(async (check) => ({
          ...check,
          ...(await probeUrl(buildUrl(publicUrl, check.path), probeOptions)),
        })),
      )
    : [];
  const publicSummary = summarizeProbeResults(publicResults);
  const localFallback = localFallbackUrl
    ? await probeUrl(buildUrl(localFallbackUrl, "/health"), probeOptions)
    : { ok: false, status: 0, url: "", error: "local fallback missing" };
  const recommendedAccess = chooseRecommendedAccess({
    publicUrl,
    publicSummary,
    localFallbackUrl,
    localFallback,
  });
  const stabilityGate = buildStabilityGate({
    recommendedAccess,
    publicUrl,
    status,
    publicSummary,
    checks,
  });
  const accessEntries = buildAccessEntries({
    publicUrl,
    publicSummary,
    localFallbackUrl,
    localFallback,
    stabilityGate,
    standbyPublicUrls: status.standbyPublicUrls,
  });

  return {
    ok: recommendedAccess.mode !== "none",
    generatedAt: new Date().toISOString(),
    recommendedAccess,
    accessEntries,
    stabilityGate,
    publicPreview: {
      url: publicUrl,
      statusFileOk: status.ok,
      stale: status.stale,
      healthCycleCount: status.healthCycleCount,
      healthWindowSeconds: status.healthWindowSeconds,
      healthIterationCount: status.healthIterationCount,
      healthRequiredEndpoints: status.healthRequiredEndpoints,
      healthStartedAt: status.healthStartedAt,
      healthEndedAt: status.healthEndedAt,
      lastFailure: status.lastFailure,
      restartCount: status.restartCount,
      standbyPromotionCount: status.standbyPromotionCount || 0,
      standbyPublicUrls: status.standbyPublicUrls || [],
      probe: publicSummary,
      results: publicResults,
    },
    localFallback: {
      url: localFallbackUrl,
      probe: localFallback,
    },
    nextSteps: buildNextSteps(recommendedAccess),
    disclaimer: "lhr.life 仍是临时隧道；固定线上测试环境才是外部稳定访问方案。",
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
    publicUrl: args.get("url") || env.FINANCE_AI_PUBLIC_PREVIEW_URL,
    localFallbackUrl: args.get("local-url") || env.FINANCE_AI_PUBLIC_PREVIEW_LOCAL_URL,
    timeoutMs: args.get("timeout-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_ACCESS_TIMEOUT_MS,
    statusOptions: {
      statusFile: args.get("status-file") || env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE,
      staleAfterMs: args.get("stale-after-ms") || env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_STALE_AFTER_MS,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const report = await buildPublicPreviewAccessReport(parseCliArgs());
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 2;
  }
}
