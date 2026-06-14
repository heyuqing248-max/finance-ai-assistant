# Multi-Agent Analysis Reference

## Purpose

This project may reference the TradingAgents multi-agent research pattern, but it must not copy its code blindly, enable automated trading, or present outputs as guaranteed investment advice.

## Reference Sources

- TradingAgents official site and GitHub describe a multi-agent trading framework with specialist analyst roles, researcher debate, trader, risk management team, and portfolio manager.
- The TradingAgents arXiv paper describes agents for fundamental, sentiment, technical analysis, bull/bear researchers, risk management, and traders using debates and historical data.

## Adaptation For This App

The app should adapt the idea into a safer Chinese web research assistant:

1. Data Evidence Layer
   - Real quote provider
   - Real news provider
   - Real filings provider
   - Macro provider
   - Public-statement provider with identity verification
   - No mock/fixture/sample fallback in strict real-data mode

2. Analyst Team
   - Macro Analyst: rates, inflation, policy, FX, liquidity
   - Industry Analyst: sector cycle, policy exposure, supply/demand
   - Fundamental Analyst: revenue, margin, balance sheet, valuation
   - Technical Analyst: trend, momentum, volume, support/resistance
   - Sentiment/News Analyst: licensed news, announcements, verified public statements

3. Debate Layer
   - Bull Researcher: strongest upside thesis and catalysts
   - Bear Researcher: strongest downside thesis and invalidation points
   - Debate output must cite evidence and state uncertainty.

4. Synthesis Layer
   - Research Manager: reconciles analyst views and conflicts
   - Risk Manager: checks drawdown, position size, volatility, liquidity, user risk profile
   - Portfolio Reviewer: considers user holdings only when the user has provided them

5. User-Facing Output
   - Use `模型参考概率`, not certainty or return promise
   - Show probability ranges and confidence level
   - Show evidence coverage and missing-data warnings
   - Show bull/base/bear cases
   - Show entry/exit/reference levels only as analysis references
   - Always include investment-risk disclaimer

## Safety Boundaries

- No automatic order execution.
- No broker action without explicit user action outside this app.
- No bypassing login, paywalls, paid APIs, app protections, or rate limits.
- No raw API key, raw provider response, raw article body, or private user data in prompts/logs.
- If any required data source is missing, lower confidence or keep that section blank.

## MVP Implementation Order

1. Add a backend multi-agent analysis contract with roles and JSON schema.
2. Add frontend `分析过程` panel showing role outputs and evidence coverage.
3. Keep current single-pass analysis as fallback only when real model provider is not enabled.
4. Add bull/bear debate display after real model provider, cost controls, citations, and compliance gates are ready.
5. Add risk/portfolio review only after portfolio inputs and suitability warnings are stable.

## Do Not Copy Directly

TradingAgents is a useful reference for workflow design. This app has a different goal: a Chinese, user-facing financial intelligence web assistant with strict real-data display, compliance disclaimers, and no trading execution. Any implementation must be reviewed against this project's `COMPLIANCE.md` and `AI_ANALYSIS_STANDARD.md`.
