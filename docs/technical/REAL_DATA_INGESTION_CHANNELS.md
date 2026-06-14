# Real Data Ingestion Channels / 真实数据接入渠道

Updated / 更新：2026-06-07

## Current Rule / 当前规则

Strict real-data mode is the default. If a provider, public page, social API, or user-imported file has no real data, the app must show an empty state instead of local mock, fixture, or sample content.

严格真实数据模式为默认规则。若 provider、公开网页、社交 API 或用户导入文件没有真实数据，页面必须显示空状态，不得使用本地 mock、fixture 或 sample 内容兜底。

## Priority Order / 优先顺序

1. Official or licensed market-data APIs / 官方或授权行情 API
2. Official news, filing, and exchange disclosure APIs / 官方新闻、公告和交易所披露 API
3. Automated public web/API discovery / 自动公开网页/API 发现
4. Official social-media APIs / 社交媒体官方 API
5. Manual import from stock apps after user login / 用户人工登录股票 App 后手动导入

## Candidate Sources / 候选来源

| Channel | Use | Current Status | Notes |
| --- | --- | --- | --- |
| Alpha Vantage GLOBAL_QUOTE | US quote smoke and delayed quote path | Connected with demo key for IBM quote | Replace demo key with real key for wider use. |
| Alpha Vantage NEWS_SENTIMENT | US news and sentiment | Demo key reaches provider but returns limitation notice | Needs a real Alpha Vantage key. |
| SEC EDGAR submissions | US filings | Connector exists; needs compliant User-Agent env | No API key required, but User-Agent is required. |
| Automated public web/API discovery | Public news, filings, company pages | Backend auto-ingestion endpoint started | Use official/public endpoints where allowed; no user paste, paywall, login bypass, or session-cookie storage. |
| X API | CEO/government/company public posts | Not configured | Needs official API access and bearer token. |
| Reddit API | Market discussion signals | Not configured | Needs official API access and compliance review. |
| TradingView | Watchlists, charts, links | Official login/API/export only | User login must happen outside the app; use official exports, alerts, webhooks, or API/OAuth if available. |
| Yahoo Finance | Watchlists, public quote/news pages | Public/official routes only | Prefer allowed public routes; no login bypass. |
| Investing.com | Macro calendar and market pages | Public/official routes only | Check terms before automation. |
| moomoo / Futubull | A/HK/US watchlists and brokerage data | Official export/API only | User can log in manually; no packet capture, no app reverse engineering. |
| Tiger Brokers | A/HK/US watchlists and brokerage data | Official export/API only | User can log in manually; no packet capture, no app reverse engineering. |
| Eastmoney / 东方财富 | A-share quote/news pages | Public/manual review | Terms and licensing must be checked before automation. |

## Forbidden Methods / 禁止方式

- No app reverse engineering.
- No packet capture against logged-in apps.
- No session cookie storage.
- No login, captcha, or paywall bypass.
- No paid full-text redistribution.
- No trading-account credential collection.

## Next Build Tasks / 下一步开发任务

1. Expand `GET /api/data-sources/auto-ingestion-run` into a scheduled automatic ingestion job.
2. Add source metadata fields: title, source, URL, publishedAt, fetchedAt, licenseTag, reviewStatus.
3. Add official export/API import for user-authorized watchlists or holdings.
4. Add SEC EDGAR User-Agent configuration and smoke test.
5. Replace Alpha Vantage demo key with user-provided real key.
6. Add X API and Reddit API configuration screens after credentials are approved.
