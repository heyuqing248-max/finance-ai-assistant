# Data Sources / 数据源规划

## Source Categories / 数据类别
- Financial news.
- Company announcements and filings.
- Exchange announcements.
- Government policy releases.
- Central bank updates.
- CEO and executive public social media statements.
- Senior government official public statements.
- Market quotes and historical prices.
- Macro indicators.
- Industry reports and research references when legally available.
- Social sentiment signals when legally and technically available.

## Version 1 Markets / 第一版市场
- A 股
- 港股
- 美股

## Data Principles / 数据原则
- Prefer legally accessible, stable, and attributable data sources.
- Respect licensing, rate limits, and terms of service.
- Separate raw facts from AI-generated interpretation.
- Track source, publish time, market, related tickers, and confidence where possible.

## Current Adapter / 当前适配层
- Current implementation uses `backend/providers/mock-provider.mjs`.
- It is a sample provider only and must display `mode: "sample"` to the webpage.
- Backend endpoints should consume provider methods such as market listing, stock search, market news, related news, and stock lookup.
- The mock provider now exposes a real-data integration plan through `GET /api/data-sources/integration-plan` and embeds the same plan in `GET /api/data-sources`.
- It also exposes a provider registry through `GET /api/data-sources/provider-registry` and embeds the same registry in `GET /api/data-sources`.
- The first market-data adapter skeleton lives at `backend/providers/market-data-provider.mjs` and is exposed through `GET /api/data-sources/market-data-adapter`.
- The market-data adapter now also provides no-network fixture reads through `GET /api/market-data/quote`, `GET /api/market-data/history`, and `GET /api/market-data/trading-calendar`.
- The first news/filings/public-statements adapter skeleton lives at `backend/providers/news-filings-provider.mjs` and is exposed through `GET /api/data-sources/news-filings-adapter`.
- The news adapter provides no-network fixture reads through `GET /api/news/intelligence`, `GET /api/news/filings`, and `GET /api/public-statements`.
- The news adapter now also reports source-verification, redistribution, ingestion-precheck, and dry-run provider-preflight policies. Real provider fetching must remain disabled until licensing, robots/terms, official-channel verification, social-statement manual review, smoke tests, manual approval, and runtime switch gates pass.
- The plan reports required provider groups, environment variables, license/source-attribution checks, blockers, and next steps without opening any vendor connection.
- The registry reports candidate provider ids, selected provider env config, adapter module names, missing env vars, and why runtime remains on `mock`.
- Future live providers should be added as new adapters with the same boundary, then selected by configuration.
- Provider responses must include enough source status for the UI to distinguish sample, delayed, and live data.

## Real Data Integration Plan / 真实数据接入计划
- Required groups for MVP production readiness: market quotes/history, financial news/filings, and macro data.
- Macro-data adapter production readiness now includes indicator freshness labels, policy-calendar verification, provider precheck, and dry-run provider preflight. Real macro provider fetching must remain disabled until source/asOf/timezone checks, smoke tests, manual approval, and runtime switch gates pass.
- Optional but important group: verified public statements from CEOs, companies, regulators, central banks, and senior government officials.
- Required environment variables are grouped by provider type, for example `FINANCE_AI_MARKET_DATA_PROVIDER`, `FINANCE_AI_MARKET_DATA_API_KEY`, `FINANCE_AI_NEWS_PROVIDER`, `FINANCE_AI_NEWS_API_KEY`, `FINANCE_AI_MACRO_PROVIDER`, and `FINANCE_AI_MACRO_API_KEY`.
- Compliance gates must confirm data license, display rights, caching rights, redistribution boundaries, attribution rules, and rate-limit/caching strategy before any provider can be labeled live.
- The UI must continue labeling data as sample until these gates pass and a real provider adapter replaces the mock provider.

## Provider Registry / Provider 注册表
- Candidate provider ids are stable internal ids, not vendor endorsements.
- Current candidate groups:
  - `licensed-market-data` for quotes, price history, and trading calendars.
  - `licensed-news-filings` for news, company announcements, and filings.
  - `official-macro-data` for rates, FX, inflation, and policy calendars.
  - `verified-public-statements` for verified CEO, company, regulator, and government statements.
- Selected providers come from env vars such as `FINANCE_AI_MARKET_DATA_PROVIDER`, `FINANCE_AI_NEWS_PROVIDER`, `FINANCE_AI_MACRO_PROVIDER`, and `FINANCE_AI_STATEMENT_PROVIDER`.
- Credentials must come from env vars or a secrets manager; never commit API keys or provider credentials.
- Public API handlers must continue calling provider adapter methods, not vendor SDKs directly.

## Market Data Adapter Skeleton / 行情适配器骨架
- Current module: `backend/providers/market-data-provider.mjs`.
- Current runtime mode: `inactive`.
- Current safety boundary: no vendor network calls, no trading actions, no real quote fetching.
- Local fixture read model: available for API integration only. It returns `mode: "fixture"`, source/license tags, timestamps, currencies, and explicit disclaimers.
- Planned methods:
  - `getQuote(market, code)` for last price, currency, source, timestamp, and license tag.
  - `getPriceHistory(market, code, range, interval)` for normalized price points and source metadata.
  - `getTradingCalendar(market, from, to)` for trading sessions and timezone.
- Current fixture endpoints:
  - `GET /api/market-data/quote?symbol=0700&market=hk`
  - `GET /api/market-data/history?symbol=AAPL&market=us`
  - `GET /api/market-data/trading-calendar?market=a&from=2026-06-01&to=2026-06-07`
- Before enabling delayed or live mode, the project must pass provider credentials, license review, source attribution, rate-limit/cache strategy, smoke tests, and mock fallback verification.

## News, Filings, and Public Statements Adapter / 新闻、公告与公开言论适配器
- Current module: `backend/providers/news-filings-provider.mjs`.
- Current runtime mode: `inactive`.
- Current safety boundary: no vendor network calls, no social-media scraping, no trading actions, no real news fetching.
- Local fixture read model: available for API integration only. It returns `mode: "fixture"`, source/license tags, speaker/source fields, timestamps, and explicit disclaimers.
- Fixture processing now includes normalized-title/related-ticker deduplication, fixture source-credibility scoring, explainable weighted importance scoring, and explicit `mock-repository-on-demand` persistence state.
- Planned methods:
  - `listImportantNews(market, symbol, minImportance)` for ranked news and source metadata.
  - `listCompanyFilings(market, symbol)` for announcement/filing records.
  - `listPublicStatements(market, symbol)` for verified CEO, executive, company, regulator, government, and public-policy statements.
- Current fixture endpoints:
  - `GET /api/news/intelligence?market=us&symbol=AAPL&minImportance=80`
  - `GET /api/news/filings?symbol=0700&market=hk`
  - `GET /api/public-statements?symbol=AAPL&market=us`
- Before enabling delayed or live mode, the project must pass provider credentials, source verification, licensing, source attribution, rate-limit/cache strategy, duplicate-news merge tests, and mock fallback verification.
- Before storing processed news intelligence in production, the project still needs persistence of score versions, duplicate groups, raw-source references, and source-verification audit fields.

## Adapter Rules / 适配层规则
- Do not place vendor-specific SDK logic directly inside public API route handlers.
- Normalize stock codes, market IDs, timestamps, source labels, and related ticker fields before AI analysis.
- Preserve raw source references separately from AI summaries.
- Fail closed: if a provider is unavailable, return an explicit source status or error instead of inventing market data.

## News Processing / 新闻处理
Each ingested item should aim to store:
- Title
- Source
- Publish time
- Market
- Related tickers
- Related industries
- Summary
- Importance score
- Sentiment direction
- Potential impact window

## Social Media and Public Statements / 社交媒体与公开言论
- Treat social media statements as signals, not verified financial facts by default.
- Prefer official or verified accounts.
- Record source URL and timestamp when available.
- Add uncertainty if identity, context, or translation is unclear.

## Future Integrations / 后续集成
- Broker or market-data webpage/API integrations.
- Email notifications.
- SMS notifications.
- WeChat notifications.
- Telegram notifications.
