import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

import { runPublicPreviewSupervisor } from "../scripts/public-preview-supervisor.mjs";

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new Readable({ read() {} });
  child.stderr = new Readable({ read() {} });
  child.killed = false;
  child.kill = () => {
    child.killed = true;
  };
  return child;
}

test("public preview supervisor starts local server before watchdog when local health is down", async () => {
  let localHealthCalls = 0;
  let localStartCount = 0;
  let watchdogCalled = false;

  const result = await runPublicPreviewSupervisor({
    once: true,
    localHealthTimeoutMs: 20,
    localHealthIntervalMs: 1,
    sleep: async () => {},
    fetchImpl: async () => {
      localHealthCalls += 1;
      return { status: localHealthCalls >= 2 ? 200 : 0 };
    },
    startLocalServer: () => {
      localStartCount += 1;
      return fakeChild();
    },
    watchdog: async (options) => {
      watchdogCalled = true;
      assert.equal(options.localFallbackUrl, "http://127.0.0.1:4192");
      assert.equal(options.standbyTunnelCount, 2);
      return {
        ok: true,
        publicUrl: "https://demo.lhr.life",
        restartCount: 0,
        healthCycleCount: 1,
        events: [],
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(watchdogCalled, true);
  assert.equal(localStartCount, 1);
  assert.equal(result.localRestartCount, 1);
  assert.ok(result.events.some((event) => event.type === "local-server-ready"));
});

test("public preview supervisor restarts local server from watchdog health wrapper", async () => {
  let localHealthCalls = 0;
  let localStartCount = 0;
  const result = await runPublicPreviewSupervisor({
    once: true,
    standbyTunnelCount: 0,
    localHealthTimeoutMs: 20,
    localHealthIntervalMs: 1,
    sleep: async () => {},
    fetchImpl: async () => {
      localHealthCalls += 1;
      return { status: localHealthCalls === 1 || localHealthCalls >= 4 ? 200 : 0 };
    },
    startLocalServer: () => {
      localStartCount += 1;
      return fakeChild();
    },
    publicHealthCheck: async () => ({
      ok: false,
      localFallback: { ok: false },
      guidance: "local fallback failed",
    }),
    watchdog: async (options) => {
      assert.equal(options.standbyTunnelCount, 0);
      const healthResult = await options.healthCheck({
        publicUrl: "https://demo.lhr.life",
        localFallbackUrl: "http://127.0.0.1:4192",
      });
      return {
        ok: healthResult.ok,
        publicUrl: "https://demo.lhr.life",
        restartCount: 1,
        healthCycleCount: 1,
        events: [],
      };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(localStartCount, 1);
  assert.equal(result.localRestartCount, 1);
  assert.ok(result.events.some((event) => event.type === "local-server-ready"));
});
