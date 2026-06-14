import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { createAuthProviderAdapter } from "./auth-provider-adapter.mjs";

const demoToken = "demo-token";
const demoUser = { id: "demo-user", displayName: "样例用户", roles: ["sample"] };
const sessionSeconds = 60 * 60 * 24;
const allowedUserRoles = ["user", "admin", "auditor", "compliance"];
const privilegedUserRoles = ["admin", "auditor", "compliance"];
const defaultPrivilegedRoleExpiryHours = 24 * 30;

const serviceStatus = {
  id: "mock-auth",
  name: "Mock 认证服务",
  mode: "sample",
  status: "ready",
  supportedMethods: ["demoToken", "emailPassword"],
  sessionMode: "bearer-token-sample-email-password",
  disclaimer:
    "当前为样例认证服务，支持 demo 与 mock 邮箱密码登录；密码会哈希保存，但仍不代表生产账号安全方案。",
};

function createRolePolicy() {
  return {
    id: "mock-auth-role-policy",
    mode: "sample-self-service",
    status: "ready",
    allowedRoles: allowedUserRoles,
    privilegedRoles: privilegedUserRoles,
    roleSource: "authUsers.roles",
    productionSelfServiceAllowed: false,
    endpointContracts: [
      { method: "GET", path: "/api/auth/roles", status: "implemented" },
      { method: "POST", path: "/api/auth/roles", status: "implemented" },
      { method: "POST", path: "/api/admin/auth/users/roles", status: "implemented" },
      { method: "POST", path: "/api/admin/auth/users/roles/revoke", status: "implemented" },
      { method: "GET", path: "/api/admin/auth/roles/history", status: "implemented" },
    ],
    adminAssignmentPolicy: {
      status: "sample-ready",
      requiredRole: "admin",
      targetLookup: ["email", "userId"],
      defaultPrivilegedRoleExpiryHours,
      maxRoleExpiryHours: 24 * 365,
      auditEventType: "auth.roleChange",
      auditAction: "adminAssign",
      productionReviewRequired: true,
    },
    adminRevocationPolicy: {
      status: "sample-ready",
      requiredRole: "admin",
      targetLookup: ["email", "userId"],
      revocableRoles: privilegedUserRoles,
      auditEventType: "auth.roleChange",
      auditAction: "adminRevoke",
      preventsSelfAdminRevoke: true,
      productionReviewRequired: true,
    },
    adminRoleHistoryPolicy: {
      status: "sample-ready",
      requiredRole: "admin",
      scope: "actor-owned-audit-events",
      eventTypes: ["auth.roleChange"],
      maxItems: 20,
      productionReviewRequired: true,
    },
    disclaimer:
      "当前仅允许 mock 邮箱账号在样例环境切换角色，用于验证审计下载门禁；生产环境必须由管理员、身份提供商或合规后台授予角色，不能让普通用户自提权。",
  };
}

function readAuthorizationHeader(headers = {}) {
  return headers.authorization || headers.Authorization || "";
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function sanitizeDisplayName(displayName = "", email = "") {
  const cleanName = String(displayName).trim().slice(0, 40);
  if (cleanName) return cleanName;
  return normalizeEmail(email).split("@")[0] || "用户";
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function createPasswordHash(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(String(password), salt, 32).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash = "") {
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(String(password), salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("base64url");
}

function createRoleGrantSummaries(user = {}, now = Date.now()) {
  const rawGrants = user.roleGrants && typeof user.roleGrants === "object" ? user.roleGrants : {};
  const roles = Array.isArray(user.roles)
    ? [...new Set(user.roles.filter((role) => typeof role === "string" && role.trim()).map((role) => role.trim()))]
    : [];
  return roles
    .filter((role) => allowedUserRoles.includes(role) || role === "sample")
    .map((role) => {
      const grant = rawGrants[role] && typeof rawGrants[role] === "object" ? rawGrants[role] : {};
      const expiresAt = typeof grant.expiresAt === "string" && grant.expiresAt.trim() ? grant.expiresAt.trim() : "";
      const expiresAtMs = expiresAt ? Date.parse(expiresAt) : NaN;
      const expired = Number.isFinite(expiresAtMs) && expiresAtMs <= now;
      return {
        role,
        status: expired ? "expired" : "active",
        grantedBy: typeof grant.grantedBy === "string" ? grant.grantedBy : "",
        grantedAt: typeof grant.grantedAt === "string" ? grant.grantedAt : "",
        expiresAt,
      };
    });
}

function createPublicUser(user = {}) {
  const roleGrants = createRoleGrantSummaries(user);
  const roles = roleGrants
    .filter((grant) => grant.status === "active")
    .map((grant) => grant.role);
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    roles,
    roleGrants,
  };
}

function sanitizeUserRoles(roles = []) {
  const source = Array.isArray(roles) ? roles : [];
  const sanitized = [
    ...new Set(
      source
        .filter((role) => typeof role === "string" && role.trim())
        .map((role) => role.trim())
        .filter((role) => allowedUserRoles.includes(role)),
    ),
  ];
  return sanitized.length ? sanitized : ["user"];
}

function hasRole(user = {}, role) {
  return Array.isArray(user.roles) && user.roles.includes(role);
}

function sanitizeRoleExpiry(input = {}, roles = [], now = Date.now()) {
  const hasPrivilegedRole = roles.some((role) => privilegedUserRoles.includes(role));
  if (!hasPrivilegedRole) return "";

  const requestedExpiresAt =
    typeof input.expiresAt === "string" && input.expiresAt.trim() ? input.expiresAt.trim() : "";
  if (requestedExpiresAt) {
    const parsed = Date.parse(requestedExpiresAt);
    const max = now + 24 * 365 * 60 * 60 * 1000;
    if (Number.isFinite(parsed) && parsed > now && parsed <= max) {
      return new Date(parsed).toISOString();
    }
  }

  const requestedHours = Number(input.expiresInHours);
  const boundedHours =
    Number.isFinite(requestedHours) && requestedHours > 0
      ? Math.min(requestedHours, 24 * 365)
      : defaultPrivilegedRoleExpiryHours;
  return new Date(now + boundedHours * 60 * 60 * 1000).toISOString();
}

function createRoleGrantMetadata(roles = [], actor = {}, input = {}) {
  const grantedAt = new Date().toISOString();
  const expiresAt = sanitizeRoleExpiry(input, roles, Date.parse(grantedAt));
  return {
    grantedBy: actor.id || "self",
    grantedAt,
    expiresAt,
  };
}

function findTargetUser(input = {}, repository) {
  const targetEmail = normalizeEmail(input.email);
  const targetUserId =
    typeof input.userId === "string" && input.userId.trim() ? input.userId.trim() : "";
  return targetUserId
    ? repository.getAuthUser(targetUserId)
    : targetEmail
      ? repository.findAuthUserByEmail(targetEmail)
      : null;
}

function sanitizeRevocableRoles(roles = []) {
  return sanitizeUserRoles(roles).filter((role) => privilegedUserRoles.includes(role));
}

function findUserByEmail(repository, email) {
  const normalizedEmail = normalizeEmail(email);
  return repository.findAuthUserByEmail(normalizedEmail);
}

function createSession(repository, user) {
  const token = `mock_${randomBytes(24).toString("base64url")}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionSeconds * 1000).toISOString();
  repository.saveAuthSession({
    id: `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId: user.id,
    tokenHash: hashToken(token),
    createdAt: now.toISOString(),
    expiresAt,
  });
  return { token, expiresAt };
}

function findSessionFromHeader(headers = {}, repository) {
  const header = readAuthorizationHeader(headers);
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token || token === demoToken) return null;
  const tokenHash = hashToken(token);
  return repository.findAuthSessionByTokenHash(tokenHash);
}

function createPublicSession(session = {}, currentSessionId = "") {
  return {
    id: session.id,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    current: Boolean(currentSessionId && session.id === currentSessionId),
    sessionMode: "email-password-session",
  };
}

function createAuthError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

export function createMockAuthService({ env = process.env } = {}) {
  const providerAdapter = createAuthProviderAdapter({ env });

  return {
    id: serviceStatus.id,

    status() {
      return {
        ...serviceStatus,
        rolePolicy: createRolePolicy(),
        providerAdapter,
      };
    },

    rolePolicy() {
      return createRolePolicy();
    },

    providerAdapterStatus() {
      return providerAdapter;
    },

    demoLogin() {
      return {
        token: demoToken,
        user: { ...demoUser },
        tokenType: "Bearer",
        expiresInSeconds: sessionSeconds,
        disclaimer: serviceStatus.disclaimer,
      };
    },

    register(input = {}, repository) {
      const email = normalizeEmail(input.email);
      const password = String(input.password || "");
      if (!isValidEmail(email)) {
        throw createAuthError("INVALID_EMAIL", "请输入有效邮箱地址。");
      }
      if (password.length < 8) {
        throw createAuthError("WEAK_PASSWORD", "密码至少需要 8 位。");
      }
      if (findUserByEmail(repository, email)) {
        throw createAuthError("EMAIL_EXISTS", "该邮箱已经注册，请直接登录。", 409);
      }

      const user = repository.createAuthUser({
        email,
        displayName: sanitizeDisplayName(input.displayName, email),
        roles: ["user"],
        passwordHash: createPasswordHash(password),
        createdAt: new Date().toISOString(),
      });
      const session = createSession(repository, user);

      return {
        token: session.token,
        tokenType: "Bearer",
        expiresInSeconds: sessionSeconds,
        expiresAt: session.expiresAt,
        user: createPublicUser(user),
        disclaimer: serviceStatus.disclaimer,
      };
    },

    login(input = {}, repository) {
      const email = normalizeEmail(input.email);
      const password = String(input.password || "");
      const user = findUserByEmail(repository, email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw createAuthError("INVALID_CREDENTIALS", "邮箱或密码不正确。", 401);
      }

      const session = createSession(repository, user);
      return {
        token: session.token,
        tokenType: "Bearer",
        expiresInSeconds: sessionSeconds,
        expiresAt: session.expiresAt,
        user: createPublicUser(user),
        disclaimer: serviceStatus.disclaimer,
      };
    },

    authenticateHeaders(headers = {}, repository) {
      const header = readAuthorizationHeader(headers);
      if (header === `Bearer ${demoToken}`) return { ...demoUser };
      const session = findSessionFromHeader(headers, repository);
      if (!session) return null;
      const user = repository.getAuthUser(session.userId);
      return user ? createPublicUser(user) : null;
    },

    listSessions(headers = {}, repository) {
      const header = readAuthorizationHeader(headers);
      if (header === `Bearer ${demoToken}`) {
        return {
          user: { ...demoUser },
          items: [
            {
              id: "demo-session",
              createdAt: "",
              expiresAt: "",
              current: true,
              sessionMode: "demo-token",
            },
          ],
          sessionPolicy: {
            redacted: true,
            tokenHashReturned: false,
            deviceBindingRequiredForProduction: true,
            disclaimer:
              "Demo token 仅用于样例演示；生产环境需要真实设备绑定、会话族和用户可见设备列表。",
          },
        };
      }

      const currentSession = findSessionFromHeader(headers, repository);
      if (!currentSession) return null;
      const user = repository.getAuthUser(currentSession.userId);
      if (!user) return null;
      const sessions = repository.listAuthSessions(user.id);
      return {
        user: createPublicUser(user),
        items: sessions.map((session) => createPublicSession(session, currentSession.id)),
        sessionPolicy: {
          redacted: true,
          tokenHashReturned: false,
          deviceBindingRequiredForProduction: true,
          disclaimer:
            "当前只返回 mock 会话摘要；生产环境还需要设备名称、IP/地区粗粒度、风险标记和用户可撤销设备列表。",
        },
      };
    },

    revokeSession(headers = {}, repository, sessionId = "") {
      const cleanSessionId = String(sessionId || "").trim();
      if (!cleanSessionId) {
        throw createAuthError("SESSION_ID_REQUIRED", "请选择要撤销的会话。", 400);
      }

      const header = readAuthorizationHeader(headers);
      if (header === `Bearer ${demoToken}`) {
        if (cleanSessionId === "demo-session") {
          throw createAuthError(
            "CURRENT_SESSION_REVOKE_UNSUPPORTED",
            "当前会话请使用退出登录；会话列表撤销仅用于其他设备。",
            409,
          );
        }
        throw createAuthError("SESSION_NOT_FOUND", "没有找到可撤销的会话。", 404);
      }

      const currentSession = findSessionFromHeader(headers, repository);
      if (!currentSession) return null;
      const user = repository.getAuthUser(currentSession.userId);
      if (!user) return null;
      if (currentSession.id === cleanSessionId) {
        throw createAuthError(
          "CURRENT_SESSION_REVOKE_UNSUPPORTED",
          "当前会话请使用退出登录；会话列表撤销仅用于其他设备。",
          409,
        );
      }

      const targetSession = repository.findAuthSession(user.id, cleanSessionId);
      if (!targetSession) {
        throw createAuthError("SESSION_NOT_FOUND", "没有找到可撤销的会话。", 404);
      }

      const revoked = repository.removeAuthSessionForUser(user.id, cleanSessionId);
      return {
        revoked,
        revokedSession: createPublicSession(targetSession, currentSession.id),
        user: createPublicUser(user),
        sessionMode: "email-password-session",
        disclaimer:
          "当前仅撤销 mock 邮箱会话；生产环境还需要设备名称、IP/地区粗粒度、风险标记和复用检测。",
      };
    },

    refreshSession(headers = {}, repository) {
      const header = readAuthorizationHeader(headers);
      if (header === `Bearer ${demoToken}`) {
        return {
          token: demoToken,
          tokenType: "Bearer",
          expiresInSeconds: sessionSeconds,
          expiresAt: new Date(Date.now() + sessionSeconds * 1000).toISOString(),
          user: { ...demoUser },
          rotated: false,
          sessionMode: "demo-token",
          disclaimer: serviceStatus.disclaimer,
        };
      }

      const session = findSessionFromHeader(headers, repository);
      if (!session) return null;
      const user = repository.getAuthUser(session.userId);
      if (!user) return null;

      repository.removeAuthSession(session.id);
      const nextSession = createSession(repository, user);
      return {
        token: nextSession.token,
        tokenType: "Bearer",
        expiresInSeconds: sessionSeconds,
        expiresAt: nextSession.expiresAt,
        user: createPublicUser(user),
        rotated: true,
        sessionMode: "email-password-session",
        disclaimer: serviceStatus.disclaimer,
      };
    },

    updateRoles(input = {}, repository, user) {
      if (!user) {
        throw createAuthError("UNAUTHORIZED", "请先登录后更新角色。", 401);
      }
      if (user.id === demoUser.id) {
        throw createAuthError(
          "DEMO_ROLE_UPDATE_UNSUPPORTED",
          "样例一键登录不能修改角色；请使用邮箱注册/登录账号测试角色门禁。",
          403,
        );
      }

      const existing = repository.getAuthUser(user.id);
      if (!existing) {
        throw createAuthError("AUTH_USER_NOT_FOUND", "未找到当前账号记录。", 404);
      }

      const roles = sanitizeUserRoles(input.roles);
      const roleGrant = createRoleGrantMetadata(roles, user, input);
      const updated = repository.updateAuthUserRoles(user.id, roles, roleGrant);
      return {
        user: createPublicUser(updated),
        rolePolicy: createRolePolicy(),
        disclaimer: createRolePolicy().disclaimer,
      };
    },

    assignRoles(input = {}, repository, actor) {
      if (!actor) {
        throw createAuthError("UNAUTHORIZED", "请先登录后执行管理员角色授权。", 401);
      }
      if (!hasRole(actor, "admin")) {
        throw createAuthError("ADMIN_ROLE_REQUIRED", "需要管理员角色才能为其他用户授权。", 403);
      }

      const target = findTargetUser(input, repository);

      if (!target) {
        throw createAuthError("AUTH_TARGET_NOT_FOUND", "未找到需要授权的目标用户。", 404);
      }

      const roles = sanitizeUserRoles(input.roles);
      const roleGrant = createRoleGrantMetadata(roles, actor, input);
      const updated = repository.updateAuthUserRoles(target.id, roles, roleGrant);
      return {
        actor: createPublicUser(actor),
        targetUser: createPublicUser(updated),
        roleGrant,
        rolePolicy: createRolePolicy(),
        disclaimer:
          "当前为 mock 管理员授权流程，用于验证生产 RBAC 需求；公开版仍需要正式身份源、审批和最小权限策略。",
      };
    },

    revokeRoles(input = {}, repository, actor) {
      if (!actor) {
        throw createAuthError("UNAUTHORIZED", "请先登录后执行管理员角色撤销。", 401);
      }
      if (!hasRole(actor, "admin")) {
        throw createAuthError("ADMIN_ROLE_REQUIRED", "需要管理员角色才能撤销其他用户角色。", 403);
      }

      const target = findTargetUser(input, repository);
      if (!target) {
        throw createAuthError("AUTH_TARGET_NOT_FOUND", "未找到需要撤销角色的目标用户。", 404);
      }

      const revokedRoles = sanitizeRevocableRoles(input.roles);
      if (!revokedRoles.length) {
        throw createAuthError("INVALID_REVOKE_ROLES", "请至少选择一个可撤销的特权角色。", 400);
      }
      if (target.id === actor.id && revokedRoles.includes("admin")) {
        throw createAuthError("SELF_ADMIN_REVOKE_BLOCKED", "不能撤销自己的管理员角色。", 403);
      }

      const currentRoles = Array.isArray(target.roles) ? target.roles : [];
      const nextRoles = currentRoles.filter((role) => !revokedRoles.includes(role));
      const effectiveRoles = nextRoles.length ? nextRoles : ["user"];
      const updated = repository.updateAuthUserRoles(target.id, effectiveRoles);
      return {
        actor: createPublicUser(actor),
        targetUser: createPublicUser(updated),
        revokedRoles,
        rolePolicy: createRolePolicy(),
        disclaimer:
          "当前为 mock 管理员角色撤销流程，用于验证生产 RBAC 需求；公开版仍需要审批、复核和完整角色历史。",
      };
    },

    logout(headers = {}, repository) {
      const header = readAuthorizationHeader(headers);
      if (header === `Bearer ${demoToken}`) {
        return { user: { ...demoUser }, revoked: false, sessionMode: "demo-token" };
      }

      const session = findSessionFromHeader(headers, repository);
      if (!session) return null;
      const user = repository.getAuthUser(session.userId);
      repository.removeAuthSession(session.id);
      return {
        user: user ? createPublicUser(user) : null,
        revoked: true,
        sessionMode: "email-password-session",
      };
    },
  };
}
