#!/usr/bin/env node

import { readFileSync } from "node:fs";

const DEFAULT_RENDER_URL = "https://finance-ai-assistant-web.onrender.com";
const DEFAULT_INDEX_HTML_URL = new URL("../index.html", import.meta.url);
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_ANALYSIS_TIMEOUT_MS = 30000;

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  return raw ? raw.replace(/\/+$/, "") : "";
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildUrl(baseUrl, path) {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

function parseAppVersionFromHtml(html = "") {
  const match = String(html).match(/app\.js\?v=(\d+)/);
  return match ? Number(match[1]) : null;
}

function readExpectedAppVersion(options = {}) {
  const localIndexHtml =
    options.localIndexHtml ?? readFileSync(options.indexHtmlUrl || DEFAULT_INDEX_HTML_URL, "utf8");
  return parseAppVersionFromHtml(localIndexHtml);
}

async function fetchWithTimeout(fetchImpl, url, options = {}) {
  const timeoutMs = parseNumber(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      ok: response.status === 200,
      status: response.status,
      durationMs: Date.now() - startedAt,
      text,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      text: "",
      error: error?.name === "AbortError" ? "timeout" : String(error?.message || error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonResult(result) {
  if (!result.ok) return null;
  try {
    return JSON.parse(result.text || "{}");
  } catch {
    return null;
  }
}

function summarizeEndpoint(result, extra = {}) {
  return {
    ok: Boolean(result?.ok),
    status: Number(result?.status) || 0,
    durationMs: Number(result?.durationMs) || 0,
    error: result?.error || "",
    ...extra,
  };
}

function fallbackEnvPrefixFromId(id = "", index = 0) {
  if (id === "fallback" || index === 0) return "FINANCE_AI_MODEL_FALLBACK";
  if (id === "fallback2" || index === 1) return "FINANCE_AI_MODEL_FALLBACK2";
  if (id === "fallback3" || index === 2) return "FINANCE_AI_MODEL_FALLBACK3";
  return `FINANCE_AI_MODEL_FALLBACK${index + 1}`;
}

function fallbackMissingEnvVars(provider = {}, index = 0) {
  if (Array.isArray(provider.missingEnvVars) && provider.missingEnvVars.length) {
    return provider.missingEnvVars.filter((item) => typeof item === "string" && item);
  }
  const prefix = fallbackEnvPrefixFromId(provider.id || "", index);
  return [
    provider.configured === true || provider.baseUrlStatus === "configured-redacted" ? "" : `${prefix}_API_KEY`,
    provider.modelId ? "" : `${prefix}_ID`,
  ].filter(Boolean);
}

function fallbackSetupStatus(provider = {}, index = 0) {
  if (provider.setupStatus) return provider.setupStatus;
  const missing = fallbackMissingEnvVars(provider, index);
  if (missing.length) return `缺少 ${missing.join(" / ")}`;
  if (provider.supported === false) return "provider 未注册";
  if (provider.allowNetwork === false) return "网络开关未启用";
  if (provider.runtimeReady === false) return "runtime 未启用";
  if (provider.canCallLiveModel === true) return "可接力";
  return "待配置";
}

function summarizeAiAdapter(payload = {}) {
  const adapter = payload.providerAdapter || {};
  const fallbackProviders = Array.isArray(adapter.fallbackModelProviders)
    ? adapter.fallbackModelProviders
    : [];
  const callableFallbacks = fallbackProviders.filter((provider) => provider?.canCallLiveModel === true);
  const configuredFallbacks = fallbackProviders.filter((provider) => provider?.configured === true);
  const primaryReady =
    adapter.configured === true && adapter.networkEnabled === true && adapter.runtimeMode !== "inactive";
  const aiRelayReady = adapter.canCallLiveModel === true || callableFallbacks.length > 0;
  const fallbackRows = fallbackProviders.map((provider, index) => {
    const missingEnvVars = fallbackMissingEnvVars(provider, index);
    return {
      id: provider.id || "",
      label: provider.label || "",
      provider: provider.provider || "",
      modelId: provider.modelId || "",
      configured: provider.configured === true,
      supported: provider.supported !== false,
      canCallLiveModel: provider.canCallLiveModel === true,
      apiStyle: provider.apiStyle || "",
      missingEnvVars,
      setupStatus: fallbackSetupStatus(provider, index),
    };
  });
  const missingDashboardSecretKeys = [
    ...(Array.isArray(adapter.missingEnvVars) ? adapter.missingEnvVars : []),
    ...fallbackRows.flatMap((provider) => provider.missingEnvVars),
  ].filter((item, index, list) => item && list.indexOf(item) === index);

  return {
    ok: aiRelayReady,
    status: adapter.status || "unknown",
    runtimeMode: adapter.runtimeMode || "unknown",
    selectedProvider: adapter.selectedProvider || "",
    selectedModel: adapter.selectedModel || "",
    configured: adapter.configured === true,
    networkEnabled: adapter.networkEnabled === true,
    canCallLiveModel: adapter.canCallLiveModel === true,
    primaryReady,
    missingEnvVars: Array.isArray(adapter.missingEnvVars) ? adapter.missingEnvVars : [],
    missingDashboardSecretKeys,
    fallbackReadyCount: callableFallbacks.length,
    fallbackConfiguredCount: configuredFallbacks.length,
    fallbackProviders: fallbackRows,
    guidance: aiRelayReady
      ? "AI 接力运行配置已在公开接口中显示为可调用；完整输出仍取决于 provider 额度、速率限制和结构化校验。"
      : missingDashboardSecretKeys.length
        ? `公开接口显示 AI 主模型和备用模型都不可调用；请在 Render Dashboard 填入这些变量并重新部署：${missingDashboardSecretKeys.join(" / ")}。`
        : "公开接口显示 AI 主模型和备用模型都不可调用；请在 Render Dashboard 填入模型密钥并重新部署。",
  };
}

function normalizeRelayAttempts(providerRelay = {}) {
  const attempts = Array.isArray(providerRelay?.attempts)
    ? providerRelay.attempts
    : Array.isArray(providerRelay?.fallbackErrorCodes)
      ? providerRelay.fallbackErrorCodes
      : [];
  return attempts
    .filter((attempt) => attempt && typeof attempt === "object")
    .map((attempt, index) => ({
      role: typeof attempt.role === "string" && attempt.role ? attempt.role : index === 0 ? "主模型" : `备用 ${index}`,
      model: typeof attempt.model === "string" ? attempt.model : "",
      code: typeof attempt.code === "string" ? attempt.code : "",
      finalReason: typeof attempt.finalReason === "string" ? attempt.finalReason : "",
      callStatus: typeof attempt.callStatus === "string" ? attempt.callStatus : "",
      outputStatus: typeof attempt.outputStatus === "string" ? attempt.outputStatus : "",
      validationStatus: typeof attempt.validationStatus === "string" ? attempt.validationStatus : "",
      cooldownStatus: typeof attempt.cooldownStatus === "string" ? attempt.cooldownStatus : "",
      retryable: attempt.retryable === true,
      retryAfterSeconds: Number.isFinite(Number(attempt.retryAfterSeconds))
        ? Math.max(0, Number(attempt.retryAfterSeconds))
        : 0,
      failedAt: typeof attempt.failedAt === "string" ? attempt.failedAt : "",
      retryAt: typeof attempt.retryAt === "string" ? attempt.retryAt : "",
      nextStep: typeof attempt.nextStep === "string" ? attempt.nextStep : "",
    }));
}

function summarizeRelayCooldown(attempts = [], ai = {}) {
  const cooldownAttempts = attempts.filter((attempt) =>
    /COOLDOWN|cooldown|RATE_LIMIT|QUOTA|429|INSUFFICIENT/i.test(
      `${attempt.code} ${attempt.cooldownStatus} ${attempt.finalReason}`,
    ),
  );
  const retryTimes = cooldownAttempts
    .map((attempt) => Date.parse(attempt.retryAt))
    .filter((time) => Number.isFinite(time))
    .sort((a, b) => a - b);
  const cooldownModels = new Set(
    cooldownAttempts.map((attempt) => String(attempt.model || "").toLowerCase()).filter(Boolean),
  );
  const immediateFallbackAvailable = Array.isArray(ai.fallbackProviders)
    ? ai.fallbackProviders.some((provider) => {
        const model = String(provider.modelId || "").toLowerCase();
        return provider.canCallLiveModel === true && model && !cooldownModels.has(model);
      })
    : false;
  const soonestRetryAt = retryTimes.length ? new Date(retryTimes[0]).toISOString() : "";
  const maxRetryAfterSeconds = cooldownAttempts.reduce(
    (max, attempt) => Math.max(max, Number(attempt.retryAfterSeconds) || 0),
    0,
  );
  return {
    cooldownActive: cooldownAttempts.some((attempt) => /cooldown-active/i.test(attempt.cooldownStatus)),
    cooldownAttemptCount: cooldownAttempts.length,
    soonestRetryAt,
    maxRetryAfterSeconds,
    immediateFallbackAvailable,
    guidance: cooldownAttempts.length
      ? immediateFallbackAvailable
        ? "部分 provider 冷却中；仍有未冷却备用模型可继续尝试。"
        : "当前可见 provider 均在冷却或限流记录中；建议等到最早重试时间后再检测完整 AI。"
      : "当前分析响应没有 provider 冷却记录。",
  };
}

function summarizeAnalysis(payload = {}, endpoint = {}, ai = {}) {
  const hasError = Boolean(payload.error);
  const analysisServiceMode = payload.analysisService?.mode || payload.analysisService?.id || "";
  const analysisMode = payload.analysisMode || analysisServiceMode || "";
  const modelIssue = payload.modelIssue || payload.error || null;
  const providerRelay = payload.providerRelay || null;
  const relayAttempts = normalizeRelayAttempts(providerRelay);
  const successfulRelayAttempt = relayAttempts.find(
    (attempt) =>
      /完整 AI 分析已生成|full ai/i.test(`${attempt.finalReason} ${attempt.outputStatus}`) ||
      (/调用成功/.test(attempt.callStatus) && /校验通过/.test(attempt.validationStatus)),
  );
  const cooldown = summarizeRelayCooldown(relayAttempts, ai);
  const realProviderServiceReady = Boolean(analysisMode && analysisMode !== "real-data-rule-reference");
  const fullAiOutputReady =
    endpoint.ok &&
    !hasError &&
    !modelIssue &&
    (realProviderServiceReady || Boolean(successfulRelayAttempt));
  return {
    ok: endpoint.ok,
    status: endpoint.status,
    analysisMode,
    analysisServiceMode,
    fullAiOutputReady,
    successfulRelayModel: fullAiOutputReady
      ? successfulRelayAttempt?.model || providerRelay?.used || payload.analysisService?.model || ""
      : "",
    modelIssueCode: modelIssue?.code || "",
    modelIssueMessage: modelIssue?.message || "",
    relayAttemptCount: relayAttempts.length,
    relayAttemptCodes: relayAttempts.map((attempt) => attempt.code || attempt.finalReason || "").filter(Boolean),
    relayAttempts,
    cooldown,
    guidance: fullAiOutputReady
      ? "完整真实 AI 已输出。"
      : analysisMode === "real-data-rule-reference"
        ? cooldown.cooldownActive
          ? "当前线上分析是规则参考；完整 AI 因 provider 冷却/限流暂不可用。"
          : "当前线上分析仍是规则参考，不是完整真实 AI 深度分析。"
        : "当前线上未确认完整真实 AI 输出。",
  };
}

function buildNextSteps({ deployedLatest, ai, analysis }) {
  const nextSteps = [];
  if (!deployedLatest) {
    nextSteps.push("Render 线上仍不是本地最新版本；请触发 Render redeploy，或确认 autoDeploy 已生效。");
  }
  if (!ai.ok) {
    const missing = ai.missingDashboardSecretKeys?.length
      ? `缺少 ${ai.missingDashboardSecretKeys.join(" / ")}；`
      : "";
    nextSteps.push(`AI 接力不可调用；${missing}请在 Render Dashboard 添加模型密钥，保存后 redeploy。`);
  }
  if (ai.ok && !analysis.fullAiOutputReady) {
    nextSteps.push("AI 接力配置可调用后，继续复测完整 AI 输出；若仍为规则参考，查看 provider 额度、429 冷却和结构化校验失败原因。");
    if (analysis.cooldown?.cooldownActive) {
      const retryText = analysis.cooldown.soonestRetryAt
        ? `最早建议重试时间：${analysis.cooldown.soonestRetryAt}。`
        : "provider 未返回明确最早重试时间。";
      const fallbackText = analysis.cooldown.immediateFallbackAvailable
        ? "仍有未冷却备用模型可立即继续检查。"
        : "当前没有未冷却备用模型可立即继续检查。";
      nextSteps.push(`${retryText}${fallbackText}`);
    }
  }
  if (!nextSteps.length) {
    nextSteps.push("固定网址版本、接口和完整 AI 输出均通过本轮检查。");
  }
  return nextSteps;
}

export async function buildRenderLiveStatus(options = {}) {
  const stableUrl = normalizeBaseUrl(
    options.stableUrl || options.url || process.env.FINANCE_AI_STABLE_PREVIEW_URL || DEFAULT_RENDER_URL,
  );
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = parseNumber(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const analysisTimeoutMs = parseNumber(options.analysisTimeoutMs, DEFAULT_ANALYSIS_TIMEOUT_MS);
  const expectedAppVersion =
    options.expectedAppVersion === undefined
      ? readExpectedAppVersion(options)
      : Number(options.expectedAppVersion);

  const [homeResult, healthResult, apiHealthResult, progressResult, aiAdapterResult, analysisResult] =
    await Promise.all([
      fetchWithTimeout(fetchImpl, buildUrl(stableUrl, "/"), { timeoutMs }),
      fetchWithTimeout(fetchImpl, buildUrl(stableUrl, "/health"), { timeoutMs }),
      fetchWithTimeout(fetchImpl, buildUrl(stableUrl, "/api/health"), { timeoutMs }),
      fetchWithTimeout(fetchImpl, buildUrl(stableUrl, "/api/project/progress"), { timeoutMs }),
      fetchWithTimeout(fetchImpl, buildUrl(stableUrl, "/api/ai-services/provider-adapter"), { timeoutMs }),
      fetchWithTimeout(fetchImpl, buildUrl(stableUrl, "/api/analysis?symbol=MSFT&riskProfile=balanced"), {
        timeoutMs: analysisTimeoutMs,
      }),
    ]);

  const liveAppVersion = parseAppVersionFromHtml(homeResult.text);
  const deployedLatest = Boolean(
    homeResult.ok &&
      Number.isFinite(liveAppVersion) &&
      Number.isFinite(expectedAppVersion) &&
      liveAppVersion >= expectedAppVersion,
  );
  const progressPayload = parseJsonResult(progressResult) || {};
  const aiPayload = parseJsonResult(aiAdapterResult) || {};
  const analysisPayload = parseJsonResult(analysisResult) || {};
  const ai = summarizeAiAdapter(aiPayload);
  const analysis = summarizeAnalysis(analysisPayload, summarizeEndpoint(analysisResult), ai);
  const endpointsOk = [homeResult, healthResult, apiHealthResult, progressResult, aiAdapterResult, analysisResult].every(
    (result) => result.ok,
  );
  const ok = endpointsOk && deployedLatest && ai.ok;

  return {
    generatedAt: new Date().toISOString(),
    ok,
    stableUrl,
    expectedAppVersion,
    liveAppVersion,
    deployedLatest,
    endpoints: {
      home: summarizeEndpoint(homeResult),
      health: summarizeEndpoint(healthResult),
      apiHealth: summarizeEndpoint(apiHealthResult),
      projectProgress: summarizeEndpoint(progressResult, {
        targetText: progressPayload?.progress?.completed?.find?.((item) => /自动化回归目标/.test(item)) || "",
        updatedAt: progressPayload?.progress?.updatedAt || "",
      }),
      aiProviderAdapter: summarizeEndpoint(aiAdapterResult),
      analysisMsft: summarizeEndpoint(analysisResult),
    },
    ai,
    analysis,
    nextSteps: buildNextSteps({ deployedLatest, ai, analysis }),
    guidance: ok
      ? "固定 Render 网址已部署最新版本，核心接口可用，AI 接力公开状态可调用。"
      : "固定 Render 网址仍有未完成项；请查看 nextSteps。",
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
    stableUrl: args.get("url") || env.FINANCE_AI_STABLE_PREVIEW_URL || DEFAULT_RENDER_URL,
    timeoutMs: args.get("timeout-ms") || env.FINANCE_AI_RENDER_LIVE_STATUS_TIMEOUT_MS,
    analysisTimeoutMs:
      args.get("analysis-timeout-ms") || env.FINANCE_AI_RENDER_LIVE_STATUS_ANALYSIS_TIMEOUT_MS,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const status = await buildRenderLiveStatus(parseCliArgs());
    console.log(JSON.stringify(status, null, 2));
    process.exitCode = status.ok ? 0 : 1;
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 2;
  }
}
