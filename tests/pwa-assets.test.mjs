import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const serviceWorker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

test("webpage declares installable PWA manifest and theme metadata", () => {
  assert.match(indexHtml, /<link rel="manifest" href="\.\/manifest\.json"/);
  assert.match(indexHtml, /<meta name="theme-color" content="#0f6b5f"/);
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./index.html");
  assert.equal(manifest.theme_color, "#0f6b5f");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
});

test("initial shell does not hardcode sample analysis metrics", () => {
  assert.match(indexHtml, /id="impactBadge"[^>]*>等待AI/);
  assert.match(indexHtml, /id="upsideRing" style="--score: 0"/);
  assert.match(indexHtml, /id="upsideValue" data-metric-state="pending">待AI模型/);
  assert.match(indexHtml, /id="downsideValue" data-metric-state="pending">待AI模型/);
  assert.match(indexHtml, /id="sentimentScore" data-metric-state="pending">待AI模型/);
  assert.match(indexHtml, /id="valuationScore" data-metric-state="pending">待AI模型/);
  assert.match(indexHtml, /id="technicalScore" data-metric-state="pending">待AI模型/);
  assert.match(indexHtml, /id="confidenceScore" data-metric-state="pending">待AI模型/);
  assert.match(indexHtml, /id="actionText">等待真实 AI 模型生成。/);
  assert.match(indexHtml, /data-term="upsideProbability"/);
  assert.match(indexHtml, /data-term="downsideProbability"/);
  assert.match(indexHtml, /aria-label="查看上涨参考概率解释"[^>]*>i<\/button>/);
  assert.match(indexHtml, /aria-label="查看下跌风险概率解释"[^>]*>i<\/button>/);
  assert.match(indexHtml, /aria-label="查看市场情绪解释"[^>]*>i<\/button>/);
  assert.match(indexHtml, /aria-label="查看估值吸引力解释"[^>]*>i<\/button>/);
  assert.match(indexHtml, /aria-label="查看技术面强弱解释"[^>]*>i<\/button>/);
  assert.match(indexHtml, /aria-label="查看分析置信度解释"[^>]*>i<\/button>/);
  assert.doesNotMatch(indexHtml, /class="term-button"[^>]*>\?<\/button>/);
  assert.doesNotMatch(indexHtml, /id="upsideRing" style="--score: 64"/);
  assert.doesNotMatch(indexHtml, /id="upsideValue">64%/);
  assert.doesNotMatch(indexHtml, /id="sentimentScore">72\/100/);
  assert.doesNotMatch(indexHtml, /谨慎持有，等待成交量确认后再考虑加仓/);
  assert.doesNotMatch(indexHtml, /本机样例行情|样例走势图|2-8 周样例|1-6 周样例|4-12 周样例/);
  assert.doesNotMatch(indexHtml, /1418|1436|1452|1461|1474|1488/);
});

test("service worker precaches core shell and supports offline navigation fallback", () => {
  assert.match(serviceWorker, /finance-ai-assistant-v145/);
  for (const asset of ["./index.html", "./styles.css", "./app.js", "./manifest.json"]) {
    assert.match(serviceWorker, new RegExp(asset.replace(/[./]/g, "\\$&")));
  }
  assert.match(serviceWorker, /NAVIGATION_FALLBACK_URL = "\.\/index\.html"/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /networkFirstNavigation\(request\)/);
  assert.match(serviceWorker, /caches\.match\(NAVIGATION_FALLBACK_URL\)/);
});

test("service worker avoids caching backend APIs and runtime-caches static assets", () => {
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /url\.pathname === "\/health"/);
  assert.match(serviceWorker, /event\.respondWith\(fetch\(request\)\)/);
  assert.match(serviceWorker, /STATIC_ASSET_PATTERN/);
  assert.match(serviceWorker, /staleWhileRevalidate\(request\)/);
  assert.match(serviceWorker, /RUNTIME_CACHE_NAME/);
});

test("service worker fetches app shell assets from network first to avoid stale releases", () => {
  assert.match(serviceWorker, /APP_SHELL_ASSET_PATTERN/);
  assert.match(serviceWorker, /\/\(\?:app\\\.js\|styles\\\.css\|manifest\\\.json\)\$/);
  assert.match(serviceWorker, /async function networkFirstAsset\(request\)/);
  assert.match(serviceWorker, /APP_SHELL_ASSET_PATTERN\.test\(url\.pathname\)/);
  assert.match(serviceWorker, /event\.respondWith\(networkFirstAsset\(request\)\)/);
});
