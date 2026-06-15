# Render 冷启动预热 / Render Cold-Start Warmup

## 目的 / Purpose

Render 免费服务可能在无人访问后进入休眠。第一次打开时用户会先看到 Render loading 页面，等服务启动后才进入网页。

Free Render services can sleep after inactivity. The first visitor may see Render's loading page before the app is ready.

## 免费处理方案 / Free Mitigation

1. 演示前手动打开固定网址，等首页加载完成后再发给别人。
2. GitHub Actions 每 10 分钟请求固定 Render 网址，尽量保持服务处于热状态。
3. 最近一次健康检查会发布到独立分支 `render-health-status`，避免每次状态更新都触发 Render 重新部署。

1. Before a demo, manually open the fixed URL and wait until the homepage fully loads before sharing it.
2. GitHub Actions requests the fixed Render URL every 10 minutes to keep the service warm when possible.
3. The latest health status is published to a separate `render-health-status` branch so status updates do not trigger Render redeploys.

## 文件 / Files

- Workflow: `.github/workflows/render-health-warmup.yml`
- JSON status: `https://raw.githubusercontent.com/heyuqing248-max/finance-ai-assistant/render-health-status/render-health.json`
- HTML status file: `https://raw.githubusercontent.com/heyuqing248-max/finance-ai-assistant/render-health-status/index.html`
- 如果以后启用 GitHub Pages，可以把 `render-health-status` 分支作为 Pages 来源，这样 HTML 状态页会更适合普通用户打开。
- If GitHub Pages is enabled later, use the `render-health-status` branch as the Pages source so the HTML status page is easier for normal users to open.

## 注意 / Notes

- GitHub scheduled workflows may be delayed by GitHub's queue and are not a paid uptime guarantee.
- Render free-tier behavior can still change, so demo-critical sessions should still use manual warmup first.
- The workflow writes only health metadata and never writes API keys or secrets.

- GitHub scheduled workflows can be delayed and are not a paid uptime guarantee.
- Render free-tier behavior can still change, so manual warmup remains recommended for important demos.
- The workflow writes only health metadata and never writes API keys or secrets.
