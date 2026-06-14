#!/usr/bin/env node

import { buildRenderDeployReadiness } from "./render-deploy-readiness.mjs";
import { summarizePublicPreviewStatus } from "./public-preview-status.mjs";
import { runStableHostingPreflight } from "./stable-hosting-preflight.mjs";

function normalizeUrl(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildTemporaryAccess(status = {}) {
  const standbyUrls = Array.isArray(status.standbyPublicUrls) ? status.standbyPublicUrls : [];
  return {
    ok: Boolean(status.ok),
    status: status.status || "unknown",
    url: normalizeUrl(status.publicUrl || ""),
    lastWindowSeconds: Number(status.healthWindowSeconds) || 0,
    lastIterationCount: Number(status.healthIterationCount) || 0,
    transientFailureCount: Number(status.transientFailureCount) || 0,
    localFallbackOk: status.localFallbackOk === undefined ? null : status.localFallbackOk,
    standby: standbyUrls
      .filter((entry) => entry?.url)
      .map((entry) => ({
        url: normalizeUrl(entry.url),
        status: entry.status || "unknown",
        healthy: entry.status === "healthy",
        lastWindowSeconds: Number(entry.healthWindowSeconds) || 0,
        lastIterationCount: Number(entry.healthIterationCount) || 0,
      })),
    acceptedForStableExternalUse: false,
    reason: "lhr.life 是临时隧道，只能作为短时间测试或固定托管失败时的临时备用。",
  };
}

function chooseRecommendedAccess({ fixedAccess, temporaryAccess, localFallback }) {
  if (fixedAccess.ready) {
    return {
      mode: "fixed-hosting",
      url: fixedAccess.url,
      label: "固定线上测试环境",
      reason: "固定 URL 已通过蓝图和连续健康门禁。",
    };
  }
  if (temporaryAccess.ok && temporaryAccess.url) {
    return {
      mode: "temporary-public",
      url: temporaryAccess.url,
      label: "当前公网临时入口",
      reason: "固定托管尚未通过，当前只能使用临时公网入口做短时间测试。",
    };
  }
  if (localFallback.ok && localFallback.url) {
    return {
      mode: "local-fallback",
      url: localFallback.url,
      label: "本机备用入口",
      reason: "公网入口不可用，只能在本机继续开发和排查。",
    };
  }
  return {
    mode: "none",
    url: "",
    label: "暂无可用入口",
    reason: "固定托管、临时公网和本机备用均未确认可用。",
  };
}

export async function buildStableAccessGate(options = {}) {
  const stableUrl = normalizeUrl(options.stableUrl || process.env.FINANCE_AI_STABLE_PREVIEW_URL || "");
  const status = options.status || (options.statusReader || summarizePublicPreviewStatus)(options.statusOptions || {});
  const temporaryAccess = buildTemporaryAccess(status);
  const renderReadiness =
    options.renderReadiness ||
    buildRenderDeployReadiness({
      ...(options.renderOptions || {}),
      strictSecrets: false,
      includeRuntimeFiles: options.includeRuntimeFiles !== false,
    });
  const stablePreflight = await (options.stablePreflightImpl || runStableHostingPreflight)({
    ...(options.preflightOptions || {}),
    stableUrl,
  });
  const fixedAccess = {
    configured: Boolean(stableUrl),
    ready: Boolean(stablePreflight.ok),
    url: stableUrl,
    blueprintReady: Boolean(stablePreflight.blueprintReady),
    secretsSafeInRepo: Boolean(stablePreflight.secretsSafe),
    continuousHealthPassed: Boolean(stablePreflight.stabilityGate?.continuousHealthPassed),
    requiredDurationSeconds: Number(stablePreflight.stabilityGate?.requiredDurationSeconds) || 180,
    requiredEndpoints: stablePreflight.requiredEndpoints || [],
    smokeSummary: stablePreflight.smokeSummary,
  };
  const localFallback = {
    ok: status.localFallbackOk === true,
    status: status.localFallbackOk === true ? "healthy" : status.localFallbackOk === false ? "unhealthy" : "unknown",
    url: normalizeUrl(status.localFallbackUrl || "http://127.0.0.1:4192"),
    external: false,
  };
  const blockers = [
    ...(fixedAccess.configured ? [] : ["尚未提供固定线上测试 URL。"]),
    ...(fixedAccess.blueprintReady ? [] : ["固定托管蓝图未通过。"]),
    ...(fixedAccess.secretsSafeInRepo ? [] : ["仓库密钥安全检查未通过。"]),
    ...(fixedAccess.continuousHealthPassed ? [] : ["固定 URL 尚未通过 2-3 分钟连续健康门禁。"]),
    "临时 lhr.life 入口不能作为稳定外部访问的完成条件。",
  ];
  const nextSteps = fixedAccess.ready
    ? [
        "把 fixedAccess.url 作为当前外部测试入口。",
        "保留临时公网和本机备用作为故障排查入口。",
        "定期重跑 npm run gate:stable-access 确认固定 URL 仍健康。",
      ]
    : [
        "在 Render Dashboard 创建或打开 finance-ai-assistant-web 固定 Web Service。",
        "按 renderReadiness.dashboardSecrets 在 Dashboard 手工填写密钥，不写入仓库或日志。",
        "拿到固定 URL 后运行 FINANCE_AI_STABLE_PREVIEW_URL=https://your-render-url npm run gate:stable-access。",
      ];
  const recommendedAccess = chooseRecommendedAccess({ fixedAccess, temporaryAccess, localFallback });

  return {
    generatedAt: new Date().toISOString(),
    ok: fixedAccess.ready,
    externalUseReady: fixedAccess.ready,
    status: fixedAccess.ready ? "stable-external-ready" : "stable-external-not-ready",
    recommendedAccess,
    fixedAccess,
    temporaryAccess,
    localFallback,
    renderReadiness: {
      ok: Boolean(renderReadiness.ok),
      mode: renderReadiness.mode || "unknown",
      renderService: renderReadiness.renderService || {},
      dashboardSecrets: renderReadiness.dashboardSecrets || [],
      missingSecretKeys: renderReadiness.missingSecretKeys || [],
      localRuntimeSecretSourceKeys: renderReadiness.localRuntimeSecretSourceKeys || [],
      unavailableSecretSourceKeys: renderReadiness.unavailableSecretSourceKeys || [],
      runtimeFileAudit: renderReadiness.runtimeFileAudit || {},
      acceptanceCriteria: renderReadiness.acceptanceCriteria || {},
      secretVerificationStatus: "manual-dashboard-required",
    },
    blockers,
    nextSteps,
    guidance: fixedAccess.ready
      ? "固定托管已通过稳定访问门禁，可以作为当前外部测试入口。"
      : "稳定外部访问仍未完成；临时公网入口可短测，但固定托管才是 P0 根治项。",
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
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await buildStableAccessGate(parseCliArgs());
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 2;
  }
}
