const requiredEnvVars = [
  "FINANCE_AI_AUTH_PROVIDER",
  "FINANCE_AI_AUTH_CLIENT_ID",
  "FINANCE_AI_AUTH_CLIENT_SECRET",
  "FINANCE_AI_AUTH_JWT_SECRET",
];
const supportedProviderIds = ["managed-auth-provider"];
const requiredRiskEnvVars = [
  "FINANCE_AI_AUTH_RISK_ENGINE_READY",
  "FINANCE_AI_AUTH_ACCOUNT_RECOVERY_READY",
  "FINANCE_AI_AUTH_SESSION_SECURITY_READY",
  "FINANCE_AI_AUTH_CSRF_PROTECTION_READY",
  "FINANCE_AI_AUTH_CREDENTIAL_STORAGE_READY",
  "FINANCE_AI_AUTH_MFA_POLICY_READY",
  "FINANCE_AI_AUTH_EMAIL_VERIFICATION_POLICY_READY",
  "FINANCE_AI_AUTH_OIDC_CALLBACK_READY",
  "FINANCE_AI_AUTH_ROLE_AUTHORIZATION_READY",
  "FINANCE_AI_AUTH_AUDIT_LOGGING_READY",
  "FINANCE_AI_AUTH_PRIVACY_CONSENT_READY",
];

function hasEnvValue(env = {}, name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function readConfig(env = {}) {
  const selectedProvider = hasEnvValue(env, "FINANCE_AI_AUTH_PROVIDER")
    ? env.FINANCE_AI_AUTH_PROVIDER.trim()
    : "";
  const missingEnvVars = requiredEnvVars.filter((name) => !hasEnvValue(env, name));

  return {
    selectedProvider,
    missingEnvVars,
    configured: missingEnvVars.length === 0,
    supported: !selectedProvider || supportedProviderIds.includes(selectedProvider),
    auditReady: env.FINANCE_AI_AUTH_AUDIT_READY === "true",
    privacyReviewed: env.FINANCE_AI_AUTH_PRIVACY_REVIEWED === "true",
    mfaReady: env.FINANCE_AI_AUTH_MFA_READY === "true",
    mfaPolicyReady: env.FINANCE_AI_AUTH_MFA_POLICY_READY === "true",
    emailVerificationReady: env.FINANCE_AI_AUTH_EMAIL_VERIFICATION_READY === "true",
    emailVerificationPolicyReady: env.FINANCE_AI_AUTH_EMAIL_VERIFICATION_POLICY_READY === "true",
    oidcCallbackReady: env.FINANCE_AI_AUTH_OIDC_CALLBACK_READY === "true",
    riskEngineReady: env.FINANCE_AI_AUTH_RISK_ENGINE_READY === "true",
    accountRecoveryReady: env.FINANCE_AI_AUTH_ACCOUNT_RECOVERY_READY === "true",
    sessionSecurityReady: env.FINANCE_AI_AUTH_SESSION_SECURITY_READY === "true",
    csrfProtectionReady: env.FINANCE_AI_AUTH_CSRF_PROTECTION_READY === "true",
    credentialStorageReady: env.FINANCE_AI_AUTH_CREDENTIAL_STORAGE_READY === "true",
    roleAuthorizationReady: env.FINANCE_AI_AUTH_ROLE_AUTHORIZATION_READY === "true",
    auditLoggingReady: env.FINANCE_AI_AUTH_AUDIT_LOGGING_READY === "true",
    privacyConsentReady: env.FINANCE_AI_AUTH_PRIVACY_CONSENT_READY === "true",
  };
}

function endpointContracts() {
  return [
    {
      id: "productionSignIn",
      method: "signIn",
      status: "planned",
      input: ["email", "password", "mfaChallenge"],
      output: ["user", "accessToken", "refreshToken", "expiresAt"],
    },
    {
      id: "productionSignUp",
      method: "signUp",
      status: "planned",
      input: ["email", "password", "displayName", "consentVersion"],
      output: ["user", "verificationRequired"],
    },
    {
      id: "sessionRefresh",
      method: "refreshSession",
      status: "planned",
      input: ["refreshToken", "deviceId"],
      output: ["accessToken", "expiresAt", "rotationId"],
    },
    {
      id: "sessionRevocation",
      method: "revokeSession",
      status: "planned",
      input: ["sessionId", "deviceId"],
      output: ["revoked", "revokedAt"],
    },
    {
      id: "oidcCallback",
      method: "handleOidcCallback",
      status: "planned",
      input: ["code", "state", "nonce", "redirectUri", "pkceVerifier"],
      output: ["user", "session", "auditEventId"],
    },
    {
      id: "roleClaimsSync",
      method: "syncRoleClaims",
      status: "planned",
      input: ["userId", "idpClaims", "requestId"],
      output: ["mappedRoles", "expiresAt", "auditEventId"],
    },
    {
      id: "adminRoleChange",
      method: "requestRoleChange",
      status: "planned",
      input: ["targetUserId", "requestedRole", "reason", "approvalContext"],
      output: ["status", "expiresAt", "auditEventId"],
    },
    {
      id: "authAuditEvent",
      method: "recordAuthAuditEvent",
      status: "planned",
      input: ["eventType", "actorUserId", "subjectUserId", "requestId", "redactedMetadata"],
      output: ["auditEventId", "hashChainStatus", "retentionClass"],
    },
  ];
}

function passwordPolicy() {
  return {
    id: "auth-password-policy",
    status: "planned",
    minLength: 12,
    requiresMixedCharacterClasses: true,
    blocksCommonPasswords: true,
    breachCheckRequired: true,
  };
}

function credentialStoragePolicy(config) {
  return {
    id: "auth-credential-storage-policy",
    status: config.credentialStorageReady ? "ready" : "blocked",
    mode: config.credentialStorageReady
      ? "production-credential-storage-ready"
      : "dry-run-no-production-credential-storage",
    canStoreProductionCredentials: false,
    passwordHashAlgorithm: "argon2id-or-managed-provider-equivalent",
    requiredControls: [
      "memoryHardHashing",
      "pepperSecretManagement",
      "breachedPasswordScreening",
      "passwordHistory",
      "resetTokenHashing",
      "credentialAuditRedaction",
    ],
    forbiddenStoredFields: ["plainPassword", "passwordResetToken", "mfaSecret", "rawRecoveryCode"],
    rotationTriggers: ["pepperRotation", "hashParameterUpgrade", "providerIncident"],
    requiresManagedSecretStore: true,
    requiresMigrationPlan: true,
  };
}

function sessionPolicy() {
  return {
    id: "auth-session-policy",
    status: "planned",
    accessTokenMinutes: 15,
    refreshTokenDays: 30,
    rotationRequired: true,
    deviceBindingRequired: true,
    revokeOnPasswordChange: true,
  };
}

function sessionSecurityPolicy(config) {
  return {
    id: "auth-session-security-policy",
    status: config.sessionSecurityReady ? "ready" : "blocked",
    mode: config.sessionSecurityReady ? "production-session-controls-ready" : "dry-run-no-session-hardening",
    canIssueProductionSessions: false,
    accessTokenMinutes: 15,
    refreshTokenDays: 30,
    requiredControls: [
      "refreshTokenRotation",
      "reuseDetection",
      "deviceBinding",
      "sessionRevocation",
      "idleTimeout",
      "sessionAuditTrail",
    ],
    revocationTriggers: [
      "passwordChange",
      "accountRecovery",
      "suspiciousLogin",
      "manualUserLogoutAllDevices",
    ],
    forbiddenAuditFields: ["accessToken", "refreshToken", "jwtSecret", "rawDeviceFingerprint"],
    requiresUserVisibleDeviceList: true,
    requiresSessionExpiryNotice: true,
  };
}

function csrfProtectionPolicy(config) {
  return {
    id: "auth-csrf-protection-policy",
    status: config.csrfProtectionReady ? "ready" : "blocked",
    mode: config.csrfProtectionReady
      ? "production-csrf-protection-ready"
      : "dry-run-no-cross-site-mutation",
    canAcceptCrossSiteMutations: false,
    protectedMethods: ["POST", "PUT", "PATCH", "DELETE"],
    requiredControls: [
      "sameSiteStrictCookies",
      "csrfTokenBinding",
      "originRefererValidation",
      "stateChangingMethodGuard",
      "doubleSubmitOrSynchronizerToken",
      "csrfAuditTrail",
    ],
    forbiddenRequestPatterns: [
      "credentialedCrossSitePost",
      "missingOriginHeader",
      "untrustedReferer",
      "csrfTokenInUrl",
      "wildcardCorsWithCredentials",
    ],
    tokenTtlMinutes: 30,
    requiresCorsAllowlist: true,
    requiresReplayProtection: true,
  };
}

function mfaPolicy(config) {
  return {
    id: "auth-mfa-policy",
    status: config.mfaReady && config.mfaPolicyReady ? "ready" : "blocked",
    mode:
      config.mfaReady && config.mfaPolicyReady
        ? "production-mfa-controls-ready"
        : "dry-run-no-production-mfa",
    canChallengeProductionUsers: false,
    supportedFactors: ["totp", "webauthn-passkey", "recovery-code"],
    requiredControls: [
      "mfaEnrollment",
      "stepUpChallenge",
      "backupCodeHashing",
      "mfaRecoveryReview",
      "trustedDeviceExpiry",
      "mfaAuditTrail",
    ],
    stepUpTriggers: ["newDevice", "highRiskLogin", "privilegedRoleAction", "passwordChange"],
    forbiddenStoredFields: ["totpSecretPlaintext", "recoveryCodePlaintext", "webauthnPrivateKey"],
    recoveryReviewRequired: true,
    userVisibleFallbackRequired: true,
  };
}

function emailVerificationPolicy(config) {
  return {
    id: "auth-email-verification-policy",
    status:
      config.emailVerificationReady && config.emailVerificationPolicyReady ? "ready" : "blocked",
    mode:
      config.emailVerificationReady && config.emailVerificationPolicyReady
        ? "production-email-verification-ready"
        : "dry-run-no-production-email-verification",
    canVerifyProductionEmail: false,
    verificationTokenMinutes: 30,
    resendCooldownSeconds: 60,
    maxResendsPerHour: 5,
    requiredControls: [
      "oneTimeVerificationToken",
      "hashedVerificationToken",
      "resendRateLimit",
      "emailChangeReverification",
      "verificationAuditTrail",
      "bounceAwareSuppression",
    ],
    forbiddenAuditFields: ["verificationToken", "rawEmailBody", "smtpCredential"],
    requiresUserVisibleExpiry: true,
    requiresEmailChangeReview: true,
  };
}

function oidcCallbackPolicy(config) {
  return {
    id: "auth-oidc-callback-policy",
    status: config.oidcCallbackReady ? "ready" : "blocked",
    mode: config.oidcCallbackReady
      ? "production-oidc-callback-ready"
      : "dry-run-no-oidc-callback",
    canHandleProductionCallback: false,
    requiredControls: [
      "redirectUriAllowlist",
      "stateNonceValidation",
      "pkceVerification",
      "callbackDomainAllowlist",
      "sameSiteCookie",
      "callbackAuditTrail",
    ],
    forbiddenCallbackInputs: [
      "unvalidatedRedirectUri",
      "plainClientSecret",
      "rawAuthorizationCodeInLogs",
      "unsignedState",
      "thirdPartyReturnUrl",
    ],
    allowedCallbackSchemes: ["https"],
    maxCallbackAgeMinutes: 10,
    requiresReplayProtection: true,
    requiresProviderIssuerValidation: true,
  };
}

function roleAuthorizationPolicy(config) {
  return {
    id: "auth-role-authorization-policy",
    status: config.roleAuthorizationReady ? "ready" : "blocked",
    mode: config.roleAuthorizationReady
      ? "production-role-authorization-ready"
      : "dry-run-no-production-role-escalation",
    canUseProductionAdminRoles: false,
    roleSource: "verified-idp-claims",
    privilegedRoles: ["admin", "complianceReviewer", "supportOperator"],
    requiredControls: [
      "verifiedIdpRoleClaims",
      "serverSideRoleMapping",
      "adminApprovalWorkflow",
      "roleExpiry",
      "leastPrivilegeRoles",
      "roleChangeAuditTrail",
    ],
    forbiddenRoleSources: [
      "clientLocalStorage",
      "requestBodyRole",
      "demoLoginSelfEscalation",
      "unsignedJwtClaim",
      "staleCachedRole",
    ],
    privilegedActionTriggers: [
      "assignRole",
      "revokeRole",
      "viewAuditExport",
      "replayDeadLetterJob",
      "downloadUserData",
    ],
    maxPrivilegedRoleDays: 90,
    requiresDualApprovalForAdmin: true,
    requiresRoleReviewRunbook: true,
  };
}

function loginRiskPolicy(config) {
  return {
    id: "auth-login-risk-policy",
    status: config.riskEngineReady ? "ready" : "blocked",
    maxFailedAttemptsPerWindow: 5,
    lockoutWindowMinutes: 15,
    suspiciousLoginSignals: [
      "newDevice",
      "impossibleTravel",
      "passwordSpray",
      "highVelocityRefresh",
    ],
    requiredActions: ["stepUpMfa", "sessionRevocation", "securityAuditEvent"],
    forbiddenAuditFields: ["password", "passwordHash", "refreshToken", "mfaSecret", "rawDeviceFingerprint"],
    riskEngineRequired: true,
  };
}

function accountRecoveryPolicy(config) {
  return {
    id: "auth-account-recovery-policy",
    status: config.accountRecoveryReady ? "ready" : "blocked",
    allowedFlows: ["verifiedEmailReset", "supportEscalationWithAudit"],
    mfaResetRequiresManualReview: true,
    resetTokenMinutes: 30,
    revokeExistingSessionsOnReset: true,
    forbiddenFlows: ["securityQuestionOnly", "silentMfaDisable", "plainEmailPasswordDisclosure"],
  };
}

function auditLoggingPolicy(config) {
  return {
    id: "auth-audit-logging-policy",
    status: config.auditReady && config.auditLoggingReady ? "ready" : "blocked",
    mode:
      config.auditReady && config.auditLoggingReady
        ? "production-auth-audit-ready"
        : "dry-run-no-auth-audit-release",
    canReleaseProductionAuthEvents: false,
    requiredEventTypes: [
      "auth.signIn",
      "auth.signOut",
      "auth.sessionRefresh",
      "auth.passwordReset",
      "auth.mfaChallenge",
      "auth.roleChange",
      "auth.oidcCallback",
    ],
    requiredControls: [
      "redactedMetadata",
      "tamperEvidentHashChain",
      "retentionClass",
      "requestCorrelationId",
      "privilegedActionReview",
      "auditExportHandoff",
    ],
    forbiddenAuditFields: [
      "plainPassword",
      "passwordHash",
      "accessToken",
      "refreshToken",
      "mfaSecret",
      "rawAuthorizationCode",
      "rawDeviceFingerprint",
    ],
    retentionDays: 365,
    requiresHashChainVerification: true,
    requiresPrivilegedExportApproval: true,
  };
}

function privacyConsentPolicy(config) {
  return {
    id: "auth-privacy-consent-policy",
    status: config.privacyReviewed && config.privacyConsentReady ? "ready" : "blocked",
    mode:
      config.privacyReviewed && config.privacyConsentReady
        ? "production-privacy-consent-ready"
        : "dry-run-no-privacy-release",
    canReleaseProductionPrivacyText: false,
    requiredControls: [
      "explicitConsentVersion",
      "privacyNoticeVersion",
      "dataSubjectRequestPath",
      "consentWithdrawalPath",
      "regionalDisclosureMapping",
      "auditRetentionDisclosure",
    ],
    forbiddenBehaviors: [
      "silentConsentUpgrade",
      "unclearAccountDeletionPath",
      "hiddenBrokerCredentialCollection",
      "privacyNoticeOnlyInEnglish",
    ],
    consentRecordFields: ["userId", "consentVersion", "acceptedAt", "locale", "source"],
    requiresUserVisibleNotice: true,
    requiresLegalReviewBeforeProduction: true,
  };
}

function securityGate(config) {
  const riskPolicy = loginRiskPolicy(config);
  const recoveryPolicy = accountRecoveryPolicy(config);
  const sessionSecurity = sessionSecurityPolicy(config);
  const csrfProtection = csrfProtectionPolicy(config);
  const credentialStorage = credentialStoragePolicy(config);
  const mfa = mfaPolicy(config);
  const emailVerification = emailVerificationPolicy(config);
  const oidcCallback = oidcCallbackPolicy(config);
  const roleAuthorization = roleAuthorizationPolicy(config);
  const auditLogging = auditLoggingPolicy(config);
  const privacyConsent = privacyConsentPolicy(config);
  const checks = [
    {
      id: "providerConfig",
      status: config.configured && config.supported ? "pass" : "blocked",
      message:
        config.configured && config.supported
          ? "认证 provider、client 凭证和 JWT secret 已配置。"
          : "认证 provider、client 凭证或 JWT secret 尚未完成可用配置。",
    },
    {
      id: "passwordPolicy",
      status: "pass",
      message: "生产密码策略要求更长密码、常见密码拦截和泄露密码检查。",
    },
    {
      id: "credentialStorage",
      status: credentialStorage.status === "ready" ? "pass" : "blocked",
      message:
        credentialStorage.status === "ready"
          ? "密码哈希、pepper、泄露密码检查、重置 token 哈希和审计脱敏准备已确认。"
          : "密码哈希、pepper、泄露密码检查、重置 token 哈希或审计脱敏策略尚未确认。",
    },
    {
      id: "sessionPolicy",
      status: "pass",
      message: "生产会话策略要求短 access token、refresh token 轮换和设备绑定。",
    },
    {
      id: "sessionSecurity",
      status: sessionSecurity.status === "ready" ? "pass" : "blocked",
      message:
        sessionSecurity.status === "ready"
          ? "生产会话轮换、复用检测、吊销、设备列表和审计准备已确认。"
          : "生产会话轮换、复用检测、吊销、设备列表或审计策略尚未确认。",
    },
    {
      id: "csrfProtection",
      status: csrfProtection.status === "ready" ? "pass" : "blocked",
      message:
        csrfProtection.status === "ready"
          ? "CSRF token、SameSite cookie、Origin/Referer 校验和 CORS 白名单准备已确认。"
          : "CSRF token、SameSite cookie、Origin/Referer 校验或 CORS 白名单策略尚未确认。",
    },
    {
      id: "mfaReadiness",
      status: config.mfaReady ? "pass" : "blocked",
      message: config.mfaReady ? "多因素认证准备已确认。" : "多因素认证策略尚未确认。",
    },
    {
      id: "mfaPolicy",
      status: mfa.status === "ready" ? "pass" : "blocked",
      message:
        mfa.status === "ready"
          ? "MFA 注册、step-up、备用码、恢复复核和审计策略准备已确认。"
          : "MFA 注册、step-up、备用码、恢复复核或审计策略尚未确认。",
    },
    {
      id: "emailVerification",
      status: config.emailVerificationReady ? "pass" : "blocked",
      message: config.emailVerificationReady ? "邮箱验证流程准备已确认。" : "邮箱验证流程尚未确认。",
    },
    {
      id: "emailVerificationPolicy",
      status: emailVerification.status === "ready" ? "pass" : "blocked",
      message:
        emailVerification.status === "ready"
          ? "邮箱验证 token、重发限流、邮箱变更复核和审计策略准备已确认。"
          : "邮箱验证 token、重发限流、邮箱变更复核或审计策略尚未确认。",
    },
    {
      id: "oidcCallback",
      status: oidcCallback.status === "ready" ? "pass" : "blocked",
      message:
        oidcCallback.status === "ready"
          ? "OIDC/OAuth 回调 redirect、state、nonce、PKCE、issuer 和重放防护准备已确认。"
          : "OIDC/OAuth 回调 redirect、state、nonce、PKCE、issuer 或重放防护策略尚未确认。",
    },
    {
      id: "loginRiskControls",
      status: riskPolicy.status === "ready" ? "pass" : "blocked",
      message:
        riskPolicy.status === "ready"
          ? "异常登录风控、失败次数限制和 step-up MFA 准备已确认。"
          : "异常登录风控、失败次数限制或 step-up MFA 策略尚未确认。",
    },
    {
      id: "accountRecovery",
      status: recoveryPolicy.status === "ready" ? "pass" : "blocked",
      message:
        recoveryPolicy.status === "ready"
          ? "账号恢复、密码重置和会话吊销策略准备已确认。"
          : "账号恢复、密码重置或会话吊销策略尚未确认。",
    },
    {
      id: "roleAuthorization",
      status: roleAuthorization.status === "ready" ? "pass" : "blocked",
      message:
        roleAuthorization.status === "ready"
          ? "生产角色 claims、管理员审批、角色过期和授权审计准备已确认。"
          : "生产角色 claims、管理员审批、角色过期或授权审计策略尚未确认。",
    },
    {
      id: "auditLogging",
      status: auditLogging.status === "ready" ? "pass" : "blocked",
      message:
        auditLogging.status === "ready"
          ? "认证审计事件、脱敏、哈希链、留存和导出审批准备已确认。"
          : "认证审计事件、脱敏、哈希链、留存或导出审批策略尚未确认。",
    },
    {
      id: "auditReadiness",
      status: config.auditReady ? "pass" : "blocked",
      message: config.auditReady ? "认证审计准备已确认。" : "认证审计、风控和留存规则尚未确认。",
    },
    {
      id: "privacyReview",
      status: privacyConsent.status === "ready" ? "pass" : "blocked",
      message:
        privacyConsent.status === "ready"
          ? "账号隐私文案、用户同意、地区披露和撤回路径已复核。"
          : "账号隐私文案、用户同意、地区披露或撤回路径尚未复核。",
    },
  ];
  const blockedReasons = checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.message);

  return {
    id: "auth-provider-security-gate",
    status: blockedReasons.length ? "blocked" : "ready-for-production-auth",
    canUseProductionAuth: blockedReasons.length === 0,
    checks,
    blockedReasons,
    disclaimer:
      "生产认证必须先通过 provider 配置、密码策略、会话策略、MFA、邮箱验证、审计风控和隐私复核门禁。",
  };
}

function productionAuthPreflightPlan(config, gate) {
  return {
    id: "auth-production-preflight-plan",
    mode: "dry-run-no-provider-call",
    status: gate.status === "ready-for-production-auth" ? "ready-for-manual-smoke" : "blocked",
    canExecuteProductionAuth: false,
    providerRequestAllowed: false,
    requiredManualApproval: true,
    checks: gate.checks.map((check) => ({
      id: check.id,
      status: check.status,
      required: true,
    })),
    requestEnvelope: {
      requiredFields: [
        "email",
        "deviceId",
        "consentVersion",
        "mfaChallenge",
        "state",
        "nonce",
        "csrfToken",
        "origin",
      ],
      forbiddenFields: [
        "plainPasswordInLogs",
        "refreshTokenInClientLogs",
        "mfaSecret",
        "rawDeviceFingerprint",
        "unvalidatedRedirectUri",
        "rawAuthorizationCodeInLogs",
        "csrfTokenInUrl",
        "wildcardCorsOrigin",
        "clientAssignedRole",
        "unsignedRoleClaim",
        "rawAuthEventPayload",
        "auditHashChainSecret",
      ],
      redactBeforeAudit: true,
      csrfProtectionRequired: true,
      oidcCallbackRequired: true,
      roleAuthorizationRequired: true,
      authAuditRequired: true,
    },
    rollback: {
      fallbackService: "mock-auth-service",
      disableFlag: "FINANCE_AI_AUTH_RUNTIME=inactive",
      revokeProductionSessionsBeforeRollback: true,
    },
  };
}

export function createAuthProviderAdapter({ env = process.env } = {}) {
  const config = readConfig(env);
  const gate = securityGate(config);
  const blockedReasons = [];
  if (!config.configured) {
    blockedReasons.push("认证 provider、client 凭证或 JWT secret 尚未配置。");
  }
  if (!config.supported) {
    blockedReasons.push(`认证 provider 未注册：${config.selectedProvider}。`);
  }
  blockedReasons.push(...gate.blockedReasons.filter((reason) => !blockedReasons.includes(reason)));

  return {
    id: "auth-provider-adapter",
    name: "Auth Provider Adapter Skeleton",
    status: blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: "inactive",
    selectedProvider: config.selectedProvider,
    supportedProviderIds,
    configured: config.configured,
    supported: config.supported,
    canUseProductionAuth: false,
    passwordPolicy: passwordPolicy(),
    credentialStoragePolicy: credentialStoragePolicy(config),
    sessionPolicy: sessionPolicy(),
    sessionSecurityPolicy: sessionSecurityPolicy(config),
    csrfProtectionPolicy: csrfProtectionPolicy(config),
    mfaPolicy: mfaPolicy(config),
    emailVerificationPolicy: emailVerificationPolicy(config),
    oidcCallbackPolicy: oidcCallbackPolicy(config),
    roleAuthorizationPolicy: roleAuthorizationPolicy(config),
    loginRiskPolicy: loginRiskPolicy(config),
    accountRecoveryPolicy: accountRecoveryPolicy(config),
    auditLoggingPolicy: auditLoggingPolicy(config),
    privacyConsentPolicy: privacyConsentPolicy(config),
    securityGate: gate,
    productionAuthPreflightPlan: productionAuthPreflightPlan(config, gate),
    endpointContracts: endpointContracts(),
    missingEnvVars: [
      ...config.missingEnvVars,
      ...requiredRiskEnvVars.filter((name) => !hasEnvValue(env, name)),
    ],
    safety: {
      noVendorNetworkCalls: true,
      mockFallbackActive: true,
      storesPasswordHashesOnly: true,
      requiresCredentialStorageHardening: true,
      requiresMfaPolicy: true,
      requiresEmailVerification: true,
      requiresOidcCallbackProtection: true,
      requiresSessionSecurity: true,
      requiresCsrfProtection: true,
      requiresRoleAuthorization: true,
      requiresLoginRiskControls: true,
      requiresAccountRecoveryReview: true,
      requiresAuditLog: true,
      requiresAuthAuditLogging: true,
      requiresPrivacyConsentPolicy: true,
      requiresPrivacyReview: true,
    },
    blockedReasons,
    nextSteps: [
      "选择已注册认证 provider，并把 client 凭证、JWT secret 和回调域名放入密钥管理或环境变量。",
      "实现 signIn、signUp、refreshSession、revokeSession，并保持 mock auth 作为网页离线回退。",
      "接入 MFA、邮箱验证、设备绑定、刷新令牌轮换、异常登录风控和脱敏审计日志。",
      "接入 CSRF 防护，保护所有会修改数据的认证请求，强制 SameSite cookie、CSRF token、Origin/Referer 校验和 CORS 白名单。",
      "接入 OIDC/OAuth 回调安全校验，强制 redirect URI 白名单、state/nonce、PKCE、issuer 校验和重放防护。",
      "接入真实 IdP role claims、服务端角色映射、管理员审批、角色过期和角色变更审计，禁止客户端自带角色升级。",
      "接入认证审计日志，确保登录、会话、MFA、角色变更和账号恢复事件具备脱敏、哈希链、留存分类和导出审批。",
      "完成隐私文案与用户同意流程复核后，才允许把 runtimeMode 从 inactive 切换为 production。",
    ],
    disclaimer:
      "当前为生产认证 provider adapter 骨架，不会请求真实认证服务；mock 邮箱密码登录仅用于开发验证，不代表生产账号安全方案。",
  };
}
