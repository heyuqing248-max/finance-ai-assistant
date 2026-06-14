const requiredDisclaimer =
  "本内容由模型基于公开信息和市场数据生成，仅供学习和研究参考，不构成任何投资建议、买卖推荐或收益承诺。市场有风险，投资需谨慎，用户应结合自身情况独立判断。";

const prohibitedClaims = ["保证收益", "保证预测准确", "承诺规避亏损", "必须买入", "必须卖出", "稳赚", "无风险"];

const capabilities = [
  "requiredDisclaimer",
  "prohibitedClaimFilter",
  "probabilityLabeling",
  "riskAcknowledgement",
  "suitabilityQuestionnaire",
  "suitabilityEnforcement",
  "jurisdictionEnforcement",
  "disclosureVersioning",
  "licensedAdviserReview",
  "analysisBoundaryAudit",
  "productionGapReport",
];

const missingProductionCapabilities = [
  "legalReviewWorkflow",
  "jurisdictionPolicy",
  "jurisdictionEnforcement",
  "suitabilityQuestionnaire",
  "suitabilityEnforcement",
  "disclosureVersioning",
  "licensedAdviserReview",
];

function complianceChecks({ env = process.env } = {}) {
  const acknowledgementReady = env.FINANCE_AI_COMPLIANCE_ACK_READY === "true";
  const suitabilityReady = env.FINANCE_AI_COMPLIANCE_SUITABILITY_READY === "true";
  const suitabilityEnforcementReady =
    env.FINANCE_AI_COMPLIANCE_SUITABILITY_ENFORCEMENT_READY === "true";
  const legalReviewed = env.FINANCE_AI_COMPLIANCE_LEGAL_REVIEWED === "true";
  const jurisdictionReviewed = env.FINANCE_AI_COMPLIANCE_JURISDICTION_REVIEWED === "true";
  const jurisdictionEnforcementReady =
    env.FINANCE_AI_COMPLIANCE_JURISDICTION_ENFORCEMENT_READY === "true";
  const disclosureVersioningReady =
    env.FINANCE_AI_COMPLIANCE_DISCLOSURE_VERSIONING_READY === "true";
  const licensedAdviserReviewReady =
    env.FINANCE_AI_COMPLIANCE_LICENSED_ADVISER_REVIEW_READY === "true";

  return [
    {
      id: "disclaimerPresence",
      status: "pass",
      message: "分析输出必须展示固定免责声明。",
    },
    {
      id: "probabilityLanguage",
      status: "pass",
      message: "所有概率必须标注为模型参考概率，不得表达为收益保证。",
    },
    {
      id: "prohibitedClaims",
      status: "pass",
      message: "禁止保证收益、保证预测准确、必须买入/卖出和无风险表述。",
    },
    {
      id: "riskAcknowledgement",
      status: acknowledgementReady ? "pass" : "blocked",
      message: acknowledgementReady
        ? "用户风险确认流程准备已确认。"
        : "用户风险确认、免责声明确认和版本记录尚未完成。",
    },
    {
      id: "suitabilityQuestionnaire",
      status: suitabilityReady ? "pass" : "blocked",
      message: suitabilityReady
        ? "适当性问卷流程准备已确认。"
        : "适当性问卷、风险画像和展示策略尚未完成。",
    },
    {
      id: "suitabilityEnforcement",
      status: suitabilityEnforcementReady ? "pass" : "blocked",
      message: suitabilityEnforcementReady
        ? "适当性执行规则、风险等级映射和不匹配内容拦截已确认。"
        : "适当性执行规则、风险等级映射或不匹配内容拦截尚未完成。",
    },
    {
      id: "legalReview",
      status: legalReviewed ? "pass" : "blocked",
      message: legalReviewed ? "法律/合规复核已确认。" : "法律/合规复核尚未完成。",
    },
    {
      id: "jurisdictionPolicy",
      status: jurisdictionReviewed ? "pass" : "blocked",
      message: jurisdictionReviewed ? "地区/司法辖区展示策略已确认。" : "地区/司法辖区展示策略尚未确认。",
    },
    {
      id: "jurisdictionEnforcement",
      status: jurisdictionEnforcementReady ? "pass" : "blocked",
      message: jurisdictionEnforcementReady
        ? "地区识别、受限地区回退、法规文案和人工复核流程已确认。"
        : "地区识别、受限地区回退、法规文案或人工复核流程尚未确认。",
    },
    {
      id: "disclosureVersioning",
      status: disclosureVersioningReady ? "pass" : "blocked",
      message: disclosureVersioningReady
        ? "披露文案版本、变更记录、重新确认规则和回滚记录已确认。"
        : "披露文案版本、变更记录、重新确认规则或回滚记录尚未确认。",
    },
    {
      id: "licensedAdviserReview",
      status: licensedAdviserReviewReady ? "pass" : "blocked",
      message: licensedAdviserReviewReady
        ? "持牌顾问复核队列、升级规则、复核 SLA 和审计记录已确认。"
        : "持牌顾问复核队列、升级规则、复核 SLA 或审计记录尚未确认。",
    },
  ];
}

export function evaluateComplianceGate({ env = process.env } = {}) {
  const checks = complianceChecks({ env });
  const blockedReasons = checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.message);

  return {
    id: "public-analysis-compliance-gate",
    status: blockedReasons.length ? "blocked" : "ready-for-public-beta",
    canReleasePublicAnalysis: blockedReasons.length === 0,
    checks,
    blockedReasons,
    disclaimer:
      "公开发布 AI 投资分析前，必须通过免责声明、概率语言、禁止承诺收益、用户风险确认、适当性问卷、适当性执行、法律复核、地区策略、地区执行、披露版本和持牌复核门禁。",
  };
}

export function createComplianceService({ env = process.env } = {}) {
  const gate = evaluateComplianceGate({ env });

  return {
    id: "mock-compliance-service",

    status() {
      return {
        id: "mock-compliance-service",
        name: "Mock 合规策略服务",
        mode: "sample",
        status: "planning",
        reviewMode: "policy-gate",
        requiredDisclaimer,
        prohibitedClaims: [...prohibitedClaims],
        outputPolicy: {
          probabilityLanguage: "模型参考概率",
          forbidsGuaranteedReturns: true,
          forbidsMustBuySell: true,
          requiresSourceSeparation: true,
          requiresNearbyDisclaimer: true,
        },
        acknowledgementPolicy: {
          version: "compliance-ack-v0",
          requiresRiskAcknowledgement: true,
          requiresOptionalPortfolioNotice: true,
          recordsDisclosureVersion: true,
          blocksPublicReleaseWithoutReview: true,
        },
        suitabilityPolicy: {
          version: "suitability-v0",
          requiredFields: [
            "riskTolerance",
            "investmentExperience",
            "investmentHorizon",
            "liquidityNeed",
          ],
          scoringMode: "sample-rule-based",
          blocksPublicReleaseWithoutReview: true,
          disclaimer: "适当性问卷仅用于样例风险画像和合规准备，不构成投资建议。",
        },
        suitabilityEnforcementPolicy: {
          id: "suitability-enforcement-policy",
          status:
            env.FINANCE_AI_COMPLIANCE_SUITABILITY_ENFORCEMENT_READY === "true"
              ? "ready"
              : "blocked",
          enforcementMode: "dry-run-no-personalized-restriction",
          canRestrictAnalysisByProfile: false,
          requiredRules: [
            "profileRequiredForPersonalizedAnalysis",
            "lowRiskBlocksAggressiveSignals",
            "liquidityNeedBlocksIlliquidRisk",
            "experienceMismatchShowsEducationOnly",
            "missingQuestionnaireShowsGeneralEducation",
          ],
          riskLevelMapping: {
            conservative: ["education-only", "lower-volatility-watchlist"],
            balanced: ["standard-risk-analysis", "position-size-warning"],
            growth: ["higher-volatility-analysis", "stronger-loss-warning"],
          },
          fallbackMode: "general-education-no-personalized-action",
          requiresAuditTrail: true,
          requiresUserVisibleReason: true,
          disclaimer:
            "适当性执行门禁用于阻断与用户风险画像不匹配的个性化分析；未完成前只能展示通用学习内容。",
        },
        jurisdictionEnforcementPolicy: {
          id: "jurisdiction-enforcement-policy",
          status:
            env.FINANCE_AI_COMPLIANCE_JURISDICTION_ENFORCEMENT_READY === "true"
              ? "ready"
              : "blocked",
          enforcementMode: "dry-run-no-region-restriction",
          canRestrictByJurisdiction: false,
          defaultJurisdiction: "AU-QLD",
          supportedJurisdictions: ["AU", "US", "HK", "CN"],
          restrictedJurisdictions: ["unknown", "sanctioned", "unreviewed"],
          requiredRules: [
            "detectUserJurisdiction",
            "blockRestrictedJurisdictions",
            "localizeDisclosures",
            "requireManualReviewForUnreviewedRegions",
            "showEducationOnlyWhenJurisdictionUnknown",
          ],
          fallbackMode: "education-only-no-personalized-analysis",
          requiresGeoConsentNotice: true,
          requiresLegalReviewPerJurisdiction: true,
          requiresAuditTrail: true,
          disclaimer:
            "地区执行门禁用于按用户所在司法辖区限制或回退分析展示；未完成前不能把同一套个性化分析无差别公开发布。",
        },
        disclosureVersioningPolicy: {
          id: "disclosure-versioning-policy",
          status:
            env.FINANCE_AI_COMPLIANCE_DISCLOSURE_VERSIONING_READY === "true"
              ? "ready"
              : "blocked",
          versioningMode: "dry-run-no-disclosure-version-release",
          canReleaseDisclosureVersion: false,
          activeVersions: {
            disclaimer: "disclaimer-v0",
            riskWarning: "risk-warning-v0",
            jurisdictionDisclosure: "jurisdiction-disclosure-v0",
            suitabilityDisclosure: "suitability-disclosure-v0",
          },
          requiredControls: [
            "immutableDisclosureVersion",
            "changeLogRequired",
            "userReAcknowledgementOnMaterialChange",
            "legalApprovalBeforeRelease",
            "rollbackDisclosureVersion",
          ],
          materialChangeTriggers: [
            "riskWarningTextChange",
            "jurisdictionScopeChange",
            "prohibitedClaimPolicyChange",
            "suitabilityRuleChange",
          ],
          requiresAuditTrail: true,
          requiresUserReAcknowledgement: true,
          disclaimer:
            "披露版本门禁用于确保免责声明、风险提示和地区披露可追踪、可回滚；重大变更后必须触发用户重新确认。",
        },
        licensedAdviserReviewPolicy: {
          id: "licensed-adviser-review-policy",
          status:
            env.FINANCE_AI_COMPLIANCE_LICENSED_ADVISER_REVIEW_READY === "true"
              ? "ready"
              : "blocked",
          reviewMode: "dry-run-no-adviser-approval",
          canApprovePersonalizedAdvice: false,
          requiredTriggers: [
            "strongBuySellLanguage",
            "lowConfidenceHighImpact",
            "complaintEscalation",
            "unreviewedJurisdiction",
            "complexPortfolioContext",
          ],
          reviewerRoles: ["licensed-adviser", "compliance-officer"],
          maxReviewLatencyHours: 24,
          fallbackMode: "education-only-pending-review",
          requiresConflictDisclosure: true,
          requiresReviewAuditTrail: true,
          requiresUserVisiblePendingState: true,
          disclaimer:
            "持牌复核门禁用于拦截疑似个性化建议或高风险输出；未复核前只能显示学习内容或等待复核状态。",
        },
        legalReviewPreflightPlan: {
          id: "legal-review-preflight-plan",
          status: "defined",
          mode: "dry-run-no-legal-approval",
          canMarkLegalReviewed: false,
          requiredManualApproval: true,
          evidenceEnvelope: {
            requiredFields: [
              "disclaimerVersion",
              "riskWarningVersion",
              "jurisdictionDisclosureVersion",
              "suitabilityPolicyVersion",
              "prohibitedClaimPolicyVersion",
              "licensedAdviserReviewPolicyVersion",
              "reviewerRole",
              "auditEventId",
            ],
            forbiddenFields: ["userPortfolioRaw", "modelApiKey", "unredactedPrompt", "privateUserNote"],
          },
          requiredReviewArtifacts: [
            "current-disclaimer-text",
            "prohibited-claim-policy",
            "jurisdiction-scope-matrix",
            "suitability-questionnaire-version",
            "licensed-adviser-escalation-rules",
            "public-release-blocker-list",
          ],
          rollback: {
            fallbackMode: "education-only-no-personalized-analysis",
            preserveBlockedPublicReleaseGate: true,
          },
          disclaimer:
            "法律复核预检只准备审查证据包和字段边界，不代表真实律师、合规人员或持牌顾问已经批准公开发布。",
        },
        publicReleaseEvidencePackage: {
          id: "public-release-evidence-package",
          status: "defined",
          mode: "dry-run-no-public-release",
          canReleasePublicAnalysis: false,
          requiredManualApproval: true,
          requiredSections: [
            "risk-acknowledgement-version",
            "legal-review-preflight-summary",
            "jurisdiction-fallback-matrix",
            "suitability-enforcement-dry-run",
            "disclosure-version-change-log",
            "licensed-adviser-review-queue-policy",
            "rollback-and-user-notice-plan",
          ],
          releaseBlockersThatMustRemainBlocked: [
            "riskAcknowledgement",
            "legalReview",
            "publicReleaseGate",
          ],
          auditControls: {
            hashChainRequired: true,
            exportRequiresPrivilegedApproval: true,
            redactsPersonalContext: true,
          },
          disclaimer:
            "公开发布证据包用于汇总上线前门禁，不会打开 public beta，也不会向社会发布真实个性化投资分析。",
        },
        complianceGate: gate,
        capabilities: [...capabilities],
        missingProductionCapabilities: [...missingProductionCapabilities],
        disclaimer:
          "当前为样例合规策略服务，用于集中展示 AI 分析边界；生产环境仍需法律复核、地区策略、用户确认记录和持牌资质判断。",
      };
    },
  };
}
