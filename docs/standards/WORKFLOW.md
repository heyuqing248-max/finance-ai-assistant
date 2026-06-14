# Workflow Standard / 工作流规范

## Before Development / 开发前
- Read `PROJECT_MEMORY.md`.
- Read relevant standards under `docs/standards/`.
- Read relevant product or technical docs before changing related behavior.
- Confirm the task belongs to the current phase in `docs/product/ROADMAP.md`.

## During Development / 开发中
- Keep each change small and stable.
- Prefer simple, testable features over large all-in-one changes.
- Do not mix unrelated product, design, and infrastructure changes in one task.
- When a feature touches investment analysis, check `AI_ANALYSIS_STANDARD.md` and `COMPLIANCE.md`.
- Current delivery target is the browser webpage/PWA. Do not use Xcode/iOS build success as the default acceptance gate unless the user explicitly asks to revive native packaging work.
- 当前交付目标是浏览器网页 / PWA。除非用户明确要求恢复原生封装，否则不要把 Xcode/iOS 构建作为默认验收标准。
- For manual webpage QA, prefer `node scripts/full-dev-server.mjs` so the webpage and mock backend start together before user-flow testing.
- 手动网页验收优先使用 `node scripts/full-dev-server.mjs`，确保网页和 mock 后端一起启动后再测试用户流程。

## After Development / 开发后
- Update the current daily log in `dev-logs/YYYY-MM-DD.md`.
- Record completed work, unfinished todo items, risks, and decisions.
- Run relevant checks or tests when available.
- Summarize user-visible changes in plain Chinese and English.

## Daily Log Format / 每日日志格式
Each daily log must include:
- 今日完成 / Completed Today
- 问题与风险 / Issues and Risks
- 明日待办 / Next Todo
- 决策记录 / Decisions

## Documentation Rule / 文档规则
- Project rules live in files, not only in conversation memory.
- If a decision changes, update the relevant standard file and `PROJECT_MEMORY.md`.
- Keep public-facing investment language conservative and compliant.
