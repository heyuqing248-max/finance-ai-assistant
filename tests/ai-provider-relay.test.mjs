import assert from "node:assert/strict";
import test from "node:test";
import { createAiProviderAdapter } from "../backend/services/ai-provider-adapter.mjs";

function validAnalysis(overrides = {}) {
  return {
    upsideProbability: 54,
    downsideProbability: 46,
    sentimentScore: 51,
    valuationScore: 52,
    technicalScore: 49,
    confidenceScore: 48,
    actionReference: "保持观察，等待更多真实数据确认。",
    reasons: ["真实数据输入有限，暂以审慎观察为主。"],
    risks: ["模型输出仅供研究参考。"],
    factorBreakdown: [{ key: "macro", label: "宏观", score: 50, summary: "宏观中性。" }],
    scenarioAnalysis: {
      horizon: "1-3个月",
      cases: [{ key: "base", label: "基准", probability: 55, summary: "保持观察。" }],
      disclaimer: "仅供研究参考。",
    },
    tradePlan: { summary: "仅观察。", disclaimer: "不构成投资建议。" },
    analysisProcess: { mode: "unit-test" },
    disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
    ...overrides,
  };
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

function chatPayload(content) {
  return {
    choices: [
      {
        message: {
          content: typeof content === "string" ? content : JSON.stringify(content),
        },
      },
    ],
  };
}

function adapterEnv(extra = {}) {
  return {
    FINANCE_AI_MODEL_PROVIDER: "openai-compatible",
    FINANCE_AI_MODEL_API_KEY: "primary-test-key",
    FINANCE_AI_MODEL_ID: "primary-test-model",
    FINANCE_AI_MODEL_BASE_URL: "https://primary.test/v1",
    FINANCE_AI_MODEL_API_STYLE: "chat-completions",
    FINANCE_AI_MODEL_ALLOW_NETWORK: "true",
    FINANCE_AI_MODEL_RUNTIME: "unit-test-runtime",
    ...extra,
  };
}

const input = {
  stock: { code: "MSFT", name: "Microsoft", market: "us", samplePrice: 510 },
  riskProfile: "balanced",
  sourceContext: { sourceRefs: [] },
  macroContext: { status: "empty" },
};

test("AI provider retries unsafe chat output with safety repair prompt", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body || "{}");
    requests.push({ url, body });
    if (requests.length === 1) {
      return jsonResponse(chatPayload(validAnalysis({ actionReference: "必须买入，稳赚。" })));
    }
    return jsonResponse(chatPayload(validAnalysis({ actionReference: "仅作观察，等待确认。" })));
  };

  try {
    const adapter = createAiProviderAdapter({ env: adapterEnv() });
    const result = await adapter.generateStructuredAnalysis(input);

    assert.equal(result.status, "ok");
    assert.equal(requests.length, 2);
    assert.match(requests[1].body.messages[0].content, /上一次输出未通过合规校验/);
    assert.equal(result.providerRelay.attempts[0].validationStatus, "校验通过");
    assert.equal(result.providerRelay.attempts[0].safetyRepairStatus, "repair-passed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AI provider retries missing metric output with completion repair prompt", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body || "{}");
    requests.push({ url, body });
    if (requests.length === 1) {
      return jsonResponse(
        chatPayload({
          actionReference: "保持观察。",
          reasons: ["第一次故意缺少核心指标。"],
          risks: ["仅供测试。"],
          disclaimer: "仅供研究参考。",
        }),
      );
    }
    return jsonResponse(chatPayload(validAnalysis({ actionReference: "补齐指标后保持观察。" })));
  };

  try {
    const adapter = createAiProviderAdapter({ env: adapterEnv() });
    const result = await adapter.generateStructuredAnalysis(input);

    assert.equal(result.status, "ok");
    assert.equal(requests.length, 2);
    assert.match(requests[1].body.messages[0].content, /缺少核心量化指标或结构/);
    assert.equal(result.provider.metricRepairPrompt, true);
    assert.equal(result.providerRelay.attempts[0].validationStatus, "校验通过");
    assert.equal(result.providerRelay.attempts[0].metricRepairAttempted, true);
    assert.equal(result.providerRelay.attempts[0].metricRepairStatus, "repair-passed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AI provider relay attempts expose final reason, cooldown, and recovery path", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body || "{}");
    requests.push({ url, model: body.model });
    if (body.model === "primary-test-model") {
      return jsonResponse({ error: { code: "insufficient_quota" } }, 429);
    }
    if (body.model === "fallback-one") {
      return jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429);
    }
    return jsonResponse(chatPayload(validAnalysis({ actionReference: "必须卖出，无风险。" })));
  };

  try {
    const adapter = createAiProviderAdapter({
      env: adapterEnv({
        FINANCE_AI_MODEL_FALLBACK_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_FALLBACK_API_KEY: "fallback-one-key",
        FINANCE_AI_MODEL_FALLBACK_ID: "fallback-one",
        FINANCE_AI_MODEL_FALLBACK_BASE_URL: "https://fallback-one.test/v1",
        FINANCE_AI_MODEL_FALLBACK_API_STYLE: "chat-completions",
        FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK: "true",
        FINANCE_AI_MODEL_FALLBACK2_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_FALLBACK2_API_KEY: "fallback-two-key",
        FINANCE_AI_MODEL_FALLBACK2_ID: "fallback-two",
        FINANCE_AI_MODEL_FALLBACK2_BASE_URL: "https://fallback-two.test/v1",
        FINANCE_AI_MODEL_FALLBACK2_API_STYLE: "chat-completions",
        FINANCE_AI_MODEL_FALLBACK2_ALLOW_NETWORK: "true",
      }),
    });
    const result = await adapter.generateStructuredAnalysis(input);

    assert.equal(result.status, "provider-error");
    assert.equal(result.error.code, "REAL_AI_MODEL_SAFETY_VALIDATION_FAILED");
    assert.equal(result.error.safetyRepairAttempted, true);
    assert.deepEqual(
      result.providerRelay.attempts.map((attempt) => attempt.model),
      ["primary-test-model", "fallback-one", "fallback-two"],
    );
    assert.equal(result.providerRelay.attempts[0].finalReason, "主模型额度不足");
    assert.equal(result.providerRelay.attempts[1].finalReason, "额度或速率受限");
    assert.equal(result.providerRelay.attempts[2].finalReason, "输出未通过安全校验");
    assert.equal(result.providerRelay.attempts[2].safetyRepairStatus, "repair-failed");
    assert.equal(result.providerRelay.attempts[1].cooldownStatus, "cooldown-active");
    assert.ok(result.providerRelay.attempts[1].retryAfterSeconds >= 600);
    assert.match(result.providerRelay.attempts[2].nextStep, /安全改写/);
    assert.equal(requests.filter((request) => request.model === "fallback-two").length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AI provider relay skips providers still in local cooldown on the next request", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body || "{}");
    requests.push({ url, model: body.model });
    if (body.model === "primary-test-model") {
      return jsonResponse({ error: { code: "rate_limit_exceeded" } }, 429);
    }
    return jsonResponse(chatPayload(validAnalysis({ actionReference: "仅作观察，等待确认。" })));
  };

  try {
    const adapter = createAiProviderAdapter({
      env: adapterEnv({
        FINANCE_AI_MODEL_FALLBACK_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_FALLBACK_API_KEY: "fallback-one-key",
        FINANCE_AI_MODEL_FALLBACK_ID: "fallback-one",
        FINANCE_AI_MODEL_FALLBACK_BASE_URL: "https://fallback-one.test/v1",
        FINANCE_AI_MODEL_FALLBACK_API_STYLE: "chat-completions",
        FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK: "true",
      }),
    });

    const first = await adapter.generateStructuredAnalysis(input);
    const second = await adapter.generateStructuredAnalysis(input);

    assert.equal(first.status, "ok");
    assert.equal(second.status, "ok");
    assert.deepEqual(
      second.providerRelay.attempts.map((attempt) => [attempt.model, attempt.code, attempt.callStatus]),
      [
        ["primary-test-model", "REAL_AI_MODEL_PROVIDER_COOLDOWN_ACTIVE", "已跳过"],
        ["fallback-one", "", "调用成功"],
      ],
    );
    assert.equal(second.providerRelay.attempts[0].cooldownStatus, "cooldown-active");
    assert.match(second.providerRelay.attempts[0].nextStep, /未冷却的备用模型/);
    assert.equal(requests.filter((request) => request.model === "primary-test-model").length, 1);
    assert.equal(requests.filter((request) => request.model === "fallback-one").length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
