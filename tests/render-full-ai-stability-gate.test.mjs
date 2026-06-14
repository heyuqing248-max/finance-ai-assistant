import test from "node:test";
import assert from "node:assert/strict";

import { runFullAiStabilityGate } from "../scripts/render-full-ai-stability-gate.mjs";

function status(overrides = {}) {
  return {
    ok: true,
    deployedLatest: true,
    liveAppVersion: 123,
    expectedAppVersion: 123,
    endpoints: {
      home: { ok: true },
      health: { ok: true },
      apiHealth: { ok: true },
      projectProgress: { ok: true },
      aiProviderAdapter: { ok: true },
      analysisMsft: { ok: true },
    },
    analysis: {
      analysisMode: "real-provider",
      fullAiOutputReady: true,
      successfulRelayModel: "openai/gpt-oss-120b",
      guidance: "完整真实 AI 已输出。",
      cooldown: {
        cooldownActive: false,
        soonestRetryAt: "",
        immediateFallbackAvailable: false,
      },
    },
    nextSteps: ["固定网址版本、接口和完整 AI 输出均通过本轮检查。"],
    ...overrides,
  };
}

test("full AI stability gate passes only when every run returns full AI", async () => {
  const result = await runFullAiStabilityGate({
    attempts: 3,
    skipWait: true,
    statusBuilder: async () => status(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.fullAiStable, true);
  assert.equal(result.requiredAttempts, 3);
  assert.equal(result.passedAttempts, 3);
  assert.equal(result.failedAttempts, 0);
  assert.equal(result.runs[0].endpoints.health.status, 0);
  assert.match(result.nextStep, /连续通过/);
});

test("full AI stability gate fails when one run falls back to rule reference", async () => {
  let callCount = 0;
  const result = await runFullAiStabilityGate({
    attempts: 3,
    skipWait: true,
    statusBuilder: async () => {
      callCount += 1;
      if (callCount === 2) {
        return status({
          analysis: {
            analysisMode: "real-data-rule-reference",
            fullAiOutputReady: false,
            successfulRelayModel: "",
            modelIssueCode: "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA",
            guidance: "当前线上分析是规则参考；完整 AI 因 provider 冷却/限流暂不可用。",
            cooldown: {
              cooldownActive: true,
              soonestRetryAt: "2026-06-15T12:30:00.000Z",
              immediateFallbackAvailable: false,
            },
          },
          nextSteps: ["最早建议重试时间：2026-06-15T12:30:00.000Z。当前没有未冷却备用模型可立即继续检查。"],
        });
      }
      return status();
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.fullAiStable, false);
  assert.equal(result.passedAttempts, 2);
  assert.equal(result.failedAttempts, 1);
  assert.equal(result.firstFailure.attempt, 2);
  assert.equal(result.soonestRetryAt, "2026-06-15T12:30:00.000Z");
  assert.match(result.nextStep, /provider 正在冷却或限流/);
});

test("full AI stability gate includes endpoint status diagnostics", async () => {
  const result = await runFullAiStabilityGate({
    attempts: 1,
    skipWait: true,
    statusBuilder: async () =>
      status({
        ok: false,
        endpoints: {
          home: { ok: false, status: 503, durationMs: 15, error: "" },
          health: { ok: true, status: 200, durationMs: 10, error: "" },
          analysisMsft: { ok: false, status: 0, durationMs: 60000, error: "timeout" },
        },
        analysis: {
          analysisMode: "",
          fullAiOutputReady: false,
          guidance: "当前线上未确认完整真实 AI 输出。",
          cooldown: {},
        },
      }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.firstFailure.endpoints.home.status, 503);
  assert.equal(result.firstFailure.endpoints.analysisMsft.error, "timeout");
});
