import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/render-health-warmup.yml", "utf8");
const docs = readFileSync("docs/technical/RENDER_WARMUP.md", "utf8");

test("Render warmup workflow schedules health checks without committing to main", () => {
  assert.match(workflow, /cron: "\*\/10 \* \* \* \*"/);
  assert.match(workflow, /RENDER_URL: https:\/\/finance-ai-assistant-web\.onrender\.com/);
  assert.match(workflow, /STATUS_BRANCH: render-health-status/);
  assert.match(workflow, /render-health-status-check\.mjs/);
  assert.match(workflow, /continue-on-error: true/);
  assert.match(workflow, /RENDER_HEALTH_DURATION_MS: "180000"/);
  assert.match(workflow, /render-health\.json/);
  assert.match(workflow, /git push origin "HEAD:\$STATUS_BRANCH"/);
  assert.doesNotMatch(workflow, /git push origin (HEAD:)?main/);
});

test("Render warmup documentation points to the public status branch", () => {
  assert.match(docs, /render-health-status/);
  assert.match(docs, /render-health\.json/);
  assert.match(docs, /避免每次状态更新都触发 Render 重新部署/);
  assert.match(docs, /manual warmup remains recommended/i);
});
