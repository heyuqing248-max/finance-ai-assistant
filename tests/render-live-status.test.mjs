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
      completed: ["后端 API、生产门禁规划、454 条自动化回归目标"],
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
      "/": response(200, '<script src="./app.js?v=113"></script>'),
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

test("render live status blocks when all AI relay keys are missing", async () => {
  const status = await buildRenderLiveStatus({
    stableUrl: "https://finance-ai-assistant-web.onrender.com",
    expectedAppVersion: 111,
    fetchImpl: createFetch({
      "/": response(200, '<script src="./app.js?v=113"></script>'),
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
