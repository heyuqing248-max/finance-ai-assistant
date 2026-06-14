# Tech Stack / 技术路线

## First Version / 第一版
Use Web/PWA first. The product is now a browser-based webpage/web app and should run in modern browsers on Apple, Windows, phones, desktops, and tablets. Native mobile or desktop packaging is not a current delivery target.

第一版改为网页制作 / Web/PWA，优先覆盖多系统和多设备，降低开发成本并加快验证；当前不再把原生 App 或 Xcode 工程作为交付目标。

The historical Xcode wrapper remains under `ios/FinanceAIAssistant.xcodeproj` only as a legacy packaging reference. Current feature development, QA, and acceptance should target the browser webpage/PWA path first.

历史上已提供可用 Xcode 打开的 iOS 外壳工程：`ios/FinanceAIAssistant.xcodeproj`。后续仅把它作为封装参考，不作为当前网页开发的默认验收项。

## Recommended Architecture / 推荐架构
- Frontend: browser-first Web/PWA, with future migration to React or Next.js when the current no-dependency prototype reaches a stable feature boundary.
- Styling: component-based CSS or a lightweight design system.
- Backend: API service for auth, watchlist, news, analysis, reminders. Current first backend step is a no-dependency Node mock API under `backend/` so API shapes can stabilize before framework selection.
- Provider adapter: market/news/search reads currently go through `backend/providers/mock-provider.mjs`; real providers should be added behind the same adapter boundary.
- Repository layer: user-owned data reads/writes currently go through `backend/repositories/mock-repository.mjs`; production database work should replace this boundary instead of changing route handlers first.
- Database: relational database for users, watchlists, preferences, logs, and analysis records. Current mock database service lives in `backend/services/mock-database-service.mjs` and reports the storage bridge, planned tables, migration phase, and missing production capabilities. Current development bridge can persist mock backend state to a local JSON file with `FINANCE_AI_DATA_FILE`, but this is not a production database.
- Audit service: audit-log retention and metadata redaction currently go through `backend/services/mock-audit-service.mjs`; production work should add tamper-evident storage, automated retention purge, admin review workflows, and field-level encryption.
- AI service: model-based summarization, classification, explanation, and analysis generation.
- AI model strategy: current route is documented in `docs/technical/AI_MODEL_STRATEGY.md`; use a free hosted OpenAI-compatible Gemini model first for local demo smoke, then consider higher-reasoning paid models or fine-tuning only after eval data proves it is useful. Training an independent base model is not an MVP route.
- Jobs: scheduled ingestion, reminder evaluation, and daily log/report jobs. Current mock scheduler service lives in `backend/jobs/mock-scheduler-service.mjs`, exposes status through `GET /api/scheduler/status`, and bridges due-job checks to the mock job runner. Current mock job runner lives in `backend/jobs/mock-reminder-job-runner.mjs`, exposes status through `GET /api/job-services`, runs `reminderEvaluation` through `POST /api/jobs/run`, and stores recent job runs.
- Notifications: start with webpage/local notifications, then add email/SMS/WeChat/Telegram based on permissions.

## MVP Technical Priorities / MVP 技术优先级
- Authentication.
- Stock search.
- Watchlist persistence.
- News ingestion abstraction.
- AI analysis abstraction.
- Explanation-term dictionary.
- Webpage/local reminders.
- PWA install support.
- Browser/PWA regression testing.

## Current Backend Baseline / 当前后端基线
- API contract: `docs/technical/API_CONTRACT.md`
- Database draft: `docs/technical/DATABASE_SCHEMA.md`
- Full local webpage stack: `scripts/full-dev-server.mjs`
- Web static server: `scripts/web-dev-server.mjs`
- Temporary public preview: `scripts/public-preview-server.mjs`; operating notes live in `docs/technical/PUBLIC_PREVIEW.md`.
- Mock backend: `backend/server.mjs`
- Mock provider adapter: `backend/providers/mock-provider.mjs`
- Mock job runner: `backend/jobs/mock-reminder-job-runner.mjs`
- Mock scheduler service: `backend/jobs/mock-scheduler-service.mjs`
- Mock repository: `backend/repositories/mock-repository.mjs`
- Mock database service: `backend/services/mock-database-service.mjs`
- Mock audit service: `backend/services/mock-audit-service.mjs`
- Backend tests: `backend/tests/backend-api.test.mjs`
- Direct backend test command: `node --test backend/tests/*.test.mjs`

## Local Run / 本地运行
- Preferred full webpage command: `node scripts/full-dev-server.mjs`
- Webpage URL: `http://127.0.0.1:4173`
- Mock backend URL: `http://localhost:4180`
- If `npm` is available, `npm run dev` and `npm run dev:all` call the same full startup script.
- For phone/iPad testing on the same Wi-Fi, use `node scripts/full-dev-server.mjs --lan` or `npm run dev:lan`, then open the printed `LAN:` URL. The frontend will infer the mock backend from the same private-network host on port `4180`.
- Use `node scripts/web-dev-server.mjs` only when testing frontend static files without backend behavior.
- Use `node scripts/public-preview-server.mjs` only for temporary same-origin public previews; do not treat tunnel URLs as production deployment.
- Use `node backend/server.mjs` only when testing backend API behavior without the webpage.

## Non-MVP Technical Items / 非 MVP 技术项
- Broker account integration.
- Real-money trading.
- Native app packaging and Xcode/iOS delivery.
- Paid subscription billing.
- High-frequency trading signals.

## Safety Requirements / 安全要求
- Store user data securely.
- Do not expose secrets in frontend code.
- Rate-limit expensive AI requests.
- Log failures without leaking sensitive data.
- Keep investment-analysis wording compliant.
