import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStableHostingHandoff,
  buildStableHostingHandoffHtml,
} from "../scripts/stable-hosting-handoff.mjs";

const blueprint = {
  ok: true,
  serviceName: "finance-ai-assistant-web",
  serviceType: "web",
  runtime: "node",
  startCommand: "npm start",
  healthCheckPath: "/health",
  requiredEndpoints: ["/", "/health", "/api/health", "/api/analysis?symbol=MSFT&riskProfile=balanced"],
  requiredDashboardSecretKeys: ["FINANCE_AI_MODEL_API_KEY", "FINANCE_AI_MODEL_FALLBACK_API_KEY"],
  checks: [
    {
      id: "env-FINANCE_AI_PUBLIC_HOST",
      ok: true,
      details: { actual: "0.0.0.0", expected: "0.0.0.0" },
    },
    {
      id: "env-FINANCE_AI_MARKET_DATA_PROVIDER",
      ok: true,
      details: { actual: "multi-free", expected: "multi-free" },
    },
  ],
};

test("stable hosting handoff builds fixed-hosting checklist without secrets", () => {
  const handoff = buildStableHostingHandoff({
    blueprint,
    stableUrl: "",
    status: {
      ok: true,
      status: "healthy",
      publicUrl: "https://temporary.lhr.life",
      localFallbackUrl: "http://127.0.0.1:4192",
      localFallbackOk: true,
    },
  });

  assert.equal(handoff.status, "handoff-ready-needs-fixed-url");
  assert.equal(handoff.accessLevels[0].label, "固定线上测试环境");
  assert.equal(handoff.accessLevels[0].status, "missing");
  assert.equal(handoff.accessLevels[1].url, "https://temporary.lhr.life");
  assert.equal(handoff.accessLevels[2].status, "healthy");
  assert.equal(handoff.renderService.startCommand, "npm start");
  assert.equal(handoff.renderService.healthCheckPath, "/health");
  assert.deepEqual(
    handoff.renderService.dashboardSecrets.map((item) => item.key),
    ["FINANCE_AI_MODEL_API_KEY", "FINANCE_AI_MODEL_FALLBACK_API_KEY"],
  );
  assert.match(handoff.commands.stableUrlSmoke, /your-render-url\.onrender\.com/);
  assert.match(handoff.blockers.join(" "), /固定线上测试 URL/);
  assert.doesNotMatch(JSON.stringify(handoff), /sk-proj|sk-or-v1|gsk_|AQ\./);
});

test("stable hosting handoff uses supplied fixed URL for smoke command", () => {
  const handoff = buildStableHostingHandoff({
    blueprint,
    stableUrl: "https://finance-ai-test.onrender.com/",
    status: {
      ok: false,
      status: "missing",
      publicUrl: "",
      localFallbackUrl: "http://127.0.0.1:4192",
      localFallbackOk: null,
    },
  });

  assert.equal(handoff.status, "fixed-url-ready-for-smoke");
  assert.equal(handoff.accessLevels[0].url, "https://finance-ai-test.onrender.com");
  assert.equal(handoff.accessLevels[0].status, "configured-needs-smoke");
  assert.equal(
    handoff.commands.stableUrlSmoke,
    "FINANCE_AI_STABLE_PREVIEW_URL=https://finance-ai-test.onrender.com npm run check:stable-hosting",
  );
  assert.equal(handoff.acceptanceCriteria.durationSeconds, 180);
  assert.ok(handoff.acceptanceCriteria.endpoints.includes("/api/health"));
});

test("stable hosting handoff exposes standby links and temporary health evidence", () => {
  const handoff = buildStableHostingHandoff({
    blueprint,
    stableUrl: "",
    status: {
      ok: true,
      status: "checking",
      publicUrl: "https://primary.lhr.life",
      localFallbackUrl: "http://127.0.0.1:4192",
      localFallbackOk: true,
      healthWindowSeconds: 180,
      healthIterationCount: 9,
      transientFailureCount: 0,
      healthEndedAt: "2026-06-14T08:43:52.503Z",
      healthRequiredEndpoints: [
        "/",
        "/health",
        "/api/health",
        "/api/analysis?symbol=MSFT&riskProfile=balanced",
        "/api/stocks/search?q=Microsoft",
      ],
      standbyPublicUrls: [
        {
          url: "https://standby-a.lhr.life",
          status: "healthy",
          checkedAt: "2026-06-14T08:44:07.509Z",
          healthWindowSeconds: 15,
          healthIterationCount: 1,
          transientFailureCount: 0,
        },
        {
          url: "https://standby-b.lhr.life",
          status: "healthy",
          checkedAt: "2026-06-14T08:44:22.514Z",
          healthWindowSeconds: 15,
          healthIterationCount: 1,
          transientFailureCount: 0,
        },
      ],
      guidance: "上一轮公网入口连续健康检查已通过；正在进行下一轮监控。",
    },
  });
  const html = buildStableHostingHandoffHtml(handoff);

  assert.equal(handoff.standbyAccess.length, 2);
  assert.equal(handoff.standbyAccess[0].url, "https://standby-a.lhr.life");
  assert.equal(handoff.standbyAccess[0].healthy, true);
  assert.equal(handoff.temporaryHealthEvidence.continuousHealthPassed, true);
  assert.equal(handoff.temporaryHealthEvidence.healthWindowSeconds, 180);
  assert.equal(handoff.temporaryHealthEvidence.healthIterationCount, 9);
  assert.match(html, /备用入口 \/ Standby Links/);
  assert.match(html, /https:\/\/standby-a\.lhr\.life/);
  assert.match(html, /https:\/\/standby-b\.lhr\.life/);
  assert.match(html, /临时入口健康证据 \/ Temporary Health Evidence/);
  assert.match(html, /passed/);
  assert.match(html, /\/api\/stocks\/search\?q=Microsoft/);
  assert.doesNotMatch(html, /sk-proj|sk-or-v1|gsk_|AQ\./);
});

test("stable hosting handoff html is user-readable and contains no secrets", () => {
  const handoff = buildStableHostingHandoff({
    blueprint,
    stableUrl: "https://finance-ai-test.onrender.com",
    status: {
      ok: true,
      status: "healthy",
      publicUrl: "https://temporary.lhr.life",
      localFallbackUrl: "http://127.0.0.1:4192",
      localFallbackOk: true,
    },
  });
  const html = buildStableHostingHandoffHtml(handoff);

  assert.match(html, /固定托管交接包/);
  assert.match(html, /Stable Hosting Handoff/);
  assert.match(html, /https:\/\/finance-ai-test\.onrender\.com/);
  assert.match(html, /https:\/\/temporary\.lhr\.life/);
  assert.match(html, /FINANCE_AI_MODEL_API_KEY/);
  assert.match(html, /Render Dashboard/);
  assert.match(html, /2-3 分钟窗口|2-3 minute/);
  assert.match(html, /FINANCE_AI_STABLE_PREVIEW_URL=https:\/\/finance-ai-test\.onrender\.com npm run check:stable-hosting/);
  assert.doesNotMatch(html, /sk-proj|sk-or-v1|gsk_|AQ\./);
});
