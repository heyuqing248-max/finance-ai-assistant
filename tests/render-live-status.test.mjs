import test from "node:test";
import assert from "node:assert/strict";

import { buildRenderLiveStatus } from "../scripts/render-live-status.mjs";

function response(status, body, headers = {}) {
  return {
    status,
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
    headers,
  };
}

function createFetch(routes) {
  return async (url) => {
    const parsed = new URL(url);
    const key = `${parsed.pathname}${parsed.search}`;
    if (!routes[key]) {
      return response(404, { error: { code: "NOT_FOUND" } });
    }
    return routes[key];
  };
}

const healthyBaseRoutes = {
  "/health": response(200, { ok: true }),
  "/api/health": response(200, { ok: true }),
  "/api/project/progress": response(200, {
    progress: {
      updatedAt: "2026-06-14",
      completed: ["后端 API、生产门禁规划、475 条自动化回归目标"],
    },
  }),
};

test("render live status reports stale live bundle when Render has not redeployed", async () => {
  const status = await buildRenderLiveStatus({
    stableUrl: "https://finance-ai-assistant-web.onrender.com",
    expectedAppVersion: 111,
    fetchImpl: createFetch({
      "/": response(200, '<script src="./app.js?v=107"></script>'),
      ...healthyBaseRoutes,
      "/api/ai-services/provider-adapter": response(200, {
        providerAdapter: {
          status: "ready-for-local-real-model",
          runtimeMode: "render-smoke",
          configured: true,
          networkEnabled: true,
          canCallLiveModel: true,
          fallbackModelProviders: [],
        },
      }),
      "/api/analysis?symbol=MSFT&riskProfile=balanced": response(200, {
        analysisMode: "real-data-rule-reference",
        modelIssue: { code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA" },
      }),
    }),
  });

  assert.equal(status.ok, false);
  assert.equal(status.liveAppVersion, 107);
  assert.equal(status.expectedAppVersion, 111);
  assert.equal(status.deployedLatest, false);
  assert.match(status.nextSteps.join(" "), /Render 线上仍不是本地最新版本/);
});

test("render live status accepts fallback-only AI relay when primary key is missing", async () => {
  const status = await buildRenderLiveStatus({
    stableUrl: "https://finance-ai-assistant-web.onrender.com",
    expectedAppVersion: 111,
    fetchImpl: createFetch({
      "/": response(200, '<script src="./app.js?v=123"></script>'),
      ...healthyBaseRoutes,
      "/api/ai-services/provider-adapter": response(200, {
        providerAdapter: {
          status: "ready-for-local-real-model",
          runtimeMode: "render-smoke",
          selectedProvider: "openai-compatible",
          selectedModel: "gpt-5.5",
          configured: false,
          networkEnabled: true,
          canCallLiveModel: true,
          missingEnvVars: ["FINANCE_AI_MODEL_API_KEY"],
          fallbackModelProviders: [
            {
              id: "fallback",
              label: "Gemini 备用模型",
              provider: "openai-compatible",
              modelId: "gemini-2.5-flash",
              configured: true,
              supported: true,
              canCallLiveModel: true,
              apiStyle: "chat-completions",
            },
          ],
        },
      }),
      "/api/analysis?symbol=MSFT&riskProfile=balanced": response(200, {
        analysisMode: "real-data-rule-reference",
        modelIssue: { code: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA" },
      }),
    }),
  });

  assert.equal(status.ok, true);
  assert.equal(status.deployedLatest, true);
  assert.equal(status.ai.ok, true);
  assert.equal(status.ai.fallbackReadyCount, 1);
  assert.equal(status.ai.missingEnvVars.includes("FINANCE_AI_MODEL_API_KEY"), true);
  assert.deepEqual(status.ai.fallbackProviders[0].missingEnvVars, []);
  assert.equal(status.analysis.fullAiOutputReady, false);
  assert.match(status.nextSteps.join(" "), /继续复测完整 AI 输出/);
});

test("render live status allows a longer timeout for analysis smoke", async () => {
  const status = await buildRenderLiveStatus({
    stableUrl: "https://finance-ai-assistant-web.onrender.com",
    expectedAppVersion: 115,
    timeoutMs: 1,
    analysisTimeoutMs: 50,
    fetchImpl: async (url, options = {}) => {
      const parsed = new URL(url);
      if (parsed.pathname === "/api/analysis") {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 10);
          options.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
        return response(200, {
          analysisMode: "real-provider",
          analysisService: { mode: "real-provider", model: "test-model" },
          factorBreakdown: [],
          scenarioAnalysis: { cases: [] },
        });
      }
      return createFetch({
        "/": response(200, '<script src="./app.js?v=123"></script>'),
        ...healthyBaseRoutes,
        "/api/ai-services/provider-adapter": response(200, {
          providerAdapter: {
            status: "ready-for-local-real-model",
            runtimeMode: "render-smoke",
            configured: true,
            networkEnabled: true,
            canCallLiveModel: true,
            fallbackModelProviders: [],
          },
        }),
      })(url);
    },
  });

  assert.equal(status.endpoints.analysisMsft.ok, true);
  assert.equal(status.analysis.fullAiOutputReady, true);
  assert.equal(status.ok, true);
});

test("render live status accepts full AI success when analysisMode is omitted", async () => {
  const status = await buildRenderLiveStatus({
    stableUrl: "https://finance-ai-assistant-web.onrender.com",
    expectedAppVersion: 119,
    fetchImpl: createFetch({
      "/": response(200, '<script src="./app.js?v=123"></script>'),
      ...healthyBaseRoutes,
      "/api/ai-services/provider-adapter": response(200, {
        providerAdapter: {
          status: "ready-for-local-real-model",
          runtimeMode: "render-smoke",
          configured: true,
          networkEnabled: true,
          canCallLiveModel: true,
          fallbackModelProviders: [
            { id: "fallback3-alt1", modelId: "openai/gpt-oss-120b", configured: true, canCallLiveModel: true },
          ],
        },
      }),
      "/api/analysis?symbol=MSFT&riskProfile=balanced": response(200, {
        analysisService: { mode: "real-provider", model: "openai/gpt-oss-120b" },
        providerRelay: {
          used: "openai/gpt-oss-120b",
          attempts: [
            {
              role: "主模型",
              model: "gpt-5.5",
              code: "REAL_AI_MODEL_INSUFFICIENT_QUOTA",
              finalReason: "主模型额度不足",
              callStatus: "调用失败",
              outputStatus: "无输出",
              validationStatus: "未进入校验",
              cooldownStatus: "cooldown-active",
              retryable: true,
              retryAfterSeconds: 3600,
              retryAt: "2026-06-14T17:45:43.876Z",
            },
            {
              role: "备用 4",
              model: "openai/gpt-oss-120b",
              finalReason: "完整 AI 分析已生成",
              callStatus: "调用成功",
              outputStatus: "完整 AI 输出可用",
              validationStatus: "校验通过",
              cooldownStatus: "not-required",
            },
          ],
        },
      }),
    }),
  });

  assert.equal(status.analysis.analysisMode, "real-provider");
  assert.equal(status.analysis.analysisServiceMode, "real-provider");
  assert.equal(status.analysis.fullAiOutputReady, true);
  assert.equal(status.analysis.successfulRelayModel, "openai/gpt-oss-120b");
  assert.match(status.analysis.guidance, /完整真实 AI 已输出/);
  assert.deepEqual(status.nextSteps, ["固定网址版本、接口和完整 AI 输出均通过本轮检查。"]);
});

test("render live status reports provider cooldown retry windows", async () => {
  const status = await buildRenderLiveStatus({
    stableUrl: "https://finance-ai-assistant-web.onrender.com",
    expectedAppVersion: 115,
    fetchImpl: createFetch({
      "/": response(200, '<script src="./app.js?v=123"></script>'),
      ...healthyBaseRoutes,
      "/api/ai-services/provider-adapter": response(200, {
        providerAdapter: {
          status: "ready-for-local-real-model",
          runtimeMode: "render-smoke",
          configured: true,
          networkEnabled: true,
          canCallLiveModel: true,
          fallbackModelProviders: [
            { id: "fallback", modelId: "gemini-2.5-flash", configured: true, canCallLiveModel: true },
            { id: "fallback2", modelId: "qwen/qwen3-next-80b-a3b-instruct:free", configured: true, canCallLiveModel: true },
          ],
        },
      }),
      "/api/analysis?symbol=MSFT&riskProfile=balanced": response(200, {
        analysisMode: "real-data-rule-reference",
        modelIssue: {
          code: "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE",
          message: "所有 provider 冷却中。",
        },
        providerRelay: {
          attempts: [
            {
              role: "主模型",
              model: "gpt-5.5",
              code: "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE",
              callStatus: "已跳过",
              outputStatus: "冷却中未请求",
              validationStatus: "未进入校验",
              finalReason: "Provider 冷却中",
              retryable: true,
              retryAfterSeconds: 3600,
              failedAt: "2026-06-14T16:31:49.000Z",
              retryAt: "2026-06-14T17:31:49.000Z",
              cooldownStatus: "cooldown-active",
              nextStep: "等待建议重试时间。",
            },
            {
              role: "备用 1",
              model: "gemini-2.5-flash",
              code: "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE",
              callStatus: "已跳过",
              outputStatus: "冷却中未请求",
              validationStatus: "未进入校验",
              finalReason: "Provider 冷却中",
              retryable: true,
              retryAfterSeconds: 540,
              failedAt: "2026-06-14T16:31:49.000Z",
              retryAt: "2026-06-14T16:40:49.000Z",
              cooldownStatus: "cooldown-active",
              nextStep: "等待建议重试时间。",
            },
            {
              role: "备用 2",
              model: "qwen/qwen3-next-80b-a3b-instruct:free",
              code: "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE",
              callStatus: "已跳过",
              outputStatus: "冷却中未请求",
              validationStatus: "未进入校验",
              finalReason: "Provider 冷却中",
              retryable: true,
              retryAfterSeconds: 600,
              failedAt: "2026-06-14T16:31:49.000Z",
              retryAt: "2026-06-14T16:41:49.000Z",
              cooldownStatus: "cooldown-active",
              nextStep: "等待建议重试时间。",
            },
          ],
        },
      }),
    }),
  });

  assert.equal(status.analysis.fullAiOutputReady, false);
  assert.equal(status.analysis.successfulRelayModel, "");
  assert.equal(status.analysis.cooldown.cooldownActive, true);
  assert.equal(status.analysis.cooldown.cooldownAttemptCount, 3);
  assert.equal(status.analysis.cooldown.soonestRetryAt, "2026-06-14T16:40:49.000Z");
  assert.equal(status.analysis.cooldown.maxRetryAfterSeconds, 3600);
  assert.equal(status.analysis.cooldown.immediateFallbackAvailable, false);
  assert.match(status.analysis.cooldown.guidance, /建议等到最早重试时间/);
  assert.match(status.nextSteps.join(" "), /最早建议重试时间：2026-06-14T16:40:49\.000Z/);
  assert.match(status.nextSteps.join(" "), /当前没有未冷却备用模型可立即继续检查/);
  assert.deepEqual(
    status.analysis.relayAttempts.map((attempt) => [
      attempt.role,
      attempt.model,
      attempt.callStatus,
      attempt.outputStatus,
      attempt.validationStatus,
    ]),
    [
      ["主模型", "gpt-5.5", "已跳过", "冷却中未请求", "未进入校验"],
      ["备用 1", "gemini-2.5-flash", "已跳过", "冷却中未请求", "未进入校验"],
      ["备用 2", "qwen/qwen3-next-80b-a3b-instruct:free", "已跳过", "冷却中未请求", "未进入校验"],
    ],
  );
});

test("render live status reports when an uncooldown fallback remains available", async () => {
  const status = await buildRenderLiveStatus({
    stableUrl: "https://finance-ai-assistant-web.onrender.com",
    expectedAppVersion: 115,
    fetchImpl: createFetch({
      "/": response(200, '<script src="./app.js?v=123"></script>'),
      ...healthyBaseRoutes,
      "/api/ai-services/provider-adapter": response(200, {
        providerAdapter: {
          status: "ready-for-local-real-model",
          runtimeMode: "render-smoke",
          configured: true,
          networkEnabled: true,
          canCallLiveModel: true,
          fallbackModelProviders: [
            { id: "fallback", modelId: "gemini-2.5-flash", configured: true, canCallLiveModel: true },
            { id: "fallback2", modelId: "openai/gpt-oss-120b", configured: true, canCallLiveModel: true },
          ],
        },
      }),
      "/api/analysis?symbol=MSFT&riskProfile=balanced": response(200, {
        analysisMode: "real-data-rule-reference",
        modelIssue: { code: "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE" },
        providerRelay: {
          attempts: [
            {
              role: "备用 1",
              model: "gemini-2.5-flash",
              code: "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE",
              retryAt: "2026-06-14T16:40:49.000Z",
              cooldownStatus: "cooldown-active",
              retryable: true,
            },
          ],
        },
      }),
    }),
  });

  assert.equal(status.analysis.cooldown.cooldownActive, true);
  assert.equal(status.analysis.cooldown.immediateFallbackAvailable, true);
  assert.match(status.analysis.cooldown.guidance, /仍有未冷却备用模型可继续尝试/);
});

test("render live status blocks when all AI relay keys are missing", async () => {
  const status = await buildRenderLiveStatus({
    stableUrl: "https://finance-ai-assistant-web.onrender.com",
    expectedAppVersion: 111,
    fetchImpl: createFetch({
      "/": response(200, '<script src="./app.js?v=123"></script>'),
      ...healthyBaseRoutes,
      "/api/ai-services/provider-adapter": response(200, {
        providerAdapter: {
          status: "blocked",
          runtimeMode: "inactive",
          configured: false,
          networkEnabled: false,
          canCallLiveModel: false,
          missingEnvVars: [
            "FINANCE_AI_MODEL_PROVIDER",
            "FINANCE_AI_MODEL_API_KEY",
            "FINANCE_AI_MODEL_ID",
          ],
          fallbackModelProviders: [
            {
              id: "fallback",
              configured: false,
              canCallLiveModel: false,
            },
          ],
        },
      }),
      "/api/analysis?symbol=MSFT&riskProfile=balanced": response(424, {
        error: { code: "REAL_AI_MODEL_NOT_CONFIGURED" },
      }),
    }),
  });

  assert.equal(status.ok, false);
  assert.equal(status.deployedLatest, true);
  assert.equal(status.ai.ok, false);
  assert.equal(status.ai.fallbackReadyCount, 0);
  assert.ok(status.ai.missingDashboardSecretKeys.includes("FINANCE_AI_MODEL_API_KEY"));
  assert.ok(status.ai.missingDashboardSecretKeys.includes("FINANCE_AI_MODEL_FALLBACK_API_KEY"));
  assert.ok(status.ai.fallbackProviders[0].setupStatus.includes("FINANCE_AI_MODEL_FALLBACK_API_KEY"));
  assert.match(status.nextSteps.join(" "), /AI 接力不可调用/);
});
