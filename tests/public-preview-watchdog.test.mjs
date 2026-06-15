import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  buildPublicPreviewAccessCardHtml,
  parsePublicPreviewTunnelUrl,
  parsePublicPreviewWatchdogCliArgs,
  runPublicPreviewWatchdog,
} from "../scripts/public-preview-watchdog.mjs";

function createFakeTunnel(publicUrl) {
  const tunnel = new EventEmitter();
  tunnel.stdout = new EventEmitter();
  tunnel.stderr = new EventEmitter();
  tunnel.killed = false;
  tunnel.kill = () => {
    tunnel.killed = true;
    tunnel.emit("exit", 0, "SIGTERM");
  };
  queueMicrotask(() => {
    tunnel.stderr.emit("data", `tunneled with tls termination, ${publicUrl}\n`);
  });
  return tunnel;
}

test("public preview watchdog extracts localhost.run public URL", () => {
  assert.equal(
    parsePublicPreviewTunnelUrl("connect ready: https://abc123.lhr.life is available"),
    "https://abc123.lhr.life",
  );
  assert.equal(parsePublicPreviewTunnelUrl("no tunnel here :("), "");
});

test("public preview watchdog CLI parser keeps boolean flags from consuming next option", () => {
  const parsed = parsePublicPreviewWatchdogCliArgs([
    "--once",
    "--health-window-ms",
    "1000",
    "--health-interval-ms=500",
  ]);

  assert.equal(parsed.once, true);
  assert.equal(parsed.healthWindowMs, "1000");
  assert.equal(parsed.healthIntervalMs, "500");
  assert.equal(parsed.healthMaxConsecutiveFailures, 2);
  assert.equal(parsed.standbyTunnelCount, 2);
  assert.match(parsed.accessCardFile, /public-preview-latest\.html$/);
});

test("public preview watchdog CLI parser allows disabling default standby tunnels", () => {
  const parsed = parsePublicPreviewWatchdogCliArgs(["--standby-count", "0"]);

  assert.equal(parsed.standbyTunnelCount, "0");
});

test("public preview watchdog access card lists latest links without secrets", () => {
  const html = buildPublicPreviewAccessCardHtml({
    status: "healthy",
    publicUrl: "https://primary.lhr.life",
    localFallbackUrl: "http://127.0.0.1:4192",
    updatedAt: "2026-06-14T10:00:00.000Z",
    healthWindowMs: 180000,
    healthIterationCount: 10,
    standbyPromotionCount: 2,
    guidance: "主入口健康。",
    standbyPublicUrls: [
      {
        url: "https://standby.lhr.life",
        status: "healthy",
        guidance: "备用健康。",
      },
    ],
  });

  assert.match(html, /当前访问入口/);
  assert.match(html, /https:\/\/primary\.lhr\.life/);
  assert.match(html, /https:\/\/standby\.lhr\.life/);
  assert.match(html, /http:\/\/127\.0\.0\.1:4192/);
  assert.match(html, /no tunnel here/);
  assert.doesNotMatch(html, /sk-proj|sk-or-v1|gsk_|AQ\./);
});

test("public preview watchdog restarts tunnel after public health failure", async () => {
  const urls = ["https://first.lhr.life", "https://second.lhr.life"];
  const tunnels = [];
  const started = [];
  const killed = [];
  const statusWrites = [];
  const healthCalls = [];

  const result = await runPublicPreviewWatchdog({
    once: true,
    maxRestarts: 2,
    tunnelTimeoutMs: 1000,
    restartBackoffMs: 1,
    healthWindowMs: 1,
    healthIntervalMs: 1,
    healthTimeoutMs: 1,
    standbyTunnelCount: 0,
    statusFile: "/private/tmp/test-finance-ai-public-preview-status.json",
    startTunnel() {
      const tunnel = createFakeTunnel(urls[started.length]);
      tunnels.push(tunnel);
      started.push(tunnel);
      tunnel.on("exit", () => killed.push(tunnel));
      return tunnel;
    },
    async healthCheck({ publicUrl, maxConsecutiveFailures, alwaysCheckLocalFallback }) {
      healthCalls.push({ publicUrl, maxConsecutiveFailures, alwaysCheckLocalFallback });
      if (publicUrl.includes("first")) {
        return {
          ok: false,
          publicUrl,
          localFallbackUrl: "http://127.0.0.1:4192",
          iterationCount: 1,
          lastFailure: {
            failed: [{ path: "/health", status: 503 }],
            consecutiveFailures: 1,
          },
          guidance: "公网预览不稳定或已断开。本机备用地址可用：http://127.0.0.1:4192",
        };
      }
      return {
        ok: true,
        publicUrl,
        localFallbackUrl: "http://127.0.0.1:4192",
        iterationCount: 1,
        lastFailure: null,
        localFallback: { ok: true, status: 200 },
        guidance: "公网预览在监控窗口内持续可用。",
      };
    },
    sleep: async () => {},
    writeFile(filePath, content) {
      statusWrites.push({ filePath, content: JSON.parse(content) });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.publicUrl, "https://second.lhr.life");
  assert.deepEqual(healthCalls, [
    { publicUrl: "https://first.lhr.life", maxConsecutiveFailures: 2, alwaysCheckLocalFallback: true },
    { publicUrl: "https://second.lhr.life", maxConsecutiveFailures: 2, alwaysCheckLocalFallback: true },
  ]);
  assert.equal(started.length, 2);
  assert.equal(killed.length, 2);
  assert.equal(tunnels[0].killed, true);
  assert.equal(tunnels[1].killed, true);
  assert.equal(statusWrites.at(-1).content.status, "healthy");
  assert.equal(statusWrites.at(-1).content.publicUrl, "https://second.lhr.life");
  assert.equal(statusWrites.at(-1).content.healthMaxConsecutiveFailures, 2);
  assert.equal(statusWrites.at(-1).content.localFallbackOk, true);
  const checkingStatus = statusWrites.find((write) => write.content.status === "checking");
  assert.ok(checkingStatus);
  assert.equal(checkingStatus.content.publicUrl, "https://first.lhr.life");
  assert.deepEqual(checkingStatus.content.healthRequiredEndpoints, [
    "/",
    "/api/health",
    "/api/analysis?symbol=MSFT&riskProfile=balanced",
    "/api/stocks/search?q=%E8%85%BE%E8%AE%AF%E6%8E%A7%E8%82%A1",
    "/api/ai-services",
  ]);
  assert.match(checkingStatus.content.guidance, /连续健康检查/);
});

test("public preview watchdog starts two standby tunnels by default", async () => {
  const urls = ["https://primary.lhr.life", "https://standby-a.lhr.life", "https://standby-b.lhr.life"];
  const started = [];
  const healthCalls = [];
  const statusWrites = [];

  const result = await runPublicPreviewWatchdog({
    once: true,
    maxRestarts: 0,
    tunnelTimeoutMs: 1000,
    healthWindowMs: 1,
    standbyHealthWindowMs: 1,
    healthIntervalMs: 1,
    healthTimeoutMs: 1,
    statusFile: "/private/tmp/test-finance-ai-public-preview-default-standby-status.json",
    startTunnel() {
      const tunnel = createFakeTunnel(urls[started.length]);
      started.push(tunnel);
      return tunnel;
    },
    async healthCheck({ publicUrl }) {
      healthCalls.push(publicUrl);
      return {
        ok: true,
        publicUrl,
        checkedEndpoints: ["/health"],
        iterationCount: 1,
        startedAt: "2026-06-14T10:00:00.000Z",
        endedAt: "2026-06-14T10:00:01.000Z",
        lastFailure: null,
        localFallback: { ok: true, status: 200 },
        guidance: "healthy",
      };
    },
    sleep: async () => {},
    writeFile(filePath, content) {
      statusWrites.push({ filePath, content: JSON.parse(content) });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.publicUrl, "https://primary.lhr.life");
  assert.equal(started.length, 3);
  assert.deepEqual(healthCalls, urls);
  assert.deepEqual(
    statusWrites.at(-1).content.standbyPublicUrls.map((entry) => [entry.url, entry.status]),
    [
      ["https://standby-a.lhr.life", "healthy"],
      ["https://standby-b.lhr.life", "healthy"],
    ],
  );
});

test("public preview watchdog promotes healthy standby tunnel when primary fails", async () => {
  const urls = ["https://primary.lhr.life", "https://standby.lhr.life", "https://replacement.lhr.life"];
  const started = [];
  const statusWrites = [];
  const events = [];
  const healthCalls = [];

  const result = await runPublicPreviewWatchdog({
    once: true,
    standbyTunnelCount: 1,
    maxRestarts: 1,
    tunnelTimeoutMs: 1000,
    restartBackoffMs: 1,
    healthWindowMs: 1,
    standbyHealthWindowMs: 1,
    healthIntervalMs: 1,
    healthTimeoutMs: 1,
    statusFile: "/private/tmp/test-finance-ai-public-preview-standby-status.json",
    startTunnel() {
      const tunnel = createFakeTunnel(urls[started.length]);
      started.push(tunnel);
      return tunnel;
    },
    async healthCheck({ publicUrl }) {
      healthCalls.push(publicUrl);
      if (publicUrl.includes("primary")) {
        return {
          ok: false,
          publicUrl,
          checkedEndpoints: ["/health"],
          iterationCount: 1,
          startedAt: "2026-06-14T10:00:00.000Z",
          endedAt: "2026-06-14T10:00:01.000Z",
          lastFailure: {
            failureType: "tunnel-503",
            failed: [{ path: "/health", status: 503 }],
            consecutiveFailures: 2,
          },
          localFallback: { ok: true, status: 200 },
          guidance: "primary failed",
        };
      }
      return {
        ok: true,
        publicUrl,
        checkedEndpoints: ["/health"],
        iterationCount: 1,
        startedAt: "2026-06-14T10:00:01.000Z",
        endedAt: "2026-06-14T10:00:02.000Z",
        lastFailure: null,
        localFallback: { ok: true, status: 200 },
        guidance: "standby healthy",
      };
    },
    sleep: async () => {},
    writeFile(filePath, content) {
      statusWrites.push({ filePath, content: JSON.parse(content) });
    },
    onEvent(event) {
      events.push(event);
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.publicUrl, "https://standby.lhr.life");
  assert.equal(result.standbyPromotionCount, 1);
  assert.deepEqual(healthCalls, ["https://primary.lhr.life", "https://standby.lhr.life"]);
  assert.equal(started.length, 3);
  assert.ok(events.some((event) => event.type === "standby-promoted"));
  const promotedStatus = statusWrites.at(-1).content;
  assert.equal(promotedStatus.publicUrl, "https://standby.lhr.life");
  assert.equal(promotedStatus.standbyPromotionCount, 1);
  assert.equal(promotedStatus.status, "healthy");
  assert.equal(promotedStatus.healthWindowMs, 1);
  assert.equal(promotedStatus.lastFailure.failureType, "tunnel-503");
  assert.deepEqual(
    promotedStatus.standbyPublicUrls.map((entry) => [entry.url, entry.status]),
    [["https://replacement.lhr.life", "ready"]],
  );
});

test("public preview watchdog rebuilds unhealthy standby while primary stays healthy", async () => {
  const urls = ["https://primary.lhr.life", "https://bad-standby.lhr.life", "https://fresh-standby.lhr.life"];
  const started = [];
  const statusWrites = [];
  const events = [];

  const result = await runPublicPreviewWatchdog({
    once: true,
    standbyTunnelCount: 1,
    maxRestarts: 0,
    tunnelTimeoutMs: 1000,
    healthWindowMs: 1,
    standbyHealthWindowMs: 1,
    healthIntervalMs: 1,
    healthTimeoutMs: 1,
    statusFile: "/private/tmp/test-finance-ai-public-preview-standby-rebuild-status.json",
    startTunnel() {
      const tunnel = createFakeTunnel(urls[started.length]);
      started.push(tunnel);
      return tunnel;
    },
    async healthCheck({ publicUrl }) {
      if (publicUrl.includes("bad-standby")) {
        return {
          ok: false,
          publicUrl,
          checkedEndpoints: ["/health"],
          iterationCount: 1,
          startedAt: "2026-06-14T10:00:01.000Z",
          endedAt: "2026-06-14T10:00:02.000Z",
          lastFailure: { failureType: "timeout", failed: [{ path: "/health", status: 0 }] },
          localFallback: { ok: true, status: 200 },
          guidance: "standby timeout",
        };
      }
      return {
        ok: true,
        publicUrl,
        checkedEndpoints: ["/health"],
        iterationCount: 1,
        startedAt: "2026-06-14T10:00:00.000Z",
        endedAt: "2026-06-14T10:00:01.000Z",
        lastFailure: null,
        localFallback: { ok: true, status: 200 },
        guidance: "healthy",
      };
    },
    sleep: async () => {},
    writeFile(filePath, content) {
      statusWrites.push({ filePath, content: JSON.parse(content) });
    },
    onEvent(event) {
      events.push(event);
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.publicUrl, "https://primary.lhr.life");
  assert.equal(started.length, 3);
  assert.ok(events.some((event) => event.type === "standby-replacing"));
  assert.deepEqual(
    statusWrites.at(-1).content.standbyPublicUrls.map((entry) => [entry.url, entry.status]),
    [["https://fresh-standby.lhr.life", "ready"]],
  );
});

test("public preview watchdog preserves completed healthy evidence during the next checking cycle", async () => {
  const started = [];
  const statusWrites = [];

  await runPublicPreviewWatchdog({
    once: false,
    maxRestarts: 0,
    maxHealthCycles: 2,
    tunnelTimeoutMs: 1000,
    healthWindowMs: 180000,
    healthIntervalMs: 15000,
    healthTimeoutMs: 15000,
    standbyTunnelCount: 0,
    statusFile: "/private/tmp/test-finance-ai-public-preview-checking-evidence.json",
    startTunnel() {
      const tunnel = createFakeTunnel("https://evidence.lhr.life");
      started.push(tunnel);
      return tunnel;
    },
    async healthCheck() {
      return {
        ok: true,
        publicUrl: "https://evidence.lhr.life",
        checkedEndpoints: [
          "/",
          "/api/health",
          "/api/analysis?symbol=MSFT&riskProfile=balanced",
          "/api/stocks/search?q=%E8%85%BE%E8%AE%AF%E6%8E%A7%E8%82%A1",
          "/api/ai-services",
        ],
        iterationCount: 8,
        startedAt: "2026-06-14T10:00:00.000Z",
        endedAt: "2026-06-14T10:03:00.000Z",
        lastFailure: null,
        transientFailureCount: 0,
        transientFailures: [],
        localFallback: { ok: true, status: 200 },
        guidance: "healthy",
      };
    },
    sleep: async () => {},
    writeFile(filePath, content) {
      statusWrites.push({ filePath, content: JSON.parse(content) });
    },
  });

  const secondCheckingStatus = statusWrites.filter((write) => write.content.status === "checking").at(-1).content;
  assert.equal(secondCheckingStatus.healthCycleCount, 2);
  assert.equal(secondCheckingStatus.healthIterationCount, 8);
  assert.equal(secondCheckingStatus.healthEndedAt, "2026-06-14T10:03:00.000Z");
  assert.ok(secondCheckingStatus.activeHealthStartedAt);
  assert.equal(secondCheckingStatus.localFallbackOk, true);
  assert.match(secondCheckingStatus.guidance, /上一轮/);
});
