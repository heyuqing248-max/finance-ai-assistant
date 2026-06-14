# Product Requirements Document / 产品需求文档

## 1. Product Positioning / 产品定位
AI 财经情报与股票分析助手是一款中文优先的 Web/PWA 应用，面向普通投资者和进阶投资者。产品通过聚合财经新闻、公告、政策、社交媒体言论、行情和基础市场数据，结合 AI 分析，输出清晰、量化、可解释的投资参考。

The product is a Chinese-first Web/PWA financial intelligence assistant. It aggregates financial news, filings, policies, social media statements, market data, and basic investment data, then uses AI to provide clear, quantified, explainable analysis references.

## 2. Target Users / 目标用户
- 普通投资者：希望快速理解新闻对股票的影响。
- 进阶投资者：希望综合新闻、基本面、估值、技术面和情绪做判断。
- 关注 A 股、港股、美股的中文用户。

## 3. Version 1 Market Scope / 第一版市场范围
- A 股
- 港股
- 美股

Later markets: 澳股、欧洲市场、日本市场、ETF、基金、外汇、债券、加密货币、大宗商品。

## 4. Core User Journeys / 核心用户流程
- 未登录用户可以搜索股票，查看基础新闻、走势判断、量化参考和风险提示。
- 注册登录用户可以保存自选股、分析偏好、提醒方式和历史分析记录。
- 用户可以添加自选股；不添加自选股也可以使用搜索分析。
- 用户可以选择分析风格：稳健型、平衡型、积极型。
- 用户可以授权不同提醒方式：网页内提醒、邮件、短信、微信、Telegram 等。

## 5. MVP Features / MVP 功能
- 注册、登录、退出登录。
- A 股、港股、美股新闻分类。
- 股票搜索。
- 自选股添加、删除、查看。
- AI 新闻总结和重点提取。
- 股票走势量化分析，包括上涨参考概率、下跌风险概率、市场情绪分数、估值吸引力分数、技术面强弱分数。
- 专业名词解释按钮。
- 用户风险偏好选择。
- 网页内提醒。
- 中文、极简、直观的界面。

## 6. Optional Portfolio Data / 非必填持仓信息
持仓信息全部非必填。界面必须提示：填写越完整，分析越完整；不填写时部分持仓相关数据无法展示。

Suggested optional fields:
- 股票代码 / 股票名称
- 买入价格
- 持仓数量
- 买入日期
- 当前成本价
- 目标收益率
- 最大可接受亏损
- 投资周期：短线 / 中线 / 长线
- 风险偏好：稳健 / 平衡 / 积极

Without portfolio data, the system can still show:
- 新闻影响
- 走势判断
- 估值分析
- 技术分析
- 市场情绪
- 风险提示

With portfolio data, the system can additionally show:
- 浮盈浮亏分析
- 止盈止损参考
- 仓位风险
- 加仓 / 减仓参考

## 7. Analysis Output / 分析输出
Output must use cautious reference language:
- 短期上涨参考概率：例如 62%
- 短期下跌风险概率：例如 38%
- 新闻影响：偏利好 / 中性 / 偏利空
- 影响周期：例如 1-5 个交易日
- 操作参考：继续观察 / 谨慎持有 / 风险升高 / 可考虑分批降低仓位
- 核心原因
- 主要风险
- 免责声明：不构成投资建议

## 8. Out of Scope for MVP / MVP 暂不包含
- 自动交易。
- 直接连接券商账户。
- 承诺收益或保证预测准确。
- 所有全球市场一次性上线。
- 付费会员体系。
