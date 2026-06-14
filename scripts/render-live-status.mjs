#!/usr/bin/env node

import { readFileSync } from "node:fs";

const DEFAULT_RENDER_URL = "https://finance-ai-assistant-web.onrender.com";
const DEFAULT_INDEX_HTML_URL = new URL("../index.html", import.meta.url);
const DEFAULT_TIMEOUT_MS = 15000;

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
    fallbackReadyCount: callableFallbacks.length,
    fallbackConfiguredCount: configuredFallbacks.length,
    fallbackProviders: fallbackProviders.map((provider) => ({
      id: provider.id || "",
      label: provider.label || "",
      provider: provider.provider || "",
      modelId: provider.modelId || "",
      configured: provider.configured === true,
      supported: provider.supported !== false,
      canCallLiveModel: provider.canCallLiveModel === true,
      apiStyle: provider.apiStyle || "",
    })),
    guidance: aiRelayReady
      ? "AI 接力运行配置已在公开接口中显示为可调用；完整输出仍取决于 provider 额度、速率限制和结构化校验。"
      : "公开接口显示 AI 主模型和备用模型都不可调用；请在 Render Dashboard 填入模型密钥并重新部署。",
  };
}

function summarizeAnalysis(payload = {}, endpoint = {}) {
  const hasError = Boolean(payload.error);
  const analysisMode = payload.analysisMode || "";
  const modelIssue = payload.modelIssue || payload.error || null;
  const providerRelay = payload.providerRelay || null;
  const fullAiOutputReady =
    endpoint.ok &&
    !hasError &&
    analysisMode &&
    analysisMode !== "real-data-rule-reference" &&
    !modelIssue;
  return {
    ok: endpoint.ok,
    status: endpoint.status,
    analysisMode,
    fullAiOutputReady,
    modelIssueCode: modelIssue?.code || "",
    modelIssueMessage: modelIssue?.message || "",
    relayAttemptCount: Array.isArray(providerRelay?.attempts) ? providerRelay.attempts.length : 0,
    relayAttemptCodes: Array.isArray(providerRelay?.attempts)
      ? providerRelay.attempts.map((attempt) => attempt.code || attempt.finalReason || "").filter(Boolean)
      : [],
    guidance: fullAiOutputReady
      ? "完整真实 AI 已输出。"
      : analysisMode === "real-data-rule-reference"
        ? "当前线上分析仍是规则参考，不是完整真实 AI 深度分析。"
        : "当前线上未确认完整真实 AI 输出。",
  };
}

function buildNextSteps({ deployedLatest, ai, analysis }) {
  const nextSteps = [];
  if (!deployedLatest) {
    nextSteps.push("Render 线上仍不是本地最新版本；请触发 Render redeploy，或确认 autoDeploy 已生效。");
  }
  if (!ai.ok) {
    nextSteps.push("AI 接力不可调用；请在 Render Dashboard 添加模型密钥，保存后 redeploy。");
  }
  if (ai.ok && !analysis.fullAiOutputReady) {
    nextSteps.push("AI 接力配置可调用后，继续复测完整 AI 输出；若仍为规则参考，查看 provider 额度、429 冷却和结构化校验失败原因。");
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
        timeoutMs,
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
  const analysis = summarizeAnalysis(analysisPayload, summarizeEndpoint(analysisResult));
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
