# Issue Fix Report 2026-06-01 / 问题修复报告 2026-06-01

## Summary / 总结
- Result: **Core prototype issues fixed / 核心原型问题已修复**
- Build: Xcode Debug simulator build passed with `BUILD SUCCEEDED`
- Simulator: iPhone 17 Pro, iOS 26.5
- Latest automated evidence: `node --test tests/*.test.mjs backend/tests/*.test.mjs` passed 93 tests.
- Latest Xcode evidence: `docs/qa/screenshots/2026-06-01-user-issue-audit-xcode.png`

本轮针对用户指出的问题做了原型层面的修复。真实数据源、登录同步、真实推送属于后端/数据阶段，已明确保留为后续任务。

This round fixed the issues that can be handled inside the current prototype. Real data sources, account sync, and real push delivery remain backend/data-stage tasks.

## Fixed / 已修复
| Issue / 问题 | Status / 状态 | Notes / 说明 |
| --- | --- | --- |
| 搜索失败会跳到错误股票 | Fixed | 未匹配时显示“未找到”，保持当前股票，不再回退到贵州茅台。 |
| 缺少搜索结果为空提示 | Fixed | 增加状态提示区，支持未找到、成功、普通提示。 |
| 加入自选没有反馈 | Fixed | 增加“已加入”“已在自选股中”的反馈。 |
| 自选股无法移除 | Fixed | 自选股卡片增加“移除自选”。 |
| 自选股无法查看详情 | Fixed | 自选股卡片可点击切换当前分析股票。 |
| 提醒权限只是静态展示 | Improved | 复选框状态会保存到本机 `localStorage`；App 内提醒会在运行环境支持时尝试请求系统通知权限；后端连接后会显示通知投递服务、outbox、渠道可用性和失败重试状态。真实外部推送仍在后端/原生阶段接入。 |
| 持仓信息没有输入字段 | Fixed | 增加买入价、持仓数量、买入日期、目标收益率、最大可接受亏损输入，并保存到本机。 |
| 持仓输入没有分析结果 | Improved | 保存买入价和数量后显示本机持仓参考，包括样例当前价、成本金额、样例浮动收益率和风险提示。 |
| 风险配置联动过弱 | Improved | 稳健/平衡/积极会联动上涨概率、情绪、估值、技术面和操作文字；持仓字段还会影响概率、原因、操作提示和风险提示。 |
| 缺少用户状态持久化 | Improved | 保存风险偏好、自选股、当前股票、当前市场、搜索历史、提醒偏好和持仓信息。 |
| 界面提示与功能不一致 | Improved | 持仓信息与提醒偏好已有对应输入/保存行为，同时保留“真实推送后续接入”的说明。 |

## Not Yet Fixed / 尚未完成
| Issue / 问题 | Reason / 原因 | Next Step / 下一步 |
| --- | --- | --- |
| 真实数据源或实时刷新 | 需要行情/新闻/公告/社媒数据源、授权和后端任务。 | 进入数据源接入阶段时设计 API 和定时抓取任务。 |
| 生产级用户登录/账户同步 | 目前已有 mock 邮箱注册/登录、样例 token、会话校验和本机/JSON 桥同步；真正上线仍需要生产认证服务、数据库、隐私策略和安全审计。 | 下一阶段选择认证方案，例如 Supabase/Auth0/自建后端。 |
| 真实邮件/短信/微信/Telegram 推送 | 需要后端服务、第三方通道和用户授权。 | 先做 App 内提醒数据模型，再逐步接入渠道。 |
| 历史走势图与估值/情绪来源说明 | Improved | 已增加近 6 期走势样例、涨跌幅、来源和刷新频率说明；真实行情源、估值源、情绪源仍需后续接入。 |

## Latest Retest / 最新复测
| Check / 检查项 | Result / 结果 |
| --- | --- |
| 空搜索不误导到贵州茅台 | Pass |
| 自选股重复添加有反馈且不重复保存 | Pass |
| 自选股可移除、可点击查看分析 | Pass |
| 提醒偏好可保存并显示渠道可用性 | Pass |
| 持仓字段可填写并参与本机分析 | Pass |
| 风险偏好会联动多项指标 | Pass |
| 当前股票、市场、自选、搜索历史、持仓信息可持久化 | Pass |
| 前后端自动回归测试 | Pass，93 tests passed |

## Follow-Up UI Notes / 后续界面优化
- P2: 移动端顶部导航已固定显示；后续可继续改成图标+文字以节省空间。
- P2: 真实提醒推送需要后端任务、推送 token、用户授权和第三方渠道配置。
- P2: 中文输入法搜索需要在真实设备或配置中文输入法的模拟器里再测。

## Verification / 验证
- `node --check app.js`: passed.
- `node --check backend/server.mjs`: passed.
- `node --test tests/*.test.mjs backend/tests/*.test.mjs`: 93 tests passed.
- Xcode Debug simulator build: passed.
- Simulator launch: passed, latest launch returned `com.serena.financeaiassistant: 41271`.
- Failed search test: passed; no-match query keeps the current stock and displays a not-found message.
- Watchlist add/duplicate test: passed.
- Portfolio input/save/summary test: passed.
- Mobile fixed-navigation retest: passed.
