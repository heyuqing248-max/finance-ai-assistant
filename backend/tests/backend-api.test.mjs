import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMockReminderJobRunner } from "../jobs/mock-reminder-job-runner.mjs";
import { createMockSchedulerService } from "../jobs/mock-scheduler-service.mjs";
import { createSchedulerProviderAdapter } from "../jobs/scheduler-provider-adapter.mjs";
import { createMacroDataProviderAdapter } from "../providers/macro-data-provider.mjs";
import {
  createMarketDataProviderAdapter,
  mapAlphaVantageSymbol,
  mapTencentQuoteSymbol,
  mapTwelveDataSymbol,
  mapYahooFinanceSymbol,
  parseAlphaVantageGlobalQuote,
  parseTencentQuoteText,
  parseYahooFinanceChartHistory,
  parseTwelveDataQuote,
  parseYahooFinanceChartQuote,
} from "../providers/market-data-provider.mjs";
import { createMockProvider } from "../providers/mock-provider.mjs";
import {
  createNewsFilingsProviderAdapter,
  parseAlphaVantageNewsSentiment,
  parseGdeltDocNews,
  parseGoogleNewsRss,
  parseHkexCompanyAnnouncements,
  parseHkexStockSearchJsonp,
  parseYahooFinanceRss,
  parseSecCompanySubmissions,
  parseSseCompanyBulletins,
} from "../providers/news-filings-provider.mjs";
import { createMockRepository } from "../repositories/mock-repository.mjs";
import { validateRepositoryContract } from "../repositories/repository-contract.mjs";
import {
  createMockState as createStoredMockState,
  loadStateFromFile as loadStoredStateFromFile,
  persistState,
  serializeState,
} from "../repositories/mock-state-store.mjs";
import { createAiProviderAdapter } from "../services/ai-provider-adapter.mjs";
import { createMockAiService } from "../services/mock-ai-service.mjs";
import { createAuthProviderAdapter } from "../services/auth-provider-adapter.mjs";
import {
  auditExportSigningPolicy,
  createMockAuditService,
  redactAuditMetadata,
  rechainAuditEvents,
  verifyAuditExportPackageSignature,
  verifyAuditChain,
} from "../services/mock-audit-service.mjs";
import { createComplianceService, evaluateComplianceGate } from "../services/compliance-service.mjs";
import { createMockDatabaseService } from "../services/mock-database-service.mjs";
import { createMockMarketDataRuntime } from "../services/mock-market-data-runtime.mjs";
import { createMockNewsIngestionRuntime } from "../services/mock-news-ingestion-runtime.mjs";
import { createMockNotificationService } from "../services/mock-notification-service.mjs";
import { createNotificationProviderAdapter } from "../services/notification-provider-adapter.mjs";
import { createProductionDatabaseAdapter } from "../services/production-database-adapter.mjs";
import {
  createAutoIngestionTimeoutPayload,
  createMockState,
  handleMockRequest,
  loadStateFromFile,
} from "../server.mjs";
import { stocks } from "../mock-data.mjs";

async function requestMock(path, options = {}, state = createMockState()) {
  return handleMockRequest(
    {
      method: options.method || "GET",
      url: path,
      headers: options.headers || {},
      body: options.body || {},
    },
    state,
  );
}

function workerSignature(secret, { operation, workerId, timestamp }) {
  return createHmac("sha256", secret)
    .update(`${operation}:${workerId}:${timestamp}`)
    .digest("hex");
}

test("health and markets endpoints respond", async () => {
  const health = await requestMock("/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.status, "ok");

  const apiHealth = await requestMock("/api/health");
  assert.equal(apiHealth.status, 200);
  assert.deepEqual(apiHealth.body, health.body);

  const markets = await requestMock("/api/markets");
  assert.equal(markets.status, 200);
  assert.deepEqual(
    markets.body.markets.map((market) => market.id),
    ["a", "hk", "us"],
  );
});

test("public preview access status reports current temporary URL and fallback plan", async () => {
  const dir = await mkdtemp(join(tmpdir(), "finance-ai-public-preview-"));
  const statusFile = join(dir, "status.json");
  await writeFile(
    statusFile,
    JSON.stringify({
      status: "healthy",
      publicUrl: "https://fresh-demo.lhr.life",
      localFallbackUrl: "http://127.0.0.1:4192",
      updatedAt: new Date().toISOString(),
      healthCycleCount: 3,
      healthWindowMs: 180000,
      healthIntervalMs: 15000,
      healthRequiredEndpoints: [
        "/",
        "/health",
        "/api/health",
        "/api/analysis?symbol=MSFT&riskProfile=balanced",
        "/api/stocks/search?q=Microsoft",
      ],
      healthIterationCount: 8,
      healthStartedAt: "2026-06-14T02:00:00.000Z",
      healthEndedAt: "2026-06-14T02:03:00.000Z",
      restartCount: 1,
      standbyPublicUrls: [
        {
          url: "https://standby-demo.lhr.life",
          status: "healthy",
          role: "standby",
          checkedAt: "2026-06-14T02:02:30.000Z",
          healthWindowMs: 15000,
          healthIterationCount: 1,
          localFallbackOk: true,
        },
      ],
      transientFailureCount: 0,
      localFallbackOk: true,
    }),
  );
  const previousStatusFile = process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE;
  const previousStableUrl = process.env.FINANCE_AI_STABLE_PUBLIC_URL;
  process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE = statusFile;
  delete process.env.FINANCE_AI_STABLE_PUBLIC_URL;
  try {
    const response = await requestMock("/api/public-preview/access-status", {
      headers: { host: "fresh-demo.lhr.life", "x-forwarded-proto": "https" },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.publicPreviewAccess.status, "healthy");
    assert.equal(response.body.publicPreviewAccess.recommendedAccess.mode, "public");
    assert.equal(response.body.publicPreviewAccess.recommendedAccess.url, "https://fresh-demo.lhr.life");
    assert.deepEqual(
      response.body.publicPreviewAccess.accessEntries.map((entry) => [entry.id, entry.status, entry.available]),
      [
        ["fixed-hosting", "missing", false],
        ["temporary-public", "ready-temporary", true],
        ["standby-public-1", "ready-standby", true],
        ["local-fallback", "healthy", true],
      ],
    );
    assert.equal(response.body.publicPreviewAccess.temporaryTunnel.enabled, true);
    assert.match(response.body.publicPreviewAccess.temporaryTunnel.warning, /no tunnel here/);
    assert.equal(response.body.publicPreviewAccess.localFallback.url, "http://127.0.0.1:4192");
    assert.equal(response.body.publicPreviewAccess.stableHosting.configured, false);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.externalUseReady, false);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.temporaryAccessReady, true);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.temporaryAccessContinuouslyReady, true);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.standbyReadyCount, 1);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.standbyRequirementPassed, true);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.continuousHealthPassed, true);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.monitorWindowSeconds, 180);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.monitorIterationCount, 8);
    assert.equal(response.body.publicPreviewAccess.healthGate.lastWindowSeconds, 180);
    assert.equal(response.body.publicPreviewAccess.healthGate.lastIterationCount, 8);
    assert.equal(response.body.publicPreviewAccess.healthGate.requiredEndpointCoverage, true);
    assert.equal(response.body.publicPreviewAccess.healthGate.standbyReadyCount, 1);
    assert.equal(response.body.publicPreviewAccess.healthGate.standbyRequirementPassed, true);
    assert.match(response.body.publicPreviewAccess.stabilityGate.userMessage, /临时测试入口/);
    assert.deepEqual(response.body.publicPreviewAccess.healthGate.requiredEndpoints.slice(0, 3), [
      "/",
      "/health",
      "/api/health",
    ]);
  } finally {
    if (previousStatusFile === undefined) {
      delete process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE;
    } else {
      process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE = previousStatusFile;
    }
    if (previousStableUrl === undefined) {
      delete process.env.FINANCE_AI_STABLE_PUBLIC_URL;
    } else {
      process.env.FINANCE_AI_STABLE_PUBLIC_URL = previousStableUrl;
    }
  }
});

test("public preview access status treats current public origin as reachable before watchdog is healthy", async () => {
  const dir = await mkdtemp(join(tmpdir(), "finance-ai-public-preview-"));
  const statusFile = join(dir, "status.json");
  await writeFile(
    statusFile,
    JSON.stringify({
      status: "ready",
      publicUrl: "https://pending-demo.lhr.life",
      localFallbackUrl: "http://127.0.0.1:4192",
      updatedAt: new Date().toISOString(),
      healthCycleCount: 0,
      restartCount: 1,
    }),
  );
  const previousStatusFile = process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE;
  process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE = statusFile;
  try {
    const response = await requestMock("/api/public-preview/access-status", {
      headers: { host: "pending-demo.lhr.life", "x-forwarded-proto": "https" },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.publicPreviewAccess.status, "reachable-unverified");
    assert.equal(response.body.publicPreviewAccess.recommendedAccess.mode, "public");
    assert.equal(response.body.publicPreviewAccess.recommendedAccess.url, "https://pending-demo.lhr.life");
    assert.match(response.body.publicPreviewAccess.recommendedAccess.reason, /watchdog/);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.externalUseReady, false);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.temporaryAccessReady, true);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.temporaryAccessContinuouslyReady, false);
    assert.equal(response.body.publicPreviewAccess.stabilityGate.standbyRequirementPassed, false);
    assert.match(response.body.publicPreviewAccess.nextSteps.join(" "), /短时间测试可使用当前公网入口/);
    assert.doesNotMatch(response.body.publicPreviewAccess.nextSteps.join(" "), /使用本机备用入口继续排查/);
  } finally {
    if (previousStatusFile === undefined) {
      delete process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE;
    } else {
      process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE = previousStatusFile;
    }
  }
});

test("public preview access status exposes active watchdog health gate checking state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "finance-ai-public-preview-"));
  const statusFile = join(dir, "status.json");
  await writeFile(
    statusFile,
    JSON.stringify({
      status: "checking",
      publicUrl: "https://checking-demo.lhr.life",
      localFallbackUrl: "http://127.0.0.1:4192",
      updatedAt: new Date().toISOString(),
      healthCycleCount: 1,
      healthWindowMs: 180000,
      healthIntervalMs: 15000,
      healthTimeoutMs: 15000,
      healthRequiredEndpoints: [
        "/",
        "/health",
        "/api/health",
        "/api/analysis?symbol=MSFT&riskProfile=balanced",
        "/api/stocks/search?q=Microsoft",
      ],
      localFallbackOk: null,
      guidance: "正在进行公网入口连续健康检查。",
    }),
  );
  const previousStatusFile = process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE;
  process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE = statusFile;
  try {
    const response = await requestMock("/api/public-preview/access-status", {
      headers: { host: "checking-demo.lhr.life", "x-forwarded-proto": "https" },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.publicPreviewAccess.status, "checking");
    assert.equal(response.body.publicPreviewAccess.accessEntries[1].status, "checking");
    assert.match(response.body.publicPreviewAccess.accessEntries[1].nextStep, /连续健康检查/);
    const localFallbackEntry = response.body.publicPreviewAccess.accessEntries.find(
      (entry) => entry.id === "local-fallback",
    );
    assert.equal(localFallbackEntry.status, "unknown");
    assert.equal(response.body.publicPreviewAccess.localFallback.status, "unknown");
    assert.equal(response.body.publicPreviewAccess.stabilityGate.continuousHealthPassed, false);
  } finally {
    if (previousStatusFile === undefined) {
      delete process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE;
    } else {
      process.env.FINANCE_AI_PUBLIC_PREVIEW_STATUS_FILE = previousStatusFile;
    }
  }
});

test("data-source endpoint reports active provider capabilities", async () => {
  const sources = await requestMock("/api/data-sources");
  assert.equal(sources.status, 200);
  assert.equal(sources.body.activeProvider.id, "mock");
  assert.equal(sources.body.activeProvider.mode, "sample");
  assert.deepEqual(sources.body.activeProvider.coverage, ["a", "hk", "us"]);
  assert.ok(sources.body.activeProvider.capabilities.includes("marketNews"));
  assert.ok(sources.body.activeProvider.capabilities.includes("integrationPlan"));
  assert.ok(sources.body.activeProvider.capabilities.includes("providerRegistry"));
  assert.ok(sources.body.activeProvider.capabilities.includes("vendorReadinessChecklist"));
  assert.ok(sources.body.activeProvider.capabilities.includes("providerSetupGuide"));
  assert.ok(sources.body.activeProvider.capabilities.includes("marketDataVendorChecklist"));
  assert.ok(sources.body.activeProvider.capabilities.includes("newsFilingsVendorChecklist"));
  assert.ok(sources.body.activeProvider.capabilities.includes("macroDataVendorChecklist"));
  assert.ok(sources.body.activeProvider.capabilities.includes("publicStatementsVendorChecklist"));
  assert.ok(sources.body.activeProvider.capabilities.includes("marketDataAdapter"));
  assert.ok(sources.body.activeProvider.capabilities.includes("fixtureMarketDataRead"));
  assert.ok(sources.body.activeProvider.capabilities.includes("macroDataAdapter"));
  assert.ok(sources.body.activeProvider.capabilities.includes("fixtureMacroDataRead"));
  assert.ok(sources.body.activeProvider.capabilities.includes("newsFilingsAdapter"));
  assert.ok(sources.body.activeProvider.capabilities.includes("fixtureNewsIntelligenceRead"));
  assert.ok(sources.body.activeProvider.capabilities.includes("dataIngestionChannelStrategy"));
  assert.equal(sources.body.activeProvider.integrationPlan.id, "real-data-source-integration-plan");
  assert.equal(sources.body.activeProvider.integrationPlan.status, "blocked");
  assert.equal(sources.body.activeProvider.integrationPlan.requiredSourceCount, 3);
  assert.equal(sources.body.activeProvider.integrationPlan.configuredRequiredCount, 0);
  assert.ok(
    sources.body.activeProvider.integrationPlan.blockedReasons.some((reason) =>
      reason.includes("provider"),
    ),
  );
  assert.equal(sources.body.activeProvider.providerRegistry.id, "real-data-provider-registry");
  assert.equal(sources.body.activeProvider.providerRegistry.status, "blocked");
  assert.equal(sources.body.activeProvider.providerRegistry.activeRuntimeProvider, "mock");
  assert.equal(
    sources.body.activeProvider.vendorReadinessChecklist.id,
    "real-data-vendor-readiness-checklist",
  );
  assert.equal(sources.body.activeProvider.vendorReadinessChecklist.passedCount, 3);
  assert.deepEqual(sources.body.activeProvider.vendorReadinessChecklist.preferredContactOrder, [
    "marketData",
    "marketNews",
    "macroData",
    "publicStatements",
  ]);
  assert.equal(
    sources.body.activeProvider.marketDataVendorChecklist.id,
    "market-data-vendor-acceptance-checklist",
  );
  assert.equal(sources.body.activeProvider.marketDataVendorChecklist.passedCount, 3);
  assert.ok(
    sources.body.activeProvider.marketDataVendorChecklist.acceptanceAreas.some(
      (area) => area.id === "delayLabel" && area.requiredFields.includes("delayMinutes"),
    ),
  );
  assert.equal(
    sources.body.activeProvider.newsFilingsVendorChecklist.id,
    "news-filings-vendor-acceptance-checklist",
  );
  assert.equal(sources.body.activeProvider.newsFilingsVendorChecklist.passedCount, 3);
  assert.ok(
    sources.body.activeProvider.newsFilingsVendorChecklist.acceptanceAreas.some(
      (area) => area.id === "paywallBoundary" && area.requiredFields.includes("linkOnlyFallback"),
    ),
  );
  assert.equal(
    sources.body.activeProvider.macroDataVendorChecklist.id,
    "macro-data-vendor-acceptance-checklist",
  );
  assert.equal(sources.body.activeProvider.macroDataVendorChecklist.passedCount, 3);
  assert.ok(
    sources.body.activeProvider.macroDataVendorChecklist.acceptanceAreas.some(
      (area) => area.id === "revisionPolicy" && area.requiredFields.includes("revisionId"),
    ),
  );
  assert.equal(
    sources.body.activeProvider.publicStatementsVendorChecklist.id,
    "public-statements-vendor-acceptance-checklist",
  );
  assert.equal(sources.body.activeProvider.publicStatementsVendorChecklist.passedCount, 3);
  assert.ok(
    sources.body.activeProvider.publicStatementsVendorChecklist.acceptanceAreas.some(
      (area) => area.id === "manualReviewQueue" && area.requiredFields.includes("reviewStatus"),
    ),
  );
  assert.equal(sources.body.activeProvider.marketDataAdapter.id, "market-data-provider-adapter");
  assert.equal(sources.body.activeProvider.marketDataAdapter.runtimeMode, "inactive");
  assert.equal(sources.body.activeProvider.marketDataAdapter.canReadFixtures, false);
  assert.equal(sources.body.activeProvider.marketDataAdapter.fixtureReadModel.status, "unavailable");
  assert.equal(sources.body.activeProvider.marketDataAdapter.fixtureReadModel.quoteCount, 0);
  assert.equal(
    sources.body.activeProvider.marketDataAdapter.alphaVantageConnector.providerId,
    "alpha-vantage",
  );
  assert.equal(
    sources.body.activeProvider.marketDataAdapter.alphaVantageConnector.functionName,
    "GLOBAL_QUOTE",
  );
  assert.equal(
    sources.body.activeProvider.marketDataAdapter.alphaVantageSmokeTestPlan.demoSymbol,
    "IBM",
  );
  assert.equal(sources.body.activeProvider.macroDataAdapter.id, "macro-data-provider-adapter");
  assert.equal(sources.body.activeProvider.macroDataAdapter.runtimeMode, "inactive");
  assert.equal(sources.body.activeProvider.macroDataAdapter.canReadFixtures, true);
  assert.equal(sources.body.activeProvider.macroDataAdapter.fixtureReadModel.contextCount, 3);
  assert.equal(sources.body.activeProvider.newsFilingsAdapter.id, "news-filings-provider-adapter");
  assert.equal(sources.body.activeProvider.newsFilingsAdapter.canReadFixtures, true);
  assert.equal(sources.body.activeProvider.newsFilingsAdapter.fixtureReadModel.newsCount, 0);
  assert.equal(sources.body.activeProvider.newsFilingsAdapter.fixtureReadModel.filingCount, 0);
  assert.equal(sources.body.activeProvider.newsFilingsAdapter.fixtureReadModel.publicStatementCount, 0);
  assert.equal(
    sources.body.activeProvider.newsFilingsAdapter.secFilingsConnector.providerId,
    "sec-company-submissions",
  );
  assert.equal(sources.body.activeProvider.newsFilingsAdapter.secFilingsConnector.requiresApiKey, false);
  assert.equal(
    sources.body.activeProvider.newsFilingsAdapter.secFilingsAccessPreflight.mode,
    "no-secret-public-filings-preflight",
  );
  assert.equal(sources.body.activeProvider.providerSetupGuide.id, "real-provider-setup-guide");
  assert.equal(sources.body.activeProvider.providerSetupGuide.mode, "no-secret-provider-setup-guide");
  assert.equal(sources.body.activeProvider.providerSetupGuide.setupGroups.length, 4);
  assert.equal(sources.body.activeProvider.providerSetupGuide.canReadProviderSecrets, false);
  assert.equal(sources.body.activeProvider.providerSetupGuide.canEnableLiveRuntime, false);
  assert.match(sources.body.activeProvider.disclaimer, /样例数据源/);
  assert.equal(sources.body.providers[0].id, sources.body.activeProvider.id);
});

test("project progress endpoint reports honest readiness snapshot", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  assert.equal(response.body.progress.id, "finance-ai-project-progress");
  assert.equal(response.body.progress.updatedAt, "2026-06-14");
  assert.equal(response.body.progress.localDemoPercent, 100);
  assert.equal(response.body.progress.publicLaunchPercent, 74.5);
  assert.equal(response.body.progress.source, "backend-computed-readiness-strict-real-data");
  assert.ok(response.body.progress.completed.includes("项目进度已从后端接口提供，前端连接后端时同步显示"));
  assert.ok(response.body.progress.completed.includes("每日开发日志已延续到 2026-06-14"));
  assert.ok(response.body.progress.blockers.includes("真实行情/新闻/公告/宏观数据源与授权"));
  assert.equal(response.body.progress.readiness.length, 6);
  assert.deepEqual(
    response.body.progress.readiness.map((item) => item.id),
    [
      "data-sources",
      "ai-analysis",
      "production-database",
      "auth-security",
      "compliance-release",
      "deployment-ops",
    ],
  );
  assert.equal(response.body.progress.readiness[0].percent, 80);
  assert.equal(response.body.progress.readiness[0].evidence.rawPercent, 100);
  assert.equal(response.body.progress.readiness[0].evidence.capApplied, true);
  assert.equal(response.body.progress.readiness[0].evidence.passedChecks, 32);
  assert.equal(response.body.progress.readiness[0].evidence.totalChecks, 35);
  assert.ok(response.body.progress.readiness[0].evidence.sourceEndpoints.includes("/api/data-sources"));
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/auto-ingestion-run",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/integration-plan",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/provider-registry",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/vendor-readiness",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/vendor-contract-handoff",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/provider-secret-quota-runbook",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/provider-setup-guide",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/market-data-vendor-checklist",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/news-filings-vendor-checklist",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/macro-data-vendor-checklist",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/public-statements-vendor-checklist",
    ),
  );
  assert.ok(
    response.body.progress.readiness[0].evidence.sourceEndpoints.includes(
      "/api/data-sources/news-filings-adapter",
    ),
  );
  assert.ok(response.body.progress.readiness[0].evidence.sourceEndpoints.includes("/api/news/filings"));
  assert.ok(response.body.progress.readiness[0].evidence.sourceEndpoints.includes("/api/market-data/quote"));
  assert.equal(response.body.progress.readiness[1].percent, 80);
  assert.equal(response.body.progress.readiness[1].evidence.rawPercent, 94);
  assert.equal(response.body.progress.readiness[1].evidence.capApplied, true);
  assert.equal(response.body.progress.readiness[1].evidence.passedChecks, 24);
  assert.equal(response.body.progress.readiness[1].evidence.totalChecks, 28);
  assert.ok(
    response.body.progress.readiness[1].evidence.sourceEndpoints.includes(
      "/api/ai-services/model-provider-setup-guide",
    ),
  );
  assert.equal(response.body.progress.readiness[2].percent, 66);
  assert.equal(response.body.progress.readiness[2].evidence.passedChecks, 26);
  assert.equal(response.body.progress.readiness[2].evidence.totalChecks, 28);
  assert.equal(response.body.progress.readiness[3].percent, 80);
  assert.equal(response.body.progress.readiness[3].evidence.rawPercent, 100);
  assert.equal(response.body.progress.readiness[3].evidence.capApplied, true);
  assert.equal(response.body.progress.readiness[3].evidence.passedChecks, 16);
  assert.equal(response.body.progress.readiness[3].evidence.totalChecks, 17);
  assert.equal(response.body.progress.readiness[4].percent, 77);
  assert.equal(response.body.progress.readiness[4].evidence.passedChecks, 15);
  assert.equal(response.body.progress.readiness[4].evidence.totalChecks, 18);
  assert.equal(response.body.progress.readiness[5].percent, 64);
  assert.equal(response.body.progress.readiness[5].evidence.passedChecks, 16);
  assert.equal(response.body.progress.readiness[5].evidence.totalChecks, 18);
  assert.equal(response.body.progress.readinessEvidence.mode, "computed-from-backend-status");
  assert.equal(response.body.progress.readinessEvidence.readinessAverage, 74.5);
  assert.equal(response.body.progress.readinessEvidence.launchFoundationCredit, 0);
  assert.equal(response.body.progress.readinessEvidence.uncappedPublicLaunchPercent, 74.5);
  assert.equal(response.body.progress.readinessEvidence.capApplied, false);
  assert.equal(response.body.progress.readinessEvidence.cappedAt, 80);
  assert.match(response.body.progress.readinessEvidence.capReason, /blocked 分项/);
  assert.match(response.body.progress.readiness[0].blocker, /数据授权/);
  assert.match(response.body.progress.disclaimer, /项目管理参考/);
});

test("project progress counts production database repository cutover structures", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const databaseReadiness = response.body.progress.readiness.find(
    (item) => item.id === "production-database",
  );
  assert.equal(databaseReadiness.percent, 66);
  assert.equal(databaseReadiness.evidence.passedChecks, 26);
  assert.equal(databaseReadiness.evidence.totalChecks, 28);
  assert.ok(
    databaseReadiness.evidence.sourceEndpoints.includes(
      "/api/database/production-repository-cutover-plan",
    ),
  );
  assert.ok(databaseReadiness.evidence.sourceEndpoints.includes("/api/database/read-only-health"));
  assert.ok(databaseReadiness.evidence.sourceEndpoints.includes("/api/database/driver-setup-plan"));
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "repositoryAdapterSkeletonDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "backupRestoreEvidencePlanDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "rollbackRehearsalEvidencePlanDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "manualCutoverPlanDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "driverSetupGuideDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "driverSmokeOrderDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "driverSecretBoundaryDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "connectionProbeTimeoutPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "productionConnection" && check.status === "blocked",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "runtimeCutover" && check.status === "blocked",
    ),
  );
});

test("project progress counts AI output validation citation and review gates", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const aiReadiness = response.body.progress.readiness.find((item) => item.id === "ai-analysis");
  assert.equal(aiReadiness.percent, 80);
  assert.equal(aiReadiness.evidence.passedChecks, 24);
  assert.equal(aiReadiness.evidence.totalChecks, 28);
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "multiAgentContractDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "userVisibleAnalysisProcessDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "responseValidationPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "citationEvidencePolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "humanReviewPolicyDefined" && check.status === "pass",
    ),
  );
});

test("project progress counts AI audit budget and secret management structures", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const aiReadiness = response.body.progress.readiness.find((item) => item.id === "ai-analysis");
  assert.equal(aiReadiness.percent, 80);
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "auditPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "budgetPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "secretManagementPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "providerRuntime" && check.status === "blocked",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "fullAiOutputSmoke" && check.status === "blocked",
    ),
  );
});

test("project progress counts AI provider and model preflight structures", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const aiReadiness = response.body.progress.readiness.find((item) => item.id === "ai-analysis");
  assert.equal(aiReadiness.percent, 80);
  assert.equal(aiReadiness.evidence.passedChecks, 24);
  assert.equal(aiReadiness.evidence.totalChecks, 28);
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "providerRegistryDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "modelRequestEnvelopeDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "manualPreflightApprovalDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "modelEvaluationEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "modelReleaseRollbackEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "modelProviderSetupGuideDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "modelProviderSmokeOrderDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "liveModelGate" && check.status === "blocked",
    ),
  );
});

test("project progress counts AI model evaluation and release evidence packages", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const aiReadiness = response.body.progress.readiness.find((item) => item.id === "ai-analysis");
  assert.equal(aiReadiness.percent, 80);
  assert.equal(aiReadiness.evidence.passedChecks, 24);
  assert.equal(aiReadiness.evidence.totalChecks, 28);
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "modelEvaluationEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "modelReleaseRollbackEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "providerRuntime" && check.status === "blocked",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "fullAiOutputSmoke" && check.status === "blocked",
    ),
  );
});

test("project progress counts AI real-data evidence packages without enabling live model", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const aiReadiness = response.body.progress.readiness.find((item) => item.id === "ai-analysis");
  assert.equal(aiReadiness.percent, 80);
  assert.equal(aiReadiness.evidence.passedChecks, 24);
  assert.equal(aiReadiness.evidence.totalChecks, 28);
  assert.ok(aiReadiness.evidence.sourceEndpoints.includes("/api/data-sources"));
  assert.ok(aiReadiness.evidence.sourceEndpoints.includes("/api/news/intelligence"));
  assert.ok(aiReadiness.evidence.sourceEndpoints.includes("/api/market-data/quote"));
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "dataSourceEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "factorCoverageEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "dataFreshnessFallbackEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "modelTimeoutFallbackPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    aiReadiness.evidence.checks.some(
      (check) => check.id === "liveModelGate" && check.status === "blocked",
    ),
  );
});

test("mock AI service returns multi-agent analysis process contract", () => {
  const ai = createMockAiService({ env: {} });
  const stock = stocks.find((item) => item.code === "AAPL");
  const analysis = ai.generateAnalysis({
    stock,
    riskProfile: "balanced",
    sourceContext: {
      sourceRefs: [
        {
          type: "news",
          sentiment: "positive",
          importanceScore: 82,
          sourceCredibilityScore: 78,
        },
      ],
    },
    macroContext: {
      status: "ok",
      market: "us",
      region: "US",
      factorScore: 66,
      summary: "Mock 宏观数据样例支持风险偏好。",
      indicators: [{ id: "rates" }, { id: "inflation" }],
      policyEvents: [],
      source: { label: "Mock 宏观数据样例" },
    },
    portfolioEntry: null,
  });

  assert.equal(analysis.analysisProcess.version, "multi-agent-analysis-v1");
  assert.equal(analysis.analysisProcess.mode, "rule-based-reference-no-live-model");
  assert.ok(analysis.analysisProcess.agents.some((agent) => agent.role === "macro"));
  assert.ok(analysis.analysisProcess.agents.some((agent) => agent.role === "sentiment"));
  assert.equal(analysis.analysisProcess.debate.bull.label, "多头研究员");
  assert.equal(analysis.analysisProcess.debate.bear.label, "空头研究员");
  assert.match(analysis.analysisProcess.synthesis.manager, /研究经理/);
  assert.match(analysis.analysisProcess.synthesis.riskReview, /风控复核/);
  assert.ok(analysis.analysisProcess.evidenceCoverage.readySourceCount >= 1);
  assert.match(analysis.analysisProcess.disclaimer, /不构成投资建议/);
});

test("project progress counts auth credential session and csrf safety structures", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const authReadiness = response.body.progress.readiness.find((item) => item.id === "auth-security");
  assert.equal(authReadiness.percent, 80);
  assert.equal(authReadiness.evidence.passedChecks, 16);
  assert.equal(authReadiness.evidence.totalChecks, 17);
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "credentialStoragePolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "sessionSecurityPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "csrfProtectionPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "productionProvider" && check.status === "blocked",
    ),
  );
});

test("project progress counts auth mfa email and oidc safety structures", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const authReadiness = response.body.progress.readiness.find((item) => item.id === "auth-security");
  assert.equal(authReadiness.percent, 80);
  assert.equal(authReadiness.evidence.passedChecks, 16);
  assert.equal(authReadiness.evidence.totalChecks, 17);
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "mfaPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "emailVerificationPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "oidcCallbackPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "productionProvider" && check.status === "blocked",
    ),
  );
});

test("project progress counts auth role risk and recovery safety structures", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const authReadiness = response.body.progress.readiness.find((item) => item.id === "auth-security");
  assert.equal(authReadiness.percent, 80);
  assert.equal(authReadiness.evidence.passedChecks, 16);
  assert.equal(authReadiness.evidence.totalChecks, 17);
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "roleAuthorizationPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "loginRiskPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "accountRecoveryPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "productionProvider" && check.status === "blocked",
    ),
  );
});

test("project progress counts auth audit and privacy consent structures", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const authReadiness = response.body.progress.readiness.find((item) => item.id === "auth-security");
  assert.equal(authReadiness.percent, 80);
  assert.equal(authReadiness.evidence.passedChecks, 16);
  assert.equal(authReadiness.evidence.totalChecks, 17);
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "auditLoggingPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "privacyConsentPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    authReadiness.evidence.checks.some(
      (check) => check.id === "productionProvider" && check.status === "blocked",
    ),
  );
});

test("project progress counts compliance release structure gates", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const complianceReadiness = response.body.progress.readiness.find(
    (item) => item.id === "compliance-release",
  );
  assert.equal(complianceReadiness.percent, 77);
  assert.equal(complianceReadiness.evidence.passedChecks, 15);
  assert.equal(complianceReadiness.evidence.totalChecks, 18);
  assert.ok(complianceReadiness.evidence.sourceEndpoints.includes("/api/compliance/status"));
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "suitabilityQuestionnairePolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "jurisdictionEnforcementPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "disclosureVersioningPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "licensedAdviserReviewPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "requiredDisclaimerPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "riskAcknowledgementPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "suitabilityEnforcementPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "jurisdictionFallbackPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "disclosureChangeControlDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "licensedAdviserEscalationPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "legalReviewPreflightPlanDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "publicReleaseEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "riskAcknowledgement" && check.status === "blocked",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "legalReview" && check.status === "blocked",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "publicReleaseGate" && check.status === "blocked",
    ),
  );
});

test("project progress keeps compliance public release blocked until user legal and release gates pass", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const complianceReadiness = response.body.progress.readiness.find(
    (item) => item.id === "compliance-release",
  );
  const blockedChecks = complianceReadiness.evidence.checks
    .filter((check) => check.status === "blocked")
    .map((check) => check.id);

  assert.deepEqual(blockedChecks, ["riskAcknowledgement", "legalReview", "publicReleaseGate"]);
  assert.match(complianceReadiness.blocker, /用户风险确认/);
});

test("project progress counts compliance pre-release evidence without opening public release", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);

  const complianceReadiness = response.body.progress.readiness.find(
    (item) => item.id === "compliance-release",
  );

  assert.equal(response.body.progress.publicLaunchPercent, 74.5);
  assert.equal(response.body.progress.readinessEvidence.readinessAverage, 74.5);
  assert.equal(complianceReadiness.percent, 77);
  assert.equal(complianceReadiness.evidence.passedChecks, 15);
  assert.equal(complianceReadiness.evidence.totalChecks, 18);
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "legalReviewPreflightPlanDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "publicReleaseEvidencePackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "riskAcknowledgement" && check.status === "blocked",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "legalReview" && check.status === "blocked",
    ),
  );
  assert.ok(
    complianceReadiness.evidence.checks.some(
      (check) => check.id === "publicReleaseGate" && check.status === "blocked",
    ),
  );
});

test("project progress counts deployment notification and scheduler operations structures", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);
  const deploymentReadiness = response.body.progress.readiness.find(
    (item) => item.id === "deployment-ops",
  );
  assert.equal(deploymentReadiness.percent, 64);
  assert.equal(deploymentReadiness.evidence.passedChecks, 16);
  assert.equal(deploymentReadiness.evidence.totalChecks, 18);
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "notificationReceiptPolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "notificationWebhookPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "externalDeliveryPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "schedulerQueuePolicyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "schedulerWorkerAuthRunbookDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "backgroundWorkerPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "notificationObservabilityEvidenceDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "schedulerIncidentResponseDrillDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "externalDelivery" && check.status === "blocked",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "backgroundWorkers" && check.status === "blocked",
    ),
  );
});

test("project progress counts production launch preflight evidence without enabling live runtimes", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);

  const databaseReadiness = response.body.progress.readiness.find(
    (item) => item.id === "production-database",
  );
  const deploymentReadiness = response.body.progress.readiness.find(
    (item) => item.id === "deployment-ops",
  );

  assert.equal(response.body.progress.publicLaunchPercent, 74.5);
  assert.equal(response.body.progress.readinessEvidence.readinessAverage, 74.5);
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "backupRestoreEvidencePlanDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "externalDeliveryPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "backgroundWorkerPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    databaseReadiness.evidence.checks.some(
      (check) => check.id === "productionConnection" && check.status === "blocked",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "externalDelivery" && check.status === "blocked",
    ),
  );
  assert.ok(
    deploymentReadiness.evidence.checks.some(
      (check) => check.id === "backgroundWorkers" && check.status === "blocked",
    ),
  );
});

test("data-source vendor readiness endpoint reports executable provider checklist", async () => {
  const response = await requestMock("/api/data-sources/vendor-readiness");
  assert.equal(response.status, 200);
  assert.equal(response.body.vendorReadinessChecklist.id, "real-data-vendor-readiness-checklist");
  assert.equal(response.body.vendorReadinessChecklist.status, "blocked");
  assert.equal(response.body.vendorReadinessChecklist.passedCount, 3);
  assert.equal(response.body.vendorReadinessChecklist.totalCount, 8);
  assert.deepEqual(response.body.vendorReadinessChecklist.preferredContactOrder, [
    "marketData",
    "marketNews",
    "macroData",
    "publicStatements",
  ]);
  assert.ok(
    response.body.vendorReadinessChecklist.groups.some(
      (group) =>
        group.id === "publicStatements" &&
        group.requiredCapabilities.includes("manualReviewQueue"),
    ),
  );
  assert.ok(
    response.body.vendorReadinessChecklist.checklistItems.some(
      (item) => item.id === "candidateShortlist" && item.status === "pass",
    ),
  );
  assert.match(response.body.vendorReadinessChecklist.disclaimer, /不代表任何 provider 已签约/);
});

test("data-source vendor contract handoff endpoint reports no-signing evidence package", async () => {
  const response = await requestMock("/api/data-sources/vendor-contract-handoff");
  assert.equal(response.status, 200);
  assert.equal(
    response.body.vendorContractHandoffPackage.id,
    "real-data-vendor-contract-handoff-package",
  );
  assert.equal(response.body.vendorContractHandoffPackage.mode, "dry-run-no-contract-signing");
  assert.equal(response.body.vendorContractHandoffPackage.canSignVendorContract, false);
  assert.equal(response.body.vendorContractHandoffPackage.canEnableProviderRuntime, false);
  assert.ok(response.body.vendorContractHandoffPackage.requiredArtifacts.includes("exchange-display-rights"));
  assert.ok(response.body.vendorContractHandoffPackage.forbiddenArtifacts.includes("providerApiKey"));
  assert.match(response.body.vendorContractHandoffPackage.disclaimer, /不代表任何真实数据 provider 已签约/);
});

test("data-source provider secret quota runbook endpoint reports no-secret-use controls", async () => {
  const response = await requestMock("/api/data-sources/provider-secret-quota-runbook");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerSecretQuotaRunbook.id, "real-data-provider-secret-quota-runbook");
  assert.equal(response.body.providerSecretQuotaRunbook.mode, "dry-run-no-secret-use");
  assert.equal(response.body.providerSecretQuotaRunbook.canReadProviderSecrets, false);
  assert.equal(response.body.providerSecretQuotaRunbook.canCallProviderNetwork, false);
  assert.ok(
    response.body.providerSecretQuotaRunbook.secretControls.requiredVaultFields.includes("credentialRef"),
  );
  assert.equal(response.body.providerSecretQuotaRunbook.quotaControls.blocksUnboundedRequests, true);
  assert.equal(response.body.providerSecretQuotaRunbook.auditControls.redactsSecrets, true);
  assert.match(response.body.providerSecretQuotaRunbook.disclaimer, /不会读取密钥、联网请求/);
});

test("data-source provider setup guide endpoint reports no-secret configuration steps", async () => {
  const response = await requestMock("/api/data-sources/provider-setup-guide");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerSetupGuide.id, "real-provider-setup-guide");
  assert.equal(response.body.providerSetupGuide.mode, "no-secret-provider-setup-guide");
  assert.equal(response.body.providerSetupGuide.setupGroups.length, 4);
  assert.ok(
    response.body.providerSetupGuide.setupGroups.some(
      (group) =>
        group.id === "marketData" &&
        group.requiredEnvVars.includes("FINANCE_AI_MARKET_DATA_API_KEY") &&
        group.smokeEndpoint.includes("/api/market-data/quote"),
    ),
  );
  assert.ok(response.body.providerSetupGuide.smokeOrder.includes("marketDataQuote"));
  assert.ok(response.body.providerSetupGuide.smokeOrder.includes("newsSentiment"));
  assert.ok(response.body.providerSetupGuide.forbiddenAuditFields.includes("apiKey"));
  assert.equal(response.body.providerSetupGuide.canReadProviderSecrets, false);
  assert.equal(response.body.providerSetupGuide.canWriteEnvFile, false);
  assert.equal(response.body.providerSetupGuide.canEnableLiveRuntime, false);
  assert.match(response.body.providerSetupGuide.disclaimer, /不会读取、保存、显示真实密钥/);
});

test("market-data vendor checklist endpoint reports acceptance questions", async () => {
  const response = await requestMock("/api/data-sources/market-data-vendor-checklist");
  assert.equal(response.status, 200);
  assert.equal(response.body.marketDataVendorChecklist.id, "market-data-vendor-acceptance-checklist");
  assert.equal(response.body.marketDataVendorChecklist.status, "blocked");
  assert.equal(response.body.marketDataVendorChecklist.passedCount, 3);
  assert.equal(response.body.marketDataVendorChecklist.totalCount, 9);
  assert.deepEqual(
    response.body.marketDataVendorChecklist.acceptanceAreas.map((area) => area.id),
    ["quoteContract", "historyContract", "tradingCalendar", "delayLabel"],
  );
  assert.ok(
    response.body.marketDataVendorChecklist.acceptanceAreas.some(
      (area) => area.id === "quoteContract" && area.requiredFields.includes("lastPrice"),
    ),
  );
  assert.ok(
    response.body.marketDataVendorChecklist.requiredQuestions.some((question) =>
      question.includes("实时还是延迟报价"),
    ),
  );
  assert.match(response.body.marketDataVendorChecklist.disclaimer, /不代表真实行情 provider 已签约/);
});

test("news-filings vendor checklist endpoint reports content rights questions", async () => {
  const response = await requestMock("/api/data-sources/news-filings-vendor-checklist");
  assert.equal(response.status, 200);
  assert.equal(response.body.newsFilingsVendorChecklist.id, "news-filings-vendor-acceptance-checklist");
  assert.equal(response.body.newsFilingsVendorChecklist.status, "blocked");
  assert.equal(response.body.newsFilingsVendorChecklist.passedCount, 3);
  assert.equal(response.body.newsFilingsVendorChecklist.totalCount, 9);
  assert.deepEqual(
    response.body.newsFilingsVendorChecklist.acceptanceAreas.map((area) => area.id),
    ["headlineSummary", "shortExcerpt", "sourceLink", "retentionPolicy", "paywallBoundary"],
  );
  assert.ok(
    response.body.newsFilingsVendorChecklist.acceptanceAreas.some(
      (area) => area.id === "shortExcerpt" && area.requiredFields.includes("maxExcerptChars"),
    ),
  );
  assert.ok(
    response.body.newsFilingsVendorChecklist.requiredQuestions.some((question) =>
      question.includes("短摘录"),
    ),
  );
  assert.match(response.body.newsFilingsVendorChecklist.disclaimer, /不代表真实新闻、公告或公开言论 provider 已签约/);
});

test("macro-data vendor checklist endpoint reports official-data questions", async () => {
  const response = await requestMock("/api/data-sources/macro-data-vendor-checklist");
  assert.equal(response.status, 200);
  assert.equal(response.body.macroDataVendorChecklist.id, "macro-data-vendor-acceptance-checklist");
  assert.equal(response.body.macroDataVendorChecklist.status, "blocked");
  assert.equal(response.body.macroDataVendorChecklist.passedCount, 3);
  assert.equal(response.body.macroDataVendorChecklist.totalCount, 10);
  assert.deepEqual(
    response.body.macroDataVendorChecklist.acceptanceAreas.map((area) => area.id),
    ["rateIndicators", "fxIndicators", "inflationIndicators", "policyEvents", "revisionPolicy"],
  );
  assert.ok(
    response.body.macroDataVendorChecklist.acceptanceAreas.some(
      (area) => area.id === "policyEvents" && area.requiredFields.includes("timezone"),
    ),
  );
  assert.ok(
    response.body.macroDataVendorChecklist.requiredQuestions.some((question) =>
      question.includes("revisionId"),
    ),
  );
  assert.match(response.body.macroDataVendorChecklist.disclaimer, /不代表真实宏观 provider 已签约/);
});

test("public-statements vendor checklist endpoint reports identity and review questions", async () => {
  const response = await requestMock("/api/data-sources/public-statements-vendor-checklist");
  assert.equal(response.status, 200);
  assert.equal(response.body.publicStatementsVendorChecklist.id, "public-statements-vendor-acceptance-checklist");
  assert.equal(response.body.publicStatementsVendorChecklist.status, "blocked");
  assert.equal(response.body.publicStatementsVendorChecklist.passedCount, 3);
  assert.equal(response.body.publicStatementsVendorChecklist.totalCount, 10);
  assert.deepEqual(
    response.body.publicStatementsVendorChecklist.acceptanceAreas.map((area) => area.id),
    [
      "verifiedIdentity",
      "sourceUrl",
      "speakerRole",
      "platformTerms",
      "shortExcerptBoundary",
      "manualReviewQueue",
    ],
  );
  assert.ok(
    response.body.publicStatementsVendorChecklist.acceptanceAreas.some(
      (area) => area.id === "manualReviewQueue" && area.requiredFields.includes("reviewStatus"),
    ),
  );
  assert.ok(
    response.body.publicStatementsVendorChecklist.requiredQuestions.some((question) =>
      question.includes("CEO"),
    ),
  );
  assert.match(response.body.publicStatementsVendorChecklist.disclaimer, /不代表真实公开言论 provider 已签约/);
});

test("data-source integration plan endpoint reports real provider blockers", async () => {
  const response = await requestMock("/api/data-sources/integration-plan");
  assert.equal(response.status, 200);
  assert.equal(response.body.integrationPlan.id, "real-data-source-integration-plan");
  assert.equal(response.body.integrationPlan.status, "blocked");
  assert.deepEqual(response.body.integrationPlan.targetMarkets, ["a", "hk", "us"]);
  assert.equal(response.body.integrationPlan.plannedSources[0].id, "marketData");
  assert.equal(response.body.integrationPlan.plannedSources[0].configured, false);
  assert.ok(
    response.body.integrationPlan.complianceChecks.some(
      (check) => check.id === "licenseReview" && check.status === "blocked",
    ),
  );
  assert.equal(response.body.integrationPlan.dryRunPreflightPlan.id, "real-data-source-integration-dry-run-preflight");
  assert.equal(response.body.integrationPlan.dryRunPreflightPlan.mode, "dry-run-no-provider-fetch");
  assert.equal(response.body.integrationPlan.dryRunPreflightPlan.canCallProviderNetwork, false);
  assert.equal(response.body.integrationPlan.dryRunPreflightPlan.canEnableLiveRuntime, false);
  assert.ok(
    response.body.integrationPlan.dryRunPreflightPlan.requestEnvelope.forbiddenFields.includes("apiKey"),
  );
  assert.match(response.body.integrationPlan.disclaimer, /真实数据源接入计划/);
});

test("mock provider integration plan becomes ready when required config is present", () => {
  const provider = createMockProvider({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "licensed-market-provider",
      FINANCE_AI_MARKET_DATA_API_KEY: "secret",
      FINANCE_AI_NEWS_PROVIDER: "licensed-news-provider",
      FINANCE_AI_NEWS_API_KEY: "secret",
      FINANCE_AI_MACRO_PROVIDER: "licensed-macro-provider",
      FINANCE_AI_MACRO_API_KEY: "secret",
      FINANCE_AI_DATA_LICENSE_CONFIRMED: "true",
      FINANCE_AI_SOURCE_ATTRIBUTION_READY: "true",
      FINANCE_AI_DATA_REDISTRIBUTION_APPROVED: "true",
      FINANCE_AI_DATA_RATE_LIMIT_PLAN: "true",
    },
  });
  const plan = provider.integrationPlan();
  assert.equal(plan.status, "ready-for-adapter");
  assert.equal(plan.configuredRequiredCount, 3);
  assert.equal(plan.blockedReasons.length, 0);
  assert.ok(plan.complianceChecks.every((check) => check.status === "pass"));
});

test("data-source provider registry endpoint reports selected provider config gaps", async () => {
  const response = await requestMock("/api/data-sources/provider-registry");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerRegistry.id, "real-data-provider-registry");
  assert.equal(response.body.providerRegistry.status, "blocked");
  assert.equal(response.body.providerRegistry.activeRuntimeProvider, "mock");
  assert.equal(response.body.providerRegistry.requiredProviderCount, 3);
  assert.equal(response.body.providerRegistry.readyRequiredCount, 0);
  assert.ok(
    response.body.providerRegistry.candidateProviders.some(
      (candidate) => candidate.id === "licensed-market-data",
    ),
  );
  assert.ok(
    response.body.providerRegistry.candidateProviders.some(
      (candidate) => candidate.id === "alpha-vantage" && candidate.groupId === "marketData",
    ),
  );
  assert.ok(
    response.body.providerRegistry.candidateProviders.some(
      (candidate) => candidate.id === "twelve-data" && candidate.groupId === "marketData",
    ),
  );
  assert.ok(
    response.body.providerRegistry.candidateProviders.some(
      (candidate) => candidate.id === "multi-free" && candidate.groupId === "marketData",
    ),
  );
  assert.ok(
    response.body.providerRegistry.candidateProviders.some(
      (candidate) => candidate.id === "alpha-vantage-news" && candidate.groupId === "marketNews",
    ),
  );
  assert.ok(
    response.body.providerRegistry.selectedProviders.some(
      (provider) => provider.groupId === "marketData" && provider.status === "missing-config",
    ),
  );
  assert.ok(
    response.body.providerRegistry.blockedReasons.some((reason) =>
      reason.includes("未完成可用 provider 配置"),
    ),
  );
  assert.equal(response.body.providerRegistry.rolloutPreflightPlan.id, "real-data-provider-registry-rollout-preflight");
  assert.equal(response.body.providerRegistry.rolloutPreflightPlan.mode, "dry-run-no-provider-runtime");
  assert.equal(response.body.providerRegistry.rolloutPreflightPlan.activeRuntimeProvider, "mock");
  assert.equal(response.body.providerRegistry.rolloutPreflightPlan.canEnableLiveRuntime, false);
  assert.ok(
    response.body.providerRegistry.rolloutPreflightPlan.runtimeSwitchGate.requiredChecks.includes(
      "manual-cutover-approval",
    ),
  );
});

test("provider registry accepts multi-free market-data provider-specific keys", () => {
  const provider = createMockProvider({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "multi-free",
      FINANCE_AI_ALPHA_VANTAGE_API_KEY: "av-secret",
      FINANCE_AI_NEWS_PROVIDER: "alpha-vantage-news",
      FINANCE_AI_NEWS_API_KEY: "news-secret",
      FINANCE_AI_MACRO_PROVIDER: "official-macro-data",
      FINANCE_AI_MACRO_API_KEY: "macro-secret",
    },
  });
  const registry = provider.providerRegistry();
  const marketData = registry.selectedProviders.find((item) => item.groupId === "marketData");

  assert.equal(marketData.selectedProvider, "multi-free");
  assert.equal(marketData.configured, true);
  assert.equal(marketData.status, "ready-for-adapter");
  assert.deepEqual(marketData.missingEnvVars, []);
  assert.equal(registry.activeRuntimeProvider, "multi-free + alpha-vantage-news + official-macro-data");
  assert.equal(registry.rolloutPreflightPlan.activeRuntimeProvider, registry.activeRuntimeProvider);
});

test("provider registry reports partial real provider runtime without marking production ready", () => {
  const provider = createMockProvider({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "multi-free",
      FINANCE_AI_TWELVE_DATA_API_KEY: "td-secret",
      FINANCE_AI_ALPHA_VANTAGE_API_KEY: "av-secret",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_NEWS_PROVIDER: "alpha-vantage-news",
      FINANCE_AI_NEWS_API_KEY: "news-secret",
      FINANCE_AI_NEWS_ALLOW_NETWORK: "true",
    },
  });
  const registry = provider.providerRegistry();
  const integrationPlan = provider.integrationPlan();
  const setupGuide = provider.providerSetupGuide();
  const marketDataSource = integrationPlan.plannedSources.find((item) => item.id === "marketData");
  const marketDataSetup = setupGuide.setupGroups.find((item) => item.id === "marketData");

  assert.equal(registry.status, "blocked");
  assert.equal(registry.activeRuntimeProvider, "multi-free + alpha-vantage-news");
  assert.equal(registry.rolloutPreflightPlan.activeRuntimeProvider, registry.activeRuntimeProvider);
  assert.equal(registry.rolloutPreflightPlan.canEnableLiveRuntime, false);
  assert.equal(registry.readyRequiredCount, 2);
  assert.equal(registry.requiredProviderCount, 3);
  assert.ok(
    registry.selectedProviders.some(
      (provider) => provider.groupId === "macroData" && provider.status === "missing-config",
    ),
  );
  assert.ok(registry.blockedReasons.some((reason) => reason.includes("宏观")));
  assert.match(registry.disclaimer, /本地 smoke\/runtime/);
  assert.doesNotMatch(registry.disclaimer, /仍使用 mock provider/);
  assert.equal(integrationPlan.configuredRequiredCount, 2);
  assert.equal(marketDataSource.configured, true);
  assert.equal(
    marketDataSource.envVars.find((item) => item.name === "FINANCE_AI_MARKET_DATA_API_KEY").configured,
    true,
  );
  assert.equal(setupGuide.activeRuntimeProvider, "multi-free + alpha-vantage-news");
  assert.equal(marketDataSetup.status, "ready-for-smoke");
  assert.deepEqual(marketDataSetup.missingEnvVars, []);
});

test("project progress counts data-source dry-run preflight without enabling live providers", async () => {
  const response = await requestMock("/api/project/progress");
  assert.equal(response.status, 200);

  const dataReadiness = response.body.progress.readiness.find((item) => item.id === "data-sources");

  assert.equal(response.body.progress.publicLaunchPercent, 74.5);
  assert.equal(response.body.progress.readinessEvidence.readinessAverage, 74.5);
  assert.equal(dataReadiness.percent, 80);
  assert.equal(dataReadiness.evidence.passedChecks, 32);
  assert.equal(dataReadiness.evidence.totalChecks, 35);
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "integrationDryRunPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "alphaVantageQuoteConnectorDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "alphaVantageDemoSmokePlanDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "alphaVantageQuoteCredentialPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "alphaVantageNewsCredentialPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "alphaVantageProviderRegistered" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "alphaVantageNewsConnectorDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "alphaVantageNewsSmokePlanDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "providerRegistryPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "vendorContractHandoffPackageDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "providerSecretQuotaRunbookDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "providerSetupGuideDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "providerSetupSmokeOrderDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "dataIngestionChannelStrategyDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "dataIngestionChannelOrderDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "automaticRealDataRunEndpointDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "secCompanyFilingsConnectorDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "secCompanyFilingsAccessPreflightDefined" && check.status === "pass",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "integrationPlan" && check.status === "blocked",
    ),
  );
  assert.ok(
    dataReadiness.evidence.checks.some(
      (check) => check.id === "providerRegistry" && check.status === "blocked",
    ),
  );
});

test("automatic real-data ingestion endpoint stays empty without live providers", async () => {
  const response = await requestMock("/api/data-sources/auto-ingestion-run?market=us&symbol=IBM");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "empty-no-fixture");
  assert.equal(response.body.mode, "automatic-real-provider-run");
  assert.equal(response.body.market, "us");
  assert.equal(response.body.symbol, "IBM");
  assert.equal(response.body.realDataCount, 0);
  assert.equal(response.body.sourceCount, 5);
  assert.deepEqual(
    response.body.sources.map((source) => source.id),
    ["marketDataQuote", "newsIntelligence", "companyFilings", "publicStatements", "macroContext"],
  );
  assert.ok(response.body.sources.every((source) => source.status !== "fixture"));
  assert.equal(response.body.payloads.quote.reason, "没有可用真实行情；样例/fixture 回退已关闭。");
  assert.equal(response.body.payloads.news.mode, "no-real-data");
  assert.match(response.body.disclaimer, /不使用 mock\/fixture\/sample 兜底/);
});

test("automatic real-data ingestion timeout payload stays empty without fixture fallback", () => {
  const payload = createAutoIngestionTimeoutPayload("marketDataQuote", 1500, { quote: null });

  assert.equal(payload.status, "error");
  assert.equal(payload.mode, "provider-timeout-empty-no-fixture");
  assert.equal(payload.sourceId, "marketDataQuote");
  assert.equal(payload.quote, null);
  assert.deepEqual(payload.items, []);
  assert.equal(payload.error.code, "AUTO_INGESTION_SOURCE_TIMEOUT");
  assert.match(payload.error.message, /1500ms/);
  assert.match(payload.error.message, /保持空白/);
});

test("mock provider registry detects unsupported selected provider ids", () => {
  const provider = createMockProvider({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "unknown-vendor",
      FINANCE_AI_MARKET_DATA_API_KEY: "secret",
      FINANCE_AI_NEWS_PROVIDER: "licensed-news-filings",
      FINANCE_AI_NEWS_API_KEY: "secret",
      FINANCE_AI_MACRO_PROVIDER: "official-macro-data",
      FINANCE_AI_MACRO_API_KEY: "secret",
    },
  });
  const registry = provider.providerRegistry();
  const marketData = registry.selectedProviders.find((entry) => entry.groupId === "marketData");
  assert.equal(registry.status, "blocked");
  assert.equal(marketData.supported, false);
  assert.equal(marketData.status, "unsupported");
  assert.ok(registry.blockedReasons.some((reason) => reason.includes("unknown-vendor")));
});

test("market-data adapter endpoint reports strict empty quote/history contract blockers", async () => {
  const response = await requestMock("/api/data-sources/market-data-adapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.marketDataAdapter.id, "market-data-provider-adapter");
  assert.equal(response.body.marketDataAdapter.status, "blocked");
  assert.equal(response.body.marketDataAdapter.runtimeMode, "inactive");
  assert.equal(response.body.marketDataAdapter.canFetchQuotes, false);
  assert.equal(response.body.marketDataAdapter.canReadFixtures, false);
  assert.equal(response.body.marketDataAdapter.fixtureReadModel.status, "unavailable");
  assert.equal(response.body.marketDataAdapter.fixtureReadModel.quoteCount, 0);
  assert.equal(response.body.marketDataAdapter.cachePolicy.status, "blocked");
  assert.equal(response.body.marketDataAdapter.cachePolicy.quoteTtlSeconds, 900);
  assert.equal(response.body.marketDataAdapter.rateLimitPolicy.status, "blocked");
  assert.equal(response.body.marketDataAdapter.rateLimitPolicy.maxRequestsPerMinute, 60);
  assert.equal(response.body.marketDataAdapter.attributionPolicy.status, "blocked");
  assert.equal(response.body.marketDataAdapter.entitlementPolicy.status, "blocked");
  assert.ok(
    response.body.marketDataAdapter.entitlementPolicy.forbiddenAuditFields.includes("rawTick"),
  );
  assert.equal(response.body.marketDataAdapter.delayLabelPolicy.status, "blocked");
  assert.equal(response.body.marketDataAdapter.precheckPolicy.status, "blocked");
  assert.equal(response.body.marketDataAdapter.requestPolicyGate.status, "blocked");
  assert.equal(response.body.marketDataAdapter.requestPolicyGate.canUseProvider, false);
  assert.equal(response.body.marketDataAdapter.requestPolicyGate.canUseFixture, false);
  assert.equal(response.body.marketDataAdapter.requestPolicyGate.fallback, "empty-no-fixture");
  assert.equal(response.body.marketDataAdapter.requestExecutionPlan.status, "empty-only");
  assert.equal(response.body.marketDataAdapter.requestExecutionPlan.fallback.selected, "empty-no-fixture");
  assert.equal(
    response.body.marketDataAdapter.requestExecutionPlan.auditDraft.eventType,
    "marketData.request.policyGate",
  );
  assert.ok(
    response.body.marketDataAdapter.requestPolicyGate.checks.some(
      (check) => check.id === "runtimeMode" && check.status === "blocked",
    ),
  );
  assert.deepEqual(response.body.marketDataAdapter.attributionPolicy.requiredFields, [
    "source.label",
    "source.licenseTag",
    "asOf",
    "dataDelay",
  ]);
  assert.equal(response.body.marketDataAdapter.providerPreflightPlan.mode, "dry-run-no-provider-request");
  assert.equal(response.body.marketDataAdapter.providerPreflightPlan.canRequestProvider, false);
  assert.equal(
    response.body.marketDataAdapter.alphaVantageCredentialPreflight.mode,
    "no-secret-credential-preflight",
  );
  assert.equal(response.body.marketDataAdapter.alphaVantageCredentialPreflight.apiKeyStatus, "missing");
  assert.ok(
    response.body.marketDataAdapter.alphaVantageCredentialPreflight.forbiddenAuditFields.includes(
      "apiKey",
    ),
  );
  assert.deepEqual(response.body.marketDataAdapter.missingEnvVars, [
    "FINANCE_AI_MARKET_DATA_PROVIDER",
    "FINANCE_AI_MARKET_DATA_API_KEY",
    "FINANCE_AI_MARKET_DATA_ENTITLEMENTS_READY",
    "FINANCE_AI_MARKET_DATA_DELAY_LABELS_READY",
    "FINANCE_AI_MARKET_DATA_PRECHECK_READY",
  ]);
  assert.ok(
    response.body.marketDataAdapter.endpointContracts.some(
      (contract) =>
        contract.method === "getQuote" &&
        contract.status === "planned" &&
        contract.fixtureStatus === "available",
    ),
  );
  assert.equal(response.body.marketDataAdapter.safety.noVendorNetworkCalls, true);
  assert.match(response.body.marketDataAdapter.disclaimer, /行情 provider adapter 骨架/);
});

test("market-data adapter becomes ready for implementation after config and gates", async () => {
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "licensed-market-data",
      FINANCE_AI_MARKET_DATA_API_KEY: "secret",
      FINANCE_AI_MARKET_DATA_MODE: "live",
      FINANCE_AI_DATA_LICENSE_CONFIRMED: "true",
      FINANCE_AI_SOURCE_ATTRIBUTION_READY: "true",
      FINANCE_AI_DATA_RATE_LIMIT_PLAN: "true",
      FINANCE_AI_MARKET_DATA_MAX_REQUESTS_PER_MINUTE: "120",
      FINANCE_AI_MARKET_DATA_ENTITLEMENTS_READY: "true",
      FINANCE_AI_MARKET_DATA_DELAY_LABELS_READY: "true",
      FINANCE_AI_MARKET_DATA_PRECHECK_READY: "true",
    },
  });
  const status = adapter.status();
  assert.equal(status.status, "ready-for-implementation");
  assert.equal(status.requestedMode, "live");
  assert.equal(status.selectedProvider, "licensed-market-data");
  assert.equal(status.cachePolicy.status, "ready-for-adapter");
  assert.equal(status.cachePolicy.quoteTtlSeconds, 15);
  assert.equal(status.rateLimitPolicy.status, "ready-for-adapter");
  assert.equal(status.rateLimitPolicy.maxRequestsPerMinute, 120);
  assert.equal(status.attributionPolicy.status, "ready-for-adapter");
  assert.equal(status.attributionPolicy.blockIfMissing, true);
  assert.equal(status.entitlementPolicy.status, "ready");
  assert.equal(status.delayLabelPolicy.status, "ready");
  assert.equal(status.precheckPolicy.status, "ready");
  assert.equal(status.requestPolicyGate.status, "blocked");
  assert.equal(status.requestPolicyGate.canUseProvider, false);
  assert.ok(status.requestPolicyGate.blockedReasons.some((reason) => reason.includes("runtime")));
  assert.equal(status.providerPreflightPlan.status, "blocked");
  assert.equal(status.providerPreflightPlan.canRequestProvider, false);
  assert.equal(status.requestExecutionPlan.status, "empty-only");
  assert.equal(status.requestExecutionPlan.rateLimit.tokenCost, 0);
  assert.equal(status.requestExecutionPlan.fallback.selected, "empty-no-fixture");
  assert.equal(status.requestExecutionPlan.fallback.localSampleAllowed, false);
  assert.deepEqual(status.missingEnvVars, []);
  assert.equal(status.canFetchQuotes, false);
  assert.equal(status.canReadFixtures, false);
  assert.equal((await adapter.getQuote()).status, "unavailable");
});

test("market-data adapter maps Alpha Vantage symbols and parses global quote", () => {
  assert.equal(mapAlphaVantageSymbol({ market: "us", code: "aapl" }), "AAPL");
  assert.equal(mapAlphaVantageSymbol({ market: "hk", code: "700" }), "0700.HKG");
  assert.equal(mapAlphaVantageSymbol({ market: "a", code: "600519" }), "600519.SHH");
  assert.equal(mapAlphaVantageSymbol({ market: "a", code: "000001" }), "000001.SHZ");

  const parsed = parseAlphaVantageGlobalQuote(
    {
      "Global Quote": {
        "01. symbol": "IBM",
        "05. price": "284.8400",
        "06. volume": "12509480",
        "07. latest trading day": "2026-06-05",
        "08. previous close": "301.7700",
        "09. change": "-16.9300",
        "10. change percent": "-5.6102%",
      },
    },
    { market: "us", code: "IBM" },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.quote.lastPrice, 284.84);
  assert.equal(parsed.quote.changePercent, -5.6102);
  assert.equal(parsed.quote.asOf, "2026-06-05T00:00:00.000Z");
  assert.equal(parsed.quote.source.label, "Alpha Vantage GLOBAL_QUOTE");
});

test("market-data adapter can fetch Alpha Vantage quote when explicit network flag is enabled", async () => {
  let requestedUrl = "";
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "alpha-vantage",
      FINANCE_AI_MARKET_DATA_API_KEY: "demo",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_MARKET_DATA_MODE: "delayed",
    },
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          "Global Quote": {
            "01. symbol": "IBM",
            "05. price": "284.8400",
            "06. volume": "12509480",
            "07. latest trading day": "2026-06-05",
            "08. previous close": "301.7700",
            "09. change": "-16.9300",
            "10. change percent": "-5.6102%",
          },
        }),
      };
    },
  });

  const status = adapter.status();
  assert.equal(status.alphaVantageConnector.canRequestProvider, true);
  assert.equal(status.runtimeMode, "delayed");
  assert.equal(status.canFetchQuotes, true);
  assert.equal(status.safety.noVendorNetworkCalls, false);

  const quotePayload = await adapter.getQuote({ market: "us", code: "IBM" });
  assert.equal(quotePayload.status, "ok");
  assert.equal(quotePayload.mode, "real-provider");
  assert.equal(quotePayload.quote.lastPrice, 284.84);
  assert.equal(quotePayload.provider.requestedSymbol, "IBM");
  assert.match(quotePayload.provider.requestUrlRedacted, /apikey=REDACTED/);
  assert.doesNotMatch(quotePayload.provider.requestUrlRedacted, /demo/);
  assert.match(requestedUrl, /function=GLOBAL_QUOTE/);
  assert.match(requestedUrl, /symbol=IBM/);
  assert.match(requestedUrl, /apikey=demo/);
});

test("market-data adapter maps Twelve Data symbols and parses quote", () => {
  assert.equal(mapTwelveDataSymbol({ market: "us", code: "msft" }), "MSFT");
  assert.equal(mapTwelveDataSymbol({ market: "hk", code: "0700" }), "");
  assert.equal(mapTwelveDataSymbol({ market: "a", code: "600519" }), "");

  const parsed = parseTwelveDataQuote(
    {
      symbol: "MSFT",
      close: "478.8700",
      previous_close: "475.0000",
      change: "3.8700",
      percent_change: "0.8147",
      volume: "12345",
      currency: "USD",
      datetime: "2026-06-11",
      timestamp: "1781136000",
    },
    { market: "us", code: "MSFT" },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.quote.lastPrice, 478.87);
  assert.equal(parsed.quote.changePercent, 0.8147);
  assert.equal(parsed.quote.currency, "USD");
  assert.equal(parsed.quote.source.label, "Twelve Data Quote");
});

test("market-data adapter can fetch Twelve Data quote when explicit network flag is enabled", async () => {
  let requestedUrl = "";
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "twelve-data",
      FINANCE_AI_TWELVE_DATA_API_KEY: "td-secret",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_MARKET_DATA_MODE: "delayed",
    },
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          symbol: "MSFT",
          close: "478.8700",
          previous_close: "475.0000",
          change: "3.8700",
          percent_change: "0.8147",
          volume: "12345",
          currency: "USD",
          datetime: "2026-06-11",
        }),
      };
    },
  });

  const status = adapter.status();
  assert.equal(status.twelveDataConnector.canRequestProvider, true);
  assert.equal(status.runtimeMode, "delayed");
  assert.equal(status.canFetchQuotes, true);
  assert.equal(status.safety.noVendorNetworkCalls, false);

  const quotePayload = await adapter.getQuote({ market: "us", code: "MSFT" });
  assert.equal(quotePayload.status, "ok");
  assert.equal(quotePayload.mode, "real-provider");
  assert.equal(quotePayload.quote.lastPrice, 478.87);
  assert.equal(quotePayload.provider.id, "twelve-data");
  assert.equal(quotePayload.provider.requestedSymbol, "MSFT");
  assert.match(quotePayload.provider.requestUrlRedacted, /apikey=REDACTED/);
  assert.doesNotMatch(quotePayload.provider.requestUrlRedacted, /td-secret/);
  assert.match(requestedUrl, /symbol=MSFT/);
  assert.match(requestedUrl, /apikey=td-secret/);
});

test("market-data adapter relays from Twelve Data to Alpha Vantage when first provider fails", async () => {
  const requestedUrls = [];
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "multi-free",
      FINANCE_AI_TWELVE_DATA_API_KEY: "td-secret",
      FINANCE_AI_ALPHA_VANTAGE_API_KEY: "av-secret",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_MARKET_DATA_MODE: "delayed",
    },
    fetchImpl: async (url) => {
      const requestedUrl = String(url);
      requestedUrls.push(requestedUrl);
      if (requestedUrl.includes("twelvedata.com")) {
        return {
          ok: true,
          json: async () => ({ status: "error", message: "API credits exhausted" }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          "Global Quote": {
            "01. symbol": "IBM",
            "05. price": "284.8400",
            "06. volume": "12509480",
            "07. latest trading day": "2026-06-05",
            "08. previous close": "301.7700",
            "09. change": "-16.9300",
            "10. change percent": "-5.6102%",
          },
        }),
      };
    },
  });

  const status = adapter.status();
  assert.equal(status.selectedProvider, "multi-free");
  assert.equal(status.twelveDataConnector.canRequestProvider, true);
  assert.equal(status.alphaVantageConnector.canRequestProvider, true);
  assert.equal(status.canFetchQuotes, true);

  const quotePayload = await adapter.getQuote({ market: "us", code: "IBM" });
  assert.equal(quotePayload.status, "ok");
  assert.equal(quotePayload.mode, "real-provider-relay");
  assert.equal(quotePayload.provider.id, "alpha-vantage");
  assert.deepEqual(
    quotePayload.provider.relay.map((attempt) => `${attempt.providerId}:${attempt.status}`),
    ["twelve-data:unavailable", "alpha-vantage:ok"],
  );
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[0], /twelvedata.com/);
  assert.match(requestedUrls[1], /alphavantage.co/);
});

test("market-data adapter maps Yahoo Finance symbols and parses chart quote", () => {
  assert.equal(mapYahooFinanceSymbol({ market: "us", code: "msft" }), "MSFT");
  assert.equal(mapYahooFinanceSymbol({ market: "hk", code: "700" }), "0700.HK");
  assert.equal(mapYahooFinanceSymbol({ market: "a", code: "600519" }), "600519.SS");
  assert.equal(mapYahooFinanceSymbol({ market: "a", code: "000001" }), "000001.SZ");

  const parsed = parseYahooFinanceChartQuote(
    {
      chart: {
        result: [
          {
            meta: {
              symbol: "600519.SS",
              currency: "CNY",
              regularMarketPrice: 1488.5,
              chartPreviousClose: 1470,
              regularMarketTime: 1781136000,
              regularMarketVolume: 123456,
            },
            timestamp: [1781049600, 1781136000],
            indicators: { quote: [{ close: [1470, 1488.5] }] },
          },
        ],
      },
    },
    { market: "a", code: "600519" },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.quote.lastPrice, 1488.5);
  assert.equal(parsed.quote.changePercent, 1.2585);
  assert.equal(parsed.quote.providerSymbol, "600519.SS");
  assert.equal(parsed.quote.source.label, "Yahoo Finance Chart");
});

test("market-data adapter maps Tencent quote symbols and parses public quote text", () => {
  assert.equal(mapTencentQuoteSymbol({ market: "us", code: "MSFT" }), "usmsft");
  assert.equal(mapTencentQuoteSymbol({ market: "hk", code: "700" }), "hk00700");
  assert.equal(mapTencentQuoteSymbol({ market: "a", code: "600519" }), "sh600519");
  assert.equal(mapTencentQuoteSymbol({ market: "a", code: "000001" }), "sz000001");

  const parsed = parseTencentQuoteText(
    'v_sh600519="1~Kweichow Moutai~600519~1281.55~1279.00~1271.18~20422~~~~~~~~~~~~~~~~~~~~~~~~20260612125718~2.55~0.20~";',
    { market: "a", code: "600519" },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.quote.lastPrice, 1281.55);
  assert.equal(parsed.quote.previousClose, 1279);
  assert.equal(parsed.quote.changePercent, 0.1994);
  assert.equal(parsed.quote.providerSymbol, "sh600519");
  assert.equal(parsed.quote.source.label, "Tencent Quote");
  assert.equal(parsed.quote.source.licenseTag, "public-quote-endpoint-local-demo");
  assert.equal(parsed.quote.asOf, "2026-06-12T04:57:18.000Z");
});

test("market-data adapter parses Yahoo Finance chart history", () => {
  const parsed = parseYahooFinanceChartHistory(
    {
      chart: {
        result: [
          {
            meta: { symbol: "600519.SS", currency: "CNY" },
            timestamp: [1780963200, 1781049600, 1781136000],
            indicators: { quote: [{ close: [1260.5, 1270.25, 1281.55] }] },
          },
        ],
      },
    },
    { market: "a", code: "600519", range: "6m", interval: "1mo" },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.mode, "real-provider");
  assert.equal(parsed.points.length, 3);
  assert.equal(parsed.points.at(-1).close, 1281.55);
  assert.equal(parsed.source.label, "Yahoo Finance Chart");
  assert.equal(parsed.providerSymbol, "600519.SS");
});

test("market-data multi-free relay falls back to Yahoo Chart for A-share quote", async () => {
  const requestedUrls = [];
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "multi-free",
      FINANCE_AI_TWELVE_DATA_API_KEY: "td-secret",
      FINANCE_AI_ALPHA_VANTAGE_API_KEY: "av-secret",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_MARKET_DATA_MODE: "delayed",
    },
    fetchImpl: async (url) => {
      const requestedUrl = String(url);
      requestedUrls.push(requestedUrl);
      if (requestedUrl.includes("twelvedata.com")) {
        return { ok: true, json: async () => ({ status: "error", message: "unsupported symbol" }) };
      }
      if (requestedUrl.includes("alphavantage.co")) {
        return { ok: true, json: async () => ({ Note: "frequency limit" }) };
      }
      return {
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                meta: {
                  symbol: "600519.SS",
                  currency: "CNY",
                  regularMarketPrice: 1488.5,
                  chartPreviousClose: 1470,
                  regularMarketTime: 1781136000,
                },
                timestamp: [1781136000],
                indicators: { quote: [{ close: [1488.5] }] },
              },
            ],
          },
        }),
      };
    },
  });

  const status = adapter.status();
  assert.equal(status.yahooChartConnector.canRequestProvider, true);

  const quotePayload = await adapter.getQuote({ market: "a", code: "600519" });
  assert.equal(quotePayload.status, "ok");
  assert.equal(quotePayload.mode, "real-provider-relay");
  assert.equal(quotePayload.provider.id, "yahoo-chart");
  assert.equal(quotePayload.quote.source.label, "Yahoo Finance Chart");
  assert.deepEqual(
    quotePayload.provider.relay.map((attempt) => `${attempt.providerId}:${attempt.status}`),
    ["twelve-data:unavailable", "alpha-vantage:unavailable", "yahoo-chart:ok"],
  );
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[0], /alphavantage.co/);
  assert.match(requestedUrls[1], /query1\.finance\.yahoo\.com/);
  assert.match(requestedUrls[1], /600519\.SS/);
});

test("market-data multi-free relay falls back to Tencent Quote when Yahoo is rate limited", async () => {
  const requestedUrls = [];
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "multi-free",
      FINANCE_AI_TWELVE_DATA_API_KEY: "td-secret",
      FINANCE_AI_ALPHA_VANTAGE_API_KEY: "av-secret",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_MARKET_DATA_MODE: "delayed",
    },
    fetchImpl: async (url) => {
      const requestedUrl = String(url);
      requestedUrls.push(requestedUrl);
      if (requestedUrl.includes("alphavantage.co")) {
        return { ok: true, json: async () => ({ Note: "frequency limit" }) };
      }
      if (requestedUrl.includes("query1.finance.yahoo.com")) {
        return { ok: false, status: 429, json: async () => ({}) };
      }
      return {
        ok: true,
        text: async () =>
          'v_sh600519="1~Kweichow Moutai~600519~1281.55~1279.00~1271.18~20422~~~~~~~~~~~~~~~~~~~~~~~~20260612125718~2.55~0.20~";',
      };
    },
  });

  const quotePayload = await adapter.getQuote({ market: "a", code: "600519" });
  assert.equal(quotePayload.status, "ok");
  assert.equal(quotePayload.mode, "real-provider-relay");
  assert.equal(quotePayload.provider.id, "tencent-quote");
  assert.equal(quotePayload.quote.source.label, "Tencent Quote");
  assert.deepEqual(
    quotePayload.provider.relay.map((attempt) => `${attempt.providerId}:${attempt.status}`),
    ["twelve-data:unavailable", "alpha-vantage:unavailable", "yahoo-chart:unavailable", "tencent-quote:ok"],
  );
  assert.equal(requestedUrls.length, 3);
  assert.match(requestedUrls[0], /alphavantage.co/);
  assert.match(requestedUrls[1], /query1\.finance\.yahoo\.com/);
  assert.match(requestedUrls[2], /qt\.gtimg\.cn/);
  assert.match(requestedUrls[2], /sh600519/);
});

test("market-data adapter can fetch Yahoo Chart history when network flag is enabled", async () => {
  let requestedUrl = "";
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "yahoo-chart",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_MARKET_DATA_MODE: "delayed",
    },
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                meta: { symbol: "600519.SS", currency: "CNY" },
                timestamp: [1780963200, 1781049600, 1781136000],
                indicators: { quote: [{ close: [1260.5, 1270.25, 1281.55] }] },
              },
            ],
          },
        }),
      };
    },
  });

  const historyPayload = await adapter.getPriceHistory({
    market: "a",
    code: "600519",
    range: "6m",
    interval: "1mo",
  });

  assert.equal(historyPayload.status, "ok");
  assert.equal(historyPayload.mode, "real-provider");
  assert.equal(historyPayload.points.length, 3);
  assert.equal(historyPayload.provider.id, "yahoo-chart");
  assert.equal(historyPayload.source.label, "Yahoo Finance Chart");
  assert.match(requestedUrl, /query1\.finance\.yahoo\.com/);
  assert.match(requestedUrl, /600519\.SS/);
  assert.match(requestedUrl, /interval=1mo/);
});

test("market-data adapter retries Yahoo Chart history with daily interval when monthly points are insufficient", async () => {
  const requestedUrls = [];
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "yahoo-chart",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_MARKET_DATA_MODE: "delayed",
    },
    fetchImpl: async (url) => {
      const requestedUrl = String(url);
      requestedUrls.push(requestedUrl);
      if (requestedUrl.includes("interval=1mo")) {
        return {
          ok: true,
          json: async () => ({
            chart: {
              result: [
                {
                  meta: { symbol: "600519.SS", currency: "CNY" },
                  timestamp: [1781136000],
                  indicators: { quote: [{ close: [1281.55] }] },
                },
              ],
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                meta: { symbol: "600519.SS", currency: "CNY" },
                timestamp: [1780963200, 1781049600, 1781136000],
                indicators: { quote: [{ close: [1260.5, 1270.25, 1281.55] }] },
              },
            ],
          },
        }),
      };
    },
  });

  const historyPayload = await adapter.getPriceHistory({
    market: "a",
    code: "600519",
    range: "6m",
    interval: "1mo",
  });

  assert.equal(historyPayload.status, "ok");
  assert.equal(historyPayload.provider.retriedFrom, "1mo/6m");
  assert.equal(historyPayload.fallbackReason, "YAHOO_CHART_HISTORY_INSUFFICIENT");
  assert.equal(historyPayload.points.length, 3);
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[0], /interval=1mo/);
  assert.match(requestedUrls[1], /interval=1d/);
});

test("market-data adapter marks Twelve Data as missing-key when relay only has Alpha key", () => {
  const adapter = createMarketDataProviderAdapter({
    env: {
      FINANCE_AI_MARKET_DATA_PROVIDER: "multi-free",
      FINANCE_AI_ALPHA_VANTAGE_API_KEY: "av-secret",
      FINANCE_AI_MARKET_DATA_ALLOW_NETWORK: "true",
      FINANCE_AI_MARKET_DATA_MODE: "delayed",
    },
  });

  const status = adapter.status();
  assert.equal(status.selectedProvider, "multi-free");
  assert.equal(status.canFetchQuotes, true);
  assert.equal(status.alphaVantageConnector.canRequestProvider, true);
  assert.equal(status.twelveDataConnector.status, "missing-key");
  assert.equal(status.twelveDataConnector.canRequestProvider, false);
  assert.equal(status.twelveDataCredentialPreflight.apiKeyStatus, "missing");
  assert.ok(
    status.twelveDataCredentialPreflight.missingRequiredEnvVars.includes(
      "FINANCE_AI_TWELVE_DATA_API_KEY",
    ),
  );
});

test("market-data adapter redacts Alpha Vantage key from provider error messages", () => {
  const parsed = parseAlphaVantageGlobalQuote(
    {
      Information:
        "We have detected your API key as SECRETKEY123 and our standard API rate limit is 25 requests per day.",
    },
    { market: "us", code: "IBM", apiKey: "SECRETKEY123" },
  );

  assert.equal(parsed.status, "unavailable");
  assert.equal(parsed.error.code, "ALPHA_VANTAGE_QUOTE_EMPTY");
  assert.match(parsed.error.message, /api key as REDACTED/);
  assert.doesNotMatch(parsed.error.message, /SECRETKEY123/);
});

test("macro-data adapter endpoint reports macro context contract blockers", async () => {
  const response = await requestMock("/api/data-sources/macro-data-adapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.macroDataAdapter.id, "macro-data-provider-adapter");
  assert.equal(response.body.macroDataAdapter.status, "blocked");
  assert.equal(response.body.macroDataAdapter.runtimeMode, "inactive");
  assert.equal(response.body.macroDataAdapter.canFetchLiveMacro, false);
  assert.equal(response.body.macroDataAdapter.canReadFixtures, true);
  assert.equal(response.body.macroDataAdapter.fixtureReadModel.contextCount, 3);
  assert.equal(response.body.macroDataAdapter.fixtureReadModel.indicatorCount, 10);
  assert.equal(response.body.macroDataAdapter.processing.macroFactorLinking, "six-factor-macro-input-v1");
  assert.equal(response.body.macroDataAdapter.freshnessPolicy.status, "blocked");
  assert.equal(response.body.macroDataAdapter.freshnessPolicy.maxIndicatorAgeDays, 7);
  assert.equal(response.body.macroDataAdapter.policyCalendarVerification.status, "blocked");
  assert.ok(
    response.body.macroDataAdapter.policyCalendarVerification.forbiddenAuditFields.includes(
      "rawPolicyDocument",
    ),
  );
  assert.equal(response.body.macroDataAdapter.precheckPolicy.status, "blocked");
  assert.equal(response.body.macroDataAdapter.providerPreflightPlan.mode, "dry-run-no-provider-fetch");
  assert.equal(response.body.macroDataAdapter.providerPreflightPlan.canFetchProviderMacro, false);
  assert.deepEqual(response.body.macroDataAdapter.missingEnvVars, [
    "FINANCE_AI_MACRO_PROVIDER",
    "FINANCE_AI_MACRO_API_KEY",
    "FINANCE_AI_MACRO_FRESHNESS_READY",
    "FINANCE_AI_MACRO_POLICY_CALENDAR_READY",
    "FINANCE_AI_MACRO_PRECHECK_READY",
  ]);
  assert.ok(
    response.body.macroDataAdapter.endpointContracts.some(
      (contract) =>
        contract.method === "getMacroContext" &&
        contract.status === "planned" &&
        contract.fixtureStatus === "available",
    ),
  );
  assert.equal(response.body.macroDataAdapter.safety.noVendorNetworkCalls, true);
  assert.match(response.body.macroDataAdapter.disclaimer, /宏观经济 provider adapter 骨架/);
});

test("macro-data adapter becomes ready for implementation after config and gates", () => {
  const adapter = createMacroDataProviderAdapter({
    env: {
      FINANCE_AI_MACRO_PROVIDER: "official-macro-data",
      FINANCE_AI_MACRO_API_KEY: "secret",
      FINANCE_AI_DATA_LICENSE_CONFIRMED: "true",
      FINANCE_AI_SOURCE_ATTRIBUTION_READY: "true",
      FINANCE_AI_DATA_RATE_LIMIT_PLAN: "true",
      FINANCE_AI_MACRO_FRESHNESS_READY: "true",
      FINANCE_AI_MACRO_POLICY_CALENDAR_READY: "true",
      FINANCE_AI_MACRO_PRECHECK_READY: "true",
    },
  });
  const status = adapter.status();
  assert.equal(status.status, "ready-for-implementation");
  assert.equal(status.selectedProvider, "official-macro-data");
  assert.equal(status.canFetchLiveMacro, false);
  assert.equal(status.canReadFixtures, true);
  assert.equal(status.freshnessPolicy.status, "ready");
  assert.equal(status.policyCalendarVerification.status, "ready");
  assert.equal(status.precheckPolicy.status, "ready");
  assert.equal(status.providerPreflightPlan.status, "blocked");
  assert.equal(status.providerPreflightPlan.canFetchProviderMacro, false);
  assert.equal(status.blockedReasons.length, 0);
});

test("macro-data adapter fetches World Bank Open Data without an API key", async () => {
  const adapter = createMacroDataProviderAdapter({
    env: {
      FINANCE_AI_MACRO_PROVIDER: "world-bank-open-data",
      FINANCE_AI_MACRO_ALLOW_NETWORK: "true",
    },
  });
  const status = adapter.status();
  assert.equal(status.selectedProvider, "world-bank-open-data");
  assert.equal(status.canFetchLiveMacro, true);
  assert.equal(status.worldBankConnector.canRequestProvider, true);
  assert.equal(status.worldBankConnector.requiresApiKey, false);

  const responsePayloads = {
    "NY.GDP.MKTP.KD.ZG": [{}, [{ date: "2024", value: 2.8 }]],
    "FP.CPI.TOTL.ZG": [{}, [{ date: "2024", value: 2.9 }]],
    "FR.INR.RINR": [{}, [{ date: "2024", value: 3.1 }]],
  };
  const result = await adapter.getMacroContext({
    market: "us",
    fetchImpl: async (url) => {
      const text = String(url);
      const indicator = Object.keys(responsePayloads).find((code) => text.includes(code));
      return {
        ok: true,
        json: async () => responsePayloads[indicator],
      };
    },
  });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.source.label, "World Bank Open Data");
  assert.equal(result.indicators.length, 3);
  assert.equal(result.sourceStatus, "world-bank-open-data");
  assert.match(result.disclaimer, /年度数据/);
});

test("macro context endpoint keeps strict blank state without a real macro provider", async () => {
  const response = await requestMock("/api/macro/context?market=us");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.mode, "no-real-data");
  assert.equal(response.body.market, "us");
  assert.equal(response.body.context, null);
  assert.deepEqual(response.body.indicators, []);
  assert.deepEqual(response.body.policyEvents, []);
  assert.equal(response.body.sourceStatus, "no-real-provider-data");
  assert.match(response.body.disclaimer, /不返回样例宏观数据/);
});

test("market-data quote endpoint stays empty without a real provider", async () => {
  const response = await requestMock("/api/market-data/quote?symbol=0700&market=hk");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "unavailable");
  assert.equal(response.body.mode, "no-real-data");
  assert.equal(response.body.quote, null);
  assert.deepEqual(response.body.points, []);
  assert.match(response.body.reason, /fixture 回退已关闭/);
  assert.doesNotMatch(JSON.stringify(response.body), /sample-fixture-not-real-time|lastPrice|386/);
});

test("market-data history endpoint stays empty without a real provider", async () => {
  const response = await requestMock("/api/market-data/history?symbol=AAPL&market=us");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "unavailable");
  assert.notEqual(response.body.mode, "fixture");
  assert.equal(response.body.code, undefined);
  assert.deepEqual(response.body.points, []);
  assert.equal(response.body.mode, "no-real-data");
  assert.match(response.body.reason, /fixture 回退已关闭/);
  assert.doesNotMatch(JSON.stringify(response.body), /local-sample|memory-sample/);
});

test("market-data policy check reports provider gate blockers without vendor calls", async () => {
  const response = await requestMock(
    "/api/market-data/policy-check?symbol=AAPL&market=us&kind=quote",
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.mode, "policy-check");
  assert.equal(response.body.policyGate.id, "market-data-request-policy-gate");
  assert.equal(response.body.policyGate.status, "blocked");
  assert.equal(response.body.policyGate.canUseProvider, false);
  assert.equal(response.body.policyGate.canUseFixture, false);
  assert.equal(response.body.policyGate.fallback, "empty-no-fixture");
  assert.equal(response.body.executionPlan.mode, "policy-check");
  assert.equal(response.body.executionPlan.status, "empty-only");
  assert.equal(response.body.executionPlan.fallback.selected, "empty-no-fixture");
  assert.equal(response.body.runtimeTelemetry.mode, "no-vendor-network");
  assert.equal(response.body.runtimeTelemetry.cache.key, "mock:us:AAPL:spot:snapshot");
  assert.ok(response.body.policyGate.missingAttributionFields.includes("source.label"));
  assert.ok(
    response.body.policyGate.checks.some(
      (check) => check.id === "runtimeMode" && check.status === "blocked",
    ),
  );
  assert.match(response.body.disclaimer, /不会请求真实 provider/);
});

test("market-data runtime status endpoint reports cache and rate-limit telemetry mode", async () => {
  const response = await requestMock("/api/market-data/runtime-status");
  assert.equal(response.status, 200);
  assert.equal(response.body.activeRuntime.id, "mock-market-data-runtime");
  assert.equal(response.body.activeRuntime.executionMode, "no-vendor-network");
  assert.equal(response.body.activeRuntime.cacheStore, "memory-telemetry");
  assert.equal(response.body.activeRuntime.mode, "strict-real-data-observability");
  assert.ok(response.body.activeRuntime.capabilities.includes("cacheLookupTelemetry"));
  assert.ok(response.body.activeRuntime.capabilities.includes("cacheFreshnessTelemetry"));
  assert.ok(response.body.activeRuntime.capabilities.includes("circuitBreakerTelemetry"));
  assert.equal(response.body.activeRuntime.rateLimitWindowSeconds, 60);
  assert.equal(response.body.activeRuntime.circuitBreakerPolicy.failureThreshold, 5);
  assert.equal(response.body.activeRuntime.safety.noVendorNetworkCalls, true);
  assert.equal(response.body.runtimes[0].id, response.body.activeRuntime.id);
});

test("mock market-data runtime models cache freshness and rate-limit windows", () => {
  let currentTime = Date.parse("2026-06-01T00:00:00.000Z");
  const runtime = createMockMarketDataRuntime({ now: () => currentTime });
  const payload = {
    status: "ok",
    executionPlan: {
      cache: {
        key: "licensed-market-data:us:AAPL:spot:snapshot",
        ttlSeconds: 10,
        maxStaleSeconds: 20,
      },
      rateLimit: {
        provider: "licensed-market-data",
        tokenCost: 1,
        maxRequestsPerMinute: 3,
        burstLimit: 2,
      },
      fallback: {
        selected: "provider-first",
        localSampleAllowed: true,
      },
    },
  };

  const first = runtime.execute({ kind: "quote", payload });
  assert.equal(first.runtimeTelemetry.cache.state, "miss");
  assert.equal(first.runtimeTelemetry.cache.stored, true);
  assert.equal(first.runtimeTelemetry.rateLimit.currentWindowCount, 1);
  assert.equal(first.runtimeTelemetry.rateLimit.remainingWindowTokens, 2);

  currentTime += 5_000;
  const second = runtime.execute({ kind: "quote", payload });
  assert.equal(second.runtimeTelemetry.cache.state, "fresh");
  assert.equal(second.runtimeTelemetry.cache.hit, true);
  assert.equal(second.runtimeTelemetry.cache.stored, false);
  assert.equal(second.runtimeTelemetry.rateLimit.currentWindowCount, 2);

  currentTime += 10_000;
  const third = runtime.execute({ kind: "quote", payload });
  assert.equal(third.runtimeTelemetry.cache.state, "stale");
  assert.equal(third.runtimeTelemetry.cache.hit, true);
  assert.equal(third.runtimeTelemetry.cache.refreshSuggested, true);
  assert.equal(third.runtimeTelemetry.rateLimit.currentWindowCount, 3);

  currentTime += 60_000;
  const fourth = runtime.execute({ kind: "quote", payload });
  assert.equal(fourth.runtimeTelemetry.cache.state, "expired");
  assert.equal(fourth.runtimeTelemetry.cache.stored, true);
  assert.equal(fourth.runtimeTelemetry.rateLimit.currentWindowCount, 1);

  const status = runtime.status();
  assert.equal(status.cacheRecords[0].state, "fresh");
  assert.equal(status.rateLimitWindows[0].remaining, 2);
  assert.equal(status.recentExecutions[0].cacheState, "expired");
  assert.equal(status.cachePolicy.freshnessModel, "fresh-stale-expired");
});

test("mock market-data runtime opens and closes circuit breaker around provider failures", () => {
  let currentTime = Date.parse("2026-06-01T00:00:00.000Z");
  const runtime = createMockMarketDataRuntime({ now: () => currentTime });

  for (let index = 0; index < 4; index += 1) {
    const failure = runtime.recordProviderFailure({
      provider: "licensed-market-data",
      kind: "quote",
      reason: "timeout",
    });
    assert.equal(failure.state, "closed");
  }

  const opened = runtime.recordProviderFailure({
    provider: "licensed-market-data",
    kind: "quote",
    reason: "timeout",
  });
  assert.equal(opened.state, "open");
  assert.equal(opened.consecutiveFailures, 5);
  assert.match(opened.coolDownUntil, /2026-06-01T00:01:00/);

  currentTime += 61_000;
  const halfOpen = runtime.status().circuitBreakers[0];
  assert.equal(halfOpen.state, "half-open");

  const payload = {
    status: "ok",
    executionPlan: {
      cache: { key: "licensed-market-data:us:AAPL:spot:snapshot", ttlSeconds: 10, maxStaleSeconds: 20 },
      rateLimit: { provider: "licensed-market-data", tokenCost: 1, maxRequestsPerMinute: 60 },
      fallback: { selected: "provider-first", localSampleAllowed: true },
    },
  };
  const success = runtime.execute({ kind: "quote", payload });
  assert.equal(success.runtimeTelemetry.circuitBreaker.stateBefore, "half-open");
  assert.equal(success.runtimeTelemetry.circuitBreaker.stateAfter, "closed");
  assert.equal(runtime.status().circuitBreakers[0].consecutiveFailures, 0);
});

test("authenticated empty market-data request does not fabricate runtime audit event", async () => {
  const state = createMockState();
  const headers = { authorization: "Bearer demo-token" };
  const quote = await requestMock("/api/market-data/quote?symbol=AAPL&market=us", { headers }, state);
  assert.equal(quote.status, 200);
  assert.equal(quote.body.status, "unavailable");
  assert.equal(quote.body.mode, "no-real-data");
  assert.equal(quote.body.runtimeTelemetry, undefined);

  const auditLog = await requestMock("/api/audit-log", { headers }, state);
  assert.equal(auditLog.status, 200);
  const runtimeEvent = auditLog.body.items.find(
    (event) => event.eventType === "marketData.request.runtime",
  );
  assert.equal(runtimeEvent, undefined);
});

test("market-data trading-calendar endpoint stays empty without a real calendar provider", async () => {
  const response = await requestMock(
    "/api/market-data/trading-calendar?market=a&from=2026-06-01&to=2026-06-07",
  );
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "unavailable");
  assert.equal(response.body.mode, "no-real-data");
  assert.deepEqual(response.body.points, []);
  assert.equal(response.body.quote, null);
  assert.match(response.body.reason, /fixture 回退已关闭/);
});

test("market-data quote endpoint keeps blank state instead of defaulting to another stock", async () => {
  const response = await requestMock("/api/market-data/quote?symbol=NO_MATCH&market=us");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "unavailable");
  assert.equal(response.body.mode, "no-real-data");
  assert.equal(response.body.quote, null);
  assert.doesNotMatch(JSON.stringify(response.body), /AAPL|Apple|Microsoft|贵州茅台|腾讯控股/);
});

test("news-filings adapter endpoint reports strict empty news and statement contracts", async () => {
  const response = await requestMock("/api/data-sources/news-filings-adapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.newsFilingsAdapter.id, "news-filings-provider-adapter");
  assert.equal(response.body.newsFilingsAdapter.status, "blocked");
  assert.equal(response.body.newsFilingsAdapter.runtimeMode, "inactive");
  assert.equal(response.body.newsFilingsAdapter.canFetchLiveNews, false);
  assert.equal(response.body.newsFilingsAdapter.fixtureReadModel.newsCount, 0);
  assert.equal(response.body.newsFilingsAdapter.fixtureReadModel.filingCount, 0);
  assert.equal(response.body.newsFilingsAdapter.fixtureReadModel.publicStatementCount, 0);
  assert.equal(
    response.body.newsFilingsAdapter.processing.importanceScoring,
    "explainable-weighted-score-v1",
  );
  assert.equal(response.body.newsFilingsAdapter.processing.persistence, "mock-repository-on-demand");
  assert.equal(response.body.newsFilingsAdapter.sourceVerificationPolicy.status, "blocked");
  assert.ok(
    response.body.newsFilingsAdapter.sourceVerificationPolicy.forbiddenAuditFields.includes(
      "rawSocialPost",
    ),
  );
  assert.equal(response.body.newsFilingsAdapter.publicStatementVerificationPolicy.status, "blocked");
  assert.ok(
    response.body.newsFilingsAdapter.publicStatementVerificationPolicy.requiredSignals.includes(
      "verificationStatus",
    ),
  );
  assert.equal(
    response.body.newsFilingsAdapter.publicStatementVerificationPolicy.blocksUnverifiedHighImpactStatements,
    true,
  );
  assert.equal(response.body.newsFilingsAdapter.publicStatementManualReviewPolicy.status, "blocked");
  assert.ok(
    response.body.newsFilingsAdapter.publicStatementManualReviewPolicy.reviewTriggers.includes(
      "highMarketImpact",
    ),
  );
  assert.ok(
    response.body.newsFilingsAdapter.publicStatementManualReviewPolicy.queueFields.includes(
      "reviewStatus",
    ),
  );
  assert.equal(response.body.newsFilingsAdapter.redistributionPolicy.status, "blocked");
  assert.equal(response.body.newsFilingsAdapter.redistributionPolicy.blocksFullTextStorage, true);
  assert.equal(response.body.newsFilingsAdapter.ingestionPrecheckPolicy.status, "blocked");
  assert.equal(
    response.body.newsFilingsAdapter.alphaVantageNewsConnector.providerId,
    "alpha-vantage-news",
  );
  assert.equal(
    response.body.newsFilingsAdapter.alphaVantageNewsConnector.functionName,
    "NEWS_SENTIMENT",
  );
  assert.equal(response.body.newsFilingsAdapter.alphaVantageNewsSmokeTestPlan.demoTicker, "AAPL");
  assert.equal(
    response.body.newsFilingsAdapter.providerPreflightPlan.mode,
    "dry-run-no-provider-fetch",
  );
  assert.equal(response.body.newsFilingsAdapter.providerPreflightPlan.canFetchProviderContent, false);
  assert.equal(
    response.body.newsFilingsAdapter.alphaVantageNewsCredentialPreflight.mode,
    "no-secret-credential-preflight",
  );
  assert.equal(
    response.body.newsFilingsAdapter.alphaVantageNewsCredentialPreflight.apiKeyStatus,
    "missing",
  );
  assert.ok(
    response.body.newsFilingsAdapter.alphaVantageNewsCredentialPreflight.forbiddenAuditFields.includes(
      "apiKey",
    ),
  );
  assert.ok(
    response.body.newsFilingsAdapter.missingEnvVars.includes(
      "FINANCE_AI_NEWS_SOURCE_VERIFICATION_READY",
    ),
  );
  assert.ok(
    response.body.newsFilingsAdapter.endpointContracts.some(
      (contract) =>
        contract.method === "listPublicStatements" &&
        contract.status === "planned" &&
        contract.fixtureStatus === "available",
    ),
  );
  assert.match(response.body.newsFilingsAdapter.disclaimer, /新闻\/公告\/公开言论 provider adapter 骨架/);
});

test("news-filings adapter becomes ready for implementation after config and gates", () => {
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_NEWS_PROVIDER: "licensed-news-filings",
      FINANCE_AI_NEWS_API_KEY: "secret",
      FINANCE_AI_STATEMENT_PROVIDER: "verified-public-statements",
      FINANCE_AI_STATEMENT_API_KEY: "secret",
      FINANCE_AI_DATA_LICENSE_CONFIRMED: "true",
      FINANCE_AI_SOURCE_ATTRIBUTION_READY: "true",
      FINANCE_AI_DATA_RATE_LIMIT_PLAN: "true",
      FINANCE_AI_NEWS_SOURCE_VERIFICATION_READY: "true",
      FINANCE_AI_NEWS_REDISTRIBUTION_READY: "true",
      FINANCE_AI_NEWS_INGESTION_PRECHECK_READY: "true",
      FINANCE_AI_STATEMENT_IDENTITY_READY: "true",
      FINANCE_AI_STATEMENT_PLATFORM_TERMS_READY: "true",
      FINANCE_AI_STATEMENT_REVIEW_QUEUE_READY: "true",
    },
  });
  const status = adapter.status();
  assert.equal(status.status, "ready-for-implementation");
  assert.equal(status.selectedNewsProvider, "licensed-news-filings");
  assert.equal(status.selectedStatementProvider, "verified-public-statements");
  assert.equal(status.canFetchLiveNews, false);
  assert.equal(status.canReadFixtures, true);
  assert.equal(status.sourceVerificationPolicy.status, "ready");
  assert.equal(status.publicStatementVerificationPolicy.status, "ready");
  assert.equal(status.publicStatementManualReviewPolicy.status, "ready");
  assert.equal(status.redistributionPolicy.status, "ready");
  assert.equal(status.ingestionPrecheckPolicy.status, "ready");
  assert.equal(status.providerPreflightPlan.status, "blocked");
  assert.equal(status.providerPreflightPlan.canFetchProviderContent, false);
});

test("news-filings adapter parses Alpha Vantage news sentiment response", () => {
  const parsed = parseAlphaVantageNewsSentiment(
    {
      feed: [
        {
          title: "Apple AI update lifts sentiment",
          url: "https://example.com/apple-ai",
          time_published: "20260606T071259",
          summary: "Apple AI update summary.",
          source: "Example News",
          topics: [{ topic: "technology", relevance_score: "0.91" }],
          overall_sentiment_score: 0.42,
          overall_sentiment_label: "Bullish",
          ticker_sentiment: [
            {
              ticker: "AAPL",
              relevance_score: "0.99",
              ticker_sentiment_score: "0.48",
              ticker_sentiment_label: "Bullish",
            },
          ],
        },
      ],
    },
    { market: "us", symbol: "AAPL" },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.mode, "real-provider");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].publishedAt, "2026-06-06T07:12:59.000Z");
  assert.equal(parsed.items[0].source.label, "Example News");
  assert.equal(parsed.items[0].sentiment.tickerLabel, "Bullish");
  assert.equal(parsed.provider.endpoint, "NEWS_SENTIMENT");
  assert.match(parsed.provider.requestUrlRedacted, /apikey=REDACTED/);
});

test("news-filings adapter parses GDELT DOC public news response", () => {
  const parsed = parseGdeltDocNews(
    {
      articles: [
        {
          title: "Microsoft shares move after AI infrastructure update",
          url: "https://example.com/msft-ai",
          domain: "example.com",
          seendate: "20260611123000",
          sourcecountry: "US",
          language: "English",
          urlhash: "abc123",
        },
      ],
    },
    { market: "us", symbol: "MSFT", limit: 5 },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.mode, "real-provider");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].title, "Microsoft shares move after AI infrastructure update");
  assert.equal(parsed.items[0].source.label, "example.com");
  assert.equal(parsed.items[0].publishedAt, "2026-06-11T12:30:00.000Z");
  assert.equal(parsed.provider.id, "gdelt-doc-news");
});

test("news-filings adapter parses Yahoo Finance RSS headline response", () => {
  const parsed = parseYahooFinanceRss(
    `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Microsoft shares rise after cloud update]]></title><link>https://finance.yahoo.com/news/msft-cloud</link><pubDate>Thu, 11 Jun 2026 12:30:00 GMT</pubDate></item></channel></rss>`,
    { market: "us", symbol: "MSFT", limit: 5 },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.mode, "real-provider");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].title, "Microsoft shares rise after cloud update");
  assert.equal(parsed.items[0].source.label, "Yahoo Finance RSS");
  assert.equal(parsed.items[0].publishedAt, "2026-06-11T12:30:00.000Z");
  assert.equal(parsed.items[0].providerRelevance.level, "company-direct");
  assert.equal(parsed.items[0].providerRelevance.matchedAlias, "microsoft");
  assert.equal(parsed.provider.id, "yahoo-finance-rss");
});

test("news-filings adapter does not treat synthetic related tickers as MSFT relevance", () => {
  const parsed = parseYahooFinanceRss(
    `<?xml version="1.0"?><rss><channel>
      <item><title>Meta Platforms receives bullish analyst note</title><link>https://finance.yahoo.com/news/meta-note</link><pubDate>Thu, 11 Jun 2026 12:30:00 GMT</pubDate></item>
      <item><title>Ryanair says travel demand is steady</title><link>https://finance.yahoo.com/news/ryanair-demand</link><pubDate>Thu, 11 Jun 2026 12:32:00 GMT</pubDate></item>
      <item><title>Microsoft Azure demand lifts cloud outlook</title><link>https://finance.yahoo.com/news/azure-cloud</link><pubDate>Thu, 11 Jun 2026 12:34:00 GMT</pubDate></item>
    </channel></rss>`,
    { market: "us", symbol: "MSFT", limit: 5 },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].title, "Microsoft Azure demand lifts cloud outlook");
  assert.equal(parsed.items[0].providerRelevance.level, "company-direct");
  assert.doesNotMatch(JSON.stringify(parsed.items), /Meta Platforms|Ryanair/);
});

test("news-filings adapter filters Yahoo RSS headlines by A-share company relevance", () => {
  const parsed = parseYahooFinanceRss(
    `<?xml version="1.0"?><rss><channel>
      <item><title>China AI Supplier Takes Top CSI 300 Spot With 5.3% Weight</title><link>https://finance.yahoo.com/news/csi-ai</link><pubDate>Thu, 04 Jun 2026 17:19:30 GMT</pubDate></item>
      <item><title>KWEICHOW MOUTAI Holds 2026 International Distributor Conference</title><link>https://finance.yahoo.com/news/kweichow-moutai</link><pubDate>Sun, 22 Mar 2026 04:38:00 GMT</pubDate></item>
      <item><title>Moutai Cultural Exhibition Opens in New York</title><link>https://finance.yahoo.com/news/moutai-cultural</link><pubDate>Mon, 08 Dec 2025 16:13:00 GMT</pubDate></item>
    </channel></rss>`,
    { market: "a", symbol: "600519", limit: 5 },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items.some((item) => item.title.includes("China AI Supplier")), false);
  assert.ok(parsed.items.every((item) => /MOUTAI|Moutai/.test(item.title)));
  assert.equal(parsed.provider.requestedTicker, "600519");
});

test("news-filings adapter rejects Yahoo RSS stock feed when no headline matches company", () => {
  const parsed = parseYahooFinanceRss(
    `<?xml version="1.0"?><rss><channel>
      <item><title>China AI Supplier Takes Top CSI 300 Spot With 5.3% Weight</title><link>https://finance.yahoo.com/news/csi-ai</link><pubDate>Thu, 04 Jun 2026 17:19:30 GMT</pubDate></item>
    </channel></rss>`,
    { market: "a", symbol: "600519", limit: 5 },
  );

  assert.equal(parsed.status, "provider-error");
  assert.equal(parsed.error.code, "YAHOO_FINANCE_RSS_RELEVANCE_EMPTY");
});

test("news-filings adapter parses Google News RSS with company relevance", () => {
  const parsed = parseGoogleNewsRss(
    `<?xml version="1.0"?><rss><channel>
      <item><title>Moutai Shares Surge After It Hikes Price of Flagship Liquor - Bloomberg.com</title><link>https://news.google.com/rss/articles/moutai</link><pubDate>Thu, 11 Jun 2026 08:16:00 GMT</pubDate><source url="https://www.bloomberg.com">Bloomberg.com</source></item>
      <item><title>Consumer stocks rise in China</title><link>https://news.google.com/rss/articles/consumer</link><pubDate>Thu, 11 Jun 2026 08:18:00 GMT</pubDate><source>Example</source></item>
    </channel></rss>`,
    { market: "a", symbol: "600519", limit: 5 },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.mode, "real-provider");
  assert.equal(parsed.provider.id, "google-news-rss");
  assert.equal(parsed.items.length, 1);
  assert.match(parsed.items[0].title, /Moutai/);
  assert.equal(parsed.items[0].source.label, "Bloomberg.com");
});

test("news-filings adapter reports Yahoo RSS temporary error page", async () => {
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_NEWS_PROVIDER: "yahoo-finance-rss",
      FINANCE_AI_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_YAHOO_NEWS_ALLOW_NETWORK: "true",
    },
    fetchImpl: async () => ({
      ok: true,
      text: async () => "<html><h1>Will be right back...</h1><script>sad-panda</script></html>",
    }),
  });

  const result = await adapter.listImportantNews({ market: "a", symbol: "600519" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "no-real-data");
  assert.equal(result.providerError.code, "YAHOO_FINANCE_RSS_TEMPORARY_UNAVAILABLE");
  assert.deepEqual(result.providerRelay.failedProviders, ["YAHOO_FINANCE_RSS_TEMPORARY_UNAVAILABLE"]);
});

test("news-filings adapter falls back to Google News RSS when Yahoo is unavailable", async () => {
  const requestedUrls = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_NEWS_PROVIDER: "multi-free-news",
      FINANCE_AI_NEWS_API_KEY: "alpha-secret",
      FINANCE_AI_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_YAHOO_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_GOOGLE_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_GDELT_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_NEWS_LIMIT: "5",
    },
    fetchImpl: async (url) => {
      const text = String(url);
      requestedUrls.push(text);
      if (text.includes("alphavantage")) {
        return { ok: true, json: async () => ({ Information: "rate limit" }) };
      }
      if (text.includes("finance.yahoo")) {
        return { ok: true, text: async () => "<html><h1>Will be right back...</h1></html>" };
      }
      if (text.includes("news.google.com")) {
        return {
          ok: true,
          text: async () =>
            `<?xml version="1.0"?><rss><channel><item><title>Kweichow Moutai public Google News headline</title><link>https://news.google.com/rss/articles/moutai</link><pubDate>Thu, 11 Jun 2026 08:16:00 GMT</pubDate><source>Google Source</source></item></channel></rss>`,
        };
      }
      throw new Error("GDELT should not be called when Google News succeeds.");
    },
  });

  const result = await adapter.listImportantNews({ market: "a", symbol: "600519" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.provider.id, "google-news-rss");
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.providerRelay.failedProviders, [
    "ALPHA_VANTAGE_NEWS_UNSUPPORTED_SYMBOL",
    "YAHOO_FINANCE_RSS_TEMPORARY_UNAVAILABLE",
  ]);
  assert.ok(requestedUrls.some((url) => url.includes("news.google.com")));
  assert.equal(requestedUrls.some((url) => url.includes("gdeltproject")), false);
});

test("news-filings adapter falls back to Yahoo RSS when Alpha Vantage news is rate limited", async () => {
  const requestedUrls = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_NEWS_PROVIDER: "multi-free-news",
      FINANCE_AI_NEWS_API_KEY: "alpha-secret",
      FINANCE_AI_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_YAHOO_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_GDELT_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_NEWS_LIMIT: "5",
    },
    fetchImpl: async (url) => {
      const text = String(url);
      requestedUrls.push(text);
      if (text.includes("alphavantage")) {
        return {
          ok: true,
          json: async () => ({
            Information:
              "We have detected your api key as alpha-secret and our standard API rate limit is 25 requests per day.",
          }),
        };
      }
      if (text.includes("finance.yahoo")) {
        return {
          ok: true,
          text: async () =>
            `<?xml version="1.0"?><rss><channel><item><title>Microsoft Yahoo RSS news</title><link>https://finance.yahoo.com/news/msft</link><pubDate>Thu, 11 Jun 2026 12:30:00 GMT</pubDate></item></channel></rss>`,
        };
      }
      throw new Error("GDELT should not be called when Yahoo succeeds.");
    },
  });

  const result = await adapter.listImportantNews({ market: "us", symbol: "MSFT" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.provider.id, "yahoo-finance-rss");
  assert.equal(result.items.length, 1);
  assert.match(result.items[0].title, /Yahoo RSS/);
  assert.deepEqual(result.providerRelay.failedProviders, ["ALPHA_VANTAGE_NEWS_EMPTY"]);
  assert.ok(requestedUrls.some((url) => url.includes("alphavantage")));
  assert.ok(requestedUrls.some((url) => url.includes("finance.yahoo")));
  assert.equal(requestedUrls.some((url) => url.includes("gdeltproject")), false);
});

test("news-filings adapter falls back to GDELT when Alpha Vantage news is rate limited", async () => {
  const requestedUrls = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_NEWS_PROVIDER: "multi-free-news",
      FINANCE_AI_NEWS_API_KEY: "alpha-secret",
      FINANCE_AI_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_GDELT_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_NEWS_LIMIT: "5",
    },
    fetchImpl: async (url) => {
      const text = String(url);
      requestedUrls.push(text);
      if (text.includes("alphavantage")) {
        return {
          ok: true,
          json: async () => ({
            Information:
              "We have detected your api key as alpha-secret and our standard API rate limit is 25 requests per day.",
          }),
        };
      }
      if (text.includes("finance.yahoo")) {
        return { ok: false, status: 503, text: async () => "" };
      }
      return {
        ok: true,
        text: async () => JSON.stringify({
          articles: [
            {
              title: "Microsoft public news from GDELT",
              url: "https://example.com/msft-gdelt",
              domain: "example.com",
              seendate: "20260611123000",
              urlhash: "gdelt-msft",
            },
          ],
        }),
      };
    },
  });

  const result = await adapter.listImportantNews({ market: "us", symbol: "MSFT" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.provider.id, "gdelt-doc-news");
  assert.equal(result.items.length, 1);
  assert.match(result.items[0].title, /GDELT/);
  assert.deepEqual(result.providerRelay.failedProviders, [
    "ALPHA_VANTAGE_NEWS_EMPTY",
    "YAHOO_FINANCE_RSS_HTTP_ERROR",
    "GOOGLE_NEWS_RSS_EMPTY",
  ]);
  assert.ok(requestedUrls.some((url) => url.includes("alphavantage")));
  assert.ok(requestedUrls.some((url) => url.includes("finance.yahoo")));
  assert.ok(requestedUrls.some((url) => url.includes("gdeltproject")));
});

test("news-filings adapter falls back to GDELT for A-share public news", async () => {
  const requestedUrls = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_NEWS_PROVIDER: "multi-free-news",
      FINANCE_AI_NEWS_API_KEY: "alpha-secret",
      FINANCE_AI_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_YAHOO_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_GDELT_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_NEWS_LIMIT: "5",
    },
    fetchImpl: async (url) => {
      const text = String(url);
      requestedUrls.push(text);
      if (text.includes("alphavantage")) {
        return {
          ok: true,
          json: async () => ({ feed: [] }),
        };
      }
      if (text.includes("finance.yahoo")) {
        return { ok: false, status: 503, text: async () => "" };
      }
      return {
        ok: true,
        text: async () => JSON.stringify({
          articles: [
            {
              title: "Kweichow Moutai public news from GDELT",
              url: "https://example.com/moutai-gdelt",
              domain: "example.com",
              seendate: "20260612103000",
              urlhash: "gdelt-moutai",
            },
          ],
        }),
      };
    },
  });

  const result = await adapter.listImportantNews({ market: "a", symbol: "600519" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.provider.id, "gdelt-doc-news");
  assert.equal(result.items[0].market, "a");
  assert.match(result.items[0].title, /Moutai/);
  assert.ok(requestedUrls.some((url) => url.includes("600519")));
  assert.ok(
    requestedUrls.some((url) => decodeURIComponent(url.replace(/\+/g, "%20")).includes("Kweichow Moutai")),
  );
});

test("news-filings adapter reports GDELT rate-limit text response", async () => {
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_NEWS_PROVIDER: "gdelt-doc-news",
      FINANCE_AI_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_GDELT_NEWS_ALLOW_NETWORK: "true",
    },
    fetchImpl: async () => ({
      ok: true,
      text: async () => "Please limit requests to one every 5 seconds.",
    }),
  });

  const result = await adapter.listImportantNews({ market: "a", symbol: "600519" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "no-real-data");
  assert.equal(result.providerError.code, "GDELT_NEWS_RATE_LIMIT");
  assert.deepEqual(result.providerRelay.failedProviders, ["GDELT_NEWS_RATE_LIMIT"]);
});

test("news-filings adapter can fetch Alpha Vantage news when explicit network flag is enabled", async () => {
  const requestedUrls = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_NEWS_PROVIDER: "alpha-vantage-news",
      FINANCE_AI_NEWS_API_KEY: "demo",
      FINANCE_AI_NEWS_ALLOW_NETWORK: "true",
      FINANCE_AI_NEWS_LIMIT: "3",
    },
    fetchImpl: async (url) => {
      requestedUrls.push(String(url));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          feed: [
            {
              title: "Apple provider news",
              url: "https://example.com/provider-news",
              time_published: "20260606T090700",
              summary: "Provider news summary.",
              source: "Provider News",
              overall_sentiment_score: 0.1,
              overall_sentiment_label: "Neutral",
              ticker_sentiment: [
                {
                  ticker: "AAPL",
                  relevance_score: "1.0",
                  ticker_sentiment_score: "0.31",
                  ticker_sentiment_label: "Somewhat-Bullish",
                },
              ],
            },
          ],
        }),
      };
    },
  });

  const status = adapter.status();
  assert.equal(status.canFetchLiveNews, true);
  assert.equal(status.alphaVantageNewsConnector.canRequestProvider, true);
  const result = await adapter.listImportantNews({ market: "us", symbol: "AAPL" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.items[0].mode, "real-provider");
  assert.equal(result.items[0].sentiment.tickerLabel, "Somewhat-Bullish");
  assert.equal(result.sourceStatus, "alpha-vantage-news-sentiment");
  assert.match(requestedUrls[0], /function=NEWS_SENTIMENT/);
  assert.match(requestedUrls[0], /tickers=AAPL/);
  assert.match(requestedUrls[0], /apikey=demo/);
});

test("news-filings adapter redacts Alpha Vantage key from provider error messages", () => {
  const parsed = parseAlphaVantageNewsSentiment(
    {
      Information:
        "We have detected your API key as SECRETKEY456 and our standard API rate limit is 25 requests per day.",
    },
    { market: "us", symbol: "AAPL", apiKey: "SECRETKEY456" },
  );

  assert.equal(parsed.status, "provider-error");
  assert.equal(parsed.error.code, "ALPHA_VANTAGE_NEWS_EMPTY");
  assert.match(parsed.error.message, /api key as REDACTED/);
  assert.doesNotMatch(parsed.error.message, /SECRETKEY456/);
});

test("news-filings adapter parses SEC company submissions response", () => {
  const parsed = parseSecCompanySubmissions(
    {
      cik: "0000320193",
      filings: {
        recent: {
          form: ["10-K", "8-K"],
          filingDate: ["2026-02-01", "2026-01-15"],
          reportDate: ["2025-12-31", "2026-01-14"],
          accessionNumber: ["0000320193-26-000010", "0000320193-26-000005"],
          primaryDocument: ["aapl-20251231.htm", "aapl-20260114.htm"],
        },
      },
    },
    { market: "us", symbol: "AAPL", limit: 2 },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.mode, "real-provider");
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].source.label, "SEC EDGAR");
  assert.equal(parsed.items[0].filingType, "10-K");
  assert.equal(parsed.items[0].publishedAt, "2026-02-01T00:00:00.000Z");
  assert.match(parsed.items[0].sourceUrl, /sec\.gov\/Archives\/edgar\/data\/320193/);
  assert.equal(parsed.items[0].mode, "real-provider");
  assert.equal(parsed.provider.requestedCik, "0000320193");
});

test("news-filings adapter parses SSE A-share company bulletins", () => {
  const parsed = parseSseCompanyBulletins(
    {
      result: [
        {
          SECURITY_CODE: "600519",
          SECURITY_NAME: "贵州茅台",
          SSEDATE: "2026-06-12",
          ADDDATE: "2026-06-11 20:55:02",
          BULLETIN_HEADING: "临时公告",
          BULLETIN_TYPE: "其它",
          TITLE: "贵州茅台第五届董事会2026年度第一次会议决议公告",
          URL: "/disclosure/listedinfo/announcement/c/new/2026-06-12/600519_20260612_1OS9.pdf",
        },
      ],
    },
    { market: "a", symbol: "600519", limit: 5 },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.mode, "real-provider");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].source.label, "上海证券交易所公告");
  assert.equal(parsed.items[0].filingType, "临时公告");
  assert.equal(parsed.items[0].publishedAt, "2026-06-12T00:00:00.000Z");
  assert.match(parsed.items[0].sourceUrl, /sse\.com\.cn\/disclosure\/listedinfo/);
});

test("news-filings adapter parses HKEX company announcements", () => {
  const parsed = parseHkexCompanyAnnouncements(
    {
      result: JSON.stringify([
        {
          FILE_INFO: "249KB",
          NEWS_ID: "12190001",
          SHORT_TEXT: "Announcements and Notices - [Monthly Returns]<br/>",
          STOCK_NAME: "TENCENT",
          TITLE: "Monthly Return of Equity Issuer on Movements in Securities",
          FILE_TYPE: "PDF",
          DATE_TIME: "05/06/2026 16:31",
          LONG_TEXT: "Announcements and Notices - [Monthly Returns]",
          STOCK_CODE: "00700<br/>80700",
          FILE_LINK: "/listedco/listconews/sehk/2026/0605/2026060501200.pdf",
        },
      ]),
    },
    { market: "hk", symbol: "0700", limit: 5 },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.mode, "real-provider");
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].source.label, "HKEXnews");
  assert.equal(parsed.items[0].code, "00700");
  assert.doesNotMatch(parsed.items[0].summary, /<br/i);
  assert.equal(parsed.items[0].publishedAt, "2026-06-05T16:31:00.000+08:00");
  assert.match(parsed.items[0].sourceUrl, /hkexnews\.hk\/listedco\/listconews\/sehk/);
  assert.equal(parsed.items[0].mode, "real-provider");
});

test("news-filings adapter parses HKEX stock search JSONP", () => {
  const parsed = parseHkexStockSearchJsonp(
    'callback({"more":"1","stockInfo":[{"stockId":7609,"code":"00700","name":"TENCENT"}]});',
    { market: "hk", symbol: "0700" },
  );

  assert.equal(parsed.status, "ok");
  assert.equal(parsed.stockId, "7609");
  assert.equal(parsed.code, "00700");
  assert.equal(parsed.name, "TENCENT");
  assert.equal(parsed.provider.id, "hkex-stock-search-prefix");
});

test("news-filings adapter can fetch SEC filings when explicit public-source flag is enabled", async () => {
  const requested = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_FILINGS_PROVIDER: "sec-company-submissions",
      FINANCE_AI_FILINGS_ALLOW_NETWORK: "true",
      FINANCE_AI_SEC_USER_AGENT: "finance-ai-assistant local-test serena@example.invalid",
      FINANCE_AI_FILINGS_LIMIT: "2",
    },
    fetchImpl: async (url, options = {}) => {
      requested.push({ url: String(url), userAgent: options.headers?.["User-Agent"] });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          cik: "0000320193",
          filings: {
            recent: {
              form: ["10-Q"],
              filingDate: ["2026-05-02"],
              reportDate: ["2026-03-31"],
              accessionNumber: ["0000320193-26-000030"],
              primaryDocument: ["aapl-20260331.htm"],
            },
          },
        }),
      };
    },
  });

  const status = adapter.status();
  assert.equal(status.canFetchLiveFilings, true);
  assert.equal(status.secFilingsConnector.canRequestProvider, true);
  assert.equal(status.secFilingsAccessPreflight.noApiKeyRequired, true);
  const result = await adapter.listCompanyFilings({ market: "us", symbol: "AAPL" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.items[0].source.label, "SEC EDGAR");
  assert.equal(result.items[0].sourceCredibilityScore, 96);
  assert.equal(result.items[0].importanceBreakdown.sourceCredibility, 96);
  assert.equal(result.items[0].filingType, "10-Q");
  assert.equal(result.sourceStatus, "sec-company-submissions");
  assert.match(requested[0].url, /CIK0000320193\.json/);
  assert.match(requested[0].userAgent, /finance-ai-assistant/);
});

test("news-filings adapter can fetch SSE filings for A-shares before SEC fallback", async () => {
  const requested = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_FILINGS_PROVIDER: "sec-company-submissions",
      FINANCE_AI_FILINGS_ALLOW_NETWORK: "true",
      FINANCE_AI_SEC_USER_AGENT: "finance-ai-assistant local-test serena@example.invalid",
      FINANCE_AI_FILINGS_LIMIT: "2",
    },
    fetchImpl: async (url, options = {}) => {
      requested.push({ url: String(url), referer: options.headers?.Referer });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: [
            {
              SECURITY_CODE: "600519",
              SECURITY_NAME: "贵州茅台",
              SSEDATE: "2026-06-12",
              BULLETIN_HEADING: "临时公告",
              TITLE: "贵州茅台关于聘任董事会秘书的公告",
              URL: "/disclosure/listedinfo/announcement/c/new/2026-06-12/600519_20260612_PHHH.pdf",
            },
          ],
        }),
      };
    },
  });

  const result = await adapter.listCompanyFilings({ market: "a", symbol: "600519" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.provider.id, "sse-company-bulletins");
  assert.equal(result.items[0].source.label, "上海证券交易所公告");
  assert.equal(result.items[0].sourceCredibilityScore, 95);
  assert.equal(result.items[0].importanceBreakdown.sourceCredibility, 95);
  assert.equal(result.providerRelay.attemptedProviders[0], "sse-company-bulletins");
  assert.ok(requested[0].url.includes("queryCompanyBulletin.do"));
  assert.equal(requested[0].referer, "https://www.sse.com.cn/");
  assert.equal(requested.length, 1);
});

test("news-filings adapter can fetch HKEX filings for Hong Kong stocks before SEC fallback", async () => {
  const requested = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_FILINGS_PROVIDER: "multi-free-filings",
      FINANCE_AI_FILINGS_ALLOW_NETWORK: "true",
      FINANCE_AI_SEC_USER_AGENT: "finance-ai-assistant local-test serena@example.invalid",
      FINANCE_AI_FILINGS_LIMIT: "2",
    },
    fetchImpl: async (url, options = {}) => {
      requested.push({ url: String(url), referer: options.headers?.Referer });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: JSON.stringify([
            {
              STOCK_CODE: "00700",
              STOCK_NAME: "TENCENT",
              DATE_TIME: "05/06/2026 16:31",
              LONG_TEXT: "Announcements and Notices - [Monthly Returns]",
              TITLE: "Monthly Return of Equity Issuer on Movements in Securities",
              FILE_LINK: "/listedco/listconews/sehk/2026/0605/2026060501200.pdf",
              NEWS_ID: "12190001",
            },
          ]),
        }),
      };
    },
  });

  const result = await adapter.listCompanyFilings({ market: "hk", symbol: "0700" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.provider.id, "hkex-company-announcements");
  assert.equal(result.items[0].source.label, "HKEXnews");
  assert.equal(result.items[0].sourceCredibilityScore, 94);
  assert.equal(result.items[0].importanceBreakdown.sourceCredibility, 94);
  assert.equal(result.providerRelay.attemptedProviders[0], "hkex-company-announcements");
  assert.ok(requested[0].url.includes("titleSearchServlet.do"));
  assert.equal(requested[0].referer, "https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=en");
  assert.equal(requested.length, 1);
});

test("news-filings adapter looks up HKEX stockId before fetching unmapped Hong Kong filings", async () => {
  const requested = [];
  const adapter = createNewsFilingsProviderAdapter({
    env: {
      FINANCE_AI_FILINGS_PROVIDER: "multi-free-filings",
      FINANCE_AI_FILINGS_ALLOW_NETWORK: "true",
      FINANCE_AI_SEC_USER_AGENT: "finance-ai-assistant local-test serena@example.invalid",
      FINANCE_AI_FILINGS_LIMIT: "2",
    },
    fetchImpl: async (url) => {
      requested.push(String(url));
      if (String(url).includes("prefix.do")) {
        return {
          ok: true,
          status: 200,
          text: async () => 'callback({"more":"1","stockInfo":[{"stockId":12345,"code":"09988","name":"BABA-W"}]});',
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: JSON.stringify([
            {
              STOCK_CODE: "09988",
              STOCK_NAME: "BABA-W",
              DATE_TIME: "05/06/2026 16:31",
              LONG_TEXT: "Announcements and Notices - [Monthly Returns]",
              TITLE: "Monthly Return of Equity Issuer on Movements in Securities",
              FILE_LINK: "/listedco/listconews/sehk/2026/0605/2026060501201.pdf",
              NEWS_ID: "12190002",
            },
          ]),
        }),
      };
    },
  });

  const result = await adapter.listCompanyFilings({ market: "hk", symbol: "9988" });

  assert.equal(result.status, "ok");
  assert.equal(result.mode, "real-provider");
  assert.equal(result.items[0].code, "09988");
  assert.ok(requested[0].includes("prefix.do"));
  assert.ok(requested[1].includes("titleSearchServlet.do"));
  assert.equal(requested.length, 2);
});

test("news-filings adapter reports public statement verification and review policy gates", async () => {
  const response = await requestMock("/api/data-sources/news-filings-adapter");
  assert.equal(response.status, 200);
  const adapter = response.body.newsFilingsAdapter;
  assert.equal(adapter.publicStatementVerificationPolicy.id, "public-statement-verification-policy");
  assert.deepEqual(adapter.publicStatementVerificationPolicy.verifiedSpeakerTypes, [
    "companyExecutive",
    "companyAccount",
    "governmentOfficial",
    "regulator",
  ]);
  assert.equal(
    adapter.publicStatementVerificationPolicy.requiresOfficialChannelOrManualReview,
    true,
  );
  assert.equal(adapter.publicStatementManualReviewPolicy.id, "public-statement-manual-review-policy");
  assert.equal(adapter.publicStatementManualReviewPolicy.defaultSlaHours, 24);
  assert.equal(adapter.publicStatementManualReviewPolicy.canPromoteAfterReview, false);
  assert.ok(
    adapter.providerPreflightPlan.checks.some(
      (check) => check.id === "publicStatementVerificationPolicy" && check.status === "blocked",
    ),
  );
  assert.ok(
    adapter.providerPreflightPlan.checks.some(
      (check) => check.id === "publicStatementManualReviewPolicy" && check.status === "blocked",
    ),
  );
});

test("news intelligence endpoint stays empty without real news provider results", async () => {
  const response = await requestMock("/api/news/intelligence?market=us&symbol=AAPL&minImportance=80");
  assert.equal(response.status, 200);
  assert.equal(response.body.mode, "no-real-data");
  assert.deepEqual(response.body.items, []);
  assert.equal(response.body.sourceStatus, "provider-error-empty-no-fixture");
  assert.equal(response.body.deduplication.inputCount, 0);
  assert.equal(response.body.deduplication.outputCount, 0);
  assert.equal(response.body.ingestionTelemetry.id, "mock-news-ingestion-runtime");
  assert.equal(response.body.ingestionTelemetry.sourceKey, "news:us:AAPL");
  assert.equal(response.body.ingestionTelemetry.acceptedCount, 0);
  assert.equal(response.body.processing.deduplication, "normalized-title-related-tickers");
  assert.match(response.body.disclaimer, /不会返回本地样例新闻/);
});

test("news ingestion runtime status endpoint reports dedupe and cooldown safety telemetry", async () => {
  const response = await requestMock("/api/news/ingestion-runtime/status");
  assert.equal(response.status, 200);
  assert.equal(response.body.activeRuntime.id, "mock-news-ingestion-runtime");
  assert.equal(response.body.activeRuntime.executionMode, "no-vendor-network");
  assert.equal(response.body.activeRuntime.cooldownWindowSeconds, 300);
  assert.ok(response.body.activeRuntime.capabilities.includes("deduplicationTelemetry"));
  assert.equal(response.body.activeRuntime.safety.noSocialScraping, true);
  assert.match(response.body.activeRuntime.disclaimer, /真实 provider 或人工导入结果/);
  assert.match(response.body.activeRuntime.disclaimer, /没有真实数据时保持空白/);
});

test("news intelligence persistence endpoint saves no records when real news is empty", async () => {
  const state = createMockState();
  const persisted = await requestMock(
    "/api/news/intelligence/persist?market=us&symbol=AAPL&minImportance=80",
    { method: "POST" },
    state,
  );
  assert.equal(persisted.status, 200);
  assert.equal(persisted.body.count, 0);
  assert.equal(persisted.body.processing.persistence, "mock-repository");
  assert.deepEqual(persisted.body.saved, []);
  assert.equal(state.newsIntelligence.length, 0);
  assert.ok(state.auditLogs.some((event) => event.eventType === "news.intelligence.persist"));

  const history = await requestMock("/api/news/intelligence/history?market=us&symbol=AAPL", {}, state);
  assert.equal(history.status, 200);
  assert.equal(history.body.items.length, 0);
});

test("news intelligence adapter deduplicates same-title fixture records and explains scoring", async () => {
  const adapter = createNewsFilingsProviderAdapter({
    newsByMarket: {
      us: [
        {
          id: "dup-1",
          market: "us",
          title: "Apple CEO emphasizes AI device privacy",
          source: "CEO / 公司动态",
          importance: 80,
          sentiment: "positive",
          publishedAt: "2026-06-01T00:00:00.000Z",
          relatedTickers: ["AAPL"],
        },
        {
          id: "dup-2",
          market: "us",
          title: "Apple CEO emphasizes AI device privacy",
          source: "CEO / 公司动态",
          importance: 82,
          sentiment: "positive",
          publishedAt: "2026-06-01T00:00:00.000Z",
          relatedTickers: ["AAPL"],
        },
      ],
    },
  });

  const result = await adapter.listImportantNews({ market: "us", symbol: "AAPL" });
  assert.equal(result.items.length, 1);
  assert.equal(result.deduplication.inputCount, 2);
  assert.equal(result.deduplication.outputCount, 1);
  assert.equal(result.deduplication.duplicateCount, 1);
  assert.deepEqual(result.items[0].duplicateIds, ["dup-1", "dup-2"]);
  assert.equal(result.items[0].sourceCount, 2);
  assert.equal(result.items[0].importanceBreakdown.formula.includes("baseImportance"), true);
  assert.ok(result.items[0].importanceScore >= 81);
});

test("mock news ingestion runtime deduplicates batches and gates attribution metadata", () => {
  let clock = Date.parse("2026-06-01T00:00:00.000Z");
  const runtime = createMockNewsIngestionRuntime({ now: () => clock });
  const first = runtime.processBatch({
    sourceType: "publicStatement",
    market: "us",
    symbol: "AAPL",
    items: [
      {
        title: "CEO 公开表述强调 AI 设备体验与隐私保护",
        source: {
          label: "Mock 公开言论样例",
          licenseTag: "sample-fixture-not-verified-live-statement",
        },
      },
      {
        title: "CEO 公开表述强调 AI 设备体验与隐私保护",
        source: {
          label: "Mock 公开言论样例",
          licenseTag: "sample-fixture-not-verified-live-statement",
        },
      },
      {
        title: "缺少来源授权标签的样例",
      },
    ],
  });
  assert.equal(first.sourceKey, "publicStatement:us:AAPL");
  assert.equal(first.acceptedCount, 1);
  assert.equal(first.duplicateCount, 1);
  assert.equal(first.attributionMissingCount, 1);
  assert.equal(first.blockedCount, 1);
  assert.equal(first.safety.noSocialScraping, true);

  clock += 60_000;
  const second = runtime.processBatch({
    sourceType: "publicStatement",
    market: "us",
    symbol: "AAPL",
    items: [
      {
        title: "CEO 公开表述强调 AI 设备体验与隐私保护",
        source: {
          label: "Mock 公开言论样例",
          licenseTag: "sample-fixture-not-verified-live-statement",
        },
      },
    ],
  });
  assert.equal(second.acceptedCount, 0);
  assert.equal(second.duplicateCount, 1);
  assert.equal(second.cooldownStatus, "cooldown-active");
  assert.equal(runtime.status().dedupeRecordCount, 1);
  assert.equal(runtime.status().sourceCooldowns[0].key, "publicStatement:us:AAPL");
});

test("filings and public statements endpoints stay empty without real provider records", async () => {
  const filings = await requestMock("/api/news/filings?symbol=0700&market=hk");
  assert.equal(filings.status, 200);
  assert.equal(filings.body.mode, "no-real-data");
  assert.deepEqual(filings.body.items, []);
  assert.equal(filings.body.sourceStatus, "no-real-provider-data");
  assert.equal(filings.body.ingestionTelemetry.sourceKey, "filing:hk:0700");

  const statements = await requestMock("/api/public-statements?symbol=AAPL&market=us");
  assert.equal(statements.status, 200);
  assert.equal(statements.body.mode, "no-real-data");
  assert.deepEqual(statements.body.items, []);
  assert.equal(statements.body.sourceStatus, "no-real-provider-data");
  assert.equal(statements.body.ingestionTelemetry.sourceKey, "publicStatement:us:AAPL");
});

test("ai-service endpoint reports active model capabilities", async () => {
  const services = await requestMock("/api/ai-services");
  assert.equal(services.status, 200);
  assert.equal(services.body.activeService.id, "mock-ai-analysis");
  assert.equal(services.body.activeService.mode, "sample");
  assert.equal(services.body.activeService.model, "rule-based-sample-v0");
  assert.ok(services.body.activeService.capabilities.includes("factorBreakdown"));
  assert.equal(services.body.activeService.providerAdapter.id, "ai-provider-adapter");
  assert.equal(services.body.activeService.providerAdapter.status, "blocked");
  assert.equal(services.body.activeService.providerAdapter.complianceGate.status, "blocked");
  assert.equal(services.body.activeService.providerAdapter.canCallLiveModel, false);
  assert.ok(
    services.body.activeService.providerAdapter.responseSchema.forbiddenFields.includes(
      "guaranteedReturn",
    ),
  );
  assert.match(services.body.activeService.disclaimer, /不代表真实 AI 投资建议/);
  assert.equal(services.body.services[0].id, services.body.activeService.id);
});

test("ai-provider adapter endpoint reports model-call safety gates", async () => {
  const response = await requestMock("/api/ai-services/provider-adapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerAdapter.id, "ai-provider-adapter");
  assert.equal(response.body.providerAdapter.runtimeMode, "inactive");
  assert.equal(response.body.providerAdapter.canCallLiveModel, false);
  assert.equal(response.body.providerAdapter.freeModelProviderPreset.id, "gemini-free");
  assert.equal(response.body.providerAdapter.freeModelProviderPreset.modelId, "gemini-2.5-flash");
  assert.equal(response.body.providerAdapter.freeModelProviderPreset.apiStyle, "chat-completions");
  assert.deepEqual(response.body.providerAdapter.missingEnvVars, [
    "FINANCE_AI_MODEL_PROVIDER",
    "FINANCE_AI_MODEL_API_KEY",
    "FINANCE_AI_MODEL_ID",
  ]);
  assert.equal(
    response.body.providerAdapter.promptContract.probabilityLanguage,
    "模型参考概率",
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "auditReadiness" && check.status === "blocked",
    ),
  );
  assert.equal(response.body.providerAdapter.auditPolicy.status, "blocked");
  assert.ok(response.body.providerAdapter.auditPolicy.forbiddenEnvelopeFields.includes("rawPrompt"));
  assert.equal(response.body.providerAdapter.responseValidationPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.responseValidationPolicy.validationMode,
    "dry-run-no-user-visible-invalid-output",
  );
  assert.equal(response.body.providerAdapter.responseValidationPolicy.canPublishValidatedOutput, false);
  assert.equal(response.body.providerAdapter.modelCallPreflightPlan.mode, "dry-run-no-model-call");
  assert.equal(response.body.providerAdapter.modelCallPreflightPlan.canExecuteLiveCall, false);
  assert.equal(
    response.body.providerAdapter.modelProviderSetupGuide.mode,
    "no-secret-model-provider-setup-guide",
  );
  assert.equal(response.body.providerAdapter.modelProviderSetupGuide.canReadModelSecrets, false);
  assert.equal(response.body.providerAdapter.modelProviderSetupGuide.canCallLiveModel, false);
  assert.ok(
    response.body.providerAdapter.modelProviderSetupGuide.forbiddenAuditFields.includes(
      "modelApiKey",
    ),
  );
  assert.ok(
    response.body.providerAdapter.modelCallPreflightPlan.auditEnvelope.forbiddenFields.includes(
      "apiKey",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "costControls" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "sourceGrounding" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "responseValidation" && check.status === "blocked",
    ),
  );
  assert.equal(response.body.providerAdapter.budgetPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.secretManagementPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.secretManagementPolicy.mode,
    "dry-run-no-model-secret-use",
  );
  assert.equal(response.body.providerAdapter.secretManagementPolicy.canUseProductionSecrets, false);
  assert.ok(
    response.body.providerAdapter.secretManagementPolicy.requiredControls.includes(
      "managedSecretStore",
    ),
  );
  assert.ok(
    response.body.providerAdapter.secretManagementPolicy.forbiddenSecretLocations.includes(
      "clientBundle",
    ),
  );
  assert.equal(response.body.providerAdapter.sourceGroundingPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.promptInjectionDefensePolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.promptInjectionDefensePolicy.mode,
    "dry-run-no-unsanitized-source-text",
  );
  assert.equal(
    response.body.providerAdapter.promptInjectionDefensePolicy.canUseUnsanitizedSourceText,
    false,
  );
  assert.ok(
    response.body.providerAdapter.promptInjectionDefensePolicy.requiredControls.includes(
      "sourceRoleIsolation",
    ),
  );
  assert.equal(response.body.providerAdapter.dataMinimizationPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.dataMinimizationPolicy.mode,
    "dry-run-no-personal-data-to-model",
  );
  assert.equal(response.body.providerAdapter.dataMinimizationPolicy.canSendPersonalDataToModel, false);
  assert.ok(
    response.body.providerAdapter.dataMinimizationPolicy.forbiddenModelFields.includes(
      "brokerCredentials",
    ),
  );
  assert.equal(response.body.providerAdapter.factorInputPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.factorInputPolicy.minReadyFactors, 6);
  assert.equal(response.body.providerAdapter.factorWeightPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.factorWeightPolicy.version, "six-factor-weight-v1");
  assert.equal(response.body.providerAdapter.citationEvidencePolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.citationEvidencePolicy.mode,
    "dry-run-no-uncited-model-output",
  );
  assert.equal(response.body.providerAdapter.citationEvidencePolicy.canPublishUncitedAnalysis, false);
  assert.ok(
    response.body.providerAdapter.citationEvidencePolicy.requiredCitationFields.includes(
      "linkedFactor",
    ),
  );
  assert.equal(response.body.providerAdapter.modelEvaluationPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.modelEvaluationPolicy.minimumPassRatePercent, 95);
  assert.equal(response.body.providerAdapter.modelEvaluationPolicy.maximumHallucinationRatePercent, 1);
  assert.equal(response.body.providerAdapter.humanReviewPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.humanReviewPolicy.lowConfidenceThresholdPercent, 55);
  assert.equal(response.body.providerAdapter.humanReviewPolicy.canEscalateToHumanReview, false);
  assert.equal(response.body.providerAdapter.releasePolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.releasePolicy.releaseMode, "dry-run-no-model-release");
  assert.equal(response.body.providerAdapter.releasePolicy.canPromoteModelVersion, false);
  assert.equal(
    response.body.providerAdapter.modelEvaluationEvidencePackage.mode,
    "dry-run-no-model-certification",
  );
  assert.equal(
    response.body.providerAdapter.modelEvaluationEvidencePackage.canCertifyModelForProduction,
    false,
  );
  assert.equal(response.body.providerAdapter.modelEvaluationEvidencePackage.requiredArtifacts.length, 8);
  assert.ok(
    response.body.providerAdapter.modelEvaluationEvidencePackage.forbiddenArtifacts.includes(
      "modelApiKey",
    ),
  );
  assert.equal(
    response.body.providerAdapter.modelReleaseRollbackEvidencePackage.mode,
    "dry-run-no-model-release",
  );
  assert.equal(
    response.body.providerAdapter.modelReleaseRollbackEvidencePackage.rollbackControls.fallbackMode,
    "empty-no-fixture-no-advice",
  );
  assert.equal(response.body.providerAdapter.modelReleaseRollbackEvidencePackage.canEnableLiveRuntime, false);
  assert.equal(response.body.providerAdapter.modelReleaseRollbackEvidencePackage.requiredArtifacts.length, 8);
  assert.ok(
    response.body.providerAdapter.modelReleaseRollbackEvidencePackage.releaseBlockersThatMustRemainBlocked.includes(
      "providerRuntime",
    ),
  );
  assert.equal(response.body.providerAdapter.runtimeMonitoringPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.runtimeMonitoringPolicy.monitoringMode, "dry-run-no-live-monitoring");
  assert.equal(response.body.providerAdapter.runtimeMonitoringPolicy.canOperateLiveMonitoring, false);
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "factorInputs" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "promptInjectionDefense" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "dataMinimization" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "secretManagement" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "modelEvaluation" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "citationEvidence" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "humanReview" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "modelRelease" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.complianceGate.checks.some(
      (check) => check.id === "runtimeMonitoring" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.modelCallPreflightPlan.requestEnvelope.requiredFields.includes(
      "factorCoverage",
    ),
  );
  assert.ok(
    response.body.providerAdapter.modelCallPreflightPlan.requestEnvelope.requiredFields.includes(
      "sourceSanitizationReport",
    ),
  );
  assert.ok(
    response.body.providerAdapter.modelCallPreflightPlan.requestEnvelope.requiredFields.includes(
      "privacyMinimizationReport",
    ),
  );
  assert.ok(
    response.body.providerAdapter.modelCallPreflightPlan.requestEnvelope.requiredFields.includes(
      "citationPackage",
    ),
  );
  assert.ok(
    response.body.providerAdapter.modelCallPreflightPlan.requestEnvelope.forbiddenFields.includes(
      "modelApiKey",
    ),
  );
  assert.equal(
    response.body.providerAdapter.modelCallPreflightPlan.secretHandling.frontendExposureForbidden,
    true,
  );
  assert.equal(
    response.body.providerAdapter.modelCallPreflightPlan.rollback.fallbackMode,
    "empty-no-fixture-no-advice",
  );
  assert.equal(
    response.body.providerAdapter.modelTimeoutFallbackPolicy.errorCode,
    "REAL_AI_MODEL_TIMEOUT_EMPTY",
  );
  assert.equal(response.body.providerAdapter.modelTimeoutFallbackPolicy.mode, "empty-no-fixture-no-advice");
  assert.equal(response.body.providerAdapter.modelTimeoutFallbackPolicy.timeoutMs, 45000);
  assert.equal(response.body.providerAdapter.modelTimeoutFallbackPolicy.canShowPartialModelOutput, false);
  assert.equal(response.body.providerAdapter.modelTimeoutFallbackPolicy.canUseFixtureFallback, false);
  assert.equal(response.body.providerAdapter.modelTimeoutFallbackPolicy.canUseMockRuleFallback, false);
  assert.equal(response.body.providerAdapter.modelTimeoutFallbackPolicy.keepsUserVisibleBlankState, true);
  assert.ok(
    response.body.providerAdapter.modelTimeoutFallbackPolicy.forbiddenFallbacks.includes(
      "mock-rule-based-analysis",
    ),
  );
  assert.equal(response.body.providerAdapter.safety.mockFallbackActive, false);
  assert.equal(response.body.providerAdapter.safety.emptyOnModelFailure, true);
  assert.equal(response.body.providerAdapter.safety.forbidsGuaranteedReturns, true);
  assert.equal(response.body.providerAdapter.safety.requiresCostControls, true);
  assert.equal(response.body.providerAdapter.safety.requiresSecretManagement, true);
  assert.equal(response.body.providerAdapter.safety.requiresSourceGrounding, true);
  assert.equal(response.body.providerAdapter.safety.requiresPromptInjectionDefense, true);
  assert.equal(response.body.providerAdapter.safety.requiresDataMinimization, true);
  assert.equal(response.body.providerAdapter.safety.requiresFactorCoverage, true);
  assert.equal(response.body.providerAdapter.safety.requiresCitationEvidence, true);
  assert.match(response.body.providerAdapter.disclaimer, /不会请求真实模型/);
});

test("local AI model config endpoint is localhost-only and never echoes API keys", async () => {
  const forbidden = await requestMock("/api/ai-services/local-model-config", {
    method: "POST",
    headers: { host: "example.com" },
    body: { apiKey: "test-secret-model-key-12345", dryRun: true },
  });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.body.error.code, "LOCAL_AI_CONFIG_ONLY");

  const configured = await requestMock("/api/ai-services/local-model-config", {
    method: "POST",
    headers: { host: "localhost:4180" },
    body: {
      apiKey: "test-secret-model-key-12345",
      modelId: "gpt-5.5",
      baseUrl: "https://api.openai.com/v1",
      dryRun: true,
    },
  });
  assert.equal(configured.status, 200);
  assert.equal(configured.body.configured, true);
  assert.equal(configured.body.modelId, "gpt-5.5");
  assert.equal(configured.body.apiStyle, "responses");
  assert.equal(configured.body.providerAdapter.canCallLiveModel, true);
  assert.equal(JSON.stringify(configured.body).includes("test-secret-model-key-12345"), false);

  const geminiConfigured = await requestMock("/api/ai-services/local-model-config", {
    method: "POST",
    headers: { host: "localhost:4180" },
    body: {
      apiKey: "test-gemini-secret-key-12345",
      provider: "openai-compatible",
      modelId: "gemini-2.5-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiStyle: "chat-completions",
      dryRun: true,
    },
  });
  assert.equal(geminiConfigured.status, 200);
  assert.equal(geminiConfigured.body.configured, true);
  assert.equal(geminiConfigured.body.modelId, "gemini-2.5-flash");
  assert.equal(geminiConfigured.body.baseUrlStatus, "configured-redacted");
  assert.equal(geminiConfigured.body.apiStyle, "chat-completions");
  assert.equal(geminiConfigured.body.providerAdapter.canCallLiveModel, true);
  assert.equal(JSON.stringify(geminiConfigured.body).includes("test-gemini-secret-key-12345"), false);

  const openRouterConfigured = await requestMock("/api/ai-services/local-model-config", {
    method: "POST",
    headers: { host: "localhost:4180" },
    body: {
      apiKey: "test-openrouter-secret-key-12345",
      provider: "openai-compatible",
      modelId: "google/gemini-2.0-flash-exp:free",
      baseUrl: "https://openrouter.ai/api/v1",
      apiStyle: "chat-completions",
      slot: "fallback2",
      dryRun: true,
    },
  });
  assert.equal(openRouterConfigured.status, 200);
  assert.equal(openRouterConfigured.body.configured, true);
  assert.equal(openRouterConfigured.body.slot, "fallback2");
  assert.equal(openRouterConfigured.body.modelId, "google/gemini-2.0-flash-exp:free");
  assert.equal(openRouterConfigured.body.providerAdapter.fallbackModelProviders.length, 3);
  assert.equal(openRouterConfigured.body.providerAdapter.fallbackModelProviders[1].configured, true);
  assert.equal(openRouterConfigured.body.providerAdapter.fallbackModelProviders[1].canCallLiveModel, true);
  assert.equal(JSON.stringify(openRouterConfigured.body).includes("test-openrouter-secret-key-12345"), false);
});

test("ai model provider setup guide endpoint reports no-secret runtime steps", async () => {
  const response = await requestMock("/api/ai-services/model-provider-setup-guide");
  assert.equal(response.status, 200);
  assert.equal(response.body.modelProviderSetupGuide.id, "ai-model-provider-setup-guide");
  assert.equal(response.body.modelProviderSetupGuide.mode, "no-secret-model-provider-setup-guide");
  assert.equal(response.body.modelProviderSetupGuide.setupGroups.length, 3);
  assert.ok(
    response.body.modelProviderSetupGuide.setupGroups.some(
      (group) =>
        group.id === "modelProvider" &&
        group.requiredEnvVars.includes("FINANCE_AI_MODEL_API_KEY") &&
        group.forbiddenFields.includes("rawModelResponse"),
    ),
  );
  assert.ok(response.body.modelProviderSetupGuide.smokeOrder.includes("structuredSchemaValidation"));
  assert.ok(response.body.modelProviderSetupGuide.smokeOrder.includes("sourceGroundingCheck"));
  assert.ok(response.body.modelProviderSetupGuide.smokeOrder.includes("releaseRollbackGate"));
  assert.ok(response.body.modelProviderSetupGuide.forbiddenAuditFields.includes("modelApiKey"));
  assert.equal(response.body.modelProviderSetupGuide.canReadModelSecrets, false);
  assert.equal(response.body.modelProviderSetupGuide.canWriteEnvFile, false);
  assert.equal(response.body.modelProviderSetupGuide.canCallLiveModel, false);
  assert.equal(response.body.modelProviderSetupGuide.canEnableLiveRuntime, false);
  assert.match(response.body.modelProviderSetupGuide.disclaimer, /不会读取、保存、显示模型密钥/);
});

test("ai-provider adapter endpoint reports evaluation and release evidence packages", async () => {
  const response = await requestMock("/api/ai-services/provider-adapter");
  assert.equal(response.status, 200);
  const {
    modelEvaluationEvidencePackage,
    modelReleaseRollbackEvidencePackage,
    dataSourceEvidencePackage,
    factorCoverageEvidencePackage,
    dataFreshnessFallbackEvidencePackage,
    modelTimeoutFallbackPolicy,
    fallbackModelProviders,
  } = response.body.providerAdapter;
  assert.equal(modelEvaluationEvidencePackage.status, "defined");
  assert.equal(modelEvaluationEvidencePackage.mode, "dry-run-no-model-certification");
  assert.equal(modelEvaluationEvidencePackage.canCertifyModelForProduction, false);
  assert.equal(modelEvaluationEvidencePackage.canPublishUserVisibleAdvice, false);
  assert.equal(modelEvaluationEvidencePackage.requiredManualApproval, true);
  assert.ok(modelEvaluationEvidencePackage.requiredArtifacts.includes("probability-calibration-report"));
  assert.equal(modelReleaseRollbackEvidencePackage.status, "defined");
  assert.equal(modelReleaseRollbackEvidencePackage.mode, "dry-run-no-model-release");
  assert.equal(modelReleaseRollbackEvidencePackage.canPromoteModelVersion, false);
  assert.equal(modelReleaseRollbackEvidencePackage.canEnableLiveRuntime, false);
  assert.equal(modelReleaseRollbackEvidencePackage.requiredManualApproval, true);
  assert.equal(modelReleaseRollbackEvidencePackage.rollbackControls.fallbackMode, "empty-no-fixture-no-advice");
  assert.ok(modelReleaseRollbackEvidencePackage.requiredArtifacts.includes("rollback-switch-test"));
  assert.equal(dataSourceEvidencePackage.mode, "dry-run-no-live-model-grounding");
  assert.equal(dataSourceEvidencePackage.canPublishWithoutSourceRefs, false);
  assert.ok(dataSourceEvidencePackage.requiredSourceTypes.includes("marketData"));
  assert.ok(dataSourceEvidencePackage.forbiddenSourceFields.includes("providerApiKey"));
  assert.equal(factorCoverageEvidencePackage.mode, "dry-run-no-factor-overconfidence");
  assert.equal(factorCoverageEvidencePackage.minReadyFactorsForActionableAnalysis, 6);
  assert.ok(factorCoverageEvidencePackage.fallbackRules.includes("fixtureFactorBlocksRealTimeClaim"));
  assert.equal(
    dataFreshnessFallbackEvidencePackage.mode,
    "dry-run-no-stale-data-release",
  );
  assert.equal(dataFreshnessFallbackEvidencePackage.canHideFallbackMode, false);
  assert.ok(dataFreshnessFallbackEvidencePackage.fallbackModes.includes("provider-error-fixture-fallback"));
  assert.ok(dataFreshnessFallbackEvidencePackage.requiredUserVisibleFlags.includes("delayedOrFixtureLabel"));
  assert.equal(modelTimeoutFallbackPolicy.status, "defined");
  assert.equal(modelTimeoutFallbackPolicy.mode, "empty-no-fixture-no-advice");
  assert.equal(modelTimeoutFallbackPolicy.errorCode, "REAL_AI_MODEL_TIMEOUT_EMPTY");
  assert.equal(modelTimeoutFallbackPolicy.canUseFixtureFallback, false);
  assert.equal(modelTimeoutFallbackPolicy.keepsUserVisibleBlankState, true);
  assert.ok(Array.isArray(fallbackModelProviders));
  assert.ok(fallbackModelProviders[0].missingEnvVars.includes("FINANCE_AI_MODEL_FALLBACK_API_KEY"));
  assert.match(fallbackModelProviders[0].setupStatus, /FINANCE_AI_MODEL_FALLBACK_API_KEY/);
});

test("ai-provider adapter becomes ready after config, audit, budget, source, and compliance gates", () => {
  const adapter = createAiProviderAdapter({
    env: {
      FINANCE_AI_MODEL_PROVIDER: "hosted-llm-provider",
      FINANCE_AI_MODEL_API_KEY: "secret",
      FINANCE_AI_MODEL_ID: "finance-analysis-model",
      FINANCE_AI_MODEL_AUDIT_READY: "true",
      FINANCE_AI_MODEL_AUDIT_SINK: "mock-audit-service",
      FINANCE_AI_MODEL_COMPLIANCE_REVIEWED: "true",
      FINANCE_AI_MODEL_RESPONSE_VALIDATOR_READY: "true",
      FINANCE_AI_MODEL_PROBABILITY_CALIBRATION_READY: "true",
      FINANCE_AI_MODEL_FORBIDDEN_CLAIM_FILTER_READY: "true",
      FINANCE_AI_MODEL_SCHEMA_FAILURE_FALLBACK_READY: "true",
      FINANCE_AI_MODEL_COST_BUDGET_READY: "true",
      FINANCE_AI_MODEL_SECRET_MANAGEMENT_READY: "true",
      FINANCE_AI_MODEL_SECRET_MANAGER: "mock-secret-manager",
      FINANCE_AI_MODEL_SOURCE_COVERAGE_READY: "true",
      FINANCE_AI_MODEL_PROMPT_INJECTION_DEFENSE_READY: "true",
      FINANCE_AI_MODEL_DATA_MINIMIZATION_READY: "true",
      FINANCE_AI_MODEL_FACTOR_INPUTS_READY: "true",
      FINANCE_AI_MODEL_FACTOR_WEIGHTS_READY: "true",
      FINANCE_AI_MODEL_CITATION_PACKAGE_READY: "true",
      FINANCE_AI_MODEL_EVALUATION_SUITE_READY: "true",
      FINANCE_AI_MODEL_HALLUCINATION_MONITOR_READY: "true",
      FINANCE_AI_MODEL_REGRESSION_THRESHOLD_READY: "true",
      FINANCE_AI_MODEL_HUMAN_REVIEW_QUEUE_READY: "true",
      FINANCE_AI_MODEL_ESCALATION_RUNBOOK_READY: "true",
      FINANCE_AI_MODEL_LOW_CONFIDENCE_POLICY_READY: "true",
      FINANCE_AI_MODEL_RELEASE_CANARY_READY: "true",
      FINANCE_AI_MODEL_VERSION_LOCK_READY: "true",
      FINANCE_AI_MODEL_ROLLBACK_SWITCH_READY: "true",
      FINANCE_AI_MODEL_RELEASE_APPROVAL_READY: "true",
      FINANCE_AI_MODEL_RUNTIME_METRICS_READY: "true",
      FINANCE_AI_MODEL_DRIFT_MONITOR_READY: "true",
      FINANCE_AI_MODEL_INCIDENT_ALERTING_READY: "true",
      FINANCE_AI_MODEL_USER_FEEDBACK_MONITOR_READY: "true",
      FINANCE_AI_MODEL_MAX_CALLS_PER_MINUTE: "30",
      FINANCE_AI_MODEL_MAX_TOKENS_PER_REQUEST: "2400",
      FINANCE_AI_MODEL_REQUEST_TIMEOUT_MS: "12000",
      FINANCE_AI_MODEL_PROMPT_VERSION: "analysis-prompt-v1",
    },
  });
  assert.equal(adapter.status, "ready-for-implementation");
  assert.equal(adapter.selectedProvider, "hosted-llm-provider");
  assert.equal(adapter.selectedModel, "finance-analysis-model");
  assert.equal(adapter.complianceGate.status, "ready-for-live-model");
  assert.equal(adapter.complianceGate.canCallLiveModel, true);
  assert.equal(adapter.auditPolicy.status, "ready");
  assert.equal(adapter.auditPolicy.sink, "mock-audit-service");
  assert.equal(adapter.responseValidationPolicy.status, "ready");
  assert.ok(adapter.responseValidationPolicy.requiredValidators.includes("forbiddenClaimFilter"));
  assert.equal(adapter.budgetPolicy.status, "ready");
  assert.equal(adapter.budgetPolicy.maxCallsPerMinute, 30);
  assert.equal(adapter.secretManagementPolicy.status, "ready");
  assert.equal(adapter.secretManagementPolicy.secretManager, "mock-secret-manager");
  assert.equal(adapter.secretManagementPolicy.canUseProductionSecrets, false);
  assert.ok(adapter.secretManagementPolicy.requiredControls.includes("keyRotation"));
  assert.equal(adapter.sourceGroundingPolicy.status, "ready");
  assert.equal(adapter.sourceGroundingPolicy.requiresUnknownWhenInsufficientEvidence, true);
  assert.equal(adapter.promptInjectionDefensePolicy.status, "ready");
  assert.equal(adapter.promptInjectionDefensePolicy.canUseUnsanitizedSourceText, false);
  assert.ok(adapter.promptInjectionDefensePolicy.detectionSignals.includes("instructionOverride"));
  assert.equal(adapter.dataMinimizationPolicy.status, "ready");
  assert.equal(adapter.dataMinimizationPolicy.canSendPersonalDataToModel, false);
  assert.ok(adapter.dataMinimizationPolicy.allowedPortfolioFields.includes("costBasisBucket"));
  assert.equal(adapter.factorInputPolicy.status, "ready");
  assert.deepEqual(adapter.factorInputPolicy.requiredFactors, [
    "macro",
    "industry",
    "fundamentals",
    "valuation",
    "technical",
    "sentiment",
  ]);
  assert.equal(adapter.factorWeightPolicy.status, "ready");
  assert.equal(adapter.factorWeightPolicy.requiresManualApprovalForWeightChange, true);
  assert.equal(adapter.citationEvidencePolicy.status, "ready");
  assert.equal(adapter.citationEvidencePolicy.canPublishUncitedAnalysis, false);
  assert.ok(adapter.citationEvidencePolicy.allowedSourceTypes.includes("publicStatement"));
  assert.equal(adapter.modelEvaluationPolicy.status, "ready");
  assert.equal(adapter.modelEvaluationPolicy.requiresPostLaunchSampling, true);
  assert.equal(adapter.humanReviewPolicy.status, "ready");
  assert.ok(adapter.humanReviewPolicy.triggerRules.includes("prohibited-claim-detected"));
  assert.equal(adapter.releasePolicy.status, "ready");
  assert.ok(adapter.releasePolicy.requiredVersionLocks.includes("promptVersion"));
  assert.equal(adapter.runtimeMonitoringPolicy.status, "ready");
  assert.ok(adapter.runtimeMonitoringPolicy.requiredSignals.includes("schemaErrorRate"));
  assert.equal(adapter.promptContract.version, "analysis-prompt-v1");
  assert.equal(adapter.modelCallPreflightPlan.status, "ready-for-manual-smoke");
  assert.equal(adapter.modelCallPreflightPlan.canExecuteLiveCall, false);
  assert.equal(adapter.modelCallPreflightPlan.rollback.fallbackMode, "empty-no-fixture-no-advice");
  assert.equal(adapter.modelTimeoutFallbackPolicy.timeoutMs, 12000);
  assert.equal(adapter.modelTimeoutFallbackPolicy.canUseMockRuleFallback, false);
  assert.equal(adapter.modelTimeoutFallbackPolicy.keepsUserVisibleBlankState, true);
  assert.equal(adapter.canCallLiveModel, false);
  assert.equal(adapter.safety.noVendorNetworkCalls, true);
  assert.equal(adapter.safety.mockFallbackActive, false);
  assert.equal(adapter.safety.emptyOnModelFailure, true);
});

test("ai-provider adapter calls openai-compatible model only when local runtime is enabled", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                upsideProbability: 58,
                downsideProbability: 42,
                sentimentScore: 61,
                valuationScore: 54,
                technicalScore: 57,
                confidenceScore: 63,
                actionReference: "模型参考：证据有限，保持观察并等待更多确认。",
                reasons: ["真实新闻和宏观证据支持中性偏积极判断。"],
                risks: ["证据覆盖仍不完整，不能视为买卖建议。"],
                factorBreakdown: [
                  { key: "macro", label: "宏观经济", score: 62, weight: 15, summary: "宏观年度数据中性。" },
                  { key: "industry", label: "行业分析", score: 58, weight: 15, summary: "行业趋势待确认。" },
                  { key: "fundamentals", label: "公司基本盘", score: 60, weight: 20, summary: "基本面稳健。" },
                  { key: "valuation", label: "估值分析", score: 54, weight: 15, summary: "估值中性。" },
                  { key: "technical", label: "技术分析", score: 57, weight: 15, summary: "趋势温和。" },
                  { key: "sentiment", label: "市场情绪", score: 61, weight: 20, summary: "情绪略偏正面。" },
                ],
                scenarioAnalysis: {
                  horizon: "2-8 周",
                  cases: [
                    { key: "bull", label: "乐观", probability: 32, targetPrice: 110, expectedReturnPct: 8, summary: "催化继续。" },
                    { key: "base", label: "基准", probability: 46, targetPrice: 103, expectedReturnPct: 1, summary: "震荡。" },
                    { key: "bear", label: "悲观", probability: 22, targetPrice: 94, expectedReturnPct: -8, summary: "风险偏好回落。" },
                  ],
                },
                tradePlan: {
                  stance: "观察",
                  currentPrice: 100,
                  entryZone: { low: 96, high: 101 },
                  stopLoss: 92,
                  takeProfit: 110,
                },
                analysisProcess: { version: "real-model-analysis-v1", mode: "real-model-structured-json" },
                warnings: ["模型参考，不构成投资建议。"],
                disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
              }),
            },
          },
        ],
      }),
    };
  };

  try {
    const adapter = createAiProviderAdapter({
      env: {
        FINANCE_AI_MODEL_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_API_KEY: "secret-model-key",
        FINANCE_AI_MODEL_ID: "finance-analysis-model",
        FINANCE_AI_MODEL_ALLOW_NETWORK: "true",
        FINANCE_AI_MODEL_RUNTIME: "local-real-model-smoke",
        FINANCE_AI_MODEL_BASE_URL: "https://example-model.test/v1",
        FINANCE_AI_MODEL_API_STYLE: "chat-completions",
      },
    });

    assert.equal(adapter.status, "ready-for-local-real-model");
    assert.equal(adapter.canCallLiveModel, true);
    assert.equal(adapter.safety.noVendorNetworkCalls, false);
    const result = await adapter.generateStructuredAnalysis({
      stock: {
        code: "MSFT",
        name: "Microsoft",
        market: "us",
        samplePrice: 100,
        sentiment: 60,
        valuation: 54,
        technical: 57,
        upside: 58,
      },
      riskProfile: "balanced",
      sourceContext: {
        sourceRefs: [{ type: "news", title: "Microsoft headline", sourceLabel: "Yahoo Finance RSS" }],
      },
      macroContext: {
        status: "ok",
        market: "us",
        summary: "美国宏观指标来自 World Bank Open Data。",
        factorScore: 62,
        source: { label: "World Bank Open Data" },
        indicators: [{ id: "gdpGrowth", label: "GDP 增速", value: "2.8%", score: 61 }],
      },
    });

    assert.equal(result.status, "ok");
    assert.equal(result.analysis.analysisService.mode, "real-provider");
    assert.equal(result.analysis.inputCoverage.model, "real-provider-model");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://example-model.test/v1/chat/completions");
    assert.match(requests[0].options.headers.authorization, /^Bearer /);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ai-provider adapter rejects live model output missing core quantitative metrics", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              upsideProbability: 62,
              actionReference: "模型只返回了部分指标，不能展示为完整分析。",
              reasons: ["验证缺失指标不能用默认值补齐。"],
              risks: ["缺失下跌、情绪、估值和技术面指标。"],
              factorBreakdown: [
                { key: "macro", label: "宏观经济", score: 60, weight: 15, summary: "宏观中性。" },
              ],
              scenarioAnalysis: {
                horizon: "2-8 周",
                cases: [{ key: "base", label: "基准", probability: 50, summary: "等待证据。" }],
              },
              disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
            }),
          },
        },
      ],
    }),
  });

  try {
    const adapter = createAiProviderAdapter({
      env: {
        FINANCE_AI_MODEL_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_API_KEY: "secret-model-key",
        FINANCE_AI_MODEL_ID: "finance-analysis-model",
        FINANCE_AI_MODEL_ALLOW_NETWORK: "true",
        FINANCE_AI_MODEL_RUNTIME: "local-real-model-smoke",
        FINANCE_AI_MODEL_BASE_URL: "https://example-model.test/v1",
        FINANCE_AI_MODEL_API_STYLE: "chat-completions",
      },
    });

    const result = await adapter.generateStructuredAnalysis({
      stock: { code: "MSFT", name: "Microsoft", market: "us", samplePrice: 100 },
      riskProfile: "balanced",
      sourceContext: { sourceRefs: [] },
      macroContext: { status: "ok", market: "us", summary: "宏观数据已接入。" },
    });

    assert.equal(result.status, "provider-error");
    assert.equal(result.error.code, "REAL_AI_MODEL_MISSING_METRICS");
    assert.match(result.error.message, /downsideProbability/);
    assert.match(result.error.message, /sentimentScore/);
    assert.equal(result.analysis, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ai-provider adapter uses Responses API by default for OpenAI-compatible official base URL", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          upsideProbability: 59,
          downsideProbability: 41,
          sentimentScore: 62,
          valuationScore: 55,
          technicalScore: 58,
          confidenceScore: 64,
          actionReference: "模型参考：保持观察，等待更多真实证据确认。",
          reasons: ["真实行情、新闻、公告和宏观证据已接入。"],
          risks: ["模型概率不代表收益保证。"],
          factorBreakdown: [
            { key: "macro", label: "宏观经济", score: 62, weight: 15, summary: "宏观年度数据中性。" },
            { key: "industry", label: "行业分析", score: 58, weight: 15, summary: "行业趋势待确认。" },
            { key: "fundamentals", label: "公司基本盘", score: 60, weight: 20, summary: "基本面稳健。" },
            { key: "valuation", label: "估值分析", score: 55, weight: 15, summary: "估值中性。" },
            { key: "technical", label: "技术分析", score: 58, weight: 15, summary: "趋势温和。" },
            { key: "sentiment", label: "市场情绪", score: 62, weight: 20, summary: "情绪略偏正面。" },
          ],
          scenarioAnalysis: {
            horizon: "2-8 周",
            cases: [
              { key: "bull", label: "乐观", probability: 33, targetPrice: 110, expectedReturnPct: 8, summary: "催化继续。" },
              { key: "base", label: "基准", probability: 45, targetPrice: 103, expectedReturnPct: 1, summary: "震荡。" },
              { key: "bear", label: "悲观", probability: 22, targetPrice: 94, expectedReturnPct: -8, summary: "风险偏好回落。" },
            ],
          },
          tradePlan: { stance: "观察" },
          analysisProcess: { version: "real-model-analysis-v1", mode: "responses-json-schema" },
          warnings: ["模型参考，不构成投资建议。"],
          disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
        }),
      }),
    };
  };

  try {
    const adapter = createAiProviderAdapter({
      env: {
        FINANCE_AI_MODEL_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_API_KEY: "secret-model-key",
        FINANCE_AI_MODEL_ID: "gpt-5.5",
        FINANCE_AI_MODEL_ALLOW_NETWORK: "true",
        FINANCE_AI_MODEL_RUNTIME: "local-real-model-smoke",
        FINANCE_AI_MODEL_BASE_URL: "https://api.openai.com/v1",
      },
    });

    assert.equal(adapter.apiStyle, "responses");
    assert.equal(adapter.recommendedModelId, "gpt-5.5");
    const result = await adapter.generateStructuredAnalysis({
      stock: { code: "MSFT", name: "Microsoft", market: "us", samplePrice: 100 },
      riskProfile: "balanced",
      sourceContext: {
        sourceRefs: [{ type: "news", title: "Microsoft headline", sourceLabel: "Yahoo Finance RSS" }],
      },
      macroContext: { status: "ok", market: "us", summary: "美国宏观指标来自 World Bank Open Data。" },
    });

    assert.equal(result.status, "ok");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://api.openai.com/v1/responses");
    const requestBody = JSON.parse(requests[0].options.body);
    assert.equal(requestBody.model, "gpt-5.5");
    assert.equal(requestBody.text.format.type, "json_schema");
    assert.equal(requestBody.text.format.name, "finance_ai_analysis");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ai-provider adapter repairs unsafe Responses output before publishing full analysis", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  const unsafeJson = JSON.stringify({
    upsideProbability: 59,
    downsideProbability: 41,
    sentimentScore: 62,
    valuationScore: 55,
    technicalScore: 58,
    confidenceScore: 64,
    actionReference: "必须买入，几乎无风险。",
    reasons: ["违规样例：必须买入。"],
    risks: ["违规样例：无风险。"],
    factorBreakdown: [
      { key: "macro", label: "宏观经济", score: 62, weight: 15, summary: "宏观年度数据中性。" },
      { key: "industry", label: "行业分析", score: 58, weight: 15, summary: "行业趋势待确认。" },
      { key: "fundamentals", label: "公司基本盘", score: 60, weight: 20, summary: "基本面稳健。" },
      { key: "valuation", label: "估值分析", score: 55, weight: 15, summary: "估值中性。" },
      { key: "technical", label: "技术分析", score: 58, weight: 15, summary: "趋势温和。" },
      { key: "sentiment", label: "市场情绪", score: 62, weight: 20, summary: "情绪略偏正面。" },
    ],
    scenarioAnalysis: {
      horizon: "2-8 周",
      cases: [
        { key: "bull", label: "乐观", probability: 33, summary: "催化继续。" },
        { key: "base", label: "基准", probability: 45, summary: "震荡。" },
        { key: "bear", label: "悲观", probability: 22, summary: "风险偏好回落。" },
      ],
    },
    disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
  });
  const repairedJson = JSON.stringify({
    upsideProbability: 59,
    downsideProbability: 41,
    sentimentScore: 62,
    valuationScore: 55,
    technicalScore: 58,
    confidenceScore: 64,
    actionReference: "模型参考：保持观察，等待更多真实证据确认。",
    reasons: ["真实行情、新闻、公告和宏观证据已接入。"],
    risks: ["模型概率不代表收益保证，需关注数据覆盖和市场波动。"],
    factorBreakdown: [
      { key: "macro", label: "宏观经济", score: 62, weight: 15, summary: "宏观年度数据中性。" },
      { key: "industry", label: "行业分析", score: 58, weight: 15, summary: "行业趋势待确认。" },
      { key: "fundamentals", label: "公司基本盘", score: 60, weight: 20, summary: "基本面稳健。" },
      { key: "valuation", label: "估值分析", score: 55, weight: 15, summary: "估值中性。" },
      { key: "technical", label: "技术分析", score: 58, weight: 15, summary: "趋势温和。" },
      { key: "sentiment", label: "市场情绪", score: 62, weight: 20, summary: "情绪略偏正面。" },
    ],
    scenarioAnalysis: {
      horizon: "2-8 周",
      cases: [
        { key: "bull", label: "乐观", probability: 33, summary: "催化继续。" },
        { key: "base", label: "基准", probability: 45, summary: "震荡。" },
        { key: "bear", label: "悲观", probability: 22, summary: "风险偏好回落。" },
      ],
    },
    tradePlan: { stance: "观察" },
    analysisProcess: { version: "real-model-analysis-v1", mode: "responses-json-schema-repaired" },
    warnings: ["模型参考，不构成投资建议。"],
    disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
  });
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        output_text: requests.length === 1 ? unsafeJson : repairedJson,
      }),
    };
  };

  try {
    const adapter = createAiProviderAdapter({
      env: {
        FINANCE_AI_MODEL_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_API_KEY: "secret-model-key",
        FINANCE_AI_MODEL_ID: "gpt-5.5",
        FINANCE_AI_MODEL_ALLOW_NETWORK: "true",
        FINANCE_AI_MODEL_RUNTIME: "local-real-model-smoke",
        FINANCE_AI_MODEL_BASE_URL: "https://api.openai.com/v1",
      },
    });

    const result = await adapter.generateStructuredAnalysis({
      stock: { code: "MSFT", name: "Microsoft", market: "us", samplePrice: 100 },
      riskProfile: "balanced",
      sourceContext: {
        sourceRefs: [{ type: "news", title: "Microsoft headline", sourceLabel: "Yahoo Finance RSS" }],
      },
      macroContext: { status: "ok", market: "us", summary: "美国宏观指标来自 World Bank Open Data。" },
    });

    assert.equal(result.status, "ok");
    assert.equal(requests.length, 2);
    assert.match(JSON.stringify(JSON.parse(requests[1].options.body).input), /上一次输出未通过合规校验/);
    assert.equal(result.provider.safetyRepairPrompt, true);
    assert.equal(result.providerRelay.attempts[0].safetyRepairAttempted, true);
    assert.equal(result.providerRelay.attempts[0].safetyRepairStatus, "repair-passed");
    assert.equal(result.providerRelay.attempts[0].validationStatus, "校验通过");
    assert.equal(result.analysis.analysisService.mode, "real-provider");
    assert.doesNotMatch(JSON.stringify(result.analysis), /必须买入|无风险/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ai-provider adapter retries provider safety filter with compliant rewrite before fallback", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  const successfulAnalysisJson = JSON.stringify({
    upsideProbability: 56,
    downsideProbability: 44,
    sentimentScore: 60,
    valuationScore: 53,
    technicalScore: 57,
    confidenceScore: 62,
    actionReference: "模型参考：保持观察，等待更多真实证据确认。",
    reasons: ["安全改写后输出无收益承诺、无买卖指令。"],
    risks: ["免费模型可能再次触发 provider 过滤或限流。"],
    factorBreakdown: [
      { key: "macro", label: "宏观经济", score: 58, weight: 15, summary: "宏观数据中性。" },
      { key: "industry", label: "行业分析", score: 56, weight: 15, summary: "行业趋势待确认。" },
      { key: "fundamentals", label: "公司基本盘", score: 60, weight: 20, summary: "基本盘稳定。" },
      { key: "valuation", label: "估值分析", score: 53, weight: 15, summary: "估值中性。" },
      { key: "technical", label: "技术分析", score: 57, weight: 15, summary: "走势温和。" },
      { key: "sentiment", label: "市场情绪", score: 60, weight: 20, summary: "情绪略偏正面。" },
    ],
    scenarioAnalysis: {
      horizon: "2-8 周",
      cases: [
        { key: "bull", label: "乐观", probability: 30, summary: "催化继续。" },
        { key: "base", label: "基准", probability: 46, summary: "震荡观察。" },
        { key: "bear", label: "谨慎", probability: 24, summary: "风险偏好回落。" },
      ],
    },
    tradePlan: {
      summary: "仅作研究观察，不构成买卖建议。",
      disclaimer: "不构成投资建议、交易指令或收益承诺。",
    },
    analysisProcess: { version: "real-model-analysis-v1", mode: "safety-filter-repaired" },
    warnings: ["模型参考，不构成投资建议。"],
    disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
  });
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (requests.length <= 2) {
      return {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "content_filter",
            message: "Response was blocked by provider safety policy.",
          },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: successfulAnalysisJson } }],
      }),
    };
  };

  try {
    const adapter = createAiProviderAdapter({
      env: {
        FINANCE_AI_MODEL_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_API_KEY: "primary-key",
        FINANCE_AI_MODEL_ID: "primary-free-model",
        FINANCE_AI_MODEL_BASE_URL: "https://primary-model.test/v1",
        FINANCE_AI_MODEL_API_STYLE: "chat-completions",
        FINANCE_AI_MODEL_ALLOW_NETWORK: "true",
        FINANCE_AI_MODEL_RUNTIME: "local-real-model-smoke",
        FINANCE_AI_MODEL_FALLBACK_API_KEY: "fallback-key",
        FINANCE_AI_MODEL_FALLBACK_ID: "fallback-free-model",
        FINANCE_AI_MODEL_FALLBACK_BASE_URL: "https://fallback-model.test/v1",
        FINANCE_AI_MODEL_FALLBACK_API_STYLE: "chat-completions",
        FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK: "true",
      },
    });

    const result = await adapter.generateStructuredAnalysis({
      stock: { code: "MSFT", name: "Microsoft", market: "us", samplePrice: 100 },
      riskProfile: "balanced",
      sourceContext: {
        sourceRefs: [{ type: "news", title: "Microsoft headline", sourceLabel: "Yahoo Finance RSS" }],
      },
      macroContext: { status: "ok", market: "us", summary: "美国宏观指标来自 World Bank Open Data。" },
    });

    assert.equal(result.status, "ok");
    assert.equal(requests.length, 3);
    assert.match(JSON.stringify(JSON.parse(requests[1].options.body).messages), /上一次输出未通过合规校验/);
    assert.equal(result.providerRelay.used, "fallback-free-model");
    assert.equal(result.providerRelay.attempts[0].code, "REAL_AI_MODEL_PROVIDER_SAFETY_FILTERED");
    assert.equal(result.providerRelay.attempts[0].safetyRepairAttempted, true);
    assert.equal(result.providerRelay.attempts[0].safetyRepairStatus, "repair-failed");
    assert.equal(result.providerRelay.attempts[1].finalReason, "完整 AI 分析已生成");
    assert.equal(result.analysis.analysisService.mode, "real-provider");
    assert.doesNotMatch(JSON.stringify(result.analysis), /必须买入|必须卖出|保证收益|无风险/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ai-provider adapter continues relay across multiple fallback model slots", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  const successfulAnalysisJson = JSON.stringify({
    upsideProbability: 57,
    downsideProbability: 43,
    sentimentScore: 61,
    valuationScore: 54,
    technicalScore: 59,
    confidenceScore: 63,
    actionReference: "模型参考：等待更多真实证据确认。",
    reasons: ["多备用模型接力后返回结构化分析。"],
    risks: ["免费模型额度可能再次受限。"],
    factorBreakdown: [
      { key: "macro", label: "宏观经济", score: 60, weight: 15, summary: "宏观数据中性。" },
      { key: "industry", label: "行业分析", score: 58, weight: 15, summary: "行业趋势待确认。" },
      { key: "fundamentals", label: "公司基本盘", score: 61, weight: 20, summary: "基本盘稳定。" },
      { key: "valuation", label: "估值分析", score: 54, weight: 15, summary: "估值中性。" },
      { key: "technical", label: "技术分析", score: 59, weight: 15, summary: "走势温和。" },
      { key: "sentiment", label: "市场情绪", score: 61, weight: 20, summary: "情绪略偏正面。" },
    ],
    scenarioAnalysis: {
      horizon: "2-8 周",
      cases: [
        { key: "bull", label: "乐观", probability: 31, targetPrice: 108, expectedReturnPct: 8, summary: "催化继续。" },
        { key: "base", label: "基准", probability: 46, targetPrice: 101, expectedReturnPct: 1, summary: "震荡。" },
        { key: "bear", label: "悲观", probability: 23, targetPrice: 93, expectedReturnPct: -7, summary: "风险偏好回落。" },
      ],
    },
    tradePlan: { stance: "观察" },
    analysisProcess: { version: "real-model-analysis-v1", mode: "multi-fallback-relay" },
    warnings: ["模型参考，不构成投资建议。"],
    disclaimer: "模型参考概率仅供研究参考，不构成投资建议或收益承诺。",
  });
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (String(url).includes("api.openai.com")) {
      return {
        ok: false,
        status: 429,
        json: async () => ({ error: { code: "insufficient_quota" } }),
      };
    }
    if (String(url).includes("generativelanguage.googleapis.com")) {
      return {
        ok: false,
        status: 429,
        json: async () => ({ error: { code: "rate_limit_exceeded" } }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: successfulAnalysisJson } }],
      }),
    };
  };

  try {
    const adapter = createAiProviderAdapter({
      env: {
        FINANCE_AI_MODEL_PROVIDER: "openai-compatible",
        FINANCE_AI_MODEL_API_KEY: "primary-secret-key",
        FINANCE_AI_MODEL_ID: "gpt-5.5",
        FINANCE_AI_MODEL_ALLOW_NETWORK: "true",
        FINANCE_AI_MODEL_RUNTIME: "local-real-model-smoke",
        FINANCE_AI_MODEL_BASE_URL: "https://api.openai.com/v1",
        FINANCE_AI_MODEL_API_STYLE: "responses",
        FINANCE_AI_MODEL_FALLBACK_API_KEY: "fallback-one-secret-key",
        FINANCE_AI_MODEL_FALLBACK_ID: "gemini-2.5-flash",
        FINANCE_AI_MODEL_FALLBACK_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai",
        FINANCE_AI_MODEL_FALLBACK_API_STYLE: "chat-completions",
        FINANCE_AI_MODEL_FALLBACK_ALLOW_NETWORK: "true",
        FINANCE_AI_MODEL_FALLBACK2_API_KEY: "fallback-two-secret-key",
        FINANCE_AI_MODEL_FALLBACK2_ID: "google/gemini-2.0-flash-exp:free",
        FINANCE_AI_MODEL_FALLBACK2_BASE_URL: "https://openrouter.ai/api/v1",
        FINANCE_AI_MODEL_FALLBACK2_API_STYLE: "chat-completions",
        FINANCE_AI_MODEL_FALLBACK2_ALLOW_NETWORK: "true",
      },
    });

    const result = await adapter.generateStructuredAnalysis({
      stock: { code: "MSFT", name: "Microsoft", market: "us", samplePrice: 100 },
      riskProfile: "balanced",
      sourceContext: {
        sourceRefs: [{ type: "news", title: "Microsoft headline", sourceLabel: "Yahoo Finance RSS" }],
      },
      macroContext: { status: "ok", market: "us", summary: "美国宏观指标来自 World Bank Open Data。" },
    });

    assert.equal(result.status, "ok");
    assert.equal(requests.length, 3);
    assert.deepEqual(result.providerRelay.attempted, [
      "gpt-5.5",
      "gemini-2.5-flash",
      "google/gemini-2.0-flash-exp:free",
    ]);
    assert.equal(result.providerRelay.used, "google/gemini-2.0-flash-exp:free");
    assert.equal(result.providerRelay.primaryErrorCode, "REAL_AI_MODEL_INSUFFICIENT_QUOTA");
    assert.equal(result.providerRelay.fallbackErrorCodes[0].model, "gemini-2.5-flash");
    assert.equal(result.providerRelay.fallbackErrorCodes[0].code, "REAL_AI_MODEL_RATE_LIMIT_OR_QUOTA");
    assert.equal(result.providerRelay.fallbackErrorCodes[0].finalReason, "额度或速率受限");
    assert.equal(result.providerRelay.fallbackErrorCodes[0].cooldownStatus, "cooldown-active");
    assert.ok(result.providerRelay.fallbackErrorCodes[0].retryAfterSeconds >= 600);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("compliance-service endpoint reports public analysis release gates", async () => {
  const services = await requestMock("/api/compliance/status");
  assert.equal(services.status, 200);
  assert.equal(services.body.activeService.id, "mock-compliance-service");
  assert.equal(services.body.activeService.mode, "sample");
  assert.equal(services.body.activeService.reviewMode, "policy-gate");
  assert.match(services.body.activeService.requiredDisclaimer, /不构成任何投资建议/);
  assert.ok(services.body.activeService.prohibitedClaims.includes("保证收益"));
  assert.equal(services.body.activeService.outputPolicy.probabilityLanguage, "模型参考概率");
  assert.equal(services.body.activeService.outputPolicy.forbidsMustBuySell, true);
  assert.equal(services.body.activeService.acknowledgementPolicy.requiresRiskAcknowledgement, true);
  assert.equal(services.body.activeService.suitabilityPolicy.version, "suitability-v0");
  assert.ok(
    services.body.activeService.suitabilityPolicy.requiredFields.includes("riskTolerance"),
  );
  assert.equal(services.body.activeService.suitabilityEnforcementPolicy.status, "blocked");
  assert.equal(
    services.body.activeService.suitabilityEnforcementPolicy.enforcementMode,
    "dry-run-no-personalized-restriction",
  );
  assert.equal(
    services.body.activeService.suitabilityEnforcementPolicy.canRestrictAnalysisByProfile,
    false,
  );
  assert.equal(services.body.activeService.jurisdictionEnforcementPolicy.status, "blocked");
  assert.equal(
    services.body.activeService.jurisdictionEnforcementPolicy.enforcementMode,
    "dry-run-no-region-restriction",
  );
  assert.equal(
    services.body.activeService.jurisdictionEnforcementPolicy.canRestrictByJurisdiction,
    false,
  );
  assert.ok(services.body.activeService.jurisdictionEnforcementPolicy.supportedJurisdictions.includes("AU"));
  assert.equal(services.body.activeService.disclosureVersioningPolicy.status, "blocked");
  assert.equal(
    services.body.activeService.disclosureVersioningPolicy.versioningMode,
    "dry-run-no-disclosure-version-release",
  );
  assert.equal(
    services.body.activeService.disclosureVersioningPolicy.canReleaseDisclosureVersion,
    false,
  );
  assert.equal(
    services.body.activeService.disclosureVersioningPolicy.activeVersions.disclaimer,
    "disclaimer-v0",
  );
  assert.equal(services.body.activeService.licensedAdviserReviewPolicy.status, "blocked");
  assert.equal(
    services.body.activeService.licensedAdviserReviewPolicy.reviewMode,
    "dry-run-no-adviser-approval",
  );
  assert.equal(
    services.body.activeService.licensedAdviserReviewPolicy.canApprovePersonalizedAdvice,
    false,
  );
  assert.ok(
    services.body.activeService.licensedAdviserReviewPolicy.requiredTriggers.includes(
      "strongBuySellLanguage",
    ),
  );
  assert.equal(services.body.activeService.complianceGate.status, "blocked");
  assert.equal(services.body.activeService.complianceGate.canReleasePublicAnalysis, false);
  assert.ok(
    services.body.activeService.complianceGate.checks.some(
      (check) => check.id === "riskAcknowledgement" && check.status === "blocked",
    ),
  );
  assert.ok(
    services.body.activeService.complianceGate.checks.some(
      (check) => check.id === "suitabilityEnforcement" && check.status === "blocked",
    ),
  );
  assert.ok(
    services.body.activeService.complianceGate.checks.some(
      (check) => check.id === "jurisdictionEnforcement" && check.status === "blocked",
    ),
  );
  assert.ok(
    services.body.activeService.complianceGate.checks.some(
      (check) => check.id === "disclosureVersioning" && check.status === "blocked",
    ),
  );
  assert.ok(
    services.body.activeService.complianceGate.checks.some(
      (check) => check.id === "licensedAdviserReview" && check.status === "blocked",
    ),
  );
  assert.ok(services.body.activeService.capabilities.includes("prohibitedClaimFilter"));
  assert.ok(
    services.body.activeService.missingProductionCapabilities.includes("legalReviewWorkflow"),
  );
  assert.match(services.body.activeService.disclaimer, /法律复核/);
});

test("compliance gate becomes ready after acknowledgement, legal, and jurisdiction review", () => {
  const gate = evaluateComplianceGate({
    env: {
      FINANCE_AI_COMPLIANCE_ACK_READY: "true",
      FINANCE_AI_COMPLIANCE_SUITABILITY_READY: "true",
      FINANCE_AI_COMPLIANCE_SUITABILITY_ENFORCEMENT_READY: "true",
      FINANCE_AI_COMPLIANCE_LEGAL_REVIEWED: "true",
      FINANCE_AI_COMPLIANCE_JURISDICTION_REVIEWED: "true",
      FINANCE_AI_COMPLIANCE_JURISDICTION_ENFORCEMENT_READY: "true",
      FINANCE_AI_COMPLIANCE_DISCLOSURE_VERSIONING_READY: "true",
      FINANCE_AI_COMPLIANCE_LICENSED_ADVISER_REVIEW_READY: "true",
    },
  });
  assert.equal(gate.status, "ready-for-public-beta");
  assert.equal(gate.canReleasePublicAnalysis, true);
  assert.ok(gate.checks.every((check) => check.status === "pass"));

  const service = createComplianceService({
    env: {
      FINANCE_AI_COMPLIANCE_ACK_READY: "true",
      FINANCE_AI_COMPLIANCE_SUITABILITY_READY: "true",
      FINANCE_AI_COMPLIANCE_SUITABILITY_ENFORCEMENT_READY: "true",
      FINANCE_AI_COMPLIANCE_LEGAL_REVIEWED: "true",
      FINANCE_AI_COMPLIANCE_JURISDICTION_REVIEWED: "true",
      FINANCE_AI_COMPLIANCE_JURISDICTION_ENFORCEMENT_READY: "true",
      FINANCE_AI_COMPLIANCE_DISCLOSURE_VERSIONING_READY: "true",
      FINANCE_AI_COMPLIANCE_LICENSED_ADVISER_REVIEW_READY: "true",
    },
  }).status();
  assert.equal(service.complianceGate.status, "ready-for-public-beta");
  assert.equal(service.suitabilityEnforcementPolicy.status, "ready");
  assert.equal(service.jurisdictionEnforcementPolicy.status, "ready");
  assert.equal(service.disclosureVersioningPolicy.status, "ready");
  assert.equal(service.licensedAdviserReviewPolicy.status, "ready");
  assert.equal(service.acknowledgementPolicy.recordsDisclosureVersion, true);
  assert.equal(service.suitabilityPolicy.scoringMode, "sample-rule-based");
});

test("compliance acknowledgement endpoints save user-scoped risk confirmations", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const unauthorized = await requestMock("/api/compliance/acknowledgements", {}, state);
  assert.equal(unauthorized.status, 401);

  const invalid = await requestMock(
    "/api/compliance/acknowledgements",
    {
      method: "POST",
      headers: auth,
      body: { acceptedDisclaimer: true, riskAcknowledged: false },
    },
    state,
  );
  assert.equal(invalid.status, 400);

  const saved = await requestMock(
    "/api/compliance/acknowledgements",
    {
      method: "POST",
      headers: auth,
      body: {
        version: "compliance-ack-v0",
        acceptedDisclaimer: true,
        riskAcknowledged: true,
        optionalPortfolioNoticeAcknowledged: true,
        source: "test-suite",
      },
    },
    state,
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.saved.userId, "demo-user");
  assert.equal(saved.body.saved.version, "compliance-ack-v0");
  assert.equal(saved.body.saved.acceptedDisclaimer, true);
  assert.equal(saved.body.saved.riskAcknowledged, true);

  const list = await requestMock(
    "/api/compliance/acknowledgements?version=compliance-ack-v0",
    { headers: auth },
    state,
  );
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.latest.id, saved.body.saved.id);
  assert.equal(list.body.acknowledgementPolicy.version, "compliance-ack-v0");

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(
    auditLog.body.items.some((event) => event.eventType === "compliance.acknowledgement.save"),
  );
});

test("suitability questionnaire endpoints save user-scoped risk profile records", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const unauthorized = await requestMock("/api/compliance/suitability", {}, state);
  assert.equal(unauthorized.status, 401);

  const invalid = await requestMock(
    "/api/compliance/suitability",
    {
      method: "POST",
      headers: auth,
      body: { answers: { riskTolerance: "high" } },
    },
    state,
  );
  assert.equal(invalid.status, 400);

  const saved = await requestMock(
    "/api/compliance/suitability",
    {
      method: "POST",
      headers: auth,
      body: {
        version: "suitability-v0",
        answers: {
          riskTolerance: "high",
          investmentExperience: "experienced",
          investmentHorizon: "long",
          liquidityNeed: "low",
        },
      },
    },
    state,
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.saved.userId, "demo-user");
  assert.equal(saved.body.saved.version, "suitability-v0");
  assert.equal(saved.body.saved.score, 100);
  assert.equal(saved.body.saved.suitabilityLevel, "growth");
  assert.equal(saved.body.saved.levelLabel, "成长型");

  const list = await requestMock(
    "/api/compliance/suitability?version=suitability-v0",
    { headers: auth },
    state,
  );
  assert.equal(list.status, 200);
  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.latest.id, saved.body.saved.id);
  assert.equal(list.body.questionnaire.version, "suitability-v0");
  assert.ok(list.body.questionnaire.requiredFields.includes("liquidityNeed"));

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(
    auditLog.body.items.some((event) => event.eventType === "compliance.suitability.save"),
  );
});

test("auth-service endpoint reports active auth capabilities", async () => {
  const services = await requestMock("/api/auth/status");
  assert.equal(services.status, 200);
  assert.equal(services.body.activeService.id, "mock-auth");
  assert.equal(services.body.activeService.mode, "sample");
  assert.deepEqual(services.body.activeService.supportedMethods, ["demoToken", "emailPassword"]);
  assert.equal(services.body.activeService.sessionMode, "bearer-token-sample-email-password");
  assert.equal(services.body.activeService.providerAdapter.id, "auth-provider-adapter");
  assert.equal(services.body.activeService.providerAdapter.status, "blocked");
  assert.equal(services.body.activeService.providerAdapter.securityGate.status, "blocked");
  assert.equal(services.body.activeService.providerAdapter.canUseProductionAuth, false);
  assert.equal(services.body.activeService.providerAdapter.passwordPolicy.minLength, 12);
  assert.equal(services.body.activeService.rolePolicy.id, "mock-auth-role-policy");
  assert.deepEqual(services.body.activeService.rolePolicy.allowedRoles, [
    "user",
    "admin",
    "auditor",
    "compliance",
  ]);
  assert.equal(services.body.activeService.rolePolicy.productionSelfServiceAllowed, false);
  assert.equal(services.body.activeService.rolePolicy.adminAssignmentPolicy.requiredRole, "admin");
  assert.equal(
    services.body.activeService.rolePolicy.adminAssignmentPolicy.defaultPrivilegedRoleExpiryHours,
    720,
  );
  assert.equal(services.body.activeService.rolePolicy.adminAssignmentPolicy.maxRoleExpiryHours, 8760);
  assert.equal(services.body.activeService.rolePolicy.adminRevocationPolicy.requiredRole, "admin");
  assert.deepEqual(services.body.activeService.rolePolicy.adminRevocationPolicy.revocableRoles, [
    "admin",
    "auditor",
    "compliance",
  ]);
  assert.equal(services.body.activeService.rolePolicy.adminRoleHistoryPolicy.requiredRole, "admin");
  assert.deepEqual(services.body.activeService.rolePolicy.adminRoleHistoryPolicy.eventTypes, [
    "auth.roleChange",
  ]);
  assert.equal(
    services.body.activeService.rolePolicy.endpointContracts.some(
      (contract) => contract.path === "/api/admin/auth/users/roles",
    ),
    true,
  );
  assert.equal(
    services.body.activeService.rolePolicy.endpointContracts.some(
      (contract) => contract.path === "/api/admin/auth/users/roles/revoke",
    ),
    true,
  );
  assert.equal(
    services.body.activeService.rolePolicy.endpointContracts.some(
      (contract) => contract.path === "/api/admin/auth/roles/history",
    ),
    true,
  );
  assert.match(services.body.activeService.disclaimer, /样例认证服务/);
  assert.equal(services.body.services[0].id, services.body.activeService.id);
});

test("auth-provider adapter endpoint reports production auth safety gates", async () => {
  const response = await requestMock("/api/auth/provider-adapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerAdapter.id, "auth-provider-adapter");
  assert.equal(response.body.providerAdapter.runtimeMode, "inactive");
  assert.equal(response.body.providerAdapter.canUseProductionAuth, false);
  assert.deepEqual(response.body.providerAdapter.missingEnvVars, [
    "FINANCE_AI_AUTH_PROVIDER",
    "FINANCE_AI_AUTH_CLIENT_ID",
    "FINANCE_AI_AUTH_CLIENT_SECRET",
    "FINANCE_AI_AUTH_JWT_SECRET",
    "FINANCE_AI_AUTH_RISK_ENGINE_READY",
    "FINANCE_AI_AUTH_ACCOUNT_RECOVERY_READY",
    "FINANCE_AI_AUTH_SESSION_SECURITY_READY",
    "FINANCE_AI_AUTH_CSRF_PROTECTION_READY",
    "FINANCE_AI_AUTH_CREDENTIAL_STORAGE_READY",
    "FINANCE_AI_AUTH_MFA_POLICY_READY",
    "FINANCE_AI_AUTH_EMAIL_VERIFICATION_POLICY_READY",
    "FINANCE_AI_AUTH_OIDC_CALLBACK_READY",
    "FINANCE_AI_AUTH_ROLE_AUTHORIZATION_READY",
    "FINANCE_AI_AUTH_AUDIT_LOGGING_READY",
    "FINANCE_AI_AUTH_PRIVACY_CONSENT_READY",
  ]);
  assert.equal(response.body.providerAdapter.credentialStoragePolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.credentialStoragePolicy.mode,
    "dry-run-no-production-credential-storage",
  );
  assert.equal(
    response.body.providerAdapter.credentialStoragePolicy.canStoreProductionCredentials,
    false,
  );
  assert.ok(
    response.body.providerAdapter.credentialStoragePolicy.requiredControls.includes(
      "breachedPasswordScreening",
    ),
  );
  assert.equal(response.body.providerAdapter.sessionPolicy.rotationRequired, true);
  assert.equal(response.body.providerAdapter.sessionSecurityPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.sessionSecurityPolicy.mode,
    "dry-run-no-session-hardening",
  );
  assert.equal(response.body.providerAdapter.sessionSecurityPolicy.canIssueProductionSessions, false);
  assert.ok(
    response.body.providerAdapter.sessionSecurityPolicy.requiredControls.includes(
      "refreshTokenRotation",
    ),
  );
  assert.equal(response.body.providerAdapter.csrfProtectionPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.csrfProtectionPolicy.mode,
    "dry-run-no-cross-site-mutation",
  );
  assert.equal(response.body.providerAdapter.csrfProtectionPolicy.canAcceptCrossSiteMutations, false);
  assert.ok(
    response.body.providerAdapter.csrfProtectionPolicy.requiredControls.includes(
      "csrfTokenBinding",
    ),
  );
  assert.ok(
    response.body.providerAdapter.csrfProtectionPolicy.forbiddenRequestPatterns.includes(
      "wildcardCorsWithCredentials",
    ),
  );
  assert.equal(response.body.providerAdapter.mfaPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.mfaPolicy.mode, "dry-run-no-production-mfa");
  assert.equal(response.body.providerAdapter.mfaPolicy.canChallengeProductionUsers, false);
  assert.ok(response.body.providerAdapter.mfaPolicy.requiredControls.includes("backupCodeHashing"));
  assert.equal(response.body.providerAdapter.emailVerificationPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.emailVerificationPolicy.mode,
    "dry-run-no-production-email-verification",
  );
  assert.equal(response.body.providerAdapter.emailVerificationPolicy.canVerifyProductionEmail, false);
  assert.ok(
    response.body.providerAdapter.emailVerificationPolicy.requiredControls.includes(
      "oneTimeVerificationToken",
    ),
  );
  assert.equal(response.body.providerAdapter.oidcCallbackPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.oidcCallbackPolicy.mode,
    "dry-run-no-oidc-callback",
  );
  assert.equal(response.body.providerAdapter.oidcCallbackPolicy.canHandleProductionCallback, false);
  assert.ok(
    response.body.providerAdapter.oidcCallbackPolicy.requiredControls.includes(
      "redirectUriAllowlist",
    ),
  );
  assert.ok(
    response.body.providerAdapter.oidcCallbackPolicy.forbiddenCallbackInputs.includes(
      "unvalidatedRedirectUri",
    ),
  );
  assert.equal(response.body.providerAdapter.roleAuthorizationPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.roleAuthorizationPolicy.mode,
    "dry-run-no-production-role-escalation",
  );
  assert.equal(response.body.providerAdapter.roleAuthorizationPolicy.canUseProductionAdminRoles, false);
  assert.ok(
    response.body.providerAdapter.roleAuthorizationPolicy.requiredControls.includes(
      "verifiedIdpRoleClaims",
    ),
  );
  assert.ok(
    response.body.providerAdapter.roleAuthorizationPolicy.forbiddenRoleSources.includes(
      "demoLoginSelfEscalation",
    ),
  );
  assert.equal(response.body.providerAdapter.auditLoggingPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.auditLoggingPolicy.mode,
    "dry-run-no-auth-audit-release",
  );
  assert.equal(
    response.body.providerAdapter.auditLoggingPolicy.canReleaseProductionAuthEvents,
    false,
  );
  assert.ok(
    response.body.providerAdapter.auditLoggingPolicy.requiredControls.includes(
      "tamperEvidentHashChain",
    ),
  );
  assert.ok(
    response.body.providerAdapter.auditLoggingPolicy.forbiddenAuditFields.includes(
      "rawAuthorizationCode",
    ),
  );
  assert.equal(response.body.providerAdapter.privacyConsentPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.privacyConsentPolicy.mode,
    "dry-run-no-privacy-release",
  );
  assert.equal(
    response.body.providerAdapter.privacyConsentPolicy.canReleaseProductionPrivacyText,
    false,
  );
  assert.ok(
    response.body.providerAdapter.privacyConsentPolicy.requiredControls.includes(
      "explicitConsentVersion",
    ),
  );
  assert.ok(
    response.body.providerAdapter.privacyConsentPolicy.forbiddenBehaviors.includes(
      "silentConsentUpgrade",
    ),
  );
  assert.equal(response.body.providerAdapter.loginRiskPolicy.status, "blocked");
  assert.ok(response.body.providerAdapter.loginRiskPolicy.forbiddenAuditFields.includes("password"));
  assert.equal(response.body.providerAdapter.accountRecoveryPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.productionAuthPreflightPlan.mode,
    "dry-run-no-provider-call",
  );
  assert.equal(response.body.providerAdapter.productionAuthPreflightPlan.canExecuteProductionAuth, false);
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "mfaReadiness" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "credentialStorage" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "sessionSecurity" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "csrfProtection" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "mfaPolicy" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "emailVerificationPolicy" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "oidcCallback" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "roleAuthorization" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "auditLogging" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.securityGate.checks.some(
      (check) => check.id === "privacyReview" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.productionAuthPreflightPlan.requestEnvelope.forbiddenFields.includes(
      "clientAssignedRole",
    ),
  );
  assert.ok(
    response.body.providerAdapter.productionAuthPreflightPlan.requestEnvelope.forbiddenFields.includes(
      "unvalidatedRedirectUri",
    ),
  );
  assert.ok(
    response.body.providerAdapter.productionAuthPreflightPlan.requestEnvelope.forbiddenFields.includes(
      "csrfTokenInUrl",
    ),
  );
  assert.ok(
    response.body.providerAdapter.productionAuthPreflightPlan.requestEnvelope.forbiddenFields.includes(
      "rawAuthEventPayload",
    ),
  );
  assert.equal(response.body.providerAdapter.safety.storesPasswordHashesOnly, true);
  assert.equal(response.body.providerAdapter.safety.requiresCredentialStorageHardening, true);
  assert.equal(response.body.providerAdapter.safety.requiresSessionSecurity, true);
  assert.equal(response.body.providerAdapter.safety.requiresCsrfProtection, true);
  assert.equal(response.body.providerAdapter.safety.requiresOidcCallbackProtection, true);
  assert.equal(response.body.providerAdapter.safety.requiresRoleAuthorization, true);
  assert.equal(response.body.providerAdapter.safety.requiresAuthAuditLogging, true);
  assert.match(response.body.providerAdapter.disclaimer, /不会请求真实认证服务/);
});

test("auth-provider adapter becomes ready after config, MFA, audit, and privacy gates", () => {
  const adapter = createAuthProviderAdapter({
    env: {
      FINANCE_AI_AUTH_PROVIDER: "managed-auth-provider",
      FINANCE_AI_AUTH_CLIENT_ID: "client-id",
      FINANCE_AI_AUTH_CLIENT_SECRET: "client-secret",
      FINANCE_AI_AUTH_JWT_SECRET: "jwt-secret",
      FINANCE_AI_AUTH_AUDIT_READY: "true",
      FINANCE_AI_AUTH_PRIVACY_REVIEWED: "true",
      FINANCE_AI_AUTH_MFA_READY: "true",
      FINANCE_AI_AUTH_EMAIL_VERIFICATION_READY: "true",
      FINANCE_AI_AUTH_RISK_ENGINE_READY: "true",
      FINANCE_AI_AUTH_ACCOUNT_RECOVERY_READY: "true",
      FINANCE_AI_AUTH_SESSION_SECURITY_READY: "true",
      FINANCE_AI_AUTH_CSRF_PROTECTION_READY: "true",
      FINANCE_AI_AUTH_CREDENTIAL_STORAGE_READY: "true",
      FINANCE_AI_AUTH_MFA_POLICY_READY: "true",
      FINANCE_AI_AUTH_EMAIL_VERIFICATION_POLICY_READY: "true",
      FINANCE_AI_AUTH_OIDC_CALLBACK_READY: "true",
      FINANCE_AI_AUTH_ROLE_AUTHORIZATION_READY: "true",
      FINANCE_AI_AUTH_AUDIT_LOGGING_READY: "true",
      FINANCE_AI_AUTH_PRIVACY_CONSENT_READY: "true",
    },
  });
  assert.equal(adapter.status, "ready-for-implementation");
  assert.equal(adapter.selectedProvider, "managed-auth-provider");
  assert.equal(adapter.securityGate.status, "ready-for-production-auth");
  assert.equal(adapter.securityGate.canUseProductionAuth, true);
  assert.equal(adapter.canUseProductionAuth, false);
  assert.equal(adapter.credentialStoragePolicy.status, "ready");
  assert.equal(adapter.credentialStoragePolicy.canStoreProductionCredentials, false);
  assert.equal(adapter.sessionPolicy.deviceBindingRequired, true);
  assert.equal(adapter.sessionSecurityPolicy.status, "ready");
  assert.equal(adapter.sessionSecurityPolicy.canIssueProductionSessions, false);
  assert.equal(adapter.csrfProtectionPolicy.status, "ready");
  assert.equal(adapter.csrfProtectionPolicy.canAcceptCrossSiteMutations, false);
  assert.ok(adapter.csrfProtectionPolicy.requiredControls.includes("originRefererValidation"));
  assert.equal(adapter.mfaPolicy.status, "ready");
  assert.equal(adapter.mfaPolicy.canChallengeProductionUsers, false);
  assert.equal(adapter.emailVerificationPolicy.status, "ready");
  assert.equal(adapter.emailVerificationPolicy.canVerifyProductionEmail, false);
  assert.equal(adapter.oidcCallbackPolicy.status, "ready");
  assert.equal(adapter.oidcCallbackPolicy.canHandleProductionCallback, false);
  assert.ok(adapter.oidcCallbackPolicy.requiredControls.includes("pkceVerification"));
  assert.equal(adapter.roleAuthorizationPolicy.status, "ready");
  assert.equal(adapter.roleAuthorizationPolicy.canUseProductionAdminRoles, false);
  assert.ok(adapter.roleAuthorizationPolicy.requiredControls.includes("adminApprovalWorkflow"));
  assert.equal(adapter.auditLoggingPolicy.status, "ready");
  assert.equal(adapter.auditLoggingPolicy.canReleaseProductionAuthEvents, false);
  assert.ok(adapter.auditLoggingPolicy.requiredControls.includes("auditExportHandoff"));
  assert.equal(adapter.privacyConsentPolicy.status, "ready");
  assert.equal(adapter.privacyConsentPolicy.canReleaseProductionPrivacyText, false);
  assert.ok(adapter.privacyConsentPolicy.requiredControls.includes("explicitConsentVersion"));
  assert.ok(adapter.privacyConsentPolicy.forbiddenBehaviors.includes("silentConsentUpgrade"));
  assert.equal(adapter.loginRiskPolicy.status, "ready");
  assert.equal(adapter.accountRecoveryPolicy.status, "ready");
  assert.equal(adapter.productionAuthPreflightPlan.status, "ready-for-manual-smoke");
  assert.equal(adapter.productionAuthPreflightPlan.canExecuteProductionAuth, false);
});

test("notification-service endpoint reports active delivery capabilities", async () => {
  const services = await requestMock("/api/notification-services");
  assert.equal(services.status, 200);
  assert.equal(services.body.activeService.id, "mock-notification-delivery");
  assert.equal(services.body.activeService.mode, "sample");
  assert.equal(services.body.activeService.deliveryMode, "outbox-only");
  assert.ok(services.body.activeService.supportedChannels.includes("wechat"));
  assert.ok(services.body.activeService.capabilities.includes("outboxQueue"));
  assert.equal(services.body.activeService.channelLabels.inApp, "网页内提醒");
  assert.equal(services.body.activeService.providerAdapter.id, "notification-provider-adapter");
  assert.equal(services.body.activeService.providerAdapter.status, "blocked");
  assert.equal(services.body.activeService.providerAdapter.deliveryGate.status, "blocked");
  assert.equal(services.body.activeService.providerAdapter.canUseExternalDelivery, false);
  assert.equal(services.body.activeService.providerAdapter.deliveryPolicy.requiresIdempotencyKey, true);
  assert.match(services.body.activeService.disclaimer, /不代表真实外部推送已送达/);
  assert.equal(services.body.services[0].id, services.body.activeService.id);
});

test("notification-provider adapter endpoint reports external delivery safety gates", async () => {
  const response = await requestMock("/api/notification-services/provider-adapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerAdapter.id, "notification-provider-adapter");
  assert.deepEqual(response.body.providerAdapter.missingEnvVars, [
    "FINANCE_AI_NOTIFICATION_PROVIDER",
    "FINANCE_AI_NOTIFICATION_PROVIDER_API_KEY",
    "FINANCE_AI_NOTIFICATION_WEBHOOK_SECRET",
    "FINANCE_AI_NOTIFICATION_RECEIPTS_READY",
    "FINANCE_AI_NOTIFICATION_SUPPRESSION_READY",
    "FINANCE_AI_NOTIFICATION_BOUNCE_READY",
    "FINANCE_AI_NOTIFICATION_WEBHOOK_ENDPOINT_READY",
    "FINANCE_AI_NOTIFICATION_WEBHOOK_REPLAY_READY",
    "FINANCE_AI_NOTIFICATION_RECEIPT_IDEMPOTENCY_READY",
  ]);
  assert.equal(response.body.providerAdapter.deliveryPolicy.providerWebhookVerification, true);
  assert.equal(response.body.providerAdapter.receiptPolicy.status, "blocked");
  assert.ok(response.body.providerAdapter.receiptPolicy.forbiddenAuditFields.includes("messageBody"));
  assert.equal(response.body.providerAdapter.suppressionPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.bounceHandlingPolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.webhookReceiptVerificationPlan.status, "blocked");
  assert.equal(
    response.body.providerAdapter.webhookReceiptVerificationPlan.mode,
    "dry-run-no-webhook-accept",
  );
  assert.equal(
    response.body.providerAdapter.webhookReceiptVerificationPlan.canAcceptProviderWebhook,
    false,
  );
  assert.equal(response.body.providerAdapter.webhookReceiptVerificationPlan.timestampToleranceSeconds, 300);
  assert.ok(
    response.body.providerAdapter.webhookReceiptVerificationPlan.checks.some(
      (check) => check.id === "providerEventIdempotency" && check.status === "blocked",
    ),
  );
  assert.equal(
    response.body.providerAdapter.externalDeliveryPreflightPlan.mode,
    "dry-run-no-external-send",
  );
  assert.equal(
    response.body.providerAdapter.externalDeliveryPreflightPlan.canExecuteExternalDelivery,
    false,
  );
  assert.ok(
    response.body.providerAdapter.deliveryGate.checks.some(
      (check) => check.id === "permissionConsent" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.channelContracts.some(
      (channel) => channel.id === "wechat" && channel.status === "planned",
    ),
  );
  assert.equal(response.body.providerAdapter.safety.forbidsSilentExternalDelivery, true);
  assert.match(response.body.providerAdapter.disclaimer, /不会请求真实推送/);
});

test("notification-provider adapter endpoint reports observability evidence package", async () => {
  const response = await requestMock("/api/notification-services/provider-adapter");
  assert.equal(response.status, 200);
  const evidence = response.body.providerAdapter.observabilityEvidencePackage;
  assert.equal(evidence.status, "defined");
  assert.equal(evidence.mode, "dry-run-no-observability-cutover");
  assert.equal(evidence.canEnableExternalDelivery, false);
  assert.equal(evidence.canSendExternalAlerts, false);
  assert.equal(evidence.requiredManualApproval, true);
  assert.equal(evidence.requiredSignals.length, 8);
  assert.ok(evidence.requiredSignals.includes("outbox-backlog-depth"));
  assert.ok(evidence.forbiddenAlertFields.includes("rawMessageBody"));
});

test("notification-provider adapter becomes ready after config, consent, audit, and privacy gates", () => {
  const adapter = createNotificationProviderAdapter({
    env: {
      FINANCE_AI_NOTIFICATION_PROVIDER: "managed-notification-provider",
      FINANCE_AI_NOTIFICATION_PROVIDER_API_KEY: "provider-key",
      FINANCE_AI_NOTIFICATION_WEBHOOK_SECRET: "webhook-secret",
      FINANCE_AI_NOTIFICATION_AUDIT_READY: "true",
      FINANCE_AI_NOTIFICATION_PRIVACY_REVIEWED: "true",
      FINANCE_AI_NOTIFICATION_CHANNEL_CONSENT_REVIEWED: "true",
      FINANCE_AI_NOTIFICATION_RECEIPTS_READY: "true",
      FINANCE_AI_NOTIFICATION_SUPPRESSION_READY: "true",
      FINANCE_AI_NOTIFICATION_BOUNCE_READY: "true",
      FINANCE_AI_NOTIFICATION_WEBHOOK_ENDPOINT_READY: "true",
      FINANCE_AI_NOTIFICATION_WEBHOOK_REPLAY_READY: "true",
      FINANCE_AI_NOTIFICATION_RECEIPT_IDEMPOTENCY_READY: "true",
    },
  });
  assert.equal(adapter.status, "ready-for-implementation");
  assert.equal(adapter.selectedProvider, "managed-notification-provider");
  assert.equal(adapter.deliveryGate.status, "ready-for-external-delivery");
  assert.equal(adapter.deliveryGate.canUseExternalDelivery, true);
  assert.equal(adapter.canUseExternalDelivery, false);
  assert.equal(adapter.consentPolicy.blocksSilentExternalDelivery, true);
  assert.equal(adapter.receiptPolicy.status, "ready");
  assert.equal(adapter.suppressionPolicy.status, "ready");
  assert.equal(adapter.bounceHandlingPolicy.status, "ready");
  assert.equal(adapter.webhookReceiptVerificationPlan.status, "ready-for-manual-smoke");
  assert.equal(adapter.webhookReceiptVerificationPlan.canAcceptProviderWebhook, false);
  assert.equal(adapter.externalDeliveryPreflightPlan.status, "ready-for-manual-smoke");
  assert.equal(adapter.externalDeliveryPreflightPlan.canExecuteExternalDelivery, false);
});

test("job-service endpoint reports active runner capabilities", async () => {
  const services = await requestMock("/api/job-services");
  assert.equal(services.status, 200);
  assert.equal(services.body.activeService.id, "mock-reminder-job-runner");
  assert.equal(services.body.activeService.mode, "sample");
  assert.equal(services.body.activeService.executionMode, "manual-api");
  assert.ok(services.body.activeService.supportedJobs.includes("reminderEvaluation"));
  assert.ok(services.body.activeService.capabilities.includes("jobRunRecords"));
  assert.match(services.body.activeService.disclaimer, /手动触发/);
  assert.equal(services.body.services[0].id, services.body.activeService.id);
});

test("scheduler-service endpoint reports active schedules and capabilities", async () => {
  const services = await requestMock("/api/scheduler/status");
  assert.equal(services.status, 200);
  assert.equal(services.body.activeService.id, "mock-scheduler-service");
  assert.equal(services.body.activeService.mode, "sample");
  assert.equal(services.body.activeService.executionMode, "manual-due-check");
  assert.equal(services.body.activeService.timezone, "Australia/Brisbane");
  assert.equal(services.body.activeService.schedules[0].jobType, "reminderEvaluation");
  assert.ok(services.body.activeService.capabilities.includes("jobRunnerBridge"));
  assert.ok(services.body.activeService.capabilities.includes("deadLetterQueue"));
  assert.ok(services.body.activeService.capabilities.includes("workerHeartbeat"));
  assert.ok(services.body.activeService.capabilities.includes("queueLagMonitoring"));
  assert.ok(services.body.activeService.capabilities.includes("enqueueJob"));
  assert.ok(services.body.activeService.capabilities.includes("retrySchedule"));
  assert.ok(services.body.activeService.capabilities.includes("queueAlerts"));
  assert.ok(services.body.activeService.capabilities.includes("workerSecretAuth"));
  assert.ok(services.body.activeService.capabilities.includes("workerNonceCleanup"));
  assert.equal(services.body.activeService.deadLetterPolicy.maxAttempts, 3);
  assert.equal(services.body.activeService.deadLetterPolicy.replaySupported, true);
  assert.equal(services.body.activeService.workerTelemetryPolicy.heartbeatTtlSeconds, 120);
  assert.equal(services.body.activeService.workerTelemetryPolicy.queueLagWarningSeconds, 300);
  assert.equal(services.body.activeService.workerAuthPolicy.enforcement, "sample-bypass");
  assert.equal(services.body.activeService.workerAuthPolicy.configured, false);
  assert.equal(services.body.activeService.workerAuthPolicy.nonceRequired, false);
  assert.equal(services.body.activeService.workerAuthPolicy.acceptedNonceHeader, "x-worker-nonce");
  assert.equal(services.body.activeService.workerAuthPolicy.nonceRetentionSeconds, 86400);
  assert.equal(services.body.activeService.workerAuthPolicy.nonceCleanupSupported, true);
  assert.equal(services.body.activeService.workerNonceMaintenancePolicy.cleanupSupported, true);
  assert.equal(services.body.activeService.workerNonceMaintenancePolicy.manualCleanupSupported, true);
  assert.equal(services.body.activeService.workerNonceMaintenancePolicy.auditTrailRequired, true);
  assert.equal(services.body.activeService.queuePolicy.enqueueSupported, true);
  assert.equal(services.body.activeService.queuePolicy.maxAttempts, 3);
  assert.equal(services.body.activeService.queuePolicy.deadLetterAfterMaxAttempts, true);
  assert.equal(services.body.activeService.providerAdapter.id, "scheduler-provider-adapter");
  assert.equal(services.body.activeService.providerAdapter.status, "blocked");
  assert.equal(services.body.activeService.providerAdapter.schedulerGate.status, "blocked");
  assert.equal(services.body.activeService.providerAdapter.canUseBackgroundWorkers, false);
  assert.equal(services.body.activeService.providerAdapter.queuePolicy.deadLetterQueueRequired, true);
  assert.match(services.body.activeService.disclaimer, /真实 cron/);
  assert.equal(services.body.services[0].id, services.body.activeService.id);
});

test("scheduler-provider adapter endpoint reports background worker safety gates", async () => {
  const response = await requestMock("/api/scheduler/provider-adapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerAdapter.id, "scheduler-provider-adapter");
  assert.deepEqual(response.body.providerAdapter.missingEnvVars, [
    "FINANCE_AI_SCHEDULER_PROVIDER",
    "FINANCE_AI_QUEUE_URL",
    "FINANCE_AI_WORKER_SECRET",
    "FINANCE_AI_CRON_SIGNING_SECRET",
    "FINANCE_AI_SCHEDULER_BACKPRESSURE_READY",
    "FINANCE_AI_SCHEDULER_WORKER_AUTH_READY",
    "FINANCE_AI_SCHEDULER_RUNBOOK_READY",
  ]);
  assert.equal(response.body.providerAdapter.runSafetyPolicy.requiresCronSignature, true);
  assert.equal(response.body.providerAdapter.backpressurePolicy.status, "blocked");
  assert.equal(response.body.providerAdapter.workerAuthPolicy.status, "blocked");
  assert.ok(response.body.providerAdapter.workerAuthPolicy.forbiddenAuditFields.includes("workerSecret"));
  assert.equal(response.body.providerAdapter.runbookPolicy.status, "blocked");
  assert.equal(
    response.body.providerAdapter.backgroundWorkerPreflightPlan.mode,
    "dry-run-no-worker-start",
  );
  assert.equal(
    response.body.providerAdapter.backgroundWorkerPreflightPlan.canStartBackgroundWorkers,
    false,
  );
  assert.ok(
    response.body.providerAdapter.schedulerGate.checks.some(
      (check) => check.id === "deadLetterQueue" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.providerAdapter.scheduleContracts.some(
      (schedule) => schedule.jobType === "newsIngestion" && schedule.status === "planned",
    ),
  );
  assert.equal(response.body.providerAdapter.safety.requiresWorkerHeartbeat, true);
  assert.match(response.body.providerAdapter.disclaimer, /不会启动真实 cron/);
});

test("scheduler-provider adapter endpoint reports incident response drill package", async () => {
  const response = await requestMock("/api/scheduler/provider-adapter");
  assert.equal(response.status, 200);
  const drillPackage = response.body.providerAdapter.incidentResponseDrillPackage;
  assert.equal(drillPackage.status, "defined");
  assert.equal(drillPackage.mode, "dry-run-no-worker-incident-cutover");
  assert.equal(drillPackage.canEnableBackgroundWorkers, false);
  assert.equal(drillPackage.canExecuteProductionIncidentDrill, false);
  assert.equal(drillPackage.requiredManualApproval, true);
  assert.equal(drillPackage.requiredDrills.length, 8);
  assert.ok(drillPackage.requiredDrills.includes("manual-due-job-check-fallback"));
  assert.ok(drillPackage.releaseBlockersThatMustRemainBlocked.includes("backgroundWorkers"));
});

test("scheduler-provider adapter becomes ready after config, DLQ, worker health, and audit gates", () => {
  const adapter = createSchedulerProviderAdapter({
    env: {
      FINANCE_AI_SCHEDULER_PROVIDER: "managed-queue-scheduler",
      FINANCE_AI_QUEUE_URL: "https://queue.example/jobs",
      FINANCE_AI_WORKER_SECRET: "worker-secret",
      FINANCE_AI_CRON_SIGNING_SECRET: "cron-secret",
      FINANCE_AI_SCHEDULER_AUDIT_READY: "true",
      FINANCE_AI_SCHEDULER_DLQ_READY: "true",
      FINANCE_AI_SCHEDULER_WORKER_HEALTH_READY: "true",
      FINANCE_AI_SCHEDULER_BACKPRESSURE_READY: "true",
      FINANCE_AI_SCHEDULER_WORKER_AUTH_READY: "true",
      FINANCE_AI_SCHEDULER_RUNBOOK_READY: "true",
    },
  });
  assert.equal(adapter.status, "ready-for-implementation");
  assert.equal(adapter.selectedProvider, "managed-queue-scheduler");
  assert.equal(adapter.schedulerGate.status, "ready-for-background-workers");
  assert.equal(adapter.schedulerGate.canUseBackgroundWorkers, true);
  assert.equal(adapter.canUseBackgroundWorkers, false);
  assert.equal(adapter.queuePolicy.requiresIdempotencyKey, true);
  assert.equal(adapter.backpressurePolicy.status, "ready");
  assert.equal(adapter.workerAuthPolicy.status, "ready");
  assert.equal(adapter.runbookPolicy.status, "ready");
  assert.equal(adapter.backgroundWorkerPreflightPlan.status, "ready-for-manual-smoke");
  assert.equal(adapter.backgroundWorkerPreflightPlan.canStartBackgroundWorkers, false);
});

test("repository status endpoint reports persistence mode and limits", async () => {
  const memoryStatus = await requestMock("/api/repository/status");
  assert.equal(memoryStatus.status, 200);
  assert.equal(memoryStatus.body.activeRepository.id, "mock-user-state-repository");
  assert.equal(memoryStatus.body.activeRepository.persistenceMode, "memory-only");
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("notificationOutbox"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("deadLetterQueue"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("queuedJobs"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("workerHeartbeats"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("workerRequestNonces"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("workerRequestNonceCleanup"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("queueTelemetry"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("complianceAcknowledgements"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("suitabilityQuestionnaires"));
  assert.ok(memoryStatus.body.activeRepository.capabilities.includes("auditArchiveReceipts"));
  assert.equal(memoryStatus.body.activeRepository.limits.auditLogs, 500);
  assert.equal(memoryStatus.body.activeRepository.limits.complianceAcknowledgements, 200);
  assert.equal(memoryStatus.body.activeRepository.limits.suitabilityQuestionnaires, 200);
  assert.equal(memoryStatus.body.activeRepository.limits.deadLetterQueue, 200);
  assert.equal(memoryStatus.body.activeRepository.limits.queuedJobs, 200);
  assert.equal(memoryStatus.body.activeRepository.limits.workerHeartbeats, 100);
  assert.equal(memoryStatus.body.activeRepository.limits.workerRequestNonces, 500);
  assert.equal(memoryStatus.body.activeRepository.limits.auditArchiveReceipts, 200);
  assert.match(memoryStatus.body.activeRepository.disclaimer, /服务重启后数据会丢失/);
  assert.equal(memoryStatus.body.repositories[0].id, memoryStatus.body.activeRepository.id);

  const fileState = createMockState();
  fileState.persistencePath = "/private/tmp/finance-ai-state.json";
  const fileStatus = await requestMock("/api/repository/status", {}, fileState);
  assert.equal(fileStatus.body.activeRepository.persistenceMode, "json-file");
  assert.equal(fileStatus.body.activeRepository.persistencePath, "configured");
  assert.match(fileStatus.body.activeRepository.disclaimer, /JSON 文件持久化桥/);
});

test("database status endpoint reports storage bridge and production gaps", async () => {
  const memoryStatus = await requestMock("/api/database/status");
  assert.equal(memoryStatus.status, 200);
  assert.equal(memoryStatus.body.activeService.id, "mock-database-service");
  assert.equal(memoryStatus.body.activeService.status, "planning");
  assert.equal(memoryStatus.body.activeService.activeStorage, "memory-only");
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("users"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("auth_role_grants"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("auth_role_events"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("auth_sessions"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("user_preferences"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("news_items"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("compliance_acknowledgements"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("suitability_questionnaires"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("audit_archive_receipts"));
  assert.ok(memoryStatus.body.activeService.plannedTables.includes("audit_events"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("repositoryBridge"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("repositoryContract"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("repositoryAdapterPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("repositoryRuntimeGuard"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryAdapter"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositorySmokeTest"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositorySqlContract"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryExecutionPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryParameterValidationPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryConnectionPoolPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositorySqlExecutorPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryResultAuditPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryReadRehearsalPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryParityPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryParityEvidencePlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryDualWritePlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryShadowWriteEvidencePlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryBackupRestoreEvidencePlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryCutoverMonitoringEvidencePlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryRollbackRehearsalEvidencePlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryCutoverAuditTrailEvidencePlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionRepositoryCutoverPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionDatabaseEncryptionPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionDatabaseAccessControlPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionDatabasePrivacyRetentionPlan"));
  assert.ok(memoryStatus.body.activeService.capabilities.includes("productionDatabaseResidencyTransferPlan"));
  assert.equal(memoryStatus.body.activeService.repositoryContract.status, "pass");
  assert.equal(memoryStatus.body.activeService.repositoryContract.missingMethods.length, 0);
  assert.equal(memoryStatus.body.activeService.productionAdapter.status, "not_configured");
  assert.equal(memoryStatus.body.activeService.productionAdapter.fallback.active, true);
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseEncryptionPlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseEncryptionPlan.mode,
    "dry-run-no-key-usage",
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseEncryptionPlan.canUseProductionKeys,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseEncryptionPlan.checks.some(
      (check) => check.id === "fieldLevelEncryption" && check.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionDatabaseEncryptionPlan.forbiddenAuditFields.includes(
      "rawKmsKey",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseAccessControlPlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseAccessControlPlan.mode,
    "dry-run-no-permission-change",
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseAccessControlPlan.canApplyDatabaseRoles,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseAccessControlPlan.checks.some(
      (check) => check.id === "rowLevelSecurity" && check.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionDatabaseAccessControlPlan.requiredRoles.includes(
      "audit_reader",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabasePrivacyRetentionPlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabasePrivacyRetentionPlan.mode,
    "dry-run-no-data-erasure",
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabasePrivacyRetentionPlan.canEraseProductionData,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionAdapter.productionDatabasePrivacyRetentionPlan.checks.some(
      (check) => check.id === "erasureWorkflow" && check.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionDatabasePrivacyRetentionPlan.governedDataScopes.includes(
      "analysis-history",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseResidencyTransferPlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseResidencyTransferPlan.mode,
    "dry-run-no-cross-border-transfer",
  );
  assert.equal(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseResidencyTransferPlan.canTransferAcrossRegions,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionAdapter.productionDatabaseResidencyTransferPlan.checks.some(
      (check) => check.id === "crossBorderTransfer" && check.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionDatabaseResidencyTransferPlan.regulatedDataScopes.includes(
      "suitability-questionnaires",
    ),
  );
  assert.equal(memoryStatus.body.activeService.migrationDryRun.status, "blocked");
  assert.ok(memoryStatus.body.activeService.migrationDryRun.tableOrder.includes("users"));
  assert.ok(
    memoryStatus.body.activeService.migrationDryRun.tablePlan.some(
      (entry) => entry.table === "notification_outbox" && entry.dependsOn.includes("reminder_rules"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationDryRun.tablePlan.some(
      (entry) => entry.table === "auth_role_grants" && entry.dependsOn.includes("users"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationDryRun.tablePlan.some(
      (entry) =>
        entry.table === "auth_role_events" &&
        entry.dependsOn.includes("users") &&
        entry.dependsOn.includes("auth_role_grants"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationDryRun.tablePlan.some(
      (entry) => entry.table === "audit_archive_receipts" && entry.dependsOn.includes("users"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationDryRun.tablePlan.some(
      (entry) => entry.table === "news_items" && entry.dependsOn.includes("users"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationDryRun.blockedReasons.some((reason) =>
      reason.includes("FINANCE_AI_DATABASE_URL"),
    ),
  );
  assert.equal(memoryStatus.body.activeService.migrationSqlDraft.status, "generated");
  assert.equal(memoryStatus.body.activeService.migrationSqlDraft.dialect, "postgresql");
  assert.equal(memoryStatus.body.activeService.migrationSqlDraft.destructive, false);
  assert.ok(memoryStatus.body.activeService.migrationSqlDraft.statementCount > 10);
  assert.match(memoryStatus.body.activeService.migrationSqlDraft.checksum, /^fnv1a-/);
  assert.ok(
    memoryStatus.body.activeService.migrationSqlDraft.preview.some((statement) =>
      statement.includes("CREATE EXTENSION IF NOT EXISTS pgcrypto"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationSqlDraft.statements.some((statement) =>
      statement.includes("source_credibility_score"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationSqlDraft.statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS auth_role_grants"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationSqlDraft.statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS auth_role_events"),
    ),
  );
  assert.equal(memoryStatus.body.activeService.migrationPackage.version, "2026.06.01.001_initial_schema");
  assert.equal(memoryStatus.body.activeService.migrationPackage.canExecute, false);
  assert.equal(memoryStatus.body.activeService.migrationPackage.executionMode, "review-only");
  assert.match(memoryStatus.body.activeService.migrationPackage.manifestChecksum, /^fnv1a-/);
  assert.ok(
    memoryStatus.body.activeService.migrationPackage.preflightChecks.some(
      (check) => check.id === "connectionConfig" && check.status === "blocked",
    ),
  );
  assert.ok(memoryStatus.body.activeService.migrationPackage.releaseGates.includes("SQL 草案已人工审查批准"));
  assert.equal(memoryStatus.body.activeService.readOnlyConnectionHealth.status, "blocked");
  assert.equal(memoryStatus.body.activeService.readOnlyConnectionHealth.safety.canWrite, false);
  assert.equal(memoryStatus.body.activeService.repositoryAdapterPlan.status, "blocked");
  assert.equal(memoryStatus.body.activeService.repositoryAdapterPlan.canSwitchAutomatically, false);
  assert.equal(memoryStatus.body.activeService.repositoryAdapterPlan.mockFallbackRequired, true);
  assert.ok(memoryStatus.body.activeService.repositoryAdapterPlan.methodPlan.requiredCount > 20);
  assert.ok(
    memoryStatus.body.activeService.repositoryAdapterPlan.dataDomains.some(
      (entry) => entry.domain === "authRoleGrants" && entry.table === "auth_role_grants",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.repositoryAdapterPlan.switchGates.some(
      (gate) => gate.id === "readOnlyConnection" && gate.status === "blocked",
    ),
  );
  assert.equal(memoryStatus.body.activeService.repositoryRuntimeGuard.status, "active");
  assert.equal(memoryStatus.body.activeService.repositoryRuntimeGuard.requestedMode, "mock");
  assert.equal(memoryStatus.body.activeService.repositoryRuntimeGuard.effectiveMode, "mock");
  assert.equal(memoryStatus.body.activeService.repositoryRuntimeGuard.canSwitchAutomatically, false);
  assert.ok(memoryStatus.body.activeService.repositoryRuntimeGuard.allowedModes.includes("postgres-primary"));
  assert.ok(
    memoryStatus.body.activeService.repositoryRuntimeGuard.checks.some(
      (check) => check.id === "mockFallback" && check.status === "pass",
    ),
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryAdapter.status, "blocked");
  assert.equal(memoryStatus.body.activeService.productionRepositoryAdapter.runtimeMode, "inactive");
  assert.equal(memoryStatus.body.activeService.productionRepositoryAdapter.safety.noNetworkCalls, true);
  assert.equal(memoryStatus.body.activeService.productionRepositoryAdapter.safety.noWrites, true);
  assert.ok(memoryStatus.body.activeService.productionRepositoryAdapter.methodCoverage.requiredCount > 20);
  assert.equal(memoryStatus.body.activeService.productionRepositoryAdapter.methodCoverage.missingCount, 0);
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryAdapter.tableCoverage.some(
      (entry) => entry.table === "auth_role_events" && entry.operationCount > 0,
    ),
  );
  assert.equal(memoryStatus.body.activeService.productionRepositorySmokeTest.status, "blocked");
  assert.equal(memoryStatus.body.activeService.productionRepositorySmokeTest.runtimeMode, "inactive");
  assert.equal(memoryStatus.body.activeService.productionRepositorySmokeTest.canExecuteAutomatically, false);
  assert.ok(memoryStatus.body.activeService.productionRepositorySmokeTest.coverage.readOnlyOperationCount > 0);
  assert.ok(
    memoryStatus.body.activeService.productionRepositorySmokeTest.criticalTables.includes(
      "auth_role_grants",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositorySmokeTest.blockedStatements.includes("DROP"),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositorySmokeTest.checks.some(
      (check) => check.id === "readOnlyProbeOptIn" && check.status === "pending",
    ),
  );
  assert.equal(memoryStatus.body.activeService.productionRepositorySqlContract.status, "draft-ready");
  assert.equal(memoryStatus.body.activeService.productionRepositorySqlContract.dialect, "postgresql");
  assert.equal(memoryStatus.body.activeService.productionRepositorySqlContract.runtimeMode, "inactive");
  assert.ok(memoryStatus.body.activeService.productionRepositorySqlContract.statementCount > 20);
  assert.ok(memoryStatus.body.activeService.productionRepositorySqlContract.writeStatementCount > 0);
  assert.ok(
    memoryStatus.body.activeService.productionRepositorySqlContract.statements.some(
      (statement) =>
        statement.method === "findAuthUserByEmail" &&
        statement.parameterStyle === "postgres-positional" &&
        statement.statement.includes("email = $1"),
    ),
  );
  assert.ok(memoryStatus.body.activeService.productionRepositorySqlContract.safety.noSqlExecution);
  assert.equal(memoryStatus.body.activeService.productionRepositoryExecutionPlan.status, "draft-ready");
  assert.equal(memoryStatus.body.activeService.productionRepositoryExecutionPlan.canExecuteSql, false);
  assert.ok(memoryStatus.body.activeService.productionRepositoryExecutionPlan.coverage.validatorCount > 0);
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryExecutionPlan.parameterValidators.some(
      (validator) => validator.parameterName === "email" && validator.type === "email",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryExecutionPlan.executionSteps.some(
      (step) => step.id === "openConnectionFromPool" && step.status === "blocked",
    ),
  );
  assert.ok(memoryStatus.body.activeService.productionRepositoryExecutionPlan.safety.auditRequiredForWrites);
  assert.equal(memoryStatus.body.activeService.productionRepositoryParameterValidationPlan.status, "draft-ready");
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryParameterValidationPlan.canValidateLocally,
    true,
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryParameterValidationPlan.canExecuteSql, false);
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryParameterValidationPlan.validatorTypes.includes(
      "email",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryParameterValidationPlan.validatorTypes.includes(
      "json-object",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryParameterValidationPlan.sampleValidationResults.some(
      (result) => result.id === "invalidEmail" && result.accepted === false,
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryParameterValidationPlan.safety.redactsSampleValues,
    true,
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryConnectionPoolPlan.status, "blocked");
  assert.equal(memoryStatus.body.activeService.productionRepositoryConnectionPoolPlan.canOpenConnection, false);
  assert.equal(memoryStatus.body.activeService.productionRepositoryConnectionPoolPlan.canExecuteSql, false);
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryConnectionPoolPlan.connection.configured,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryConnectionPoolPlan.lifecycleSteps.some(
      (step) => step.id === "acquireClient" && step.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryConnectionPoolPlan.checks.some(
      (check) => check.id === "parameterValidation" && check.status === "pass",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryConnectionPoolPlan.safety.releaseClientFinally,
    true,
  );
  assert.equal(memoryStatus.body.activeService.productionRepositorySqlExecutorPlan.status, "blocked");
  assert.equal(memoryStatus.body.activeService.productionRepositorySqlExecutorPlan.canExecuteSql, false);
  assert.equal(memoryStatus.body.activeService.productionRepositorySqlExecutorPlan.canOpenConnection, false);
  assert.ok(memoryStatus.body.activeService.productionRepositorySqlExecutorPlan.statementCount > 20);
  assert.ok(
    memoryStatus.body.activeService.productionRepositorySqlExecutorPlan.executableStatements.some(
      (statement) =>
        statement.method === "findAuthUserByEmail" &&
        statement.parameterBindingStyle === "pg-parameter-array",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositorySqlExecutorPlan.executorLifecycle.some(
      (step) => step.id === "executeClientQuery" && step.status === "blocked",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositorySqlExecutorPlan.safety.parameterArrayOnly,
    true,
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryResultAuditPlan.status, "blocked");
  assert.equal(memoryStatus.body.activeService.productionRepositoryResultAuditPlan.canMapLiveRows, false);
  assert.equal(memoryStatus.body.activeService.productionRepositoryResultAuditPlan.canWriteAudit, false);
  assert.ok(memoryStatus.body.activeService.productionRepositoryResultAuditPlan.mappingCount > 20);
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryResultAuditPlan.resultShapes.includes(
      "single-row-or-null",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryResultAuditPlan.auditValidationSamples.some(
      (sample) => sample.id === "unsafeRawValueEnvelope" && sample.accepted === false,
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryResultAuditPlan.safety.rawRowsNeverLogged,
    true,
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryReadRehearsalPlan.status, "blocked");
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryReadRehearsalPlan.canRunStagingReads,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryReadRehearsalPlan.coverage.readStatementCount >
      0,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryReadRehearsalPlan.checks.some(
      (check) => check.id === "readOnlyRehearsalOptIn" && check.status === "pending",
    ),
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryParityPlan.status, "blocked");
  assert.equal(memoryStatus.body.activeService.productionRepositoryParityPlan.runtimeMode, "inactive");
  assert.equal(memoryStatus.body.activeService.productionRepositoryParityPlan.canCompareAutomatically, false);
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryParityPlan.parityWindow.maxAllowedMismatchPercent,
    0,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryParityPlan.comparisonPlan.some(
      (entry) => entry.domain === "authUsers" && entry.table === "users",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryParityPlan.checks.some(
      (check) => check.id === "parityOptIn" && check.status === "pending",
    ),
  );
  assert.ok(memoryStatus.body.activeService.productionRepositoryParityPlan.safety.noWrites);
  assert.equal(memoryStatus.body.activeService.productionRepositoryParityEvidencePlan.status, "blocked");
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryParityEvidencePlan.canCaptureEvidence,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryParityEvidencePlan.mismatchCategories.some(
      (category) => category.id === "fieldValueMismatch" && category.severity === "blocker",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryParityEvidencePlan.auditEnvelope.forbiddenFields.includes(
      "rawPostgresRows",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryParityEvidencePlan.safety.mismatchBlocksCutover,
    true,
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryDualWritePlan.status, "blocked");
  assert.equal(memoryStatus.body.activeService.productionRepositoryDualWritePlan.runtimeMode, "inactive");
  assert.equal(memoryStatus.body.activeService.productionRepositoryDualWritePlan.canWriteAutomatically, false);
  assert.equal(memoryStatus.body.activeService.productionRepositoryDualWritePlan.mockPrimaryRequired, true);
  assert.equal(memoryStatus.body.activeService.productionRepositoryDualWritePlan.productionShadowWriteOnly, true);
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryDualWritePlan.rehearsalWindow.maxAllowedWriteMismatchPercent,
    0,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryDualWritePlan.writePlan.some(
      (entry) => entry.domain === "authUsers" && entry.table === "users",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryDualWritePlan.checks.some(
      (check) => check.id === "dualWriteOptIn" && check.status === "pending",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryDualWritePlan.rollbackTriggers.some(
      (trigger) => trigger.includes("写入结果不一致"),
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryShadowWriteEvidencePlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryShadowWriteEvidencePlan.canWriteProduction,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryShadowWriteEvidencePlan.idempotencyPolicy
      .requiredForEveryWrite,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryShadowWriteEvidencePlan.auditEnvelope.forbiddenFields.includes(
      "rawPayload",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryShadowWriteEvidencePlan.safety.rawPayloadNeverLogged,
    true,
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryBackupRestoreEvidencePlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryBackupRestoreEvidencePlan.canRunRestore,
    false,
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryBackupRestoreEvidencePlan.recoveryObjectives
      .targetRpoMinutes,
    15,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryBackupRestoreEvidencePlan.rehearsalArtifacts.some(
      (artifact) => artifact.id === "schemaDump" && artifact.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryBackupRestoreEvidencePlan.checks.some(
      (check) => check.id === "backupRestoreOptIn" && check.status === "pending",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryBackupRestoreEvidencePlan.safety
      .cutoverBlockedUntilRestoreVerified,
    true,
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryCutoverMonitoringEvidencePlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryCutoverMonitoringEvidencePlan.canReadProductionMetrics,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryCutoverMonitoringEvidencePlan.metricProbes.some(
      (probe) => probe.id === "writeFailureRate" && probe.rollbackOnBreach === true,
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryCutoverMonitoringEvidencePlan.checks.some(
      (check) => check.id === "monitoringOptIn" && check.status === "pending",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryCutoverMonitoringEvidencePlan.safety
      .cutoverBlockedUntilMonitoringVerified,
    true,
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryRollbackRehearsalEvidencePlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryRollbackRehearsalEvidencePlan.canRollbackRuntime,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryRollbackRehearsalEvidencePlan.rollbackPaths.some(
      (path) => path.id === "featureFlagRevert" && path.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryRollbackRehearsalEvidencePlan.checks.some(
      (check) => check.id === "rollbackRehearsalOptIn" && check.status === "pending",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryRollbackRehearsalEvidencePlan.safety
      .cutoverBlockedUntilRollbackVerified,
    true,
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryCutoverAuditTrailEvidencePlan.status,
    "blocked",
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryCutoverAuditTrailEvidencePlan.canWriteAudit,
    false,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryCutoverAuditTrailEvidencePlan.auditEnvelope
      .forbiddenFields.includes("rawPayload"),
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryCutoverAuditTrailEvidencePlan.checks.some(
      (check) => check.id === "auditTrailOptIn" && check.status === "pending",
    ),
  );
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryCutoverAuditTrailEvidencePlan.safety
      .cutoverBlockedUntilAuditVerified,
    true,
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryCutoverPlan.status, "blocked");
  assert.equal(memoryStatus.body.activeService.productionRepositoryCutoverPlan.runtimeMode, "inactive");
  assert.equal(memoryStatus.body.activeService.productionRepositoryCutoverPlan.canSwitchAutomatically, false);
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryCutoverPlan.featureFlag.name,
    "FINANCE_AI_REPOSITORY_MODE",
  );
  assert.equal(memoryStatus.body.activeService.productionRepositoryCutoverPlan.featureFlag.target, "postgres-primary");
  assert.equal(
    memoryStatus.body.activeService.productionRepositoryCutoverPlan.cutoverWindow.maxAllowedMismatchPercent,
    0,
  );
  assert.ok(
    memoryStatus.body.activeService.productionRepositoryCutoverPlan.checks.some(
      (check) => check.id === "humanApproval" && check.status === "pending",
    ),
  );
  assert.ok(memoryStatus.body.activeService.productionRepositoryCutoverPlan.safety.noAutomaticSwitch);
  assert.ok(
    memoryStatus.body.activeService.readOnlyConnectionHealth.checks.some(
      (check) => check.id === "driverAvailability" && check.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.readOnlyConnectionHealth.blockedReasons.some((reason) =>
      reason.includes("数据库驱动"),
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.productionAdapter.migrationPlan.steps.some(
      (step) => step.id === "configureConnection" && step.status === "blocked",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.repositoryContract.tableMappings.some(
      (mapping) => mapping.domain === "notificationOutbox" && mapping.table === "notification_outbox",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.repositoryContract.tableMappings.some(
      (mapping) => mapping.domain === "authRoleGrants" && mapping.table === "auth_role_grants",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.repositoryContract.tableMappings.some(
      (mapping) => mapping.domain === "authRoleEvents" && mapping.table === "auth_role_events",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.repositoryContract.tableMappings.some(
      (mapping) => mapping.domain === "newsIntelligence" && mapping.table === "news_items",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.repositoryContract.tableMappings.some(
      (mapping) =>
        mapping.domain === "suitabilityQuestionnaires" &&
        mapping.table === "suitability_questionnaires",
    ),
  );
  assert.ok(
    memoryStatus.body.activeService.migrationChecks.every((check) => check.status === "pass"),
  );
  assert.ok(
    memoryStatus.body.activeService.missingProductionCapabilities.includes("encryptionAtRest"),
  );
  assert.match(memoryStatus.body.activeService.disclaimer, /生产数据库/);

  const fileState = createMockState();
  fileState.persistencePath = "/private/tmp/finance-ai-state.json";
  const fileStatus = await requestMock("/api/database/status", {}, fileState);
  assert.equal(fileStatus.body.activeService.activeStorage, "json-file-bridge");
  assert.equal(fileStatus.body.services[0].id, fileStatus.body.activeService.id);
});

test("production database encryption plan becomes smoke-ready after KMS and encryption gates", () => {
  const adapter = createProductionDatabaseAdapter({
    env: {
      FINANCE_AI_DATABASE_URL: "postgres://user:pass@example.test:5432/finance",
      FINANCE_AI_DB_KMS_PROVIDER: "managed-kms",
      FINANCE_AI_DB_KMS_KEY_ID: "finance-key-v1",
      FINANCE_AI_DB_ENCRYPTION_AT_REST_READY: "true",
      FINANCE_AI_DB_FIELD_ENCRYPTION_READY: "true",
      FINANCE_AI_DB_KEY_ROTATION_READY: "true",
      FINANCE_AI_DB_BACKUP_ENCRYPTION_READY: "true",
    },
  });
  const plan = adapter.productionDatabaseEncryptionPlan({ status: "pass" });
  assert.equal(plan.status, "ready-for-manual-smoke");
  assert.equal(plan.mode, "dry-run-no-key-usage");
  assert.equal(plan.provider, "managed-kms");
  assert.equal(plan.keyIdConfigured, true);
  assert.equal(plan.canUseProductionKeys, false);
  assert.ok(plan.checks.every((check) => check.status === "pass"));
});

test("production database access control plan becomes smoke-ready after role and RLS gates", () => {
  const adapter = createProductionDatabaseAdapter({
    env: {
      FINANCE_AI_DATABASE_URL: "postgres://user:pass@example.test:5432/finance",
      FINANCE_AI_DB_LEAST_PRIVILEGE_READY: "true",
      FINANCE_AI_DB_RLS_READY: "true",
      FINANCE_AI_DB_SERVICE_ROLE_AUDIT_READY: "true",
      FINANCE_AI_DB_ADMIN_APPROVAL_READY: "true",
    },
  });
  const plan = adapter.productionDatabaseAccessControlPlan({ status: "pass" });
  assert.equal(plan.status, "ready-for-manual-smoke");
  assert.equal(plan.mode, "dry-run-no-permission-change");
  assert.equal(plan.canApplyDatabaseRoles, false);
  assert.ok(plan.requiredRoles.includes("migration_runner"));
  assert.ok(plan.checks.every((check) => check.status === "pass"));
});

test("production database privacy retention plan becomes smoke-ready after erasure gates", () => {
  const adapter = createProductionDatabaseAdapter({
    env: {
      FINANCE_AI_DATABASE_URL: "postgres://user:pass@example.test:5432/finance",
      FINANCE_AI_DB_RETENTION_POLICY_READY: "true",
      FINANCE_AI_DB_ERASURE_WORKFLOW_READY: "true",
      FINANCE_AI_DB_SUBJECT_EXPORT_READY: "true",
      FINANCE_AI_DB_PRIVACY_AUDIT_READY: "true",
      FINANCE_AI_DB_LEGAL_HOLD_READY: "true",
      FINANCE_AI_DB_PRIVACY_APPROVAL_READY: "true",
    },
  });
  const plan = adapter.productionDatabasePrivacyRetentionPlan({ status: "pass" });
  assert.equal(plan.status, "ready-for-manual-smoke");
  assert.equal(plan.mode, "dry-run-no-data-erasure");
  assert.equal(plan.canEraseProductionData, false);
  assert.ok(plan.governedDataScopes.includes("notification-outbox"));
  assert.ok(plan.retentionClasses.includes("legal-hold"));
  assert.ok(plan.checks.every((check) => check.status === "pass"));
});

test("production database residency transfer plan becomes smoke-ready after region gates", () => {
  const adapter = createProductionDatabaseAdapter({
    env: {
      FINANCE_AI_DATABASE_URL: "postgres://user:pass@example.test:5432/finance",
      FINANCE_AI_DB_DATA_RESIDENCY_READY: "true",
      FINANCE_AI_DB_CROSS_BORDER_TRANSFER_READY: "true",
      FINANCE_AI_DB_REGIONAL_BACKUP_READY: "true",
      FINANCE_AI_DB_SUBPROCESSOR_REVIEW_READY: "true",
      FINANCE_AI_DB_RESIDENCY_APPROVAL_READY: "true",
    },
  });
  const plan = adapter.productionDatabaseResidencyTransferPlan({ status: "pass" });
  assert.equal(plan.status, "ready-for-manual-smoke");
  assert.equal(plan.mode, "dry-run-no-cross-border-transfer");
  assert.equal(plan.canTransferAcrossRegions, false);
  assert.ok(plan.governedRegions.includes("backup-region"));
  assert.ok(plan.regulatedDataScopes.includes("notification-recipients"));
  assert.ok(plan.checks.every((check) => check.status === "pass"));
});

test("database migration dry-run endpoint previews table order without writes", async () => {
  const response = await requestMock("/api/database/migration-dry-run");
  assert.equal(response.status, 200);
  assert.equal(response.body.dryRun.mode, "dry-run");
  assert.equal(response.body.dryRun.status, "blocked");
  assert.deepEqual(response.body.dryRun.tableOrder.slice(0, 3), [
    "users",
    "auth_role_grants",
    "auth_role_events",
  ]);
  assert.ok(
    response.body.dryRun.tablePlan.some(
      (entry) => entry.table === "auth_sessions" && entry.dependsOn.includes("users"),
    ),
  );
  assert.ok(
    response.body.dryRun.steps.some(
      (step) => step.id === "previewSchemaMigrations" && step.status === "pending",
    ),
  );
  assert.ok(response.body.dryRun.rollbackPlan.some((item) => item.includes("mock/JSON")));
  assert.equal(response.body.dryRun.migrationSqlDraft.status, "generated");
  assert.ok(
    response.body.dryRun.migrationSqlDraft.statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS users"),
    ),
  );
  assert.match(response.body.dryRun.disclaimer, /dry-run/);
});

test("database migration SQL draft endpoint returns reviewable PostgreSQL statements", async () => {
  const response = await requestMock("/api/database/migration-sql-draft");
  assert.equal(response.status, 200);
  assert.equal(response.body.draft.id, "production-db-sql-draft-001");
  assert.equal(response.body.draft.dialect, "postgresql");
  assert.equal(response.body.draft.status, "generated");
  assert.equal(response.body.draft.destructive, false);
  assert.equal(response.body.draft.reviewRequired, true);
  assert.ok(response.body.draft.statements[0].includes("CREATE EXTENSION IF NOT EXISTS pgcrypto"));
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS notification_outbox"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS suitability_questionnaires"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS worker_request_nonces"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS auth_role_grants"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("CREATE TABLE IF NOT EXISTS auth_role_events"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("idx_auth_role_events_target_created"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("expires_at TIMESTAMPTZ NOT NULL"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("raw_source_refs JSONB"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("idx_news_items_duplicate_group"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("idx_worker_request_nonces_user_created"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("idx_worker_request_nonces_expires"),
    ),
  );
  assert.ok(
    response.body.draft.statements.some((statement) =>
      statement.includes("REFERENCES reminder_rules(id)"),
    ),
  );
  assert.match(response.body.draft.checksum, /^fnv1a-/);
  assert.match(response.body.draft.disclaimer, /不会执行任何 SQL/);
});

test("database migration package endpoint returns versioned preflight gates", async () => {
  const response = await requestMock("/api/database/migration-package");
  assert.equal(response.status, 200);
  assert.equal(response.body.migrationPackage.id, "production-db-migration-package-001");
  assert.equal(response.body.migrationPackage.version, "2026.06.01.001_initial_schema");
  assert.equal(response.body.migrationPackage.status, "blocked");
  assert.equal(response.body.migrationPackage.canExecute, false);
  assert.equal(response.body.migrationPackage.executionMode, "review-only");
  assert.equal(response.body.migrationPackage.manifest.destructive, false);
  assert.match(response.body.migrationPackage.manifestChecksum, /^fnv1a-/);
  assert.ok(
    response.body.migrationPackage.preflightChecks.some(
      (check) => check.id === "liveConnection" && check.status === "blocked",
    ),
  );
  assert.ok(response.body.migrationPackage.pendingApprovals.includes("humanApproval"));
  assert.ok(response.body.migrationPackage.releaseGates.includes("迁移工具已接入并记录版本"));
  assert.match(response.body.migrationPackage.disclaimer, /canExecute=false/);
});

test("database read-only health endpoint reports safe connection blockers", async () => {
  const response = await requestMock("/api/database/read-only-health");
  assert.equal(response.status, 200);
  assert.equal(response.body.readOnlyHealth.id, "production-db-readonly-health");
  assert.equal(response.body.readOnlyHealth.mode, "read-only-health");
  assert.equal(response.body.readOnlyHealth.status, "blocked");
  assert.equal(response.body.readOnlyHealth.driver.package, "pg");
  assert.equal(response.body.readOnlyHealth.driver.available, false);
  assert.equal(response.body.readOnlyHealth.safety.readOnlyOnly, true);
  assert.equal(response.body.readOnlyHealth.safety.canWrite, false);
  assert.ok(response.body.readOnlyHealth.safety.blockedStatements.includes("DROP"));
  assert.ok(
    response.body.readOnlyHealth.checks.some(
      (check) => check.id === "networkProbe" && check.status === "skipped",
    ),
  );
  assert.match(response.body.readOnlyHealth.disclaimer, /不会写入数据库/);
});

test("database driver setup endpoint reports secret boundaries and smoke order", async () => {
  const response = await requestMock("/api/database/driver-setup-plan");
  assert.equal(response.status, 200);
  assert.equal(response.body.driverSetupPlan.id, "production-db-driver-setup-plan");
  assert.equal(response.body.driverSetupPlan.targetDriver, "pg");
  assert.equal(response.body.driverSetupPlan.canInstallAutomatically, false);
  assert.equal(response.body.driverSetupPlan.canConnectAutomatically, false);
  assert.ok(response.body.driverSetupPlan.smokeOrder.includes("readOnlyHealthPreflight"));
  assert.ok(response.body.driverSetupPlan.smokeOrder.includes("manualCutoverGate"));
  assert.equal(response.body.driverSetupPlan.secretBoundary.redactsConnectionUrl, true);
  assert.equal(response.body.driverSetupPlan.secretBoundary.canReadDatabaseSecrets, false);
  assert.equal(response.body.driverSetupPlan.secretBoundary.canPrintRawConnectionString, false);
  assert.ok(
    response.body.driverSetupPlan.secretBoundary.forbiddenAuditFields.includes(
      "rawConnectionString",
    ),
  );
  assert.ok(
    response.body.driverSetupPlan.envVars.some(
      (entry) => entry.name === "FINANCE_AI_DATABASE_URL" && entry.secret === true,
    ),
  );
});

test("database repository adapter plan endpoint reports switch gates", async () => {
  const response = await requestMock("/api/database/repository-adapter-plan");
  assert.equal(response.status, 200);
  assert.equal(response.body.repositoryAdapterPlan.id, "production-repository-adapter-plan");
  assert.equal(response.body.repositoryAdapterPlan.runtimeMode, "inactive");
  assert.equal(response.body.repositoryAdapterPlan.canSwitchAutomatically, false);
  assert.equal(response.body.repositoryAdapterPlan.mockFallbackRequired, true);
  assert.ok(response.body.repositoryAdapterPlan.methodPlan.requiredCount > 20);
  assert.equal(response.body.repositoryAdapterPlan.methodPlan.missingCount, 0);
  assert.ok(
    response.body.repositoryAdapterPlan.dataDomains.some(
      (entry) => entry.domain === "authRoleEvents" && entry.table === "auth_role_events",
    ),
  );
  assert.ok(
    response.body.repositoryAdapterPlan.switchGates.some(
      (gate) => gate.id === "repositoryContract" && gate.status === "pass",
    ),
  );
  assert.ok(
    response.body.repositoryAdapterPlan.switchGates.some(
      (gate) => gate.id === "driverSetup" && gate.status === "blocked",
    ),
  );
  assert.ok(
    response.body.repositoryAdapterPlan.blockedReasons.some((reason) =>
      reason.includes("驱动"),
    ),
  );
  assert.match(response.body.repositoryAdapterPlan.disclaimer, /不会连接数据库/);
});

test("database repository runtime guard endpoint blocks unsafe repository modes", async () => {
  const response = await requestMock("/api/database/repository-runtime-guard");
  assert.equal(response.status, 200);
  assert.equal(response.body.repositoryRuntimeGuard.id, "repository-runtime-guard");
  assert.equal(response.body.repositoryRuntimeGuard.status, "active");
  assert.equal(response.body.repositoryRuntimeGuard.requestedMode, "mock");
  assert.equal(response.body.repositoryRuntimeGuard.effectiveMode, "mock");
  assert.equal(response.body.repositoryRuntimeGuard.canSwitchAutomatically, false);
  assert.ok(response.body.repositoryRuntimeGuard.allowedModes.includes("postgres-primary"));
  assert.ok(
    response.body.repositoryRuntimeGuard.checks.some(
      (check) => check.id === "automaticSwitchDisabled" && check.status === "pass",
    ),
  );
  assert.match(response.body.repositoryRuntimeGuard.disclaimer, /不会自动切换到 PostgreSQL/);

  const guardedService = createMockDatabaseService({
    env: { FINANCE_AI_REPOSITORY_MODE: "postgres-primary" },
  });
  const guardedStatus = guardedService.status({
    id: "mock-user-state-repository",
    persistenceMode: "json-file",
  });
  assert.equal(guardedStatus.repositoryRuntimeGuard.status, "fallback-active");
  assert.equal(guardedStatus.repositoryRuntimeGuard.requestedMode, "postgres-primary");
  assert.equal(guardedStatus.repositoryRuntimeGuard.effectiveMode, "json");
  assert.equal(guardedStatus.repositoryRuntimeGuard.canUseRequestedMode, false);
  assert.ok(
    guardedStatus.repositoryRuntimeGuard.blockedReasons.some((reason) =>
      reason.includes("不能把 PostgreSQL 设为主数据源"),
    ),
  );
});

test("database production repository adapter endpoint reports skeleton coverage", async () => {
  const response = await requestMock("/api/database/production-repository-adapter");
  assert.equal(response.status, 200);
  assert.equal(response.body.productionRepositoryAdapter.id, "production-postgres-repository-adapter");
  assert.equal(response.body.productionRepositoryAdapter.runtimeMode, "inactive");
  assert.equal(response.body.productionRepositoryAdapter.safety.noRuntimeSwitch, true);
  assert.equal(response.body.productionRepositoryAdapter.safety.noWrites, true);
  assert.equal(response.body.productionRepositoryAdapter.driver.package, "pg");
  assert.equal(response.body.productionRepositoryAdapter.driver.available, false);
  assert.ok(response.body.productionRepositoryAdapter.methodCoverage.requiredCount > 20);
  assert.equal(response.body.productionRepositoryAdapter.methodCoverage.missingCount, 0);
  assert.ok(
    response.body.productionRepositoryAdapter.operationContracts.some(
      (operation) =>
        operation.method === "recordAudit" &&
        operation.table === "auth_role_events" &&
        operation.transactionRequired === true,
    ),
  );
  assert.ok(
    response.body.productionRepositoryAdapter.tableCoverage.some(
      (entry) => entry.table === "auth_role_grants" && entry.writeOperationCount > 0,
    ),
  );
  assert.equal(
    response.body.productionRepositoryAdapter.connectionProbeTimeoutPolicy.mode,
    "read-only-timeboxed-probe-plan",
  );
  assert.equal(response.body.productionRepositoryAdapter.connectionProbeTimeoutPolicy.timeoutMs, 3000);
  assert.equal(
    response.body.productionRepositoryAdapter.connectionProbeTimeoutPolicy.canOpenConnectionAutomatically,
    false,
  );
  assert.equal(response.body.productionRepositoryAdapter.connectionProbeTimeoutPolicy.canExecuteWriteProbe, false);
  assert.equal(response.body.productionRepositoryAdapter.connectionProbeTimeoutPolicy.safety.readOnlyOnly, true);
  assert.equal(
    response.body.productionRepositoryAdapter.connectionProbeTimeoutPolicy.safety.cutoverBlockedOnTimeout,
    true,
  );
  assert.ok(
    response.body.productionRepositoryAdapter.connectionProbeTimeoutPolicy.auditEnvelope.forbiddenFields.includes(
      "rawConnectionString",
    ),
  );
  assert.ok(
    response.body.productionRepositoryAdapter.blockedReasons.some((reason) =>
      reason.includes("数据库驱动"),
    ),
  );
  assert.match(response.body.productionRepositoryAdapter.disclaimer, /不会写库/);
});

test("database production repository SQL contract endpoint reports parameterized statements", async () => {
  const response = await requestMock("/api/database/production-repository-sql-contract");
  assert.equal(response.status, 200);
  assert.equal(response.body.productionRepositorySqlContract.id, "production-repository-sql-contract");
  assert.equal(response.body.productionRepositorySqlContract.mode, "parameterized-sql-contract");
  assert.equal(response.body.productionRepositorySqlContract.status, "draft-ready");
  assert.equal(response.body.productionRepositorySqlContract.runtimeMode, "inactive");
  assert.equal(response.body.productionRepositorySqlContract.dialect, "postgresql");
  assert.ok(response.body.productionRepositorySqlContract.statementCount > 20);
  assert.ok(response.body.productionRepositorySqlContract.writeStatementCount > 0);
  assert.ok(response.body.productionRepositorySqlContract.readStatementCount > 0);
  assert.ok(response.body.productionRepositorySqlContract.tableWhitelist.includes("users"));
  assert.ok(
    response.body.productionRepositorySqlContract.statements.some(
      (statement) =>
        statement.method === "findAuthUserByEmail" &&
        statement.statement === "SELECT * FROM users WHERE email = $1 LIMIT 1" &&
        statement.parameterNames.includes("email"),
    ),
  );
  assert.ok(
    response.body.productionRepositorySqlContract.statements.some(
      (statement) =>
        statement.method === "recordAudit" &&
        statement.transactionRequired === true &&
        statement.auditRequired === true,
    ),
  );
  assert.ok(
    response.body.productionRepositorySqlContract.checks.some(
      (check) => check.id === "parameterizedStatements" && check.status === "pass",
    ),
  );
  assert.equal(response.body.productionRepositorySqlContract.safety.noDatabaseConnection, true);
  assert.equal(response.body.productionRepositorySqlContract.safety.parameterizedValuesOnly, true);
  assert.match(response.body.productionRepositorySqlContract.disclaimer, /不会执行 SQL/);
});

test("database production repository execution plan endpoint reports validators and transaction policy", async () => {
  const response = await requestMock("/api/database/production-repository-execution-plan");
  assert.equal(response.status, 200);
  assert.equal(response.body.productionRepositoryExecutionPlan.id, "production-repository-execution-plan");
  assert.equal(response.body.productionRepositoryExecutionPlan.mode, "transaction-audit-execution-plan");
  assert.equal(response.body.productionRepositoryExecutionPlan.status, "draft-ready");
  assert.equal(response.body.productionRepositoryExecutionPlan.runtimeMode, "inactive");
  assert.equal(response.body.productionRepositoryExecutionPlan.canExecuteSql, false);
  assert.equal(response.body.productionRepositoryExecutionPlan.canOpenConnection, false);
  assert.ok(response.body.productionRepositoryExecutionPlan.coverage.validatorCount > 0);
  assert.ok(response.body.productionRepositoryExecutionPlan.coverage.transactionWrappedWriteCount > 0);
  assert.equal(response.body.productionRepositoryExecutionPlan.transactionWrapper.begin, "BEGIN");
  assert.equal(response.body.productionRepositoryExecutionPlan.transactionWrapper.rollback, "ROLLBACK");
  assert.ok(response.body.productionRepositoryExecutionPlan.transactionWrapper.wrapsMethods.includes("recordAudit"));
  assert.equal(response.body.productionRepositoryExecutionPlan.auditWritePolicy.redactParameterValues, true);
  assert.equal(response.body.productionRepositoryExecutionPlan.auditWritePolicy.hashChainRequired, true);
  assert.ok(
    response.body.productionRepositoryExecutionPlan.parameterValidators.some(
      (validator) =>
        validator.parameterName === "email" &&
        validator.type === "email" &&
        validator.required === true,
    ),
  );
  assert.ok(
    response.body.productionRepositoryExecutionPlan.executionSteps.some(
      (step) => step.id === "executeParameterizedStatement" && step.status === "blocked",
    ),
  );
  assert.equal(response.body.productionRepositoryExecutionPlan.safety.validatesBeforeExecution, true);
  assert.equal(response.body.productionRepositoryExecutionPlan.safety.noSqlExecution, true);
  assert.match(response.body.productionRepositoryExecutionPlan.disclaimer, /不会打开数据库连接/);
});

test("database production repository parameter validation endpoint reports local validation rules", async () => {
  const response = await requestMock("/api/database/production-repository-parameter-validation-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryParameterValidationPlan;
  assert.equal(plan.id, "production-repository-parameter-validation-plan");
  assert.equal(plan.mode, "local-parameter-validation-plan");
  assert.equal(plan.status, "draft-ready");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canValidateLocally, true);
  assert.equal(plan.canExecuteSql, false);
  assert.ok(plan.validatorCount > 0);
  assert.ok(plan.validatorTypes.includes("stable-id"));
  assert.ok(plan.validatorTypes.includes("email"));
  assert.ok(
    plan.sampleValidationResults.some(
      (result) => result.id === "validEmail" && result.accepted === true,
    ),
  );
  assert.ok(
    plan.sampleValidationResults.some(
      (result) =>
        result.id === "invalidEmail" &&
        result.accepted === false &&
        result.errorCode === "INVALID_EMAIL",
    ),
  );
  assert.ok(
    plan.sampleValidationResults.some(
      (result) =>
        result.id === "largeLimit" &&
        result.accepted === false &&
        result.errorCode === "OUT_OF_RANGE",
    ),
  );
  assert.ok(plan.checks.some((check) => check.id === "redactionPolicy" && check.status === "pass"));
  assert.equal(plan.safety.noDatabaseConnection, true);
  assert.equal(plan.safety.noSqlExecution, true);
  assert.equal(plan.safety.redactsSampleValues, true);
  assert.match(plan.disclaimer, /不会打开数据库连接/);
});

test("database production repository connection pool endpoint reports transaction wrapper gates", async () => {
  const response = await requestMock("/api/database/production-repository-connection-pool-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryConnectionPoolPlan;
  assert.equal(plan.id, "production-repository-connection-pool-plan");
  assert.equal(plan.mode, "connection-pool-transaction-wrapper-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canOpenConnection, false);
  assert.equal(plan.canExecuteSql, false);
  assert.equal(plan.driver.package, "pg");
  assert.equal(plan.connection.configured, false);
  assert.equal(plan.connection.sslRequired, true);
  assert.equal(plan.poolConfig.max, 5);
  assert.equal(plan.transactionWrapper.releaseClient, "finally");
  assert.ok(
    plan.lifecycleSteps.some((step) => step.id === "validateParameters" && step.status === "pass"),
  );
  assert.ok(
    plan.lifecycleSteps.some((step) => step.id === "acquireClient" && step.status === "blocked"),
  );
  assert.ok(
    plan.checks.some((check) => check.id === "automaticConnectionDisabled" && check.status === "pass"),
  );
  assert.equal(plan.safety.noDatabaseConnection, true);
  assert.equal(plan.safety.noSqlExecution, true);
  assert.equal(plan.safety.releaseClientFinally, true);
  assert.match(plan.disclaimer, /不会创建连接池/);
});

test("database production repository SQL executor endpoint reports binding and audit plan", async () => {
  const response = await requestMock("/api/database/production-repository-sql-executor-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositorySqlExecutorPlan;
  assert.equal(plan.id, "production-repository-sql-executor-plan");
  assert.equal(plan.mode, "parameter-binding-result-mapping-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canExecuteSql, false);
  assert.equal(plan.canOpenConnection, false);
  assert.ok(plan.statementCount > 20);
  assert.ok(plan.bindingCoverage.boundParameterCount > 0);
  assert.equal(plan.bindingCoverage.boundParameterCount, plan.bindingCoverage.redactedBindingCount);
  assert.ok(
    plan.executableStatements.some(
      (statement) =>
        statement.method === "findAuthUserByEmail" &&
        statement.parameterBindingStyle === "pg-parameter-array" &&
        statement.resultShape === "single-row-or-null",
    ),
  );
  assert.ok(
    plan.executorLifecycle.some((step) => step.id === "executeClientQuery" && step.status === "blocked"),
  );
  assert.equal(plan.auditEnvelope.redactParameterValues, true);
  assert.equal(plan.auditEnvelope.includeRowCountOnly, true);
  assert.ok(plan.checks.some((check) => check.id === "rawValueRedaction" && check.status === "pass"));
  assert.equal(plan.safety.parameterArrayOnly, true);
  assert.equal(plan.safety.noStringInterpolationForValues, true);
  assert.equal(plan.safety.noSqlExecution, true);
  assert.match(plan.disclaimer, /不会执行 SQL/);
});

test("database production repository result audit endpoint reports mapping and envelope rules", async () => {
  const response = await requestMock("/api/database/production-repository-result-audit-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryResultAuditPlan;
  assert.equal(plan.id, "production-repository-result-audit-plan");
  assert.equal(plan.mode, "result-mapping-audit-envelope-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canMapLiveRows, false);
  assert.equal(plan.canWriteAudit, false);
  assert.ok(plan.mappingCount > 20);
  assert.ok(plan.resultShapes.includes("single-row-or-null"));
  assert.ok(
    plan.mappings.some(
      (mapping) =>
        mapping.method === "findAuthUserByEmail" &&
        mapping.mappingMode === "single-or-null" &&
        mapping.rawRowsLogged === false,
    ),
  );
  assert.ok(plan.auditEnvelope.allowedFields.includes("statementId"));
  assert.ok(plan.auditEnvelope.forbiddenFields.includes("rawParameterValues"));
  assert.ok(
    plan.auditValidationSamples.some(
      (sample) =>
        sample.id === "unsafeRawRowsEnvelope" &&
        sample.accepted === false &&
        sample.blockedFields.includes("rawRows"),
    ),
  );
  assert.ok(plan.checks.some((check) => check.id === "auditRawValueBlock" && check.status === "pass"));
  assert.equal(plan.safety.rawRowsNeverLogged, true);
  assert.equal(plan.safety.rawParameterValuesNeverLogged, true);
  assert.equal(plan.safety.rowCountOnlyInAudit, true);
  assert.match(plan.disclaimer, /不会写审计/);
});

test("database production repository read rehearsal endpoint reports staging gates", async () => {
  const response = await requestMock("/api/database/production-repository-read-rehearsal-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryReadRehearsalPlan;
  assert.equal(plan.id, "production-repository-readonly-query-rehearsal-plan");
  assert.equal(plan.mode, "staging-readonly-query-rehearsal-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canRunStagingReads, false);
  assert.equal(plan.canRunProductionReads, false);
  assert.equal(plan.canWriteData, false);
  assert.equal(plan.readOnlyRehearsalEnabled, false);
  assert.ok(plan.coverage.readStatementCount > 0);
  assert.ok(plan.coverage.sampleQueryCount > 0);
  assert.equal(plan.rehearsalWindow.environment, "staging-first");
  assert.equal(plan.rehearsalWindow.maxRowsPerQuery, 25);
  assert.ok(
    plan.sampleQueries.some(
      (query) =>
        query.method === "findAuthUserByEmail" &&
        query.resultShape === "single-row-or-null" &&
        query.readOnlyTransaction === true,
    ),
  );
  assert.ok(plan.checks.some((check) => check.id === "readOnlyRehearsalOptIn" && check.status === "pending"));
  assert.equal(plan.safety.noSqlExecution, true);
  assert.equal(plan.safety.readOnlyTransactionsOnly, true);
  assert.equal(plan.safety.rawRowsNeverLogged, true);
  assert.match(plan.disclaimer, /不会执行 SQL/);
});

test("database production repository smoke test endpoint reports read-only gates", async () => {
  const response = await requestMock("/api/database/production-repository-smoke-test");
  assert.equal(response.status, 200);
  assert.equal(response.body.productionRepositorySmokeTest.id, "production-repository-readonly-smoke-plan");
  assert.equal(response.body.productionRepositorySmokeTest.mode, "read-only-smoke-plan");
  assert.equal(response.body.productionRepositorySmokeTest.status, "blocked");
  assert.equal(response.body.productionRepositorySmokeTest.runtimeMode, "inactive");
  assert.equal(response.body.productionRepositorySmokeTest.canExecuteAutomatically, false);
  assert.equal(response.body.productionRepositorySmokeTest.driver.package, "pg");
  assert.equal(response.body.productionRepositorySmokeTest.driver.available, false);
  assert.ok(response.body.productionRepositorySmokeTest.coverage.readOnlyOperationCount > 0);
  assert.ok(response.body.productionRepositorySmokeTest.coverage.criticalTableCount > 0);
  assert.ok(
    response.body.productionRepositorySmokeTest.smokeQueries.some(
      (query) => query.id === "connectionPing" && query.statement === "SELECT 1",
    ),
  );
  assert.ok(
    response.body.productionRepositorySmokeTest.smokeQueries.some((query) =>
      query.id.startsWith("tableVisible:auth_role_grants"),
    ),
  );
  assert.ok(
    response.body.productionRepositorySmokeTest.checks.some(
      (check) => check.id === "writeGuard" && check.status === "planned",
    ),
  );
  assert.ok(response.body.productionRepositorySmokeTest.blockedStatements.includes("TRUNCATE"));
  assert.ok(
    response.body.productionRepositorySmokeTest.blockedReasons.some((reason) =>
      reason.includes("只读探测开关"),
    ),
  );
  assert.match(response.body.productionRepositorySmokeTest.disclaimer, /不会执行 SQL/);
});

test("database production repository parity plan endpoint reports dual-read gates", async () => {
  const response = await requestMock("/api/database/production-repository-parity-plan");
  assert.equal(response.status, 200);
  assert.equal(response.body.productionRepositoryParityPlan.id, "production-repository-dual-read-parity-plan");
  assert.equal(response.body.productionRepositoryParityPlan.mode, "dual-read-parity-plan");
  assert.equal(response.body.productionRepositoryParityPlan.status, "blocked");
  assert.equal(response.body.productionRepositoryParityPlan.runtimeMode, "inactive");
  assert.equal(response.body.productionRepositoryParityPlan.canCompareAutomatically, false);
  assert.equal(response.body.productionRepositoryParityPlan.mockRepositoryRequired, true);
  assert.equal(response.body.productionRepositoryParityPlan.productionRepositoryRequired, true);
  assert.equal(response.body.productionRepositoryParityPlan.parityWindow.minimumRuns, 3);
  assert.equal(response.body.productionRepositoryParityPlan.parityWindow.maxAllowedMismatchPercent, 0);
  assert.ok(
    response.body.productionRepositoryParityPlan.comparisonPlan.some(
      (entry) => entry.domain === "authSessions" && entry.table === "auth_sessions",
    ),
  );
  assert.ok(response.body.productionRepositoryParityPlan.ignoredFields.includes("updatedAt"));
  assert.ok(
    response.body.productionRepositoryParityPlan.checks.some(
      (check) => check.id === "readOnlySmoke" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.productionRepositoryParityPlan.checks.some(
      (check) => check.id === "zeroMismatchThreshold" && check.status === "planned",
    ),
  );
  assert.ok(response.body.productionRepositoryParityPlan.safety.mockFallbackRequired);
  assert.ok(
    response.body.productionRepositoryParityPlan.blockedReasons.some((reason) =>
      reason.includes("双读验证开关"),
    ),
  );
  assert.match(response.body.productionRepositoryParityPlan.disclaimer, /双读一致性/);
});

test("database production repository parity evidence endpoint reports mismatch gates", async () => {
  const response = await requestMock("/api/database/production-repository-parity-evidence-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryParityEvidencePlan;
  assert.equal(plan.id, "production-repository-parity-evidence-plan");
  assert.equal(plan.mode, "dual-read-parity-evidence-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canCaptureEvidence, false);
  assert.equal(plan.canReadProductionData, false);
  assert.equal(plan.canWriteData, false);
  assert.ok(plan.evidenceCoverage.domainCount > 0);
  assert.equal(plan.evidenceCoverage.maxAllowedMismatchPercent, 0);
  assert.ok(
    plan.evidenceRecords.some(
      (record) =>
        record.domain === "authSessions" &&
        record.expectedOutcome === "zero-mismatch" &&
        record.status === "blocked",
    ),
  );
  assert.ok(
    plan.mismatchCategories.some(
      (category) => category.id === "rowCountMismatch" && category.action === "block-cutover",
    ),
  );
  assert.ok(plan.auditEnvelope.forbiddenFields.includes("rawMockRows"));
  assert.ok(plan.checks.some((check) => check.id === "rawDataRedaction" && check.status === "pass"));
  assert.equal(plan.safety.rawRowsNeverLogged, true);
  assert.equal(plan.safety.mismatchBlocksCutover, true);
  assert.match(plan.disclaimer, /差异评估/);
});

test("database production repository dual-write plan endpoint reports rehearsal gates", async () => {
  const response = await requestMock("/api/database/production-repository-dual-write-plan");
  assert.equal(response.status, 200);
  assert.equal(response.body.productionRepositoryDualWritePlan.id, "production-repository-dual-write-rehearsal-plan");
  assert.equal(response.body.productionRepositoryDualWritePlan.mode, "dual-write-rehearsal-plan");
  assert.equal(response.body.productionRepositoryDualWritePlan.status, "blocked");
  assert.equal(response.body.productionRepositoryDualWritePlan.runtimeMode, "inactive");
  assert.equal(response.body.productionRepositoryDualWritePlan.canWriteAutomatically, false);
  assert.equal(response.body.productionRepositoryDualWritePlan.canSwitchAutomatically, false);
  assert.equal(response.body.productionRepositoryDualWritePlan.mockPrimaryRequired, true);
  assert.equal(response.body.productionRepositoryDualWritePlan.productionShadowWriteOnly, true);
  assert.equal(response.body.productionRepositoryDualWritePlan.rehearsalWindow.minimumSuccessfulRuns, 3);
  assert.equal(response.body.productionRepositoryDualWritePlan.rehearsalWindow.maxAllowedWriteMismatchPercent, 0);
  assert.equal(response.body.productionRepositoryDualWritePlan.rehearsalWindow.rollbackOnFirstMismatch, true);
  assert.ok(
    response.body.productionRepositoryDualWritePlan.writePlan.some(
      (entry) =>
        entry.domain === "authUsers" &&
        entry.table === "users" &&
        entry.transactionRequired === true &&
        entry.auditRequired === true,
    ),
  );
  assert.ok(
    response.body.productionRepositoryDualWritePlan.checks.some(
      (check) => check.id === "dualReadParity" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.productionRepositoryDualWritePlan.checks.some(
      (check) => check.id === "idempotencyKeys" && check.status === "planned",
    ),
  );
  assert.ok(response.body.productionRepositoryDualWritePlan.safety.mockRemainsSourceOfTruth);
  assert.ok(
    response.body.productionRepositoryDualWritePlan.rollbackTriggers.some((trigger) =>
      trigger.includes("幂等键"),
    ),
  );
  assert.ok(
    response.body.productionRepositoryDualWritePlan.blockedReasons.some((reason) =>
      reason.includes("双写演练开关"),
    ),
  );
  assert.match(response.body.productionRepositoryDualWritePlan.disclaimer, /双写/);
});

test("database production repository shadow write evidence endpoint reports idempotency gates", async () => {
  const response = await requestMock("/api/database/production-repository-shadow-write-evidence-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryShadowWriteEvidencePlan;
  assert.equal(plan.id, "production-repository-shadow-write-evidence-plan");
  assert.equal(plan.mode, "shadow-write-evidence-idempotency-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canWriteProduction, false);
  assert.equal(plan.canChangeUserVisibleData, false);
  assert.equal(plan.canSwitchRuntime, false);
  assert.ok(plan.evidenceCoverage.domainCount > 0);
  assert.equal(plan.evidenceCoverage.maxAllowedWriteMismatchPercent, 0);
  assert.ok(
    plan.evidenceRecords.some(
      (record) =>
        record.domain === "authUsers" &&
        record.idempotencyKeyRequired === true &&
        record.status === "blocked",
    ),
  );
  assert.equal(plan.idempotencyPolicy.requiredForEveryWrite, true);
  assert.equal(plan.idempotencyPolicy.rawPayloadHashOnly, true);
  assert.ok(plan.auditEnvelope.forbiddenFields.includes("rawPayload"));
  assert.ok(plan.checks.some((check) => check.id === "shadowOnly" && check.status === "pass"));
  assert.equal(plan.safety.productionWritesShadowOnly, true);
  assert.equal(plan.safety.rawPayloadNeverLogged, true);
  assert.ok(plan.rollbackTriggers.some((trigger) => trigger.includes("幂等键")));
  assert.match(plan.disclaimer, /影子写/);
});

test("database production repository backup restore evidence endpoint reports recovery gates", async () => {
  const response = await requestMock("/api/database/production-repository-backup-restore-evidence-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryBackupRestoreEvidencePlan;
  assert.equal(plan.id, "production-repository-backup-restore-evidence-plan");
  assert.equal(plan.mode, "backup-restore-rehearsal-evidence-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canRunBackup, false);
  assert.equal(plan.canRunRestore, false);
  assert.equal(plan.canTouchProductionData, false);
  assert.equal(plan.backupRestoreVerified, false);
  assert.equal(plan.recoveryObjectives.targetRpoMinutes, 15);
  assert.equal(plan.recoveryObjectives.targetRtoMinutes, 30);
  assert.equal(plan.recoveryObjectives.minimumSuccessfulRestoreRuns, 2);
  assert.equal(plan.recoveryObjectives.maxAllowedDataLossRecords, 0);
  assert.ok(plan.evidenceCoverage.tableCount > 0);
  assert.ok(plan.evidenceCoverage.criticalTableCount > 0);
  assert.equal(plan.evidenceCoverage.restoreRunCountRequired, 2);
  assert.ok(plan.criticalTables.includes("users"));
  assert.ok(
    plan.rehearsalArtifacts.some(
      (artifact) =>
        artifact.id === "schemaDump" &&
        artifact.encrypted === true &&
        artifact.checksumRequired === true &&
        artifact.status === "blocked",
    ),
  );
  assert.ok(
    plan.checks.some((check) => check.id === "backupRestoreOptIn" && check.status === "pending"),
  );
  assert.ok(plan.safety.noBackupExecution);
  assert.ok(plan.safety.noRestoreExecution);
  assert.ok(plan.safety.cutoverBlockedUntilRestoreVerified);
  assert.ok(plan.rollbackTriggers.some((trigger) => trigger.includes("校验和")));
  assert.match(plan.disclaimer, /备份恢复/);
});

test("database production repository cutover monitoring evidence endpoint reports observability gates", async () => {
  const response = await requestMock("/api/database/production-repository-cutover-monitoring-evidence-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryCutoverMonitoringEvidencePlan;
  assert.equal(plan.id, "production-repository-cutover-monitoring-evidence-plan");
  assert.equal(plan.mode, "cutover-monitoring-evidence-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canStartMonitoring, false);
  assert.equal(plan.canReadProductionMetrics, false);
  assert.equal(plan.canSwitchRuntime, false);
  assert.equal(plan.monitoringVerified, false);
  assert.equal(plan.monitoringWindow.preCutoverMinutes, 60);
  assert.equal(plan.monitoringWindow.postCutoverMinutes, 120);
  assert.equal(plan.monitoringWindow.rollbackDecisionMinutes, 15);
  assert.ok(plan.evidenceCoverage.metricCount >= 5);
  assert.ok(plan.evidenceCoverage.alertRouteCount >= 3);
  assert.ok(
    plan.metricProbes.some(
      (probe) =>
        probe.id === "writeFailureRate" &&
        probe.threshold === "<=0.1%" &&
        probe.rollbackOnBreach === true,
    ),
  );
  assert.ok(
    plan.alertRoutes.some(
      (route) => route.id === "engineeringOnCall" && route.status === "blocked",
    ),
  );
  assert.ok(
    plan.checks.some((check) => check.id === "monitoringOptIn" && check.status === "pending"),
  );
  assert.ok(plan.safety.noMetricSubscription);
  assert.ok(plan.safety.noProductionMetricsRead);
  assert.ok(plan.safety.cutoverBlockedUntilMonitoringVerified);
  assert.ok(plan.rollbackTriggers.some((trigger) => trigger.includes("写入失败率")));
  assert.match(plan.disclaimer, /监控证据/);
});

test("database production repository rollback rehearsal evidence endpoint reports rollback gates", async () => {
  const response = await requestMock("/api/database/production-repository-rollback-rehearsal-evidence-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryRollbackRehearsalEvidencePlan;
  assert.equal(plan.id, "production-repository-rollback-rehearsal-evidence-plan");
  assert.equal(plan.mode, "rollback-rehearsal-evidence-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canRollbackRuntime, false);
  assert.equal(plan.canReplayWrites, false);
  assert.equal(plan.canTouchProductionData, false);
  assert.equal(plan.rollbackVerified, false);
  assert.equal(plan.rollbackObjectives.rollbackDeadlineMinutes, 15);
  assert.equal(plan.rollbackObjectives.targetRtoMinutes, 10);
  assert.equal(plan.rollbackObjectives.minimumSuccessfulRollbackRuns, 2);
  assert.ok(plan.evidenceCoverage.rollbackPathCount >= 5);
  assert.ok(plan.evidenceCoverage.requiredAuditPackageCount >= 1);
  assert.ok(
    plan.rollbackPaths.some(
      (path) =>
        path.id === "featureFlagRevert" &&
        path.expectedDurationMinutes === 2 &&
        path.status === "blocked",
    ),
  );
  assert.ok(
    plan.checks.some((check) => check.id === "rollbackRehearsalOptIn" && check.status === "pending"),
  );
  assert.ok(plan.safety.noRuntimeRollback);
  assert.ok(plan.safety.noAuditExportExecution);
  assert.ok(plan.safety.cutoverBlockedUntilRollbackVerified);
  assert.ok(plan.rollbackTriggers.some((trigger) => trigger.includes("15 分钟")));
  assert.match(plan.disclaimer, /回滚演练证据/);
});

test("database production repository cutover audit trail evidence endpoint reports audit gates", async () => {
  const response = await requestMock("/api/database/production-repository-cutover-audit-trail-evidence-plan");
  assert.equal(response.status, 200);
  const plan = response.body.productionRepositoryCutoverAuditTrailEvidencePlan;
  assert.equal(plan.id, "production-repository-cutover-audit-trail-evidence-plan");
  assert.equal(plan.mode, "cutover-audit-trail-evidence-plan");
  assert.equal(plan.status, "blocked");
  assert.equal(plan.runtimeMode, "inactive");
  assert.equal(plan.canWriteAudit, false);
  assert.equal(plan.canReadProductionAudit, false);
  assert.equal(plan.canSwitchRuntime, false);
  assert.equal(plan.auditTrailVerified, false);
  assert.equal(plan.auditObjectives.requiredHashChainContinuityPercent, 100);
  assert.equal(plan.auditObjectives.maxAuditLagSeconds, 30);
  assert.equal(plan.auditObjectives.minimumRetentionDays, 90);
  assert.equal(plan.evidenceCoverage.eventTypeCount, 5);
  assert.equal(plan.evidenceCoverage.auditFieldCount, 10);
  assert.equal(plan.evidenceCoverage.forbiddenFieldCount, 7);
  assert.ok(
    plan.auditEvents.some(
      (event) =>
        event.id === "cutoverRequested" &&
        event.eventType === "repository.cutover.requested" &&
        event.status === "blocked",
    ),
  );
  assert.ok(plan.auditEnvelope.forbiddenFields.includes("rawPayload"));
  assert.equal(plan.auditEnvelope.hashChainRequired, true);
  assert.equal(plan.auditEnvelope.exportPackageRequired, true);
  assert.ok(plan.checks.some((check) => check.id === "auditTrailOptIn" && check.status === "pending"));
  assert.ok(plan.safety.noAuditWrite);
  assert.ok(plan.safety.noProductionAuditRead);
  assert.ok(plan.safety.cutoverBlockedUntilAuditVerified);
  assert.ok(plan.rollbackTriggers.some((trigger) => trigger.includes("hash 链")));
  assert.match(plan.disclaimer, /审计链证据/);
});

test("database production repository cutover plan endpoint reports manual switch gates", async () => {
  const response = await requestMock("/api/database/production-repository-cutover-plan");
  assert.equal(response.status, 200);
  assert.equal(response.body.productionRepositoryCutoverPlan.id, "production-repository-cutover-plan");
  assert.equal(response.body.productionRepositoryCutoverPlan.mode, "feature-flag-cutover-plan");
  assert.equal(response.body.productionRepositoryCutoverPlan.status, "blocked");
  assert.equal(response.body.productionRepositoryCutoverPlan.runtimeMode, "inactive");
  assert.equal(response.body.productionRepositoryCutoverPlan.canSwitchAutomatically, false);
  assert.equal(response.body.productionRepositoryCutoverPlan.canWriteAutomatically, false);
  assert.equal(response.body.productionRepositoryCutoverPlan.featureFlag.name, "FINANCE_AI_REPOSITORY_MODE");
  assert.equal(response.body.productionRepositoryCutoverPlan.featureFlag.current, "mock");
  assert.equal(response.body.productionRepositoryCutoverPlan.featureFlag.target, "postgres-primary");
  assert.ok(response.body.productionRepositoryCutoverPlan.featureFlag.allowedValues.includes("postgres-shadow"));
  assert.equal(response.body.productionRepositoryCutoverPlan.featureFlag.requiresManualApproval, true);
  assert.equal(response.body.productionRepositoryCutoverPlan.cutoverWindow.minimumSuccessfulDualWriteRuns, 3);
  assert.equal(response.body.productionRepositoryCutoverPlan.cutoverWindow.maxAllowedMismatchPercent, 0);
  assert.equal(response.body.productionRepositoryCutoverPlan.cutoverWindow.rollbackDeadlineMinutes, 15);
  assert.ok(
    response.body.productionRepositoryCutoverPlan.checks.some(
      (check) => check.id === "dualWriteRehearsal" && check.status === "blocked",
    ),
  );
  assert.ok(
    response.body.productionRepositoryCutoverPlan.checks.some(
      (check) => check.id === "humanApproval" && check.status === "pending",
    ),
  );
  assert.ok(response.body.productionRepositoryCutoverPlan.safety.noAutomaticSwitch);
  assert.ok(response.body.productionRepositoryCutoverPlan.safety.requiresHumanApproval);
  assert.ok(
    response.body.productionRepositoryCutoverPlan.rollbackTriggers.some((trigger) =>
      trigger.includes("审计事件"),
    ),
  );
  assert.ok(
    response.body.productionRepositoryCutoverPlan.blockedReasons.some((reason) =>
      reason.includes("人工切换批准"),
    ),
  );
  assert.match(response.body.productionRepositoryCutoverPlan.disclaimer, /不会切换运行时仓储/);
});

test("audit-service endpoint reports retention and redaction boundaries", async () => {
  const services = await requestMock("/api/audit/status");
  assert.equal(services.status, 200);
  assert.equal(services.body.activeService.id, "mock-audit-service");
  assert.equal(services.body.activeService.mode, "sample");
  assert.equal(services.body.activeService.storageMode, "memory-only");
  assert.equal(services.body.activeService.retentionPolicy.maxEvents, 500);
  assert.equal(services.body.activeService.retentionPolicy.manualPurgeSupported, true);
  assert.equal(services.body.activeService.retentionPolicy.rechainAfterPurge, true);
  assert.equal(services.body.activeService.maintenancePolicy.manualPurgeSupported, true);
  assert.equal(services.body.activeService.maintenancePolicy.rechainAfterPurge, true);
  assert.equal(services.body.activeService.maintenancePolicy.exportPackageSupported, true);
  assert.equal(services.body.activeService.automationPlan.status, "blocked");
  assert.equal(services.body.activeService.automationPlan.mode, "dry-run-no-scheduler-start");
  assert.equal(services.body.activeService.automationPlan.canStartAutomatedPurge, false);
  assert.equal(services.body.activeService.automationPlan.schedule.localTime, "06:00");
  assert.equal(services.body.activeService.automationPlan.schedule.timezone, "Australia/Brisbane");
  assert.ok(
    services.body.activeService.automationPlan.checks.some(
      (check) => check.id === "wormArchive" && check.status === "blocked",
    ),
  );
  assert.equal(
    services.body.activeService.automationPlan.safety.requiresArchiveBeforeDelete,
    true,
  );
  assert.equal(services.body.activeService.signingPolicy.status, "sample-unsigned");
  assert.equal(services.body.activeService.signingPolicy.signingSecretConfigured, false);
  assert.equal(services.body.activeService.signingPolicy.signedExportsSupported, false);
  assert.equal(services.body.activeService.downloadAuthorizationPolicy.status, "sample-bypass");
  assert.deepEqual(services.body.activeService.downloadAuthorizationPolicy.allowedRoles, [
    "admin",
    "auditor",
    "compliance",
  ]);
  assert.equal(services.body.activeService.redactionPolicy.email, "masked");
  assert.equal(services.body.activeService.integrity.status, "verified");
  assert.equal(services.body.activeService.integrity.algorithm, "sha256-stable-json");
  assert.ok(services.body.activeService.capabilities.includes("safeMetadata"));
  assert.ok(services.body.activeService.capabilities.includes("hashChainIntegrity"));
  assert.ok(services.body.activeService.capabilities.includes("retentionPurge"));
  assert.ok(services.body.activeService.capabilities.includes("auditExportPackage"));
  assert.ok(services.body.activeService.capabilities.includes("auditExportSigningPolicy"));
  assert.ok(services.body.activeService.capabilities.includes("auditExportVerification"));
  assert.ok(services.body.activeService.capabilities.includes("auditExportArchiveReceipt"));
  assert.ok(services.body.activeService.capabilities.includes("auditExportDownloadPackage"));
  assert.ok(
    services.body.activeService.missingProductionCapabilities.includes("externalWormArchive"),
  );
  assert.ok(
    services.body.activeService.missingProductionCapabilities.includes("signedAuditExports"),
  );
  assert.ok(
    services.body.activeService.missingProductionCapabilities.includes("immutableArchiveWrite"),
  );
  assert.match(services.body.activeService.disclaimer, /hash chain 完整性校验/);

  const fileState = createMockState();
  fileState.persistencePath = "/private/tmp/finance-ai-state.json";
  const fileStatus = await requestMock("/api/audit/status", {}, fileState);
  assert.equal(fileStatus.body.activeService.storageMode, "json-file");
});

test("mock audit service redacts sensitive metadata and reports production gaps", () => {
  const auditService = createMockAuditService();
  const status = auditService.status({ persistenceMode: "json-file" });
  assert.equal(status.storageMode, "json-file");
  assert.equal(status.retentionPolicy.maxEvents, 500);
  assert.ok(status.capabilities.includes("retentionLimit"));
  assert.ok(status.capabilities.includes("retentionPurge"));
  assert.ok(status.capabilities.includes("auditExportPackage"));
  assert.ok(status.capabilities.includes("auditExportSigningPolicy"));
  assert.ok(status.capabilities.includes("auditExportVerification"));
  assert.ok(status.capabilities.includes("auditExportArchiveReceipt"));
  assert.ok(status.capabilities.includes("auditExportDownloadPackage"));
  assert.ok(status.capabilities.includes("auditRetentionAutomationPlan"));
  assert.equal(status.automationPlan.status, "blocked");
  assert.equal(status.automationPlan.safety.noAutomaticSchedulerStart, true);
  assert.ok(status.capabilities.includes("auditExportReplayPreview"));
  assert.ok(status.capabilities.includes("hashChainIntegrity"));
  assert.ok(status.missingProductionCapabilities.includes("fieldLevelEncryption"));
  assert.ok(status.missingProductionCapabilities.includes("signedAuditExports"));
  assert.ok(status.missingProductionCapabilities.includes("auditExportDownloadWorkflow"));
  assert.ok(status.missingProductionCapabilities.includes("auditReplayImportWorkflow"));
  assert.equal(status.downloadAuthorizationPolicy.status, "sample-bypass");

  const redacted = redactAuditMetadata({
    email: "serena@example.com",
    nested: {
      token: "secret-token",
      authorization: "Bearer secret",
      keep: "safe",
    },
  });
  assert.equal(redacted.email, "se****@example.com");
  assert.equal(redacted.nested.token, "[redacted]");
  assert.equal(redacted.nested.authorization, "[redacted]");
  assert.equal(redacted.nested.keep, "safe");
});

test("mock audit hash chain verifies intact records and detects tampering", () => {
  const state = createMockState();
  const repository = createMockRepository(state);
  const user = { id: "demo-user", displayName: "Demo" };
  const first = repository.recordAudit({
    user,
    eventType: "audit.first",
    message: "First event.",
    metadata: { safe: "one" },
  });
  const second = repository.recordAudit({
    user,
    eventType: "audit.second",
    message: "Second event.",
    metadata: { token: "secret", safe: "two" },
  });

  assert.equal(second.previousHash, first.hash);
  assert.equal(second.sequence, first.sequence + 1);
  assert.equal(second.metadata.token, "[redacted]");
  assert.equal(repository.status().auditIntegrity.status, "verified");
  assert.equal(repository.status().auditIntegrity.eventCount, 2);

  state.auditLogs[0].metadata.safe = "tampered";
  const broken = verifyAuditChain(state.auditLogs);
  assert.equal(broken.status, "broken");
  assert.equal(broken.brokenEvents[0].reason, "hash-mismatch");
});

test("audit retention purge endpoint prunes old events and preserves hash chain", async () => {
  const state = createMockState();
  const repository = createMockRepository(state);
  const user = { id: "demo-user", displayName: "Demo" };
  repository.recordAudit({
    user,
    eventType: "audit.old",
    message: "Old audit event.",
    metadata: { safe: "old" },
  });
  repository.recordAudit({
    user,
    eventType: "audit.active",
    message: "Active audit event.",
    metadata: { safe: "active" },
  });
  state.auditLogs.find((event) => event.eventType === "audit.old").createdAt = new Date(
    Date.now() - 100 * 24 * 60 * 60 * 1000,
  ).toISOString();
  state.auditLogs.find((event) => event.eventType === "audit.active").createdAt =
    new Date().toISOString();
  state.auditLogs = rechainAuditEvents(state.auditLogs);

  const unauthorized = await requestMock(
    "/api/audit/retention/purge",
    { method: "POST" },
    state,
  );
  assert.equal(unauthorized.status, 401);

  const purge = await requestMock(
    "/api/audit/retention/purge",
    { method: "POST", headers: { authorization: "Bearer demo-token" } },
    state,
  );
  assert.equal(purge.status, 200);
  assert.equal(purge.body.purgeRun.status, "success");
  assert.equal(purge.body.purgeRun.checkedEvents, 2);
  assert.equal(purge.body.purgeRun.prunedEvents, 1);
  assert.equal(purge.body.retentionPolicy.manualPurgeSupported, true);
  assert.equal(purge.body.integrity.status, "verified");
  assert.equal(
    state.auditLogs.some((event) => event.eventType === "audit.old"),
    false,
  );
  assert.ok(state.auditLogs.some((event) => event.eventType === "audit.active"));
  assert.ok(state.auditLogs.some((event) => event.eventType === "audit.retention.purge"));
  assert.equal(verifyAuditChain(state.auditLogs).status, "verified");
});

test("audit export endpoint returns redacted evidence package and audit event", async () => {
  const state = createMockState();
  const repository = createMockRepository(state);
  const user = { id: "demo-user", displayName: "Demo" };
  repository.recordAudit({
    user,
    eventType: "auth.signIn",
    message: "User logged in.",
    metadata: {
      email: "serena@example.com",
      token: "secret-token",
      safe: "visible",
    },
  });

  const unauthorized = await requestMock("/api/audit/export", {}, state);
  assert.equal(unauthorized.status, 401);

  const exported = await requestMock(
    "/api/audit/export",
    { headers: { authorization: "Bearer demo-token" } },
    state,
  );
  assert.equal(exported.status, 200);
  assert.equal(exported.body.manifest.version, "audit-export-v0");
  assert.equal(exported.body.manifest.eventCount, 1);
  assert.equal(exported.body.manifest.integrityStatus, "verified");
  assert.equal(exported.body.manifest.signed, false);
  assert.equal(exported.body.signature.status, "unsigned");
  assert.match(exported.body.signature.payloadHash, /^[a-f0-9]{64}$/);
  assert.equal(exported.body.events[0].metadata.token, "[redacted]");
  assert.equal(exported.body.events[0].metadata.email, "se****@example.com");
  assert.equal(exported.body.events[0].metadata.safe, "visible");
  assert.equal(exported.body.integrity.status, "verified");

  const auditLog = await requestMock(
    "/api/audit-log",
    { headers: { authorization: "Bearer demo-token" } },
    state,
  );
  assert.ok(
    auditLog.body.items.some(
      (event) =>
        event.eventType === "audit.export.package" &&
        event.metadata.eventCount === 1 &&
        event.metadata.signed === false,
    ),
  );
});

test("audit export package can be signed and verified when signing secret is configured", async () => {
  const previousSecret = process.env.FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET;
  const previousKeyId = process.env.FINANCE_AI_AUDIT_EXPORT_KEY_ID;
  process.env.FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET = "audit-export-test-secret";
  process.env.FINANCE_AI_AUDIT_EXPORT_KEY_ID = "audit-export-test-key";

  try {
    const policy = auditExportSigningPolicy();
    assert.equal(policy.status, "ready");
    assert.equal(policy.signedExportsSupported, true);
    assert.equal(policy.keyId, "audit-export-test-key");

    const state = createMockState();
    const repository = createMockRepository(state);
    const user = { id: "demo-user", displayName: "Demo" };
    repository.recordAudit({
      user,
      eventType: "portfolio.save",
      message: "Portfolio saved.",
      metadata: { safe: "visible", token: "secret-token" },
    });

    const exported = await requestMock(
      "/api/audit/export",
      { headers: { authorization: "Bearer demo-token" } },
      state,
    );
    assert.equal(exported.status, 200);
    assert.equal(exported.body.manifest.signed, true);
    assert.equal(exported.body.manifest.signatureKeyId, "audit-export-test-key");
    assert.equal(exported.body.signature.status, "signed");
    assert.equal(exported.body.signature.keyId, "audit-export-test-key");
    assert.match(exported.body.signature.signature, /^[a-f0-9]{64}$/);
    assert.match(exported.body.signature.payloadHash, /^[a-f0-9]{64}$/);
    assert.equal(
      verifyAuditExportPackageSignature(exported.body).status,
      "verified",
    );

    const verified = await requestMock(
      "/api/audit/export/verify",
      {
        method: "POST",
        headers: { authorization: "Bearer demo-token" },
        body: { exportPackage: exported.body },
      },
      state,
    );
    assert.equal(verified.status, 200);
    assert.equal(verified.body.verified, true);
    assert.equal(verified.body.status, "verified");
    assert.equal(verified.body.checks.signature, "verified");
    assert.equal(verified.body.checks.payloadHash, "matched");

    const tamperedPackage = {
      ...exported.body,
      events: exported.body.events.map((event, index) =>
        index === 0 ? { ...event, metadata: { ...event.metadata, safe: "tampered" } } : event,
      ),
    };
    const tampered = await requestMock(
      "/api/audit/export/verify",
      {
        method: "POST",
        headers: { authorization: "Bearer demo-token" },
        body: { exportPackage: tamperedPackage },
      },
      state,
    );
    assert.equal(tampered.status, 200);
    assert.equal(tampered.body.verified, false);
    assert.ok(tampered.body.reasons.includes("hash-chain-broken"));
    assert.ok(tampered.body.reasons.includes("payload-hash-mismatch"));

    const unauthorizedArchive = await requestMock(
      "/api/audit/export/archive",
      { method: "POST", body: { exportPackage: exported.body } },
      state,
    );
    assert.equal(unauthorizedArchive.status, 401);

    const archived = await requestMock(
      "/api/audit/export/archive",
      {
        method: "POST",
        headers: { authorization: "Bearer demo-token" },
        body: { exportPackage: exported.body },
      },
      state,
    );
    assert.equal(archived.status, 200);
    assert.equal(archived.body.receipt.accepted, true);
    assert.equal(archived.body.receipt.status, "archived");
    assert.equal(archived.body.receipt.immutable, false);
    assert.equal(archived.body.receipt.signatureStatus, "verified");
    assert.match(archived.body.receipt.packageChecksum, /^[a-f0-9]{64}$/);
    assert.equal(state.auditArchiveReceipts[0].id, archived.body.receipt.id);

    const rejectedArchive = await requestMock(
      "/api/audit/export/archive",
      {
        method: "POST",
        headers: { authorization: "Bearer demo-token" },
        body: { exportPackage: tamperedPackage },
      },
      state,
    );
    assert.equal(rejectedArchive.status, 200);
    assert.equal(rejectedArchive.body.receipt.accepted, false);
    assert.equal(rejectedArchive.body.receipt.status, "rejected");
    assert.ok(rejectedArchive.body.receipt.reasons.includes("hash-chain-broken"));

    const unauthorizedReceipts = await requestMock("/api/audit/export/archive", {}, state);
    assert.equal(unauthorizedReceipts.status, 401);

    const receiptList = await requestMock(
      "/api/audit/export/archive",
      { headers: { authorization: "Bearer demo-token" } },
      state,
    );
    assert.equal(receiptList.status, 200);
    assert.equal(receiptList.body.items.length, 2);
    assert.equal(receiptList.body.items[0].status, "rejected");
    assert.equal(receiptList.body.items[1].status, "archived");
    assert.equal(receiptList.body.retentionLimit, 200);

    const unauthorizedDownload = await requestMock(
      "/api/audit/export/download",
      { method: "POST", body: { exportPackage: exported.body } },
      state,
    );
    assert.equal(unauthorizedDownload.status, 401);

    const preparedDownload = await requestMock(
      "/api/audit/export/download",
      {
        method: "POST",
        headers: { authorization: "Bearer demo-token" },
        body: { exportPackage: exported.body },
      },
      state,
    );
    assert.equal(preparedDownload.status, 200);
    assert.equal(preparedDownload.body.download.accepted, true);
    assert.equal(preparedDownload.body.download.status, "prepared");
    assert.equal(preparedDownload.body.download.exportId, exported.body.manifest.id);
    assert.match(preparedDownload.body.download.filename, /^audit-export-\d+-\d{4}-\d{2}-\d{2}\.json$/);
    assert.equal(preparedDownload.body.download.mimeType, "application/json");
    assert.equal(preparedDownload.body.download.encoding, "base64");
    assert.equal(preparedDownload.body.download.byteSize > 0, true);
    assert.match(preparedDownload.body.download.packageChecksum, /^[a-f0-9]{64}$/);
    assert.match(preparedDownload.body.download.contentBase64, /^[A-Za-z0-9+/=]+$/);

    const rejectedDownload = await requestMock(
      "/api/audit/export/download",
      {
        method: "POST",
        headers: { authorization: "Bearer demo-token" },
        body: { exportPackage: tamperedPackage },
      },
      state,
    );
    assert.equal(rejectedDownload.status, 200);
    assert.equal(rejectedDownload.body.download.accepted, false);
    assert.equal(rejectedDownload.body.download.status, "rejected");
    assert.equal(rejectedDownload.body.download.contentBase64, "");
    assert.ok(rejectedDownload.body.download.reasons.includes("hash-chain-broken"));

    const unauthorizedReplay = await requestMock(
      "/api/audit/export/replay-preview",
      { method: "POST", body: { exportPackage: exported.body } },
      state,
    );
    assert.equal(unauthorizedReplay.status, 401);

    const replayPreview = await requestMock(
      "/api/audit/export/replay-preview",
      {
        method: "POST",
        headers: { authorization: "Bearer demo-token" },
        body: { exportPackage: exported.body },
      },
      state,
    );
    assert.equal(replayPreview.status, 200);
    assert.equal(replayPreview.body.preview.dryRun, true);
    assert.equal(replayPreview.body.preview.accepted, true);
    assert.equal(replayPreview.body.preview.totalEvents, 1);
    assert.equal(replayPreview.body.preview.duplicateEvents, 1);
    assert.equal(replayPreview.body.preview.wouldImportEvents, 0);
    assert.ok(replayPreview.body.preview.warnings.includes("duplicate-events-detected"));
    assert.equal(replayPreview.body.preview.eventTypeCounts[0].eventType, "portfolio.save");

    const rejectedReplay = await requestMock(
      "/api/audit/export/replay-preview",
      {
        method: "POST",
        headers: { authorization: "Bearer demo-token" },
        body: { exportPackage: tamperedPackage },
      },
      state,
    );
    assert.equal(rejectedReplay.status, 200);
    assert.equal(rejectedReplay.body.preview.accepted, false);
    assert.equal(rejectedReplay.body.preview.status, "rejected");
    assert.ok(rejectedReplay.body.preview.reasons.includes("hash-chain-broken"));

    const signedStatus = createMockAuditService().status(repository.status());
    assert.ok(signedStatus.capabilities.includes("signedAuditExports"));
    assert.equal(
      signedStatus.missingProductionCapabilities.includes("signedAuditExports"),
      false,
    );

    const auditLog = await requestMock(
      "/api/audit-log",
      { headers: { authorization: "Bearer demo-token" } },
      state,
    );
    assert.ok(
      auditLog.body.items.some(
        (event) =>
          event.eventType === "audit.export.archive" &&
          event.metadata.status === "archived" &&
          event.metadata.accepted === true,
      ),
    );
    assert.ok(
      auditLog.body.items.some(
        (event) =>
          event.eventType === "audit.export.replay.preview" &&
          event.metadata.dryRun === true,
      ),
    );
    assert.ok(
      auditLog.body.items.some(
        (event) =>
          event.eventType === "audit.export.download.prepare" &&
          event.metadata.accepted === true &&
          event.metadata.filename === preparedDownload.body.download.filename,
      ),
    );
  } finally {
    if (previousSecret === undefined) {
      delete process.env.FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET;
    } else {
      process.env.FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET = previousSecret;
    }
    if (previousKeyId === undefined) {
      delete process.env.FINANCE_AI_AUDIT_EXPORT_KEY_ID;
    } else {
      process.env.FINANCE_AI_AUDIT_EXPORT_KEY_ID = previousKeyId;
    }
  }
});

test("audit download can require privileged roles before preparing handoff", async () => {
  const previousRoleGate = process.env.FINANCE_AI_AUDIT_DOWNLOAD_REQUIRES_PRIVILEGED_ROLE;
  const previousSecret = process.env.FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET;
  process.env.FINANCE_AI_AUDIT_DOWNLOAD_REQUIRES_PRIVILEGED_ROLE = "true";
  process.env.FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET = "audit-download-role-test-secret";

  try {
    const state = createMockState();
    const repository = createMockRepository(state);
    const auditService = createMockAuditService();
    const regularUser = { id: "regular-user", displayName: "Regular", roles: ["user"] };
    const auditorUser = { id: "auditor-user", displayName: "Auditor", roles: ["auditor"] };

    repository.recordAudit({
      user: regularUser,
      eventType: "portfolio.save",
      message: "Portfolio saved.",
      metadata: { safe: "visible" },
    });
    const exportPackage = auditService.exportPackage(repository, regularUser, {
      requestedBy: "test",
    });

    const denied = auditService.prepareDownload(repository, regularUser, exportPackage, {
      requestedBy: "test",
    });
    assert.equal(denied.download.accepted, false);
    assert.equal(denied.download.status, "denied");
    assert.equal(denied.download.contentBase64, "");
    assert.ok(denied.download.reasons.includes("audit-download-role-required"));
    assert.equal(denied.authorization.policy.status, "role-enforced");

    const allowed = auditService.prepareDownload(repository, auditorUser, exportPackage, {
      requestedBy: "test",
    });
    assert.equal(allowed.download.accepted, true);
    assert.equal(allowed.download.status, "prepared");
    assert.match(allowed.download.contentBase64, /^[A-Za-z0-9+/=]+$/);

    assert.ok(
      state.auditLogs.some(
        (event) =>
          event.eventType === "audit.export.download.denied" &&
          event.metadata.reason === "audit-download-role-required",
      ),
    );
    assert.ok(
      state.auditLogs.some(
        (event) =>
          event.eventType === "audit.export.download.prepare" &&
          event.metadata.accepted === true,
      ),
    );
  } finally {
    if (previousRoleGate === undefined) {
      delete process.env.FINANCE_AI_AUDIT_DOWNLOAD_REQUIRES_PRIVILEGED_ROLE;
    } else {
      process.env.FINANCE_AI_AUDIT_DOWNLOAD_REQUIRES_PRIVILEGED_ROLE = previousRoleGate;
    }
    if (previousSecret === undefined) {
      delete process.env.FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET;
    } else {
      process.env.FINANCE_AI_AUDIT_EXPORT_SIGNING_SECRET = previousSecret;
    }
  }
});

test("mock database service reports production readiness gaps", () => {
  const databaseService = createMockDatabaseService();
  const status = databaseService.status({
    id: "mock-user-state-repository",
    persistenceMode: "json-file",
  });
  assert.equal(status.activeStorage, "json-file-bridge");
  assert.equal(status.migrationPhase, "pre-production");
  assert.ok(status.plannedTables.includes("reminder_rules"));
  assert.ok(status.capabilityLabels.jsonBridge);
  assert.equal(status.repositoryContract.status, "blocked");
  assert.ok(status.repositoryContract.missingMethods.includes("listWatchlistCodes"));

  const readiness = databaseService.productionReadiness(status);
  assert.equal(readiness.ready, false);
  assert.equal(readiness.activeStorage, "json-file-bridge");
  assert.equal(readiness.productionAdapterStatus, "not_configured");
  assert.ok(readiness.missingCapabilities.includes("backupRestore"));
  assert.match(readiness.nextStep, /production database adapter/);
});

test("production database adapter skeleton reports config, health, and migration plan", () => {
  const missingAdapter = createProductionDatabaseAdapter();
  const missingHealth = missingAdapter.health({ status: "pass" });
  assert.equal(missingHealth.status, "not_configured");
  assert.equal(missingHealth.connection.configured, false);
  assert.equal(missingHealth.migrationPlan.steps[0].status, "blocked");
  assert.equal(missingHealth.fallback.active, true);

  const configuredAdapter = createProductionDatabaseAdapter({
    databaseUrl: "postgres://serena:secret@db.example.com:5432/finance",
    provider: "postgres",
    driverAvailable: true,
    readOnlyProbeEnabled: true,
    readOnlyRehearsalEnabled: true,
    parityVerificationEnabled: true,
    dualWriteRehearsalEnabled: true,
    backupRestoreVerified: true,
    cutoverMonitoringVerified: true,
    rollbackRehearsalVerified: true,
    cutoverAuditTrailVerified: true,
    cutoverApproved: true,
    plannedTables: ["users", "auth_sessions"],
  });
  const configuredHealth = configuredAdapter.health({
    status: "pass",
    tableMappings: [
      { domain: "authUsers", table: "users", methods: ["getAuthUser", "saveAuthUser"] },
      { domain: "authSessions", table: "auth_sessions", methods: ["findAuthSessionByTokenHash"] },
    ],
  });
  assert.equal(configuredHealth.status, "configured");
  assert.equal(configuredHealth.connection.configured, true);
  assert.match(configuredHealth.connection.redactedUrl, /configured/);
  assert.match(configuredHealth.connection.redactedUrl, /redacted/);
  assert.equal(configuredHealth.migrationPlan.steps[0].status, "pass");
  assert.equal(
    configuredHealth.migrationPlan.steps.find((step) => step.id === "verifyRepositoryContract")
      .status,
    "pass",
  );
  assert.equal(configuredHealth.migrationDryRun.status, "ready-for-driver");
  assert.equal(configuredHealth.migrationDryRun.tableOrder[0], "users");
  assert.equal(configuredHealth.migrationSqlDraft.status, "generated");
  assert.ok(configuredHealth.migrationSqlDraft.statementCount >= 3);
  assert.equal(configuredHealth.migrationPackage.version, "2026.06.01.001_initial_schema");
  assert.equal(configuredHealth.migrationPackage.canExecute, false);
  assert.equal(configuredHealth.readOnlyConnectionHealth.status, "ready-for-readonly-probe");
  assert.equal(configuredHealth.readOnlyConnectionHealth.driver.available, true);
  assert.equal(configuredHealth.readOnlyConnectionHealth.safety.canMigrate, false);
  assert.equal(configuredHealth.repositoryAdapterPlan.status, "implementation-required");
  assert.equal(configuredHealth.repositoryAdapterPlan.runtimeMode, "inactive");
  assert.equal(configuredHealth.productionRepositoryAdapter.status, "ready-for-implementation");
  assert.equal(configuredHealth.productionRepositoryAdapter.safety.noNetworkCalls, true);
  assert.ok(configuredHealth.productionRepositoryAdapter.methodCoverage.requiredCount > 0);
  assert.equal(configuredHealth.productionRepositorySmokeTest.status, "ready-for-readonly-smoke");
  assert.equal(configuredHealth.productionRepositorySmokeTest.canExecuteAutomatically, false);
  assert.ok(
    configuredHealth.productionRepositorySmokeTest.checks.some(
      (check) => check.id === "readOnlyProbeOptIn" && check.status === "pass",
    ),
  );
  assert.equal(configuredHealth.productionRepositorySqlContract.status, "draft-ready");
  assert.ok(
    configuredHealth.productionRepositorySqlContract.statements.some(
      (statement) => statement.method === "getAuthUser" && statement.statement.includes("id = $1"),
    ),
  );
  assert.equal(configuredHealth.productionRepositorySqlContract.safety.parameterizedValuesOnly, true);
  assert.equal(configuredHealth.productionRepositoryExecutionPlan.status, "draft-ready");
  assert.ok(
    configuredHealth.productionRepositoryExecutionPlan.parameterValidators.some(
      (validator) => validator.parameterName === "userId" && validator.type === "stable-id",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryExecutionPlan.auditWritePolicy.redactParameterValues, true);
  assert.equal(configuredHealth.productionRepositoryParameterValidationPlan.status, "draft-ready");
  assert.ok(configuredHealth.productionRepositoryParameterValidationPlan.validatorTypes.includes("stable-id"));
  assert.ok(
    configuredHealth.productionRepositoryParameterValidationPlan.sampleValidationResults.some(
      (result) => result.id === "validStableId" && result.accepted === true,
    ),
  );
  assert.equal(configuredHealth.productionRepositoryParameterValidationPlan.safety.noSqlExecution, true);
  assert.equal(configuredHealth.productionRepositoryConnectionPoolPlan.status, "ready-for-implementation");
  assert.equal(configuredHealth.productionRepositoryConnectionPoolPlan.connection.configured, true);
  assert.equal(configuredHealth.productionRepositoryConnectionPoolPlan.driver.available, true);
  assert.ok(
    configuredHealth.productionRepositoryConnectionPoolPlan.lifecycleSteps.some(
      (step) => step.id === "createPool" && step.status === "planned",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryConnectionPoolPlan.safety.noDatabaseConnection, true);
  assert.equal(configuredHealth.productionRepositorySqlExecutorPlan.status, "ready-for-implementation");
  assert.ok(
    configuredHealth.productionRepositorySqlExecutorPlan.executableStatements.some(
      (statement) => statement.method === "getAuthUser" && statement.status === "planned",
    ),
  );
  assert.equal(configuredHealth.productionRepositorySqlExecutorPlan.auditEnvelope.includeRowCountOnly, true);
  assert.equal(configuredHealth.productionRepositorySqlExecutorPlan.safety.parameterArrayOnly, true);
  assert.equal(configuredHealth.productionRepositoryResultAuditPlan.status, "ready-for-implementation");
  assert.ok(configuredHealth.productionRepositoryResultAuditPlan.resultShapes.length > 0);
  assert.ok(
    configuredHealth.productionRepositoryResultAuditPlan.resultShapes.every((shape) =>
      ["health-row", "rows", "single-row-or-null", "inserted-row", "upserted-row"].includes(shape),
    ),
  );
  assert.ok(
    configuredHealth.productionRepositoryResultAuditPlan.auditValidationSamples.some(
      (sample) => sample.id === "safeSuccessEnvelope" && sample.accepted === true,
    ),
  );
  assert.equal(configuredHealth.productionRepositoryResultAuditPlan.safety.rawParameterValuesNeverLogged, true);
  assert.equal(configuredHealth.productionRepositoryReadRehearsalPlan.status, "ready-for-staging-rehearsal");
  assert.ok(configuredHealth.productionRepositoryReadRehearsalPlan.coverage.readStatementCount > 0);
  assert.ok(
    configuredHealth.productionRepositoryReadRehearsalPlan.sampleQueries.some(
      (query) => query.method === "getAuthUser" && query.status === "planned",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryReadRehearsalPlan.safety.noWrites, true);
  assert.equal(configuredHealth.productionRepositoryParityPlan.status, "ready-for-staging-parity");
  assert.equal(configuredHealth.productionRepositoryParityPlan.safety.noRuntimeSwitch, true);
  assert.ok(
    configuredHealth.productionRepositoryParityPlan.checks.some(
      (check) => check.id === "parityOptIn" && check.status === "pass",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryParityEvidencePlan.status, "ready-for-evidence-capture");
  assert.ok(configuredHealth.productionRepositoryParityEvidencePlan.evidenceCoverage.domainCount > 0);
  assert.ok(
    configuredHealth.productionRepositoryParityEvidencePlan.evidenceRecords.some(
      (record) => record.status === "planned",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryParityEvidencePlan.safety.rawRowsNeverLogged, true);
  assert.equal(configuredHealth.productionRepositoryDualWritePlan.status, "ready-for-controlled-rehearsal");
  assert.equal(configuredHealth.productionRepositoryDualWritePlan.safety.mockRemainsSourceOfTruth, true);
  assert.ok(
    configuredHealth.productionRepositoryDualWritePlan.checks.some(
      (check) => check.id === "dualWriteOptIn" && check.status === "pass",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryShadowWriteEvidencePlan.status, "ready-for-shadow-evidence");
  assert.ok(configuredHealth.productionRepositoryShadowWriteEvidencePlan.evidenceCoverage.domainCount > 0);
  assert.ok(
    configuredHealth.productionRepositoryShadowWriteEvidencePlan.evidenceRecords.some(
      (record) => record.status === "planned" && record.idempotencyKeyRequired === true,
    ),
  );
  assert.equal(configuredHealth.productionRepositoryShadowWriteEvidencePlan.safety.idempotencyKeysRequired, true);
  assert.equal(
    configuredHealth.productionRepositoryBackupRestoreEvidencePlan.status,
    "ready-for-backup-restore-evidence",
  );
  assert.equal(configuredHealth.productionRepositoryBackupRestoreEvidencePlan.backupRestoreVerified, true);
  assert.equal(
    configuredHealth.productionRepositoryBackupRestoreEvidencePlan.evidenceCoverage.restoreRunCountRequired,
    2,
  );
  assert.ok(
    configuredHealth.productionRepositoryBackupRestoreEvidencePlan.rehearsalArtifacts.some(
      (artifact) => artifact.id === "restoreDryRun" && artifact.status === "verified",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryBackupRestoreEvidencePlan.safety.noRestoreExecution, true);
  assert.equal(
    configuredHealth.productionRepositoryCutoverMonitoringEvidencePlan.status,
    "ready-for-monitoring-evidence",
  );
  assert.equal(configuredHealth.productionRepositoryCutoverMonitoringEvidencePlan.monitoringVerified, true);
  assert.ok(
    configuredHealth.productionRepositoryCutoverMonitoringEvidencePlan.metricProbes.some(
      (probe) => probe.id === "auditHashChainContinuity" && probe.status === "verified",
    ),
  );
  assert.ok(
    configuredHealth.productionRepositoryCutoverMonitoringEvidencePlan.alertRoutes.some(
      (route) => route.id === "auditArchive" && route.status === "verified",
    ),
  );
  assert.equal(
    configuredHealth.productionRepositoryCutoverMonitoringEvidencePlan.safety.noProductionMetricsRead,
    true,
  );
  assert.equal(
    configuredHealth.productionRepositoryRollbackRehearsalEvidencePlan.status,
    "ready-for-rollback-evidence",
  );
  assert.equal(configuredHealth.productionRepositoryRollbackRehearsalEvidencePlan.rollbackVerified, true);
  assert.ok(
    configuredHealth.productionRepositoryRollbackRehearsalEvidencePlan.rollbackPaths.some(
      (path) => path.id === "auditExport" && path.status === "verified",
    ),
  );
  assert.ok(
    configuredHealth.productionRepositoryRollbackRehearsalEvidencePlan.checks.some(
      (check) => check.id === "featureFlagRollback" && check.status === "pass",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryRollbackRehearsalEvidencePlan.safety.noRuntimeRollback, true);
  assert.equal(
    configuredHealth.productionRepositoryCutoverAuditTrailEvidencePlan.status,
    "ready-for-audit-trail-evidence",
  );
  assert.equal(configuredHealth.productionRepositoryCutoverAuditTrailEvidencePlan.auditTrailVerified, true);
  assert.ok(
    configuredHealth.productionRepositoryCutoverAuditTrailEvidencePlan.auditEvents.some(
      (event) => event.id === "featureFlagChanged" && event.status === "verified",
    ),
  );
  assert.equal(
    configuredHealth.productionRepositoryCutoverAuditTrailEvidencePlan.auditEnvelope.hashChainRequired,
    true,
  );
  assert.ok(
    configuredHealth.productionRepositoryCutoverAuditTrailEvidencePlan.checks.some(
      (check) => check.id === "auditTrailOptIn" && check.status === "pass",
    ),
  );
  assert.equal(configuredHealth.productionRepositoryCutoverPlan.status, "ready-for-manual-cutover");
  assert.equal(configuredHealth.productionRepositoryCutoverPlan.canSwitchAutomatically, false);
  assert.equal(configuredHealth.productionRepositoryCutoverPlan.featureFlag.target, "postgres-primary");
  assert.ok(configuredHealth.productionRepositoryCutoverPlan.safety.requiresHumanApproval);
  assert.ok(
    configuredHealth.productionRepositoryCutoverPlan.checks.some(
      (check) => check.id === "backupRestore" && check.status === "pass",
    ),
  );
  assert.ok(
    configuredHealth.productionRepositoryCutoverPlan.checks.some(
      (check) => check.id === "monitoring" && check.status === "pass",
    ),
  );
  assert.ok(
    configuredHealth.productionRepositoryCutoverPlan.checks.some(
      (check) => check.id === "rollbackPlan" && check.status === "pass",
    ),
  );
  assert.ok(
    configuredHealth.productionRepositoryCutoverPlan.checks.some(
      (check) => check.id === "auditTrail" && check.status === "pass",
    ),
  );
  assert.ok(
    configuredHealth.productionRepositoryCutoverPlan.checks.some(
      (check) => check.id === "humanApproval" && check.status === "pass",
    ),
  );
  assert.ok(
    configuredHealth.repositoryAdapterPlan.switchGates.some(
      (gate) => gate.id === "humanApproval" && gate.status === "pending",
    ),
  );
  assert.ok(configuredHealth.driverSetupPlan.smokeOrder.includes("readOnlyHealthPreflight"));
  assert.equal(configuredHealth.driverSetupPlan.secretBoundary.redactsConnectionUrl, true);
  assert.equal(configuredHealth.driverSetupPlan.secretBoundary.canReadDatabaseSecrets, false);
  assert.ok(
    configuredHealth.migrationPackage.preflightChecks.some(
      (check) => check.id === "connectionConfig" && check.status === "pass",
    ),
  );
  assert.ok(
    configuredHealth.migrationDryRun.steps.some(
      (step) => step.id === "previewSchemaMigrations" && step.status === "ready",
    ),
  );
  assert.match(configuredHealth.fallback.reason, /真实数据库驱动/);
});

test("repository contract validates required methods and table mappings", () => {
  const repository = createMockRepository(createMockState());
  const contract = validateRepositoryContract(repository);
  assert.equal(contract.version, "2026-06-01.repository.v1");
  assert.equal(contract.status, "pass");
  assert.equal(contract.missingMethods.length, 0);
  assert.ok(contract.requiredMethods.includes("savePortfolioEntry"));
  assert.ok(contract.requiredMethods.includes("saveNewsIntelligenceRecord"));
  assert.ok(contract.requiredMethods.includes("updateAuthUserRoles"));
  assert.ok(contract.requiredMethods.includes("recordAudit"));
  assert.ok(
    contract.tableMappings.some(
      (mapping) => mapping.domain === "authSessions" && mapping.table === "auth_sessions",
    ),
  );
  assert.ok(
    contract.tableMappings.some(
      (mapping) =>
        mapping.domain === "authRoleGrants" &&
        mapping.methods.includes("updateAuthUserRoles") &&
        mapping.table === "auth_role_grants",
    ),
  );
  assert.ok(
    contract.tableMappings.some(
      (mapping) =>
        mapping.domain === "authRoleEvents" &&
        mapping.methods.includes("listAuditEvents") &&
        mapping.table === "auth_role_events",
    ),
  );
  assert.ok(
    contract.tableMappings.some(
      (mapping) => mapping.domain === "newsIntelligence" && mapping.table === "news_items",
    ),
  );
  assert.ok(
    contract.tableMappings.some(
      (mapping) =>
        mapping.domain === "suitabilityQuestionnaires" &&
        mapping.table === "suitability_questionnaires",
    ),
  );
  assert.ok(
    contract.tableMappings.some(
      (mapping) =>
        mapping.domain === "workerRequestNonces" &&
        mapping.methods.includes("pruneWorkerRequestNonces") &&
        mapping.table === "worker_request_nonces",
    ),
  );
  assert.ok(
    contract.tableMappings.some(
      (mapping) =>
        mapping.domain === "auditArchiveReceipts" &&
        mapping.methods.includes("saveAuditArchiveReceipt") &&
        mapping.table === "audit_archive_receipts",
    ),
  );
  assert.ok(contract.migrationChecks.every((check) => check.status === "pass"));

  const incompleteContract = validateRepositoryContract({ status: () => ({ capabilities: [] }) });
  assert.equal(incompleteContract.status, "blocked");
  assert.ok(incompleteContract.missingMethods.includes("saveNotification"));
  assert.ok(
    incompleteContract.migrationChecks.some(
      (check) => check.id === "repositoryInterface" && check.status === "blocked",
    ),
  );
});

test("mock state store serializes and persists repository state", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "finance-ai-store-"));
  const dataFile = join(tempDir, "state.json");
  const state = createStoredMockState({
    watchlist: ["AAPL"],
    reminders: [
      {
        id: "reminder-4",
        userId: "demo-user",
        code: "AAPL",
        type: "priceAbove",
        threshold: "200",
        channels: ["inApp", "bad-channel", "email", "email"],
      },
    ],
    preferences: {
      "demo-user": {
        riskProfile: "broken",
        notifications: { inApp: true, bad: true },
      },
    },
    newsIntelligence: [
      {
        id: "news-us-001",
        market: "us",
        symbol: "AAPL",
        title: "Apple fixture intelligence",
        importanceScore: 200,
        sourceCredibilityScore: "78",
        scoreVersion: "explainable-weighted-score-v1",
      },
    ],
    complianceAcknowledgements: [
      {
        id: "ack-001",
        userId: "demo-user",
        version: "compliance-ack-v0",
        acceptedDisclaimer: true,
        riskAcknowledged: true,
        optionalPortfolioNoticeAcknowledged: true,
        acceptedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    suitabilityQuestionnaires: [
      {
        id: "suitability-001",
        userId: "demo-user",
        version: "suitability-v0",
        answers: {
          riskTolerance: "unsupported",
          investmentExperience: "some",
          investmentHorizon: "long",
          liquidityNeed: "low",
        },
        score: "67",
        suitabilityLevel: "balanced",
        completedAt: "2026-06-01T00:30:00.000Z",
      },
    ],
    auditArchiveReceipts: [
      {
        id: "audit-archive-receipt-001",
        userId: "demo-user",
        exportId: "audit-export-001",
        status: "sample-archived",
        accepted: true,
        immutable: false,
        packageChecksum: "c".repeat(64),
        signatureStatus: "unsigned",
        verificationStatus: "unsigned",
        reasons: ["export-not-signed"],
        archivedAt: "2026-06-01T00:40:00.000Z",
      },
    ],
    persistencePath: dataFile,
  });

  assert.deepEqual(serializeState(state).watchlist, ["AAPL"]);
  assert.deepEqual(serializeState(state).watchlists["demo-user"], ["AAPL"]);
  assert.equal(state.nextReminderId, 5);
  assert.deepEqual(state.reminders[0].channels, ["inApp", "email"]);
  assert.equal(state.preferences["demo-user"].riskProfile, "balanced");
  assert.deepEqual(state.preferences["demo-user"].notifications, { inApp: true });
  assert.equal(state.newsIntelligence[0].importanceScore, 100);
  assert.equal(state.newsIntelligence[0].sourceCredibilityScore, 78);
  assert.equal(state.complianceAcknowledgements[0].id, "ack-001");
  assert.equal(state.suitabilityQuestionnaires[0].id, "suitability-001");
  assert.equal(state.suitabilityQuestionnaires[0].answers.riskTolerance, "medium");
  assert.equal(state.suitabilityQuestionnaires[0].score, 67);
  assert.equal(state.auditArchiveReceipts[0].id, "audit-archive-receipt-001");
  assert.equal(state.auditArchiveReceipts[0].accepted, true);

  const repository = createMockRepository(state);
  repository.addWatchlistCode("demo-user", "0700");
  await persistState(state);
  const rawValue = JSON.parse(await readFile(dataFile, "utf8"));
  assert.deepEqual(rawValue.watchlist, ["AAPL", "0700"]);
  assert.deepEqual(rawValue.watchlists["demo-user"], ["AAPL", "0700"]);
  assert.equal(rawValue.complianceAcknowledgements[0].version, "compliance-ack-v0");
  assert.equal(rawValue.suitabilityQuestionnaires[0].version, "suitability-v0");
  assert.equal(rawValue.auditArchiveReceipts[0].exportId, "audit-export-001");

  const reloaded = await loadStoredStateFromFile(dataFile);
  assert.deepEqual(reloaded.watchlists["demo-user"], ["AAPL", "0700"]);
  assert.equal(reloaded.newsIntelligence[0].id, "news-us-001");
  assert.equal(reloaded.complianceAcknowledgements[0].id, "ack-001");
  assert.equal(reloaded.suitabilityQuestionnaires[0].id, "suitability-001");
  assert.equal(reloaded.auditArchiveReceipts[0].id, "audit-archive-receipt-001");
  assert.equal(reloaded.persistencePath, dataFile);
});

test("mock repository centralizes user state operations", () => {
  const state = createMockState();
  const repository = createMockRepository(state);

  assert.equal(repository.status().id, "mock-user-state-repository");
  assert.ok(repository.status().capabilities.includes("auditRedaction"));

  assert.equal(repository.addWatchlistCode("demo-user", "AAPL"), 1);
  assert.equal(repository.addWatchlistCode("user-2", "0700"), 1);
  assert.deepEqual(repository.listWatchlistCodes("demo-user"), ["AAPL"]);
  assert.deepEqual(repository.listWatchlistCodes("user-2"), ["0700"]);

  repository.savePreferences("demo-user", {
    riskProfile: "balanced",
    notifications: { inApp: true },
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  assert.equal(repository.getPreferences("demo-user").riskProfile, "balanced");

  repository.saveAnalysisHistory({
    id: "analysis-1",
    userId: "demo-user",
    symbol: "AAPL",
  });
  assert.equal(repository.listAnalysisHistory("demo-user")[0].id, "analysis-1");

  repository.saveNewsIntelligenceRecord({
    id: "news-us-001",
    market: "us",
    symbol: "AAPL",
    title: "Apple fixture intelligence",
    relatedTickers: ["AAPL"],
    importanceScore: 80,
    persistedAt: "2026-06-01T00:00:00.000Z",
  });
  repository.saveNewsIntelligenceRecord({
    id: "news-us-001",
    market: "us",
    symbol: "AAPL",
    title: "Apple fixture intelligence updated",
    relatedTickers: ["AAPL"],
    importanceScore: 82,
    persistedAt: "2026-06-01T01:00:00.000Z",
  });
  assert.deepEqual(
    repository.listNewsIntelligenceRecords({ market: "us", symbol: "AAPL" }).map((record) => [
      record.id,
      record.importanceScore,
    ]),
    [["news-us-001", 82]],
  );

  repository.saveComplianceAcknowledgement({
    id: "ack-001",
    userId: "demo-user",
    version: "compliance-ack-v0",
    acceptedDisclaimer: true,
    riskAcknowledged: true,
    acceptedAt: "2026-06-01T00:00:00.000Z",
  });
  assert.equal(repository.listComplianceAcknowledgements("demo-user")[0].id, "ack-001");
  assert.equal(
    repository.latestComplianceAcknowledgement("demo-user", "compliance-ack-v0").id,
    "ack-001",
  );

  repository.saveSuitabilityQuestionnaire({
    id: "suitability-001",
    userId: "demo-user",
    version: "suitability-v0",
    answers: {
      riskTolerance: "medium",
      investmentExperience: "some",
      investmentHorizon: "medium",
      liquidityNeed: "medium",
    },
    score: 55,
    suitabilityLevel: "balanced",
    levelLabel: "平衡型",
    completedAt: "2026-06-01T00:30:00.000Z",
  });
  assert.equal(repository.listSuitabilityQuestionnaires("demo-user")[0].id, "suitability-001");
  assert.equal(
    repository.latestSuitabilityQuestionnaire("demo-user", "suitability-v0").levelLabel,
    "平衡型",
  );

  repository.savePortfolioEntry({
    userId: "demo-user",
    code: "AAPL",
    buyPrice: "100",
    holdingQty: "10",
    savedAt: "2026-06-01T00:00:00.000Z",
  });
  repository.savePortfolioEntry({
    userId: "demo-user",
    code: "AAPL",
    buyPrice: "120",
    holdingQty: "8",
    savedAt: "2026-06-01T01:00:00.000Z",
  });
  repository.savePortfolioEntry({
    userId: "user-2",
    code: "0700",
    buyPrice: "300",
    holdingQty: "2",
    savedAt: "2026-06-01T01:00:00.000Z",
  });
  assert.deepEqual(
    repository.listPortfolioEntries("demo-user").map((entry) => [entry.code, entry.buyPrice]),
    [["AAPL", "120"]],
  );
  assert.deepEqual(
    repository.listPortfolioEntries("user-2").map((entry) => entry.code),
    ["0700"],
  );

  repository.saveNotification({
    id: "notification-1",
    userId: "demo-user",
    status: "queued",
    channel: "inApp",
  });
  assert.equal(repository.listNotifications("demo-user")[0].id, "notification-1");
  assert.equal(repository.markNotificationRead("demo-user", "notification-1").status, "read");

  repository.saveWorkerRequestNonce({
    id: "nonce-active-001",
    userId: "demo-user",
    workerId: "worker-repo",
    operation: "recordWorkerHeartbeat",
    nonce: "active-nonce",
    timestamp: "2026-06-01T00:00:00.000Z",
    expiresAt: "2999-01-01T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
  });
  repository.saveWorkerRequestNonce({
    id: "nonce-expired-001",
    userId: "demo-user",
    workerId: "worker-repo",
    operation: "recordWorkerHeartbeat",
    nonce: "expired-nonce",
    timestamp: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-06-01T00:01:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
  });
  assert.equal(repository.findWorkerRequestNonce("demo-user", "active-nonce").id, "nonce-active-001");
  assert.equal(repository.pruneWorkerRequestNonces("demo-user", Date.parse("2026-06-01T00:02:00.000Z")), 1);
  assert.equal(repository.findWorkerRequestNonce("demo-user", "expired-nonce"), null);

  repository.saveAuditArchiveReceipt({
    id: "audit-archive-receipt-repo-001",
    userId: "demo-user",
    exportId: "audit-export-repo-001",
    status: "archived",
    accepted: true,
    immutable: false,
    packageChecksum: "d".repeat(64),
    signatureStatus: "verified",
    verificationStatus: "verified",
    reasons: [],
    archivedAt: "2026-06-01T00:45:00.000Z",
  });
  assert.equal(
    repository.listAuditArchiveReceipts("demo-user")[0].id,
    "audit-archive-receipt-repo-001",
  );

  const authUser = repository.createAuthUser({
    email: "repo@example.com",
    displayName: "Repo User",
    passwordHash: "scrypt:salt:hash",
    createdAt: "2026-06-01T00:00:00.000Z",
  });
  assert.equal(repository.findAuthUserByEmail("repo@example.com").id, authUser.id);
  assert.equal(repository.getAuthUser(authUser.id).email, "repo@example.com");
  assert.deepEqual(repository.updateAuthUserRoles(authUser.id, ["auditor"]).roles, ["auditor"]);
  repository.saveAuthSession({
    id: "session-1",
    userId: authUser.id,
    tokenHash: "token-hash",
    createdAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2999-01-01T00:00:00.000Z",
  });
  assert.equal(repository.findAuthSessionByTokenHash("token-hash").id, "session-1");
  assert.equal(repository.removeAuthSession("session-1"), 1);
  assert.equal(repository.findAuthSessionByTokenHash("token-hash"), null);

  repository.recordAudit({
    user: { id: "demo-user" },
    eventType: "repository.test",
    message: "Repository test event.",
    metadata: {
      token: "secret-token",
      email: "repo@example.com",
      safe: "value",
    },
  });
  assert.equal(repository.listAuditEvents("demo-user")[0].eventType, "repository.test");
  assert.equal(repository.listAuditEvents("demo-user")[0].metadata.token, "[redacted]");
  assert.equal(repository.listAuditEvents("demo-user")[0].metadata.email, "re**@example.com");
  assert.equal(repository.listAuditEvents("demo-user")[0].metadata.safe, "value");
});

test("stock search, news, and analysis endpoints avoid sample news while preserving catalog analysis", async () => {
  const search = await requestMock("/api/stocks/search?q=Apple");
  assert.equal(search.status, 200);
  assert.equal(search.body.provider, "mock");
  assert.equal(search.body.results[0].code, "AAPL");

  const news = await requestMock("/api/news?market=us");
  assert.equal(news.status, 200);
  assert.equal(news.body.market, "us");
  assert.equal(news.body.sourceStatus, "no-real-data");
  assert.equal(news.body.provider, "mock");
  assert.deepEqual(news.body.items, []);
  assert.match(news.body.disclaimer, /不返回样例新闻/);

  const analysis = await requestMock("/api/analysis?symbol=AAPL&riskProfile=aggressive");
  assert.equal(analysis.status, 200);
  assert.equal(analysis.body.symbol, "AAPL");
  assert.equal(analysis.body.modelReference, true);
  assert.equal(analysis.body.upsideProbability, 63);
  assert.equal(analysis.body.informationFlowImpact.probabilityAdjustment, 0);
  assert.equal(analysis.body.informationFlowImpact.sentimentTilt, "neutral");
  assert.ok(analysis.body.reasons.length > 0);
  assert.ok(analysis.body.reasons.every((reason) => typeof reason === "string" && reason.length > 0));
  assert.equal(analysis.body.tradePlan.stance, "等待确认");
  assert.ok(analysis.body.tradePlan.entryZone.low < analysis.body.tradePlan.currentPrice);
  assert.ok(analysis.body.tradePlan.takeProfit > analysis.body.tradePlan.currentPrice);
  assert.match(analysis.body.tradePlan.disclaimer, /不构成/);
  assert.equal(analysis.body.scenarioAnalysis.cases.length, 3);
  assert.ok(
    analysis.body.scenarioAnalysis.cases.reduce((total, item) => total + item.probability, 0) <=
      100,
  );
  assert.ok(analysis.body.scenarioAnalysis.cases.some((item) => item.key === "bull"));
  assert.match(analysis.body.scenarioAnalysis.disclaimer, /不构成/);
  assert.equal(analysis.body.history.length, 6);
  assert.equal(analysis.body.historySource.label, "Mock 行情样例");
  assert.equal(analysis.body.analysisService.id, "mock-ai-analysis");
  assert.equal(analysis.body.inputCoverage.macro, "fixture-linked");
  assert.equal(analysis.body.inputCoverage.news, "sample-empty");
  assert.equal(analysis.body.inputCoverage.compliance, "guest-basic-no-user-record");
  assert.equal(analysis.body.complianceContext.status, "guest-basic-analysis");
  assert.equal(analysis.body.complianceContext.acknowledged, false);
  assert.ok(["fixture-linked", "sample-empty"].includes(analysis.body.inputCoverage.filings));
  assert.ok(["fixture-linked", "sample-empty"].includes(analysis.body.inputCoverage.publicStatements));
  assert.ok(!analysis.body.sourceRefs.some((ref) => ref.type === "news"));
  assert.ok(
    analysis.body.factorBreakdown.some(
      (factor) => factor.key === "macro" && typeof factor.summary === "string" && factor.summary.length > 0,
    ),
  );
  assert.equal(analysis.body.analysisProcess.version, "multi-agent-analysis-v1");
  assert.equal(analysis.body.analysisProcess.mode, "rule-based-reference-no-live-model");
  assert.ok(
    analysis.body.analysisProcess.agents.some(
      (agent) => agent.role === "macro" && agent.label === "宏观分析师",
    ),
  );
  assert.ok(
    analysis.body.analysisProcess.agents.some(
      (agent) => agent.role === "sentiment" && agent.label === "情绪新闻分析师",
    ),
  );
  assert.equal(analysis.body.analysisProcess.debate.bull.label, "多头研究员");
  assert.equal(analysis.body.analysisProcess.debate.bear.label, "空头研究员");
  assert.match(analysis.body.analysisProcess.synthesis.manager, /研究经理/);
  assert.match(analysis.body.analysisProcess.synthesis.riskReview, /风控复核/);
  assert.ok(analysis.body.analysisProcess.evidenceCoverage.readySourceCount >= 0);
  assert.match(analysis.body.analysisProcess.disclaimer, /不构成投资建议/);
  assert.equal(typeof analysis.body.macroContext.sourceLabel, "string");
  assert.ok(analysis.body.macroContext.indicatorCount >= 0);
  assert.ok(analysis.body.confidenceScore >= 0);
  assert.ok(analysis.body.warnings.length > 0);
  assert.ok(analysis.body.warnings.every((warning) => typeof warning === "string" && warning.length > 0));
  assert.match(analysis.body.disclaimer, /不构成投资建议/);
});

test("stock search returns metadata-only security master matches beyond local samples", async () => {
  const search = await requestMock("/api/stocks/search?q=NVDA");
  const microsoftByName = await requestMock("/api/stocks/search?q=Microsoft");
  const microsoftByCode = await requestMock("/api/stocks/search?q=MSFT");

  assert.equal(search.status, 200);
  assert.equal(search.body.sourceStatus, "metadata-only-catalog");
  assert.deepEqual(search.body.results[0], {
    code: "NVDA",
    name: "NVIDIA",
    market: "us",
    source: "metadata-only-catalog",
  });
  assert.deepEqual(microsoftByName.body.results[0], {
    code: "MSFT",
    name: "Microsoft",
    market: "us",
    source: "metadata-only-catalog",
  });
  assert.deepEqual(microsoftByCode.body.results[0], microsoftByName.body.results[0]);
});

test("authenticated analysis reports compliance acknowledgement context", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const missing = await requestMock(
    "/api/analysis?symbol=AAPL&riskProfile=balanced",
    { headers: auth },
    state,
  );
  assert.equal(missing.status, 200);
  assert.equal(missing.body.complianceContext.status, "acknowledgement-required");
  assert.equal(missing.body.complianceContext.acknowledged, false);
  assert.equal(missing.body.inputCoverage.compliance, "missing-required-acknowledgement");

  const acknowledgement = await requestMock(
    "/api/compliance/acknowledgements",
    {
      method: "POST",
      headers: auth,
      body: {
        version: "compliance-ack-v0",
        acceptedDisclaimer: true,
        riskAcknowledged: true,
        optionalPortfolioNoticeAcknowledged: true,
        source: "analysis-test",
      },
    },
    state,
  );
  assert.equal(acknowledgement.status, 200);

  const acknowledged = await requestMock(
    "/api/analysis?symbol=AAPL&riskProfile=balanced",
    { headers: auth },
    state,
  );
  assert.equal(acknowledged.status, 200);
  assert.equal(acknowledged.body.complianceContext.status, "acknowledged");
  assert.equal(acknowledged.body.complianceContext.acknowledged, true);
  assert.equal(acknowledged.body.inputCoverage.compliance, "acknowledged-versioned-record");
  assert.equal(
    acknowledged.body.complianceContext.latestAcknowledgement.id,
    acknowledgement.body.saved.id,
  );
  assert.match(acknowledged.body.complianceContext.disclaimer, /不代表适当性评估/);
});

test("analysis history endpoint saves and lists model-reference records", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const unauthorized = await requestMock("/api/analysis/history", {}, state);
  assert.equal(unauthorized.status, 401);

  const analysis = await requestMock("/api/analysis?symbol=AAPL&riskProfile=aggressive", {}, state);
  const saved = await requestMock(
    "/api/analysis/history",
    {
      method: "POST",
      headers: auth,
      body: analysis.body,
    },
    state,
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.saved.symbol, "AAPL");
  assert.equal(saved.body.saved.riskProfile, "aggressive");
  assert.equal(saved.body.saved.upsideProbability, 63);
  assert.match(saved.body.saved.disclaimer, /历史记录/);

  const history = await requestMock("/api/analysis/history", { headers: auth }, state);
  assert.equal(history.status, 200);
  assert.equal(history.body.items.length, 1);
  assert.equal(history.body.items[0].id, saved.body.saved.id);

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(auditLog.body.items.some((event) => event.eventType === "analysis.history.save"));
});

test("authenticated analysis uses saved portfolio context", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  await requestMock(
    "/api/portfolio",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        buyPrice: "220",
        holdingQty: "1",
        buyDate: "2026-05-01",
        targetReturn: "15",
        maxLoss: "8",
      },
    },
    state,
  );

  const analysis = await requestMock(
    "/api/analysis?symbol=AAPL&riskProfile=aggressive",
    { headers: auth },
    state,
  );

  assert.equal(analysis.status, 200);
  assert.equal(analysis.body.inputCoverage.portfolio, "backend-saved-position");
  assert.equal(analysis.body.portfolioContext.source, "backend-saved");
  assert.equal(analysis.body.portfolioContext.estimatedReturnPct, -10.91);
  assert.equal(analysis.body.upsideProbability, 57);
  assert.match(analysis.body.actionReference, /最大可接受亏损 -8%/);
  assert.ok(analysis.body.reasons.some((reason) => reason.includes("后端持仓联动")));
  assert.ok(analysis.body.risks.some((risk) => risk.includes("风险边界")));
});

test("protected endpoints require auth and accept demo token", async () => {
  const unauthorized = await requestMock("/api/me");
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.body.error.code, "UNAUTHORIZED");

  const login = await requestMock("/api/auth/demo-login", { method: "POST" });
  assert.equal(login.status, 200);
  assert.equal(login.body.token, "demo-token");
  assert.equal(login.body.tokenType, "Bearer");
  assert.equal(login.body.expiresInSeconds, 86400);
  assert.match(login.body.disclaimer, /样例认证服务/);

  const me = await requestMock("/api/me", {
    headers: { authorization: `Bearer ${login.body.token}` },
  });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.displayName, "样例用户");
});

test("mock email auth registers, logs in, rejects duplicates, and authenticates sessions", async () => {
  const state = createMockState();
  const weak = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "bad-email", password: "123", displayName: "Bad" },
    },
    state,
  );
  assert.equal(weak.status, 400);
  assert.equal(weak.body.error.code, "INVALID_EMAIL");

  const registered = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "Investor@Example.com", password: "StrongPass123", displayName: "投资者" },
    },
    state,
  );
  assert.equal(registered.status, 201);
  assert.match(registered.body.token, /^mock_/);
  assert.equal(registered.body.tokenType, "Bearer");
  assert.equal(registered.body.user.email, "investor@example.com");
  assert.equal(registered.body.user.displayName, "投资者");
  assert.equal(Object.keys(state.authUsers).length, 1);
  assert.match(state.authUsers[registered.body.user.id].passwordHash, /^scrypt:/);

  const duplicate = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "investor@example.com", password: "StrongPass123", displayName: "Again" },
    },
    state,
  );
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, "EMAIL_EXISTS");

  const wrongPassword = await requestMock(
    "/api/auth/login",
    {
      method: "POST",
      body: { email: "investor@example.com", password: "WrongPass123" },
    },
    state,
  );
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.error.code, "INVALID_CREDENTIALS");

  const loggedIn = await requestMock(
    "/api/auth/login",
    {
      method: "POST",
      body: { email: "investor@example.com", password: "StrongPass123" },
    },
    state,
  );
  assert.equal(loggedIn.status, 200);
  assert.match(loggedIn.body.token, /^mock_/);

  const me = await requestMock("/api/me", {
    headers: { authorization: `Bearer ${loggedIn.body.token}` },
  }, state);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, "investor@example.com");

  const auditLog = await requestMock(
    "/api/audit-log",
    { headers: { authorization: `Bearer ${loggedIn.body.token}` } },
    state,
  );
  const signUpAudit = auditLog.body.items.find((event) => event.eventType === "auth.signUp");
  const signInAudit = auditLog.body.items.find((event) => event.eventType === "auth.signIn");
  assert.equal(signUpAudit?.metadata.action, "emailPasswordSignUp");
  assert.equal(signUpAudit?.metadata.legacyEventType, "auth.register");
  assert.equal(signUpAudit?.metadata.retentionClass, "auth-security-365d");
  assert.match(signUpAudit?.metadata.requestCorrelationId || "", /^auth-/);
  assert.equal(signInAudit?.metadata.action, "emailPasswordSignIn");
  assert.equal(signInAudit?.metadata.legacyEventType, "auth.login");
  assert.equal(signInAudit?.metadata.method, "emailPassword");
});

test("mock email auth roles can be managed for sample authorization testing", async () => {
  const state = createMockState();
  const registered = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "roles@example.com", password: "StrongPass123", displayName: "Roles" },
    },
    state,
  );
  const auth = { authorization: `Bearer ${registered.body.token}` };

  assert.deepEqual(registered.body.user.roles, ["user"]);

  const initialRoles = await requestMock("/api/auth/roles", { headers: auth }, state);
  assert.equal(initialRoles.status, 200);
  assert.equal(initialRoles.body.rolePolicy.mode, "sample-self-service");
  assert.deepEqual(initialRoles.body.user.roles, ["user"]);

  const updated = await requestMock(
    "/api/auth/roles",
    {
      method: "POST",
      headers: auth,
      body: { roles: ["auditor", "unknown"] },
    },
    state,
  );
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body.user.roles, ["auditor"]);
  assert.deepEqual(state.authUsers[registered.body.user.id].roles, ["auditor"]);
  assert.equal(updated.body.rolePolicy.productionSelfServiceAllowed, false);

  const me = await requestMock("/api/me", { headers: auth }, state);
  assert.deepEqual(me.body.user.roles, ["auditor"]);
  assert.ok(
    state.auditLogs.some(
      (event) =>
        event.eventType === "auth.roleChange" &&
        event.metadata.action === "roleSelfUpdate" &&
        event.metadata.legacyEventType === "auth.roles.update",
    ),
  );

  const demoDenied = await requestMock(
    "/api/auth/roles",
    {
      method: "POST",
      headers: { authorization: "Bearer demo-token" },
      body: { roles: ["admin"] },
    },
    state,
  );
  assert.equal(demoDenied.status, 403);
  assert.equal(demoDenied.body.error.code, "DEMO_ROLE_UPDATE_UNSUPPORTED");
});

test("mock admin can assign roles to another email user", async () => {
  const state = createMockState();
  const admin = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "admin@example.com", password: "StrongPass123", displayName: "Admin" },
    },
    state,
  );
  const target = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "target@example.com", password: "StrongPass123", displayName: "Target" },
    },
    state,
  );
  const adminAuth = { authorization: `Bearer ${admin.body.token}` };
  const targetAuth = { authorization: `Bearer ${target.body.token}` };

  const denied = await requestMock(
    "/api/admin/auth/users/roles",
    {
      method: "POST",
      headers: targetAuth,
      body: { email: "admin@example.com", roles: ["auditor"] },
    },
    state,
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, "ADMIN_ROLE_REQUIRED");

  const promoteAdmin = await requestMock(
    "/api/auth/roles",
    {
      method: "POST",
      headers: adminAuth,
      body: { roles: ["admin"], expiresInHours: 48 },
    },
    state,
  );
  assert.equal(promoteAdmin.status, 200);
  assert.equal(promoteAdmin.body.user.roleGrants[0].role, "admin");
  assert.equal(promoteAdmin.body.user.roleGrants[0].status, "active");
  assert.ok(Date.parse(promoteAdmin.body.user.roleGrants[0].expiresAt) > Date.now());

  const assigned = await requestMock(
    "/api/admin/auth/users/roles",
    {
      method: "POST",
      headers: adminAuth,
      body: { email: "target@example.com", roles: ["compliance"], expiresInHours: 12 },
    },
    state,
  );
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.actor.email, "admin@example.com");
  assert.equal(assigned.body.targetUser.email, "target@example.com");
  assert.deepEqual(assigned.body.targetUser.roles, ["compliance"]);
  assert.equal(assigned.body.rolePolicy.adminAssignmentPolicy.requiredRole, "admin");
  assert.equal(assigned.body.targetUser.roleGrants[0].role, "compliance");
  assert.ok(Date.parse(assigned.body.targetUser.roleGrants[0].expiresAt) > Date.now());
  assert.equal(assigned.body.roleGrant.expiresAt, assigned.body.targetUser.roleGrants[0].expiresAt);

  const targetMe = await requestMock("/api/me", { headers: targetAuth }, state);
  assert.deepEqual(targetMe.body.user.roles, ["compliance"]);
  assert.ok(
    state.auditLogs.some(
      (event) =>
        event.eventType === "auth.roleChange" &&
        event.metadata.action === "adminAssign" &&
        event.metadata.legacyEventType === "auth.roles.admin_assign" &&
        event.metadata.roleExpiresAt,
    ),
  );

  const selfRevokeDenied = await requestMock(
    "/api/admin/auth/users/roles/revoke",
    {
      method: "POST",
      headers: adminAuth,
      body: { email: "admin@example.com", roles: ["admin"] },
    },
    state,
  );
  assert.equal(selfRevokeDenied.status, 403);
  assert.equal(selfRevokeDenied.body.error.code, "SELF_ADMIN_REVOKE_BLOCKED");

  const revoked = await requestMock(
    "/api/admin/auth/users/roles/revoke",
    {
      method: "POST",
      headers: adminAuth,
      body: { email: "target@example.com", roles: ["compliance"] },
    },
    state,
  );
  assert.equal(revoked.status, 200);
  assert.deepEqual(revoked.body.revokedRoles, ["compliance"]);
  assert.deepEqual(revoked.body.targetUser.roles, ["user"]);
  assert.ok(
    state.auditLogs.some(
      (event) =>
        event.eventType === "auth.roleChange" &&
        event.metadata.action === "adminRevoke" &&
        event.metadata.legacyEventType === "auth.roles.admin_revoke",
    ),
  );

  const history = await requestMock(
    "/api/admin/auth/roles/history",
    { headers: adminAuth },
    state,
  );
  assert.equal(history.status, 200);
  assert.equal(history.body.policy.scope, "actor-owned-audit-events");
  assert.deepEqual(
    history.body.items.map((event) => event.metadata.action),
    ["adminRevoke", "adminAssign", "roleSelfUpdate"],
  );
  assert.equal(history.body.items[0].metadata.targetEmail, "ta****@example.com");

  const historyDenied = await requestMock(
    "/api/admin/auth/roles/history",
    { headers: targetAuth },
    state,
  );
  assert.equal(historyDenied.status, 403);
  assert.equal(historyDenied.body.error.code, "ADMIN_ROLE_REQUIRED");

  state.authUsers[admin.body.user.id].roleGrants.admin.expiresAt = "2026-01-01T00:00:00.000Z";
  const expiredAdminDenied = await requestMock(
    "/api/admin/auth/users/roles",
    {
      method: "POST",
      headers: adminAuth,
      body: { email: "target@example.com", roles: ["auditor"] },
    },
    state,
  );
  assert.equal(expiredAdminDenied.status, 403);
  assert.equal(expiredAdminDenied.body.error.code, "ADMIN_ROLE_REQUIRED");
});

test("mock email auth logout revokes session token", async () => {
  const state = createMockState();
  const registered = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "logout@example.com", password: "StrongPass123", displayName: "Logout" },
    },
    state,
  );
  const auth = { authorization: `Bearer ${registered.body.token}` };

  assert.equal(state.authSessions.length, 1);
  const beforeLogout = await requestMock("/api/me", { headers: auth }, state);
  assert.equal(beforeLogout.status, 200);

  const logout = await requestMock("/api/auth/logout", { method: "POST", headers: auth }, state);
  assert.equal(logout.status, 200);
  assert.equal(logout.body.success, true);
  assert.equal(logout.body.revoked, true);
  assert.equal(state.authSessions.length, 0);

  const afterLogout = await requestMock("/api/me", { headers: auth }, state);
  assert.equal(afterLogout.status, 401);

  assert.ok(
    state.auditLogs.some(
      (event) =>
        event.eventType === "auth.signOut" &&
        event.metadata.action === "sessionSignOut" &&
        event.metadata.legacyEventType === "auth.logout",
    ),
  );

  const unauthorized = await requestMock("/api/auth/logout", { method: "POST" }, state);
  assert.equal(unauthorized.status, 401);
});

test("mock email auth refresh rotates session token and audits refresh", async () => {
  const state = createMockState();
  const registered = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "refresh@example.com", password: "StrongPass123", displayName: "Refresh" },
    },
    state,
  );
  const oldAuth = { authorization: `Bearer ${registered.body.token}` };

  assert.equal(state.authSessions.length, 1);
  const refreshed = await requestMock(
    "/api/auth/session/refresh",
    { method: "POST", headers: oldAuth },
    state,
  );
  assert.equal(refreshed.status, 200);
  assert.equal(refreshed.body.rotated, true);
  assert.match(refreshed.body.token, /^mock_/);
  assert.notEqual(refreshed.body.token, registered.body.token);
  assert.equal(state.authSessions.length, 1);

  const oldTokenRejected = await requestMock("/api/me", { headers: oldAuth }, state);
  assert.equal(oldTokenRejected.status, 401);

  const newAuth = { authorization: `Bearer ${refreshed.body.token}` };
  const newTokenAccepted = await requestMock("/api/me", { headers: newAuth }, state);
  assert.equal(newTokenAccepted.status, 200);
  assert.equal(newTokenAccepted.body.user.email, "refresh@example.com");

  const auditLog = await requestMock("/api/audit-log", { headers: newAuth }, state);
  const refreshAudit = auditLog.body.items.find(
    (event) => event.eventType === "auth.sessionRefresh",
  );
  assert.equal(refreshAudit?.metadata.action, "sessionRefresh");
  assert.equal(refreshAudit?.metadata.legacyEventType, "auth.session.refresh");
  assert.equal(refreshAudit?.metadata.retentionClass, "auth-security-365d");
  assert.equal(refreshAudit?.metadata.rotated, true);
  assert.match(refreshAudit?.metadata.requestCorrelationId || "", /^auth-/);

  const unauthorized = await requestMock("/api/auth/session/refresh", { method: "POST" }, state);
  assert.equal(unauthorized.status, 401);
});

test("mock email auth lists redacted active sessions and audits access", async () => {
  const state = createMockState();
  const registered = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "sessions@example.com", password: "StrongPass123", displayName: "Sessions" },
    },
    state,
  );
  const login = await requestMock(
    "/api/auth/login",
    {
      method: "POST",
      body: { email: "sessions@example.com", password: "StrongPass123" },
    },
    state,
  );
  const auth = { authorization: `Bearer ${login.body.token}` };

  assert.equal(state.authSessions.length, 2);
  const sessions = await requestMock("/api/auth/sessions", { headers: auth }, state);
  assert.equal(sessions.status, 200);
  assert.equal(sessions.body.user.email, "sessions@example.com");
  assert.equal(sessions.body.items.length, 2);
  assert.equal(sessions.body.items.filter((session) => session.current).length, 1);
  assert.equal(sessions.body.sessionPolicy.tokenHashReturned, false);
  assert.ok(sessions.body.items.every((session) => !Object.hasOwn(session, "tokenHash")));
  assert.ok(sessions.body.items.every((session) => session.sessionMode === "email-password-session"));

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  const listAudit = auditLog.body.items.find((event) => event.eventType === "auth.sessionList");
  assert.equal(listAudit?.metadata.action, "sessionList");
  assert.equal(listAudit?.metadata.legacyEventType, "auth.sessions.list");
  assert.equal(listAudit?.metadata.sessionCount, 2);
  assert.equal(listAudit?.metadata.sensitiveSessionFieldsReturned, false);

  const unauthorized = await requestMock("/api/auth/sessions", {}, state);
  assert.equal(unauthorized.status, 401);
});

test("mock email auth revokes another redacted session and audits access", async () => {
  const state = createMockState();
  const registered = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: { email: "revoke-sessions@example.com", password: "StrongPass123", displayName: "Revoke" },
    },
    state,
  );
  const login = await requestMock(
    "/api/auth/login",
    {
      method: "POST",
      body: { email: "revoke-sessions@example.com", password: "StrongPass123" },
    },
    state,
  );
  const currentAuth = { authorization: `Bearer ${login.body.token}` };
  const oldAuth = { authorization: `Bearer ${registered.body.token}` };

  const sessions = await requestMock("/api/auth/sessions", { headers: currentAuth }, state);
  const target = sessions.body.items.find((session) => !session.current);
  const current = sessions.body.items.find((session) => session.current);
  assert.ok(target?.id);
  assert.ok(current?.id);

  const revoked = await requestMock(
    `/api/auth/sessions/${encodeURIComponent(target.id)}`,
    { method: "DELETE", headers: currentAuth },
    state,
  );
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.revoked, 1);
  assert.equal(revoked.body.revokedSession.id, target.id);
  assert.equal(revoked.body.revokedSession.current, false);
  assert.equal(Object.hasOwn(revoked.body.revokedSession, "tokenHash"), false);

  const oldMe = await requestMock("/api/me", { headers: oldAuth }, state);
  assert.equal(oldMe.status, 401);
  const currentMe = await requestMock("/api/me", { headers: currentAuth }, state);
  assert.equal(currentMe.status, 200);

  const revokeCurrent = await requestMock(
    `/api/auth/sessions/${encodeURIComponent(current.id)}`,
    { method: "DELETE", headers: currentAuth },
    state,
  );
  assert.equal(revokeCurrent.status, 409);

  const auditLog = await requestMock("/api/audit-log", { headers: currentAuth }, state);
  const revokeAudit = auditLog.body.items.find((event) => event.eventType === "auth.sessionRevoke");
  assert.equal(revokeAudit?.metadata.action, "sessionRevoke");
  assert.equal(revokeAudit?.metadata.legacyEventType, "auth.sessions.revoke");
  assert.equal(revokeAudit?.metadata.revoked, 1);
  assert.equal(revokeAudit?.metadata.revokedCurrentSession, false);
  assert.equal(revokeAudit?.metadata.sensitiveSessionFieldsReturned, false);

  const unauthorized = await requestMock(
    `/api/auth/sessions/${encodeURIComponent(target.id)}`,
    { method: "DELETE" },
    state,
  );
  assert.equal(unauthorized.status, 401);
});

test("preferences endpoint saves sanitized user settings", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const unauthorized = await requestMock("/api/preferences", {}, state);
  assert.equal(unauthorized.status, 401);

  const saved = await requestMock(
    "/api/preferences",
    {
      method: "POST",
      headers: auth,
      body: {
        riskProfile: "aggressive",
        notifications: {
          inApp: true,
          email: true,
          sms: "yes",
          unknown: true,
        },
      },
    },
    state,
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.body.preferences.riskProfile, "aggressive");
  assert.deepEqual(saved.body.preferences.notifications, { inApp: true, email: true });
  assert.ok(saved.body.preferences.updatedAt);

  const fetched = await requestMock("/api/preferences", { headers: auth }, state);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.preferences.riskProfile, "aggressive");
  assert.deepEqual(fetched.body.preferences.notifications, { inApp: true, email: true });

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(auditLog.body.items.some((event) => event.eventType === "preferences.save"));
});

test("watchlist endpoints add, list, and remove stocks", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };
  const added = await requestMock(
    "/api/watchlist",
    {
      method: "POST",
      headers: auth,
      body: { code: "AAPL" },
    },
    state,
  );
  assert.equal(added.status, 200);
  assert.equal(added.body.added, "AAPL");

  const list = await requestMock("/api/watchlist", { headers: auth }, state);
  assert.equal(list.status, 200);
  assert.equal(list.body.items[0].code, "AAPL");

  const removed = await requestMock(
    "/api/watchlist/AAPL",
    {
      method: "DELETE",
      headers: auth,
    },
    state,
  );
  assert.equal(removed.status, 200);
  assert.equal(removed.body.removed, "AAPL");
  assert.equal(removed.body.size, 0);
});

test("watchlist endpoints isolate data by authenticated user", async () => {
  const state = createMockState();
  const userOne = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: {
        email: "watch-one@example.com",
        password: "password123",
        displayName: "Watch One",
      },
    },
    state,
  );
  const userTwo = await requestMock(
    "/api/auth/register",
    {
      method: "POST",
      body: {
        email: "watch-two@example.com",
        password: "password123",
        displayName: "Watch Two",
      },
    },
    state,
  );
  const authOne = { authorization: `Bearer ${userOne.body.token}` };
  const authTwo = { authorization: `Bearer ${userTwo.body.token}` };

  await requestMock(
    "/api/watchlist",
    { method: "POST", headers: authOne, body: { code: "AAPL" } },
    state,
  );
  await requestMock(
    "/api/watchlist",
    { method: "POST", headers: authTwo, body: { code: "0700" } },
    state,
  );

  const listOne = await requestMock("/api/watchlist", { headers: authOne }, state);
  const listTwo = await requestMock("/api/watchlist", { headers: authTwo }, state);

  assert.deepEqual(listOne.body.items.map((item) => item.code), ["AAPL"]);
  assert.deepEqual(listTwo.body.items.map((item) => item.code), ["0700"]);
  assert.deepEqual(state.watchlists[userOne.body.user.id], ["AAPL"]);
  assert.deepEqual(state.watchlists[userTwo.body.user.id], ["0700"]);
});

test("reminder endpoints add, list, and remove rules", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const unauthorized = await requestMock("/api/reminders", {}, state);
  assert.equal(unauthorized.status, 401);

  const missingChannels = await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceAbove",
        threshold: "210",
        channels: [],
      },
    },
    state,
  );
  assert.equal(missingChannels.status, 400);
  assert.equal(missingChannels.body.error.code, "INVALID_REMINDER_CHANNELS");

  const added = await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceAbove",
        threshold: "210",
        channels: ["inApp", "email"],
      },
    },
    state,
  );
  assert.equal(added.status, 200);
  assert.equal(added.body.saved.code, "AAPL");
  assert.equal(added.body.saved.type, "priceAbove");
  assert.deepEqual(added.body.saved.channels, ["inApp", "email"]);

  const sanitized = await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceBelow",
        threshold: "180",
        channels: ["email", "bad-channel", "email", "telegram", 7],
      },
    },
    state,
  );
  assert.equal(sanitized.status, 200);
  assert.deepEqual(sanitized.body.saved.channels, ["email", "telegram"]);

  const list = await requestMock("/api/reminders", { headers: auth }, state);
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.items[0].channels, ["email", "telegram"]);
  assert.equal(list.body.items[1].id, added.body.saved.id);

  const removed = await requestMock(
    `/api/reminders/${added.body.saved.id}`,
    {
      method: "DELETE",
      headers: auth,
    },
    state,
  );
  assert.equal(removed.status, 200);
  assert.equal(removed.body.removed, added.body.saved.id);
  assert.equal(removed.body.size, 1);
});

test("reminder evaluation triggers price and important-news rules", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const priceRule = await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceBelow",
        threshold: "210",
        channels: ["inApp"],
      },
    },
    state,
  );
  const newsRule = await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "importantNews",
        threshold: "80",
        channels: ["inApp"],
      },
    },
    state,
  );
  await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceAbove",
        threshold: "210",
        channels: ["inApp"],
      },
    },
    state,
  );

  const evaluation = await requestMock(
    "/api/reminders/evaluate",
    { method: "POST", headers: auth },
    state,
  );

  assert.equal(evaluation.status, 200);
  assert.equal(evaluation.body.checked, 3);
  assert.equal(evaluation.body.triggeredCount, 2);
  assert.ok(
    evaluation.body.items.some(
      (item) =>
        item.ruleId === priceRule.body.saved.id &&
        item.triggered &&
        item.observedValue === 196 &&
        item.deliveryServiceId === "mock-notification-delivery" &&
        item.notificationIds.length === 1,
    ),
  );
  assert.ok(
    evaluation.body.items.some(
      (item) =>
        item.ruleId === newsRule.body.saved.id &&
        item.triggered &&
        item.observedValue === 81 &&
        item.newsTitle.includes("AI") &&
        item.deliveryServiceId === "mock-notification-delivery" &&
        item.notificationIds.length === 1,
    ),
  );

  const notifications = await requestMock("/api/notifications", { headers: auth }, state);
  assert.equal(notifications.status, 200);
  assert.equal(notifications.body.items.length, 2);
  assert.deepEqual(
    notifications.body.items.map((item) => item.channel).sort(),
    ["inApp", "inApp"],
  );
  assert.ok(
    notifications.body.items.every(
      (item) =>
        item.deliveryServiceId === "mock-notification-delivery" &&
        item.deliveryMode === "outbox-only" &&
        item.channelLabel === "网页内提醒" &&
        item.deliveryStatus === "delivered" &&
        item.attemptCount === 1,
    ),
  );

  const read = await requestMock(
    `/api/notifications/${notifications.body.items[0].id}/read`,
    { method: "POST", headers: auth },
    state,
  );
  assert.equal(read.status, 200);
  assert.equal(read.body.notification.status, "read");

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  const triggerEvents = auditLog.body.items.filter(
    (event) => event.eventType === "reminder.triggered",
  );
  assert.equal(triggerEvents.length, 2);
  assert.deepEqual(
    triggerEvents.map((event) => event.metadata.type).sort(),
    ["importantNews", "priceBelow"],
  );
  assert.ok(
    triggerEvents.every(
      (event) => event.metadata.deliveryServiceId === "mock-notification-delivery",
    ),
  );
  assert.ok(auditLog.body.items.some((event) => event.eventType === "notification.read"));
});

test("notification delivery records channel status and supports retry", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceBelow",
        threshold: "210",
        channels: ["inApp", "email"],
      },
    },
    state,
  );

  const evaluation = await requestMock(
    "/api/reminders/evaluate",
    { method: "POST", headers: auth },
    state,
  );
  assert.equal(evaluation.status, 200);
  assert.equal(evaluation.body.triggeredCount, 1);
  assert.equal(evaluation.body.items[0].notificationIds.length, 2);

  const notifications = await requestMock("/api/notifications", { headers: auth }, state);
  assert.equal(notifications.status, 200);
  assert.equal(notifications.body.items.length, 2);

  const inApp = notifications.body.items.find((item) => item.channel === "inApp");
  const email = notifications.body.items.find((item) => item.channel === "email");
  assert.equal(inApp.deliveryStatus, "delivered");
  assert.equal(inApp.deliveryAttempts[0].status, "delivered");
  assert.equal(email.deliveryStatus, "failed");
  assert.equal(email.deliveryAttempts[0].errorCode, "CONNECTOR_NOT_CONFIGURED");
  assert.match(email.deliveryError, /连接器尚未配置/);

  const retry = await requestMock(
    `/api/notifications/${email.id}/retry`,
    { method: "POST", headers: auth },
    state,
  );
  assert.equal(retry.status, 200);
  assert.equal(retry.body.notification.deliveryStatus, "failed");
  assert.equal(retry.body.notification.attemptCount, 2);
  assert.equal(retry.body.notification.deliveryAttempts.length, 2);
  assert.ok(retry.body.notification.nextRetryAt);

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  const attempts = auditLog.body.items.filter(
    (event) => event.eventType === "notification.delivery.attempt",
  );
  assert.equal(attempts.length, 3);
  assert.ok(attempts.some((event) => event.metadata.reason === "manual-retry"));
});

test("job runner records reminder evaluation job runs", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceBelow",
        threshold: "210",
        channels: ["inApp"],
      },
    },
    state,
  );

  const job = await requestMock(
    "/api/jobs/run",
    {
      method: "POST",
      headers: auth,
      body: { type: "reminderEvaluation" },
    },
    state,
  );

  assert.equal(job.status, 200);
  assert.equal(job.body.jobRun.type, "reminderEvaluation");
  assert.equal(job.body.jobRun.status, "success");
  assert.deepEqual(job.body.jobRun.summary, { checked: 1, triggeredCount: 1 });
  assert.equal(job.body.result.triggeredCount, 1);

  const jobs = await requestMock("/api/jobs", { headers: auth }, state);
  assert.equal(jobs.status, 200);
  assert.equal(jobs.body.items[0].id, job.body.jobRun.id);

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(auditLog.body.items.some((event) => event.eventType === "job.run"));
});

test("mock reminder job runner centralizes reminder evaluation and job records", () => {
  const state = createMockState();
  const repository = createMockRepository(state);
  const runner = createMockReminderJobRunner({
    dataProvider: createMockProvider(),
    notificationService: createMockNotificationService(),
  });
  const user = { id: "demo-user", displayName: "样例用户" };

  repository.addReminder({
    id: repository.nextReminderId(),
    userId: user.id,
    code: "AAPL",
    type: "priceBelow",
    threshold: "210",
    channels: ["inApp", "telegram"],
    createdAt: "2026-06-01T00:00:00.000Z",
  });

  const evaluation = runner.evaluateReminderRulesForUser(repository, user);
  assert.equal(evaluation.checked, 1);
  assert.equal(evaluation.triggeredCount, 1);
  assert.equal(repository.listNotifications(user.id).length, 2);
  const duplicateEvaluation = runner.evaluateReminderRulesForUser(repository, user);
  assert.equal(duplicateEvaluation.triggeredCount, 1);
  assert.equal(duplicateEvaluation.items[0].duplicateSuppressedCount, 2);
  assert.equal(repository.listNotifications(user.id).length, 2);
  assert.ok(
    repository
      .listAuditEvents(user.id)
      .some((event) => event.eventType === "notification.duplicate_suppressed"),
  );

  repository.addReminder({
    id: repository.nextReminderId(),
    userId: user.id,
    code: "AAPL",
    type: "priceBelow",
    threshold: "210",
    channels: [],
    createdAt: "2026-06-01T00:01:00.000Z",
  });
  const noConsentEvaluation = runner.evaluateReminderRulesForUser(repository, user);
  const noConsentItem = noConsentEvaluation.items.find((item) => item.channels.length === 0);
  assert.equal(noConsentItem.triggered, true);
  assert.deepEqual(noConsentItem.notificationIds, []);
  assert.equal(
    repository
      .listNotifications(user.id)
      .some((notification) => notification.ruleId === noConsentItem.ruleId),
    false,
  );

  const job = runner.runJob(repository, user, "reminderEvaluation");
  assert.equal(job.ok, true);
  assert.equal(job.jobRun.type, "reminderEvaluation");
  assert.deepEqual(job.jobRun.summary, { checked: 2, triggeredCount: 2 });
  assert.equal(repository.listJobRuns(user.id)[0].id, job.jobRun.id);
  assert.ok(repository.listAuditEvents(user.id).some((event) => event.eventType === "job.run"));

  const unsupported = runner.runJob(repository, user, "unknownJob");
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.error.code, "UNSUPPORTED_JOB");
});

test("scheduler run-due endpoint bridges schedules to job runner", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceBelow",
        threshold: "210",
        channels: ["inApp"],
      },
    },
    state,
  );

  const unauthorized = await requestMock("/api/scheduler/run-due", { method: "POST" }, state);
  assert.equal(unauthorized.status, 401);

  const scheduler = await requestMock(
    "/api/scheduler/run-due",
    {
      method: "POST",
      headers: auth,
      body: { idempotencyKey: "scheduler-test-001" },
    },
    state,
  );

  assert.equal(scheduler.status, 200);
  assert.equal(scheduler.body.schedulerRun.executionMode, "manual-due-check");
  assert.equal(scheduler.body.schedulerRun.checkedSchedules, 1);
  assert.equal(scheduler.body.schedulerRun.executedJobs, 1);
  assert.equal(scheduler.body.schedulerRun.idempotencyKey, "scheduler-test-001");
  assert.equal(scheduler.body.idempotency.status, "accepted");
  assert.equal(scheduler.body.jobs[0].jobType, "reminderEvaluation");
  assert.equal(scheduler.body.jobs[0].result.triggeredCount, 1);
  assert.match(scheduler.body.disclaimer, /手动触发/);

  const jobs = await requestMock("/api/jobs", { headers: auth }, state);
  assert.equal(jobs.body.items[0].type, "reminderEvaluation");

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(auditLog.body.items.some((event) => event.eventType === "scheduler.run_due"));
  assert.ok(auditLog.body.items.some((event) => event.eventType === "job.run"));

  const duplicate = await requestMock(
    "/api/scheduler/run-due",
    {
      method: "POST",
      headers: auth,
      body: { idempotencyKey: "scheduler-test-001" },
    },
    state,
  );
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.schedulerRun.status, "skipped");
  assert.equal(duplicate.body.schedulerRun.skipReason, "duplicate-idempotency-key");
  assert.equal(duplicate.body.schedulerRun.executedJobs, 0);
});

test("scheduler dead-letter endpoints list and replay failed jobs", async () => {
  const state = createMockState({
    deadLetterQueue: [
      {
        id: "dlq-api-001",
        userId: "demo-user",
        scheduleId: "schedule-reminder-evaluation",
        jobType: "reminderEvaluation",
        status: "open",
        attempts: 1,
        maxAttempts: 3,
        nextRetryAt: "2026-06-01T00:01:00.000Z",
        lastError: { code: "WORKER_FAILED", message: "样例 worker 失败。" },
        payload: { requestedBy: "test" },
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  });
  const auth = { authorization: "Bearer demo-token" };

  const unauthorized = await requestMock("/api/scheduler/dead-letter", {}, state);
  assert.equal(unauthorized.status, 401);

  const list = await requestMock("/api/scheduler/dead-letter", { headers: auth }, state);
  assert.equal(list.status, 200);
  assert.equal(list.body.items[0].id, "dlq-api-001");
  assert.equal(list.body.policy.replaySupported, true);

  const replay = await requestMock(
    "/api/scheduler/dead-letter/dlq-api-001/replay",
    { method: "POST", headers: auth },
    state,
  );
  assert.equal(replay.status, 200);
  assert.equal(replay.body.deadLetterJob.status, "replayed");
  assert.equal(replay.body.deadLetterJob.attempts, 2);
  assert.equal(replay.body.jobRun.type, "reminderEvaluation");

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(
    auditLog.body.items.some((event) => event.eventType === "scheduler.dead_letter.replay"),
  );
});

test("scheduler worker-health endpoints record heartbeat and queue lag", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const unauthorizedHealth = await requestMock("/api/scheduler/worker-health", {}, state);
  assert.equal(unauthorizedHealth.status, 401);

  const initialHealth = await requestMock("/api/scheduler/worker-health", { headers: auth }, state);
  assert.equal(initialHealth.status, 200);
  assert.equal(initialHealth.body.status, "no-workers");
  assert.equal(initialHealth.body.queue.status, "no-workers");

  const heartbeat = await requestMock(
    "/api/scheduler/worker-heartbeat",
    {
      method: "POST",
      headers: auth,
      body: {
        workerId: "worker-api-001",
        jobTypes: ["reminderEvaluation"],
        queueDepth: 12,
        queueLagMs: 360000,
      },
    },
    state,
  );
  assert.equal(heartbeat.status, 200);
  assert.equal(heartbeat.body.heartbeat.workerId, "worker-api-001");
  assert.equal(heartbeat.body.heartbeat.status, "warning");
  assert.equal(heartbeat.body.workerHealth.status, "degraded");
  assert.equal(heartbeat.body.workerHealth.queue.status, "warning");

  const health = await requestMock("/api/scheduler/worker-health", { headers: auth }, state);
  assert.equal(health.body.workerCount, 1);
  assert.equal(health.body.activeWorkerCount, 1);
  assert.equal(health.body.queue.maxLagMs, 360000);

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(
    auditLog.body.items.some((event) => event.eventType === "scheduler.worker_heartbeat"),
  );
});

test("scheduler worker secret gates heartbeat and queue processing when configured", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };
  const previousSecret = process.env.FINANCE_AI_WORKER_SECRET;
  process.env.FINANCE_AI_WORKER_SECRET = "test-worker-secret";

  try {
    const status = await requestMock("/api/scheduler/status", {}, state);
    assert.equal(status.body.activeService.workerAuthPolicy.enforcement, "required");
    assert.equal(status.body.activeService.workerAuthPolicy.configured, true);

    const blockedHeartbeat = await requestMock(
      "/api/scheduler/worker-heartbeat",
      {
        method: "POST",
        headers: auth,
        body: { workerId: "secure-worker", queueDepth: 0, queueLagMs: 0 },
      },
      state,
    );
    assert.equal(blockedHeartbeat.status, 403);
    assert.equal(blockedHeartbeat.body.error.code, "WORKER_AUTH_REQUIRED");

    const acceptedHeartbeat = await requestMock(
      "/api/scheduler/worker-heartbeat",
      {
        method: "POST",
        headers: { ...auth, "x-worker-secret": "test-worker-secret" },
        body: { workerId: "secure-worker", queueDepth: 0, queueLagMs: 0 },
      },
      state,
    );
    assert.equal(acceptedHeartbeat.status, 200);
    assert.equal(acceptedHeartbeat.body.workerAuth.enforcement, "required");
    assert.equal(acceptedHeartbeat.body.heartbeat.workerId, "secure-worker");

    await requestMock(
      "/api/scheduler/enqueue",
      {
        method: "POST",
        headers: auth,
        body: { jobType: "reminderEvaluation", payload: { source: "worker-secret-test" } },
      },
      state,
    );
    const blockedProcess = await requestMock(
      "/api/scheduler/process-queue",
      {
        method: "POST",
        headers: auth,
        body: { workerId: "secure-worker" },
      },
      state,
    );
    assert.equal(blockedProcess.status, 403);
    assert.equal(blockedProcess.body.workerAuth.enforcement, "required");

    const acceptedProcess = await requestMock(
      "/api/scheduler/process-queue",
      {
        method: "POST",
        headers: auth,
        body: { workerId: "secure-worker", workerSecret: "test-worker-secret" },
      },
      state,
    );
    assert.equal(acceptedProcess.status, 200);
    assert.equal(acceptedProcess.body.workerAuth.enforcement, "required");
    assert.equal(acceptedProcess.body.queueRun.status, "success");
  } finally {
    if (previousSecret === undefined) {
      delete process.env.FINANCE_AI_WORKER_SECRET;
    } else {
      process.env.FINANCE_AI_WORKER_SECRET = previousSecret;
    }
  }
});

test("scheduler worker signature gate rejects replayed or unsigned callbacks", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };
  const previousSecret = process.env.FINANCE_AI_WORKER_SECRET;
  const previousSignatureRequired = process.env.FINANCE_AI_WORKER_SIGNATURE_REQUIRED;
  process.env.FINANCE_AI_WORKER_SECRET = "signed-worker-secret";
  process.env.FINANCE_AI_WORKER_SIGNATURE_REQUIRED = "true";

  try {
    const status = await requestMock("/api/scheduler/status", {}, state);
    assert.equal(status.body.activeService.workerAuthPolicy.status, "signed-required");
    assert.equal(status.body.activeService.workerAuthPolicy.signatureRequired, true);
    assert.equal(status.body.activeService.workerAuthPolicy.nonceRequired, true);
    assert.equal(status.body.activeService.workerAuthPolicy.acceptedNonceHeader, "x-worker-nonce");
    assert.equal(status.body.activeService.workerAuthPolicy.nonceRetentionSeconds, 86400);
    assert.equal(status.body.activeService.workerAuthPolicy.nonceCleanupSupported, true);

    const timestamp = new Date().toISOString();
    const signature = workerSignature("signed-worker-secret", {
      operation: "recordWorkerHeartbeat",
      workerId: "signed-worker",
      timestamp,
    });
    const acceptedHeartbeat = await requestMock(
      "/api/scheduler/worker-heartbeat",
      {
        method: "POST",
        headers: {
          ...auth,
          "x-worker-secret": "signed-worker-secret",
          "x-worker-timestamp": timestamp,
          "x-worker-signature": signature,
          "x-worker-nonce": "nonce-heartbeat-001",
        },
        body: { workerId: "signed-worker", queueDepth: 0, queueLagMs: 0 },
      },
      state,
    );
    assert.equal(acceptedHeartbeat.status, 200);
    assert.equal(acceptedHeartbeat.body.workerAuth.signatureRequired, true);

    const missingNonceTimestamp = new Date().toISOString();
    const missingNonceSignature = workerSignature("signed-worker-secret", {
      operation: "recordWorkerHeartbeat",
      workerId: "signed-worker",
      timestamp: missingNonceTimestamp,
    });
    const missingNonceHeartbeat = await requestMock(
      "/api/scheduler/worker-heartbeat",
      {
        method: "POST",
        headers: {
          ...auth,
          "x-worker-secret": "signed-worker-secret",
          "x-worker-timestamp": missingNonceTimestamp,
          "x-worker-signature": missingNonceSignature,
        },
        body: { workerId: "signed-worker", queueDepth: 0, queueLagMs: 0 },
      },
      state,
    );
    assert.equal(missingNonceHeartbeat.status, 403);
    assert.equal(missingNonceHeartbeat.body.error.code, "WORKER_NONCE_REQUIRED");

    const replayedHeartbeat = await requestMock(
      "/api/scheduler/worker-heartbeat",
      {
        method: "POST",
        headers: {
          ...auth,
          "x-worker-secret": "signed-worker-secret",
          "x-worker-timestamp": timestamp,
          "x-worker-signature": signature,
          "x-worker-nonce": "nonce-heartbeat-001",
        },
        body: { workerId: "signed-worker", queueDepth: 0, queueLagMs: 0 },
      },
      state,
    );
    assert.equal(replayedHeartbeat.status, 403);
    assert.equal(replayedHeartbeat.body.error.code, "WORKER_NONCE_REPLAYED");

    const expiredNonceTimestamp = new Date().toISOString();
    const expiredNonceSignature = workerSignature("signed-worker-secret", {
      operation: "recordWorkerHeartbeat",
      workerId: "signed-worker",
      timestamp: expiredNonceTimestamp,
    });
    state.workerRequestNonces.push({
      id: "expired-worker-nonce-001",
      userId: "demo-user",
      workerId: "signed-worker",
      operation: "recordWorkerHeartbeat",
      nonce: "nonce-expired-cleanup-001",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const acceptedAfterPrune = await requestMock(
      "/api/scheduler/worker-heartbeat",
      {
        method: "POST",
        headers: {
          ...auth,
          "x-worker-secret": "signed-worker-secret",
          "x-worker-timestamp": expiredNonceTimestamp,
          "x-worker-signature": expiredNonceSignature,
          "x-worker-nonce": "nonce-expired-cleanup-001",
        },
        body: { workerId: "signed-worker", queueDepth: 0, queueLagMs: 0 },
      },
      state,
    );
    assert.equal(acceptedAfterPrune.status, 200);
    assert.equal(
      state.workerRequestNonces.some((record) => record.id === "expired-worker-nonce-001"),
      false,
    );
    assert.ok(
      state.workerRequestNonces.some(
        (record) =>
          record.nonce === "nonce-expired-cleanup-001" &&
          Date.parse(record.expiresAt) > Date.now(),
      ),
    );

    const unsignedHeartbeat = await requestMock(
      "/api/scheduler/worker-heartbeat",
      {
        method: "POST",
        headers: { ...auth, "x-worker-secret": "signed-worker-secret" },
        body: { workerId: "signed-worker", queueDepth: 0, queueLagMs: 0 },
      },
      state,
    );
    assert.equal(unsignedHeartbeat.status, 403);
    assert.equal(unsignedHeartbeat.body.error.code, "WORKER_SIGNATURE_REQUIRED");

    const expiredTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const expiredSignature = workerSignature("signed-worker-secret", {
      operation: "processQueuedJobs",
      workerId: "signed-worker",
      timestamp: expiredTimestamp,
    });
    const expiredProcess = await requestMock(
      "/api/scheduler/process-queue",
      {
        method: "POST",
        headers: auth,
        body: {
          workerId: "signed-worker",
          workerSecret: "signed-worker-secret",
          workerTimestamp: expiredTimestamp,
          workerSignature: expiredSignature,
          workerNonce: "nonce-expired-process-001",
        },
      },
      state,
    );
    assert.equal(expiredProcess.status, 403);
    assert.equal(expiredProcess.body.error.code, "WORKER_SIGNATURE_EXPIRED");
  } finally {
    if (previousSecret === undefined) {
      delete process.env.FINANCE_AI_WORKER_SECRET;
    } else {
      process.env.FINANCE_AI_WORKER_SECRET = previousSecret;
    }
    if (previousSignatureRequired === undefined) {
      delete process.env.FINANCE_AI_WORKER_SIGNATURE_REQUIRED;
    } else {
      process.env.FINANCE_AI_WORKER_SIGNATURE_REQUIRED = previousSignatureRequired;
    }
  }
});

test("scheduler worker nonce cleanup endpoint prunes expired records and audits", async () => {
  const state = createMockState({
    workerRequestNonces: [
      {
        id: "nonce-cleanup-expired-001",
        userId: "demo-user",
        workerId: "signed-worker",
        operation: "recordWorkerHeartbeat",
        nonce: "expired-cleanup-nonce",
        timestamp: "2026-05-30T00:00:00.000Z",
        expiresAt: "2026-05-31T00:00:00.000Z",
        createdAt: "2026-05-30T00:00:00.000Z",
      },
      {
        id: "nonce-cleanup-active-001",
        userId: "demo-user",
        workerId: "signed-worker",
        operation: "recordWorkerHeartbeat",
        nonce: "active-cleanup-nonce",
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
  });
  const auth = { authorization: "Bearer demo-token" };

  const unauthorized = await requestMock(
    "/api/scheduler/worker-nonces/cleanup",
    { method: "POST" },
    state,
  );
  assert.equal(unauthorized.status, 401);

  const cleanup = await requestMock(
    "/api/scheduler/worker-nonces/cleanup",
    { method: "POST", headers: auth },
    state,
  );
  assert.equal(cleanup.status, 200);
  assert.equal(cleanup.body.cleanupRun.status, "success");
  assert.equal(cleanup.body.cleanupRun.checkedNonces, 2);
  assert.equal(cleanup.body.cleanupRun.prunedNonces, 1);
  assert.equal(cleanup.body.cleanupRun.remainingNonces, 1);
  assert.equal(cleanup.body.workerNonceMaintenancePolicy.manualCleanupSupported, true);
  assert.equal(
    state.workerRequestNonces.some((record) => record.id === "nonce-cleanup-expired-001"),
    false,
  );
  assert.equal(state.workerRequestNonces[0].id, "nonce-cleanup-active-001");

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(
    auditLog.body.items.some(
      (event) =>
        event.eventType === "scheduler.worker_nonce.cleanup" &&
        event.metadata.prunedNonces === 1,
    ),
  );
});

test("scheduler queue endpoints enqueue and report retry alerts", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const unauthorizedQueue = await requestMock("/api/scheduler/queue", {}, state);
  assert.equal(unauthorizedQueue.status, 401);

  const initialQueue = await requestMock("/api/scheduler/queue", { headers: auth }, state);
  assert.equal(initialQueue.status, 200);
  assert.equal(initialQueue.body.status, "empty");
  assert.equal(initialQueue.body.summary.total, 0);

  const enqueue = await requestMock(
    "/api/scheduler/enqueue",
    {
      method: "POST",
      headers: auth,
      body: {
        jobType: "reminderEvaluation",
        priority: 8,
        payload: { source: "api-test" },
      },
    },
    state,
  );
  assert.equal(enqueue.status, 200);
  assert.equal(enqueue.body.queuedJob.jobType, "reminderEvaluation");
  assert.equal(enqueue.body.queuedJob.status, "queued");
  assert.equal(enqueue.body.queuedJob.priority, 8);
  assert.equal(enqueue.body.queueState.summary.queued, 1);
  assert.equal(enqueue.body.queueState.summary.due, 1);
  assert.ok(
    enqueue.body.queueState.alerts.some(
      (alert) => alert.code === "due-jobs-without-active-worker",
    ),
  );

  const queue = await requestMock("/api/scheduler/queue", { headers: auth }, state);
  assert.equal(queue.status, 200);
  assert.equal(queue.body.items[0].id, enqueue.body.queuedJob.id);
  assert.equal(queue.body.items[0].payload.source, "api-test");

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(
    auditLog.body.items.some((event) => event.eventType === "scheduler.queue.enqueue"),
  );
});

test("scheduler process-queue endpoint drains due queued jobs", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };

  const unauthorized = await requestMock("/api/scheduler/process-queue", { method: "POST" }, state);
  assert.equal(unauthorized.status, 401);

  const enqueue = await requestMock(
    "/api/scheduler/enqueue",
    {
      method: "POST",
      headers: auth,
      body: {
        jobType: "reminderEvaluation",
        priority: 6,
        payload: { source: "process-test" },
      },
    },
    state,
  );
  assert.equal(enqueue.status, 200);

  const processed = await requestMock(
    "/api/scheduler/process-queue",
    {
      method: "POST",
      headers: auth,
      body: { workerId: "worker-process-api", limit: 5 },
    },
    state,
  );
  assert.equal(processed.status, 200);
  assert.equal(processed.body.queueRun.status, "success");
  assert.equal(processed.body.queueRun.completedJobs, 1);
  assert.equal(processed.body.processedJobs[0].status, "completed");
  assert.equal(processed.body.queueState.summary.completed, 1);
  assert.equal(processed.body.queueState.items[0].status, "completed");

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(
    auditLog.body.items.some((event) => event.eventType === "scheduler.queue.process"),
  );
});

test("mock scheduler process-queue retries then dead-letters failed jobs", () => {
  const state = createMockState({
    queuedJobs: [
      {
        id: "queued-direct-retry",
        userId: "demo-user",
        jobType: "reminderEvaluation",
        status: "queued",
        priority: 5,
        attempts: 0,
        maxAttempts: 3,
        scheduledFor: "2026-06-01T00:00:00.000Z",
        payload: { source: "retry-case" },
      },
      {
        id: "queued-direct-dlq",
        userId: "demo-user",
        jobType: "reminderEvaluation",
        status: "queued",
        priority: 4,
        attempts: 2,
        maxAttempts: 3,
        scheduledFor: "2026-06-01T00:00:00.000Z",
        payload: { source: "dlq-case" },
      },
    ],
  });
  const repository = createMockRepository(state);
  const user = { id: "demo-user", displayName: "样例用户" };
  const runner = {
    supports(type) {
      return type === "reminderEvaluation";
    },
    runJob() {
      return {
        ok: false,
        error: { code: "WORKER_FAILED", message: "样例队列 worker 失败。" },
      };
    },
  };
  const scheduler = createMockSchedulerService({ jobRunner: runner });

  const result = scheduler.processQueuedJobs(repository, user, {
    requestedBy: "test",
    workerId: "failing-worker",
    limit: 2,
  });

  assert.equal(result.queueRun.status, "partial");
  assert.equal(result.queueRun.retryScheduledJobs, 1);
  assert.equal(result.queueRun.failedJobs, 1);
  assert.equal(repository.findQueuedJob(user.id, "queued-direct-retry").status, "retrying");
  assert.ok(repository.findQueuedJob(user.id, "queued-direct-retry").nextRetryAt);
  assert.equal(repository.findQueuedJob(user.id, "queued-direct-dlq").status, "failed");
  assert.equal(repository.listDeadLetterJobs(user.id)[0].scheduleId, "queued-direct-dlq");
  assert.ok(
    repository
      .listAuditEvents(user.id)
      .some((event) => event.eventType === "scheduler.queue.process"),
  );
});

test("mock scheduler service centralizes due-job checks", () => {
  const state = createMockState();
  const repository = createMockRepository(state);
  const notificationService = createMockNotificationService();
  const runner = createMockReminderJobRunner({
    dataProvider: createMockProvider(),
    notificationService,
  });
  const scheduler = createMockSchedulerService({ jobRunner: runner });
  const user = { id: "demo-user", displayName: "样例用户" };

  repository.addReminder({
    id: repository.nextReminderId(),
    userId: user.id,
    code: "AAPL",
    type: "priceBelow",
    threshold: "210",
    channels: ["inApp"],
    createdAt: "2026-06-01T00:00:00.000Z",
  });

  assert.equal(scheduler.status().schedules[0].jobType, "reminderEvaluation");

  const result = scheduler.runDueJobs(repository, user, { requestedBy: "test" });
  assert.equal(result.schedulerRun.status, "success");
  assert.equal(result.schedulerRun.requestedBy, "test");
  assert.equal(result.jobs.length, 1);
  assert.equal(result.idempotency.status, "accepted");
  assert.equal(repository.listJobRuns(user.id)[0].type, "reminderEvaluation");
  assert.ok(
    repository.listAuditEvents(user.id).some((event) => event.eventType === "scheduler.run_due"),
  );

  const cooldown = scheduler.runDueJobs(repository, user, { requestedBy: "test" });
  assert.equal(cooldown.schedulerRun.status, "skipped");
  assert.equal(cooldown.schedulerRun.skipReason, "cooldown-active");
  assert.equal(cooldown.jobs.length, 0);
});

test("mock scheduler service reports stale and critical worker telemetry", () => {
  const state = createMockState({
    workerHeartbeats: [
      {
        id: "heartbeat-old",
        userId: "demo-user",
        workerId: "old-worker",
        jobTypes: ["reminderEvaluation"],
        status: "healthy",
        queueDepth: 0,
        queueLagMs: 0,
        lastSeenAt: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  });
  const repository = createMockRepository(state);
  const runner = createMockReminderJobRunner({
    dataProvider: createMockProvider(),
    notificationService: createMockNotificationService(),
  });
  const scheduler = createMockSchedulerService({ jobRunner: runner });
  const user = { id: "demo-user", displayName: "样例用户" };

  const staleHealth = scheduler.workerHealth(repository, user);
  assert.equal(staleHealth.status, "degraded");
  assert.equal(staleHealth.staleWorkerCount, 1);

  const critical = scheduler.recordWorkerHeartbeat(repository, user, {
    workerId: "critical-worker",
    jobTypes: ["reminderEvaluation"],
    queueDepth: 120,
    queueLagMs: 901000,
  });
  assert.equal(critical.heartbeat.status, "critical");
  assert.equal(critical.workerHealth.status, "critical");
  assert.equal(critical.workerHealth.queue.status, "critical");
  assert.ok(
    repository
      .listAuditEvents(user.id)
      .some((event) => event.eventType === "scheduler.worker_heartbeat"),
  );
});

test("mock scheduler service captures failed due jobs in the dead-letter queue", () => {
  const state = createMockState();
  const repository = createMockRepository(state);
  const user = { id: "demo-user", displayName: "样例用户" };
  let shouldFail = true;
  const runner = {
    supports(type) {
      return type === "reminderEvaluation";
    },
    runJob(repo, activeUser, type) {
      if (shouldFail) {
        return {
          ok: false,
          error: { code: "WORKER_FAILED", message: "样例 worker 执行失败。" },
        };
      }
      const jobRun = repo.saveJobRun({
        id: `job-test-${Date.now()}`,
        userId: activeUser.id,
        type,
        status: "success",
        startedAt: "2026-06-01T00:00:00.000Z",
        finishedAt: "2026-06-01T00:00:01.000Z",
        summary: { checked: 0, triggeredCount: 0 },
      });
      return { ok: true, jobRun, result: { checked: 0, triggeredCount: 0, items: [] } };
    },
  };
  const scheduler = createMockSchedulerService({ jobRunner: runner });

  const failed = scheduler.runDueJobs(repository, user, {
    requestedBy: "test",
    idempotencyKey: "dlq-service-001",
  });
  assert.equal(failed.schedulerRun.status, "partial");
  assert.equal(failed.errors[0].code, "WORKER_FAILED");
  assert.match(failed.errors[0].deadLetterJobId, /^dlq-/);
  assert.equal(failed.deadLetterQueue.open, 1);
  const deadLetterJob = repository.listDeadLetterJobs(user.id)[0];
  assert.equal(deadLetterJob.status, "open");
  assert.equal(deadLetterJob.attempts, 1);

  shouldFail = false;
  const replay = scheduler.replayDeadLetterJob(repository, user, deadLetterJob.id);
  assert.equal(replay.ok, true);
  assert.equal(replay.deadLetterJob.status, "replayed");
  assert.equal(replay.deadLetterJob.attempts, 2);
  assert.equal(replay.deadLetterQueue.replayed, 1);
  assert.ok(
    repository
      .listAuditEvents(user.id)
      .some((event) => event.eventType === "scheduler.dead_letter.replay"),
  );
});

test("portfolio endpoint upserts optional fields and lists user positions", async () => {
  const state = createMockState();
  const auth = { authorization: "Bearer demo-token" };
  const saved = await requestMock(
    "/api/portfolio",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        buyPrice: "100",
        holdingQty: "10",
        buyDate: "",
        targetReturn: "",
        maxLoss: "",
      },
    },
    state,
  );

  assert.equal(saved.status, 200);
  assert.equal(saved.body.saved.code, "AAPL");
  assert.equal(saved.body.localSummary.cost, 1000);
  assert.equal(saved.body.localSummary.sampleReturnPct, 96);
  assert.match(saved.body.localSummary.disclaimer, /不代表真实行情/);

  const updated = await requestMock(
    "/api/portfolio",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        buyPrice: "110",
        holdingQty: "9",
        buyDate: "",
        targetReturn: "12",
        maxLoss: "5",
      },
    },
    state,
  );
  assert.equal(updated.status, 200);
  assert.equal(state.portfolio.length, 1);
  assert.equal(state.portfolio[0].buyPrice, "110");
  assert.equal(state.portfolio[0].updatedAt, state.portfolio[0].savedAt);

  const list = await requestMock("/api/portfolio", { headers: auth }, state);
  assert.equal(list.status, 200);
  assert.deepEqual(
    list.body.items.map((entry) => [entry.code, entry.buyPrice, entry.targetReturn]),
    [["AAPL", "110", "12"]],
  );

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, state);
  assert.ok(auditLog.body.items.some((event) => event.eventType === "portfolio.upsert"));
});

test("file-backed state persists user data and safe audit events", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "finance-ai-assistant-"));
  const dataFile = join(dataDir, "mock-state.json");
  const auth = { authorization: "Bearer demo-token" };
  const state = await loadStateFromFile(dataFile);

  await requestMock(
    "/api/watchlist",
    {
      method: "POST",
      headers: auth,
      body: { code: "AAPL" },
    },
    state,
  );
  const reminder = await requestMock(
    "/api/reminders",
    {
      method: "POST",
      headers: auth,
      body: {
        code: "AAPL",
        type: "priceAbove",
        threshold: "210",
        channels: ["inApp"],
      },
    },
    state,
  );
  await requestMock("/api/portfolio", {
    method: "POST",
    headers: auth,
    body: {
      code: "AAPL",
      buyPrice: "100",
      holdingQty: "10",
      buyDate: "",
      targetReturn: "",
      maxLoss: "",
    },
  }, state);
  await requestMock(
    "/api/preferences",
    {
      method: "POST",
      headers: auth,
      body: {
        riskProfile: "conservative",
        notifications: { inApp: true, telegram: true },
      },
    },
    state,
  );
  const analysis = await requestMock("/api/analysis?symbol=AAPL&riskProfile=balanced", {}, state);
  const historyRecord = await requestMock(
    "/api/analysis/history",
    {
      method: "POST",
      headers: auth,
      body: analysis.body,
    },
    state,
  );

  const rawPersisted = JSON.parse(await readFile(dataFile, "utf8"));
  assert.deepEqual(rawPersisted.watchlist, ["AAPL"]);
  assert.deepEqual(rawPersisted.watchlists["demo-user"], ["AAPL"]);
  assert.equal(rawPersisted.reminders[0].id, reminder.body.saved.id);
  assert.equal(rawPersisted.analysisHistory[0].id, historyRecord.body.saved.id);
  assert.deepEqual(rawPersisted.notificationOutbox, []);
  assert.equal(rawPersisted.preferences["demo-user"].riskProfile, "conservative");
  assert.deepEqual(rawPersisted.preferences["demo-user"].notifications, {
    inApp: true,
    telegram: true,
  });
  assert.deepEqual(rawPersisted.jobRuns, []);
  assert.ok(rawPersisted.auditLogs.length >= 3);

  const reloadedState = await loadStateFromFile(dataFile);
  const watchlist = await requestMock("/api/watchlist", { headers: auth }, reloadedState);
  assert.equal(watchlist.body.items[0].code, "AAPL");

  const reminders = await requestMock("/api/reminders", { headers: auth }, reloadedState);
  assert.equal(reminders.body.items[0].id, reminder.body.saved.id);

  const auditLog = await requestMock("/api/audit-log", { headers: auth }, reloadedState);
  assert.equal(auditLog.status, 200);
  assert.ok(auditLog.body.items.some((event) => event.eventType === "portfolio.upsert"));
  assert.ok(auditLog.body.items.some((event) => event.eventType === "preferences.save"));
  assert.ok(auditLog.body.items.some((event) => event.eventType === "analysis.history.save"));
  const portfolioAudit = auditLog.body.items.find((event) => event.eventType === "portfolio.upsert");
  assert.deepEqual(portfolioAudit.metadata, { code: "AAPL", filledFields: 2 });
});
