const defaultDriverPackage = "pg";

function uniqueStrings(values = []) {
  return [
    ...new Set(
      values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()),
    ),
  ];
}

function createOperationContracts(repositoryContract = {}) {
  const tableMappings = Array.isArray(repositoryContract.tableMappings)
    ? repositoryContract.tableMappings
    : [];
  const mappedOperations = tableMappings.flatMap((mapping) => {
    const methods = Array.isArray(mapping.methods) ? mapping.methods : [];
    return methods.map((method) => ({
      method,
      domain: mapping.domain,
      table: mapping.table,
      status: "planned",
      accessPattern: method.startsWith("list")
        ? "select-many"
        : method.startsWith("find") || method.startsWith("get") || method.startsWith("latest")
          ? "select-one"
          : method.startsWith("remove") || method.startsWith("prune")
            ? "delete-or-prune"
            : method.startsWith("update")
              ? "update"
              : "insert-or-upsert",
      transactionRequired:
        method.startsWith("save") ||
        method.startsWith("update") ||
        method.startsWith("remove") ||
        method.startsWith("prune") ||
        method === "recordAudit",
    }));
  });
  return [
    {
      method: "status",
      domain: "repositoryStatus",
      table: "",
      status: "planned",
      accessPattern: "adapter-health",
      transactionRequired: false,
    },
    ...mappedOperations,
  ];
}

function createTableCoverage(repositoryContract = {}) {
  const operationContracts = createOperationContracts(repositoryContract);
  const tables = uniqueStrings(operationContracts.map((operation) => operation.table));
  return tables.map((table) => {
    const operations = operationContracts.filter((operation) => operation.table === table);
    return {
      table,
      operationCount: operations.length,
      writeOperationCount: operations.filter((operation) => operation.transactionRequired).length,
      domains: uniqueStrings(operations.map((operation) => operation.domain)),
      methods: uniqueStrings(operations.map((operation) => operation.method)),
    };
  });
}

function toSnakeCase(value = "") {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function createSqlTemplateForOperation(operation = {}) {
  const table = operation.table;
  const method = operation.method;
  if (!table) {
    return {
      statement: "SELECT 1 AS repository_status",
      parameterNames: [],
      resultShape: "health-row",
    };
  }

  if (method === "findAuthUserByEmail") {
    return {
      statement: `SELECT * FROM ${table} WHERE email = $1 LIMIT 1`,
      parameterNames: ["email"],
      resultShape: "single-row-or-null",
    };
  }
  if (method === "getAuthUser") {
    return {
      statement: `SELECT * FROM ${table} WHERE id = $1 LIMIT 1`,
      parameterNames: ["userId"],
      resultShape: "single-row-or-null",
    };
  }
  if (method === "findAuthSessionByTokenHash") {
    return {
      statement: `SELECT * FROM ${table} WHERE token_hash = $1 AND revoked_at IS NULL LIMIT 1`,
      parameterNames: ["tokenHash"],
      resultShape: "single-row-or-null",
    };
  }
  if (method.startsWith("find")) {
    return {
      statement: `SELECT * FROM ${table} WHERE id = $1 LIMIT 1`,
      parameterNames: ["id"],
      resultShape: "single-row-or-null",
    };
  }
  if (method.startsWith("latest")) {
    return {
      statement: `SELECT * FROM ${table} WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      parameterNames: ["userId"],
      resultShape: "single-row-or-null",
    };
  }
  if (method.startsWith("list")) {
    return {
      statement: `SELECT * FROM ${table} WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      parameterNames: ["userId", "limit"],
      resultShape: "rows",
    };
  }
  if (method.startsWith("remove")) {
    return {
      statement: `DELETE FROM ${table} WHERE id = $1 AND user_id = $2 RETURNING id`,
      parameterNames: ["id", "userId"],
      resultShape: "deleted-id",
    };
  }
  if (method.startsWith("prune")) {
    return {
      statement: `DELETE FROM ${table} WHERE created_at < $1 RETURNING id`,
      parameterNames: ["olderThan"],
      resultShape: "deleted-ids",
    };
  }
  if (method.startsWith("update")) {
    return {
      statement: `UPDATE ${table} SET updated_at = now(), payload = $2 WHERE id = $1 RETURNING *`,
      parameterNames: ["id", "payload"],
      resultShape: "updated-row",
    };
  }
  if (method === "recordAudit") {
    return {
      statement: `INSERT INTO ${table} (user_id, event_type, message, metadata, hash, previous_hash, created_at) VALUES ($1, $2, $3, $4::jsonb, $5, $6, now()) RETURNING *`,
      parameterNames: ["userId", "eventType", "message", "metadata", "hash", "previousHash"],
      resultShape: "inserted-row",
    };
  }
  if (method.startsWith("save") || method.startsWith("add") || method.startsWith("create")) {
    return {
      statement: `INSERT INTO ${table} (id, user_id, payload, created_at, updated_at) VALUES ($1, $2, $3::jsonb, now(), now()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now() RETURNING *`,
      parameterNames: ["id", "userId", "payload"],
      resultShape: "upserted-row",
    };
  }
  if (method.startsWith("next")) {
    return {
      statement: `SELECT nextval('${table}_id_seq') AS next_id`,
      parameterNames: [],
      resultShape: "sequence-row",
    };
  }
  return {
    statement: `SELECT * FROM ${table} WHERE user_id = $1 LIMIT $2`,
    parameterNames: ["userId", "limit"],
    resultShape: "rows",
  };
}

function createSqlStatementPlan(repositoryContract = {}, config = {}) {
  const operationContracts = createOperationContracts(repositoryContract);
  const tableWhitelist = uniqueStrings(
    operationContracts.map((operation) => operation.table).filter(Boolean),
  );
  const invalidTables = tableWhitelist.filter((table) => !/^[a-z_][a-z0-9_]*$/.test(table));
  const contractReady = repositoryContract.status === "pass";
  const statements = operationContracts.map((operation, index) => {
    const template = createSqlTemplateForOperation(operation);
    const accessMode = operation.transactionRequired ? "write" : "read";
    return {
      id: `${toSnakeCase(operation.method)}_${index + 1}`,
      method: operation.method,
      domain: operation.domain,
      table: operation.table,
      accessMode,
      accessPattern: operation.accessPattern,
      transactionRequired: operation.transactionRequired,
      auditRequired: operation.transactionRequired || operation.method === "recordAudit",
      parameterStyle: "postgres-positional",
      parameterNames: template.parameterNames,
      placeholderCount: template.parameterNames.length,
      statement: template.statement,
      resultShape: template.resultShape,
      status: invalidTables.includes(operation.table) ? "blocked" : "draft",
    };
  });
  const blockedReasons = [];
  if (!contractReady) blockedReasons.push("仓储接口契约未通过，不能确认 SQL 方法覆盖。");
  if (invalidTables.length) {
    blockedReasons.push("存在不符合 PostgreSQL 标识符白名单的表名，不能生成安全 SQL 模板。");
  }

  return {
    id: "production-repository-sql-contract",
    mode: "parameterized-sql-contract",
    status: blockedReasons.length ? "blocked" : "draft-ready",
    runtimeMode: "inactive",
    dialect: "postgresql",
    driver: {
      package: config.driverPackage || defaultDriverPackage,
      required: true,
    },
    statementCount: statements.length,
    writeStatementCount: statements.filter((statement) => statement.accessMode === "write").length,
    readStatementCount: statements.filter((statement) => statement.accessMode === "read").length,
    tableWhitelist,
    statements,
    checks: [
      {
        id: "repositoryContract",
        status: contractReady ? "pass" : "blocked",
        required: true,
      },
      {
        id: "tableWhitelist",
        status: invalidTables.length ? "blocked" : "pass",
        required: true,
      },
      {
        id: "parameterizedStatements",
        status: "pass",
        required: true,
      },
      {
        id: "writeTransactions",
        status: statements.some((statement) => statement.transactionRequired) ? "planned" : "pass",
        required: true,
      },
      {
        id: "auditForWrites",
        status: "planned",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      noRuntimeSwitch: true,
      tableNamesFromRepositoryContractOnly: true,
      parameterizedValuesOnly: true,
      blocksStringInterpolationForValues: true,
    },
    blockedReasons,
    nextSteps: [
      "为每个 SQL 模板补充真实列映射和输入校验。",
      "使用 pg 参数数组执行，不允许把用户输入拼进 SQL 字符串。",
      "所有写入语句必须进入事务，并在成功后写入审计事件。",
      "在 staging 上用只读冒烟与 repository contract parity 测试验证模板。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储 SQL 契约草案；当前不会连接数据库、不会执行 SQL、不会写入数据，也不会切换运行时仓储。",
  };
}

function inferParameterValidator(parameterName = "") {
  if (parameterName === "limit") {
    return {
      type: "integer",
      required: true,
      min: 1,
      max: 500,
    };
  }
  if (parameterName === "metadata" || parameterName === "payload") {
    return {
      type: "json-object",
      required: true,
      maxBytes: 65536,
    };
  }
  if (parameterName === "olderThan") {
    return {
      type: "iso-datetime",
      required: true,
    };
  }
  if (parameterName === "hash" || parameterName === "previousHash") {
    return {
      type: "hex-or-empty-string",
      required: parameterName === "hash",
      maxLength: 128,
    };
  }
  if (parameterName.toLowerCase().includes("email")) {
    return {
      type: "email",
      required: true,
      maxLength: 320,
    };
  }
  if (parameterName.toLowerCase().includes("token")) {
    return {
      type: "sha256-or-token-hash",
      required: true,
      maxLength: 256,
    };
  }
  if (parameterName.endsWith("Id") || parameterName === "id" || parameterName === "userId") {
    return {
      type: "stable-id",
      required: true,
      maxLength: 128,
    };
  }
  return {
    type: "non-empty-string",
    required: true,
    maxLength: 2000,
  };
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function redactValidationSample(value, rule = {}) {
  if (rule.type === "email") return "[email]";
  if (rule.type === "json-object") return "[json-object]";
  if (rule.type === "stable-id") return "[stable-id]";
  if (rule.type === "integer") return "[integer]";
  if (rule.type === "iso-datetime") return "[iso-datetime]";
  if (rule.type === "hex-or-empty-string" || rule.type === "sha256-or-token-hash") {
    return "[hash]";
  }
  if (typeof value === "string") return "[string]";
  if (value === null) return "[null]";
  if (value === undefined) return "[undefined]";
  return `[${typeof value}]`;
}

function validationResult(accepted, errorCode = "", message = "") {
  return { accepted, errorCode, message };
}

function validateValueAgainstRule(value, rule = {}) {
  const required = rule.required !== false;
  if (!required && (value === undefined || value === null || value === "")) {
    return validationResult(true);
  }
  if (required && (value === undefined || value === null || value === "")) {
    return validationResult(false, "REQUIRED", "参数不能为空。");
  }

  if (rule.type === "email") {
    if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return validationResult(false, "INVALID_EMAIL", "邮箱格式无效。");
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return validationResult(false, "TOO_LONG", "邮箱长度超过限制。");
    }
    return validationResult(true);
  }

  if (rule.type === "json-object") {
    if (!isPlainObject(value)) {
      return validationResult(false, "INVALID_JSON_OBJECT", "参数必须是 JSON 对象。");
    }
    const serialized = JSON.stringify(value);
    if (rule.maxBytes && serialized.length > rule.maxBytes) {
      return validationResult(false, "JSON_TOO_LARGE", "JSON 对象超过大小限制。");
    }
    return validationResult(true);
  }

  if (rule.type === "stable-id") {
    if (typeof value !== "string" || !value.trim()) {
      return validationResult(false, "INVALID_ID", "ID 必须是非空字符串。");
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return validationResult(false, "TOO_LONG", "ID 长度超过限制。");
    }
    if (!/^[a-zA-Z0-9:_-]+$/.test(value)) {
      return validationResult(false, "UNSAFE_ID", "ID 只能包含字母、数字、冒号、下划线和短横线。");
    }
    return validationResult(true);
  }

  if (rule.type === "integer") {
    if (!Number.isInteger(value)) {
      return validationResult(false, "INVALID_INTEGER", "参数必须是整数。");
    }
    if (Number.isFinite(rule.min) && value < rule.min) {
      return validationResult(false, "OUT_OF_RANGE", "整数低于最小值。");
    }
    if (Number.isFinite(rule.max) && value > rule.max) {
      return validationResult(false, "OUT_OF_RANGE", "整数超过最大值。");
    }
    return validationResult(true);
  }

  if (rule.type === "iso-datetime") {
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
      return validationResult(false, "INVALID_DATETIME", "参数必须是可解析的 ISO 日期时间。");
    }
    return validationResult(true);
  }

  if (rule.type === "hex-or-empty-string") {
    if (!required && value === "") return validationResult(true);
    if (typeof value !== "string" || !/^[a-fA-F0-9]+$/.test(value)) {
      return validationResult(false, "INVALID_HEX", "参数必须是十六进制字符串。");
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return validationResult(false, "TOO_LONG", "Hash 长度超过限制。");
    }
    return validationResult(true);
  }

  if (rule.type === "sha256-or-token-hash") {
    if (typeof value !== "string" || !/^[a-zA-Z0-9:_-]+$/.test(value)) {
      return validationResult(false, "INVALID_TOKEN_HASH", "Token hash 包含不安全字符。");
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return validationResult(false, "TOO_LONG", "Token hash 长度超过限制。");
    }
    return validationResult(true);
  }

  if (typeof value !== "string" || !value.trim()) {
    return validationResult(false, "INVALID_STRING", "参数必须是非空字符串。");
  }
  if (rule.maxLength && value.length > rule.maxLength) {
    return validationResult(false, "TOO_LONG", "字符串长度超过限制。");
  }
  return validationResult(true);
}

function sampleCasesForValidator(validator = {}) {
  if (validator.type === "email") {
    return [
      { id: "validEmail", value: "user@example.com" },
      { id: "invalidEmail", value: "not-an-email" },
    ];
  }
  if (validator.type === "json-object") {
    return [
      { id: "validJsonObject", value: { source: "test" } },
      { id: "invalidJsonObject", value: ["not-object"] },
    ];
  }
  if (validator.type === "stable-id") {
    return [
      { id: "validStableId", value: "user-123" },
      { id: "invalidStableId", value: "user 123" },
    ];
  }
  if (validator.type === "integer") {
    return [
      { id: "validLimit", value: 100 },
      { id: "largeLimit", value: 1000 },
    ];
  }
  if (validator.type === "iso-datetime") {
    return [
      { id: "validIsoDateTime", value: "2026-06-01T06:00:00+10:00" },
      { id: "invalidIsoDateTime", value: "tomorrow" },
    ];
  }
  if (validator.type === "hex-or-empty-string") {
    return [
      { id: "validHexHash", value: "abcdef123456" },
      { id: "invalidHexHash", value: "hash value" },
    ];
  }
  if (validator.type === "sha256-or-token-hash") {
    return [
      { id: "validTokenHash", value: "sha256_token_hash_123" },
      { id: "invalidTokenHash", value: "token hash" },
    ];
  }
  return [
    { id: "validString", value: "sample" },
    { id: "invalidString", value: "" },
  ];
}

function createParameterValidationPlan(repositoryContract = {}, config = {}) {
  const executionPlan = createExecutionPlan(repositoryContract, config);
  const validators = Array.isArray(executionPlan.parameterValidators)
    ? executionPlan.parameterValidators
    : [];
  const validatorTypes = uniqueStrings(validators.map((validator) => validator.type));
  const representativeValidators = validatorTypes
    .map((type) => validators.find((validator) => validator.type === type))
    .filter(Boolean);
  const sampleValidationResults = representativeValidators.flatMap((validator) =>
    sampleCasesForValidator(validator).map((sample) => {
      const result = validateValueAgainstRule(sample.value, validator);
      return {
        id: sample.id,
        validatorType: validator.type,
        method: validator.method,
        parameterName: validator.parameterName,
        accepted: result.accepted,
        errorCode: result.errorCode,
        message: result.message,
        redactedSample: redactValidationSample(sample.value, validator),
      };
    }),
  );
  const blockedReasons = [];
  if (executionPlan.status !== "draft-ready") {
    blockedReasons.push("执行计划尚未准备好，不能确认参数校验覆盖。");
  }
  if (!validators.length) {
    blockedReasons.push("没有可用参数校验器，不能进入生产仓储执行器实现。");
  }

  return {
    id: "production-repository-parameter-validation-plan",
    mode: "local-parameter-validation-plan",
    status: blockedReasons.length ? "blocked" : "draft-ready",
    runtimeMode: "inactive",
    canValidateLocally: validators.length > 0,
    canExecuteSql: false,
    validatorCount: validators.length,
    validatorTypes,
    validators,
    sampleValidationResults,
    checks: [
      {
        id: "repositoryExecutionPlan",
        status: executionPlan.status === "draft-ready" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "validatorCoverage",
        status: validators.length ? "pass" : "blocked",
        required: true,
      },
      {
        id: "redactionPolicy",
        status: sampleValidationResults.every((result) => result.redactedSample.startsWith("["))
          ? "pass"
          : "blocked",
        required: true,
      },
      {
        id: "sqlExecutionBlocked",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      localOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      redactsSampleValues: true,
      validatesBeforeExecution: true,
    },
    blockedReasons,
    nextSteps: [
      "把这些纯参数校验器接入未来 PostgreSQL 执行器入口。",
      "为每类校验器补齐边界值、空值和恶意输入测试。",
      "执行审计只记录参数形状和校验结果，不记录原始敏感值。",
      "连接池、事务包装和 SQL 执行仍需在 staging 环境单独验证。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储参数校验计划；当前只做本地规则校验，不会打开数据库连接、不会执行 SQL、不会写入数据。",
  };
}

function createConnectionPoolPlan(repositoryContract = {}, config = {}) {
  const parameterValidationPlan = createParameterValidationPlan(repositoryContract, config);
  const driverPackage = config.driverPackage || defaultDriverPackage;
  const driverAvailable = config.driverAvailable === true;
  const connectionConfigured = Boolean(config.databaseUrl);
  const sslMode = config.sslMode || "required";
  const blockedReasons = [];

  if (!connectionConfigured) {
    blockedReasons.push("缺少生产数据库连接串，不能准备连接池实现。");
  }
  if (!driverAvailable) {
    blockedReasons.push(`数据库驱动 ${driverPackage} 尚未可用，不能创建连接池。`);
  }
  if (parameterValidationPlan.status !== "draft-ready") {
    blockedReasons.push("参数校验计划尚未准备好，不能进入连接池执行包装。");
  }

  return {
    id: "production-repository-connection-pool-plan",
    mode: "connection-pool-transaction-wrapper-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: "inactive",
    canOpenConnection: false,
    canExecuteSql: false,
    driver: {
      package: driverPackage,
      available: driverAvailable,
    },
    connection: {
      configured: connectionConfigured,
      provider: config.provider || "postgres",
      sslMode,
      sslRequired: sslMode !== "disable",
      credentialsSource: connectionConfigured ? "env-redacted" : "missing",
    },
    poolConfig: {
      min: 0,
      max: 5,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 5000,
      statementTimeoutMs: 10000,
      applicationName: "finance-ai-assistant-api",
    },
    transactionWrapper: {
      defaultIsolationLevel: "read committed",
      readOnlyTransactionsForReads: true,
      writeTransactionsRequired: true,
      begin: "BEGIN",
      commit: "COMMIT",
      rollback: "ROLLBACK",
      releaseClient: "finally",
      retryPolicy: "no-auto-retry-for-writes",
    },
    lifecycleSteps: [
      {
        id: "loadConnectionConfig",
        status: connectionConfigured ? "pass" : "blocked",
        required: true,
      },
      {
        id: "validateParameters",
        status: parameterValidationPlan.status === "draft-ready" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "createPool",
        status: driverAvailable && connectionConfigured ? "planned" : "blocked",
        required: true,
      },
      {
        id: "acquireClient",
        status: "blocked",
        required: true,
      },
      {
        id: "beginTransactionForWrites",
        status: "planned",
        required: true,
      },
      {
        id: "executeParameterizedStatement",
        status: "blocked",
        required: true,
      },
      {
        id: "commitOrRollback",
        status: "planned",
        required: true,
      },
      {
        id: "releaseClient",
        status: "planned",
        required: true,
      },
    ],
    checks: [
      {
        id: "connectionConfig",
        status: connectionConfigured ? "pass" : "blocked",
        required: true,
      },
      {
        id: "driverAvailability",
        status: driverAvailable ? "pass" : "blocked",
        required: true,
      },
      {
        id: "parameterValidation",
        status: parameterValidationPlan.status === "draft-ready" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "automaticConnectionDisabled",
        status: "pass",
        required: true,
      },
      {
        id: "sqlExecutionBlocked",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      noRuntimeSwitch: true,
      secretsRedacted: true,
      validatesBeforeAcquire: true,
      releaseClientFinally: true,
      sslRequired: sslMode !== "disable",
      transactionRequiredForWrites: true,
    },
    blockedReasons,
    nextSteps: [
      "实现 pg Pool 工厂，但默认不在应用启动时自动打开连接。",
      "所有仓储方法必须先通过参数校验，再 acquire client。",
      "读方法使用只读事务或只读角色；写方法必须 begin/commit/rollback 并 finally release client。",
      "在 staging 用只读冒烟、双读一致性和双写演练验证连接池行为。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储连接池与事务包装计划；当前不会创建连接池、不会打开数据库连接、不会执行 SQL、不会写入数据。",
  };
}

function createConnectionProbeTimeoutPolicy(config = {}) {
  const timeoutMs = Number(config.connectionProbeTimeoutMs);
  const resolvedTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs >= 500 && timeoutMs <= 10000
      ? Math.round(timeoutMs)
      : 3000;

  return {
    id: "production-repository-connection-probe-timeout-policy",
    mode: "read-only-timeboxed-probe-plan",
    status: "defined",
    runtimeMode: "inactive",
    timeoutMs: resolvedTimeoutMs,
    canOpenConnectionAutomatically: false,
    canExecuteWriteProbe: false,
    requiredProbeStatements: [
      { id: "connectionPing", statement: "SELECT 1", timeoutMs: resolvedTimeoutMs, readOnly: true },
      {
        id: "readOnlyTransaction",
        statement: "SHOW transaction_read_only",
        timeoutMs: resolvedTimeoutMs,
        readOnly: true,
      },
      {
        id: "roleIdentity",
        statement: "SELECT current_user",
        timeoutMs: resolvedTimeoutMs,
        readOnly: true,
      },
    ],
    failureMode: {
      onTimeout: "fail-closed-no-cutover",
      onDriverError: "fail-closed-no-cutover",
      onWriteCapabilityDetected: "fail-closed-no-cutover",
      userVisibleStatus: "生产数据库只读探针失败或超时，继续使用当前本地/模拟仓储。",
    },
    auditEnvelope: {
      allowedFields: ["eventType", "driverPackage", "timeoutMs", "probeId", "status", "latencyMs", "errorCode"],
      forbiddenFields: ["rawConnectionString", "databasePassword", "rawSqlResult", "connectionUrl", "sslKey"],
      redactBeforeWrite: true,
      hashChainRequired: true,
    },
    safety: {
      readOnlyOnly: true,
      statementTimeoutRequired: true,
      connectionTimeoutRequired: true,
      noWrites: true,
      noMigrations: true,
      noRuntimeSwitch: true,
      redactsConnectionString: true,
      cutoverBlockedOnTimeout: true,
    },
    disclaimer:
      "这是生产 PostgreSQL 连接探针超时与只读策略；当前不会自动打开数据库连接，不会执行写入或迁移，也不会记录原始连接串。",
  };
}

function createSqlExecutorPlan(repositoryContract = {}, config = {}) {
  const sqlPlan = createSqlStatementPlan(repositoryContract, config);
  const connectionPoolPlan = createConnectionPoolPlan(repositoryContract, config);
  const validatorsByName = new Map(
    createExecutionPlan(repositoryContract, config).parameterValidators.map((validator) => [
      `${validator.method}:${validator.parameterName}`,
      validator,
    ]),
  );
  const executableStatements = sqlPlan.statements.map((statement) => {
    const parameterBindings = statement.parameterNames.map((parameterName, index) => {
      const validator = validatorsByName.get(`${statement.method}:${parameterName}`) || {};
      return {
        position: index + 1,
        name: parameterName,
        validatorType: validator.type || "unknown",
        source: "method-argument",
        redactedInLogs: true,
      };
    });
    return {
      id: statement.id,
      method: statement.method,
      table: statement.table,
      accessMode: statement.accessMode,
      transactionRequired: statement.transactionRequired,
      auditRequired: statement.auditRequired,
      parameterBindingStyle: "pg-parameter-array",
      parameterBindings,
      resultShape: statement.resultShape,
      resultMapping: {
        mode: statement.resultShape === "rows" ? "rows-array" : "single-or-null",
        timestampsAsIsoStrings: true,
        jsonbParsed: true,
      },
      status: connectionPoolPlan.status === "ready-for-implementation" ? "planned" : "blocked",
    };
  });
  const blockedReasons = [];
  if (sqlPlan.status !== "draft-ready") {
    blockedReasons.push("SQL 契约尚未准备好，不能生成执行器绑定计划。");
  }
  if (connectionPoolPlan.status !== "ready-for-implementation") {
    blockedReasons.push("连接池计划尚未准备好，执行器必须保持不可执行。");
  }

  return {
    id: "production-repository-sql-executor-plan",
    mode: "parameter-binding-result-mapping-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: "inactive",
    canExecuteSql: false,
    canOpenConnection: false,
    statementCount: executableStatements.length,
    writeStatementCount: executableStatements.filter((statement) => statement.accessMode === "write").length,
    readStatementCount: executableStatements.filter((statement) => statement.accessMode === "read").length,
    bindingCoverage: {
      parameterizedStatementCount: executableStatements.filter(
        (statement) => statement.parameterBindingStyle === "pg-parameter-array",
      ).length,
      boundParameterCount: executableStatements.reduce(
        (total, statement) => total + statement.parameterBindings.length,
        0,
      ),
      redactedBindingCount: executableStatements.reduce(
        (total, statement) =>
          total + statement.parameterBindings.filter((binding) => binding.redactedInLogs).length,
        0,
      ),
    },
    executableStatements,
    executorLifecycle: [
      { id: "validateParameters", status: "pass", required: true },
      {
        id: "bindParameterArray",
        status: sqlPlan.status === "draft-ready" ? "planned" : "blocked",
        required: true,
      },
      {
        id: "acquireClient",
        status: connectionPoolPlan.status === "ready-for-implementation" ? "planned" : "blocked",
        required: true,
      },
      { id: "executeClientQuery", status: "blocked", required: true },
      { id: "mapResultShape", status: "planned", required: true },
      { id: "writeAuditEnvelope", status: "planned", required: true },
      { id: "releaseClient", status: "planned", required: true },
    ],
    auditEnvelope: {
      eventTypePrefix: "repository.postgres.execute",
      includeStatementId: true,
      includeMethod: true,
      includeAccessMode: true,
      includeParameterNames: true,
      redactParameterValues: true,
      includeRowCountOnly: true,
      hashChainRequiredForWrites: true,
    },
    checks: [
      {
        id: "sqlContract",
        status: sqlPlan.status === "draft-ready" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "connectionPoolPlan",
        status: connectionPoolPlan.status === "ready-for-implementation" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "parameterArrayBinding",
        status: "pass",
        required: true,
      },
      {
        id: "rawValueRedaction",
        status: "pass",
        required: true,
      },
      {
        id: "liveExecutionDisabled",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      noRuntimeSwitch: true,
      parameterArrayOnly: true,
      noStringInterpolationForValues: true,
      redactsParameterValues: true,
      mapsRowCountOnlyInAudit: true,
      releaseClientFinally: true,
    },
    blockedReasons,
    nextSteps: [
      "实现 executeRepositoryStatement(statementId, params) 的纯参数绑定入口。",
      "把所有用户输入放入 pg 参数数组，禁止字符串拼接用户值。",
      "查询结果按 resultShape 映射，审计只记录 statement id、参数名、访问模式和 row count。",
      "在 staging 使用只读冒烟和双读一致性验证执行器输出。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储 SQL 执行器绑定计划；当前不会创建连接池、不会打开数据库连接、不会执行 SQL、不会写入数据。",
  };
}

function createResultMappingAuditPlan(repositoryContract = {}, config = {}) {
  const sqlExecutorPlan = createSqlExecutorPlan(repositoryContract, config);
  const mappings = sqlExecutorPlan.executableStatements.map((statement) => ({
    id: `${statement.id}_result_mapping`,
    method: statement.method,
    table: statement.table,
    resultShape: statement.resultShape,
    mappingMode: statement.resultMapping?.mode || "single-or-null",
    jsonbParsed: statement.resultMapping?.jsonbParsed === true,
    timestampsAsIsoStrings: statement.resultMapping?.timestampsAsIsoStrings === true,
    emptyResultPolicy:
      statement.resultShape === "rows"
        ? "empty-array"
        : statement.resultShape === "deleted-id" || statement.resultShape === "deleted-ids"
          ? "deleted-count"
          : "null",
    rowCountExposedToAudit: true,
    rawRowsLogged: false,
    status: statement.status === "planned" ? "planned" : "blocked",
  }));
  const auditEnvelope = sqlExecutorPlan.auditEnvelope || {};
  const allowedAuditFields = [
    "statementId",
    "method",
    "accessMode",
    "parameterNames",
    "rowCount",
    "durationMs",
    "status",
    "errorCode",
  ];
  const auditValidationSamples = [
    {
      id: "safeSuccessEnvelope",
      accepted: true,
      fields: ["statementId", "method", "accessMode", "parameterNames", "rowCount", "durationMs", "status"],
      blockedFields: [],
    },
    {
      id: "unsafeRawValueEnvelope",
      accepted: false,
      fields: ["statementId", "method", "rawParameterValues"],
      blockedFields: ["rawParameterValues"],
    },
    {
      id: "unsafeRawRowsEnvelope",
      accepted: false,
      fields: ["statementId", "method", "rawRows"],
      blockedFields: ["rawRows"],
    },
  ];
  const blockedReasons = [];
  if (sqlExecutorPlan.status !== "ready-for-implementation") {
    blockedReasons.push("SQL 执行器绑定计划尚未准备好，不能确认结果映射与审计 envelope。");
  }

  return {
    id: "production-repository-result-audit-plan",
    mode: "result-mapping-audit-envelope-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-implementation",
    runtimeMode: "inactive",
    canMapLiveRows: false,
    canWriteAudit: false,
    mappingCount: mappings.length,
    resultShapes: uniqueStrings(mappings.map((mapping) => mapping.resultShape)),
    mappings,
    auditEnvelope: {
      eventTypePrefix: auditEnvelope.eventTypePrefix || "repository.postgres.execute",
      allowedFields: allowedAuditFields,
      forbiddenFields: ["rawParameterValues", "rawRows", "connectionString", "token", "password"],
      redactParameterValues: auditEnvelope.redactParameterValues === true,
      includeRowCountOnly: auditEnvelope.includeRowCountOnly === true,
      hashChainRequiredForWrites: auditEnvelope.hashChainRequiredForWrites === true,
    },
    auditValidationSamples,
    checks: [
      {
        id: "sqlExecutorPlan",
        status: sqlExecutorPlan.status === "ready-for-implementation" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "resultShapeCoverage",
        status: mappings.length ? "pass" : "blocked",
        required: true,
      },
      {
        id: "jsonbParsing",
        status: mappings.every((mapping) => mapping.jsonbParsed) ? "pass" : "blocked",
        required: true,
      },
      {
        id: "timestampNormalization",
        status: mappings.every((mapping) => mapping.timestampsAsIsoStrings) ? "pass" : "blocked",
        required: true,
      },
      {
        id: "auditRawValueBlock",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      noAuditWrite: true,
      rawRowsNeverLogged: true,
      rawParameterValuesNeverLogged: true,
      rowCountOnlyInAudit: true,
      timestampsNormalized: true,
      jsonbParsed: true,
    },
    blockedReasons,
    nextSteps: [
      "实现 resultShape 到 repository 返回对象的纯映射函数。",
      "为 rows、single-row-or-null、inserted-row、updated-row、deleted-id 等结果形状补充边界测试。",
      "审计 envelope 只允许 statement id、方法、访问模式、参数名、row count、耗时和状态。",
      "在 staging 中对照 mock/JSON 仓储验证结果映射一致性。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储结果映射与审计 envelope 计划；当前不会读取数据库行、不会写审计、不会执行 SQL。",
  };
}

function createReadOnlyQueryRehearsalPlan(repositoryContract = {}, config = {}) {
  const smokePlan = createReadOnlySmokeTestPlan(repositoryContract, config);
  const resultAuditPlan = createResultMappingAuditPlan(repositoryContract, config);
  const sqlExecutorPlan = createSqlExecutorPlan(repositoryContract, config);
  const readOnlyRehearsalEnabled = config.readOnlyRehearsalEnabled === true;
  const readStatements = sqlExecutorPlan.executableStatements.filter(
    (statement) => statement.accessMode === "read",
  );
  const sampleQueries = readStatements.slice(0, 10).map((statement) => ({
    id: `${statement.id}_readonly_rehearsal`,
    method: statement.method,
    table: statement.table || "repository_health",
    resultShape: statement.resultShape,
    parameterNames: statement.parameterBindings.map((binding) => binding.name),
    expectedMapping: statement.resultMapping?.mode || "single-or-null",
    maxRows: statement.resultShape === "rows" ? 25 : 1,
    readOnlyTransaction: true,
    auditExpectation: "statement-id-method-row-count-duration-status",
    status:
      smokePlan.status === "ready-for-readonly-smoke" &&
      resultAuditPlan.status === "ready-for-implementation" &&
      readOnlyRehearsalEnabled
        ? "planned"
        : "blocked",
  }));
  const blockedReasons = [];
  if (smokePlan.status !== "ready-for-readonly-smoke") {
    blockedReasons.push("只读冒烟测试计划尚未准备好，不能进入只读查询预演。");
  }
  if (resultAuditPlan.status !== "ready-for-implementation") {
    blockedReasons.push("结果映射与审计 envelope 计划尚未准备好，不能验证只读查询输出。");
  }
  if (!readOnlyRehearsalEnabled) {
    blockedReasons.push("只读查询预演开关未开启，当前不能运行 staging 查询预演。");
  }
  if (!readStatements.length) {
    blockedReasons.push("没有可预演的只读仓储语句。");
  }

  return {
    id: "production-repository-readonly-query-rehearsal-plan",
    mode: "staging-readonly-query-rehearsal-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-staging-rehearsal",
    runtimeMode: "inactive",
    canRunStagingReads: false,
    canRunProductionReads: false,
    canWriteData: false,
    readOnlyRehearsalEnabled,
    coverage: {
      readStatementCount: readStatements.length,
      sampleQueryCount: sampleQueries.length,
      tableCount: uniqueStrings(readStatements.map((statement) => statement.table)).length,
      parameterizedReadCount: readStatements.filter(
        (statement) => statement.parameterBindingStyle === "pg-parameter-array",
      ).length,
    },
    rehearsalWindow: {
      environment: "staging-first",
      maxRowsPerQuery: 25,
      statementTimeoutMs: 10000,
      minimumSuccessfulRuns: 3,
      maxAllowedErrorCount: 0,
    },
    sampleQueries,
    checks: [
      {
        id: "readOnlySmokePlan",
        status: smokePlan.status === "ready-for-readonly-smoke" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "resultAuditPlan",
        status: resultAuditPlan.status === "ready-for-implementation" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "readOnlyRehearsalOptIn",
        status: readOnlyRehearsalEnabled ? "pass" : "pending",
        required: true,
      },
      {
        id: "readStatementCoverage",
        status: readStatements.length ? "pass" : "blocked",
        required: true,
      },
      {
        id: "writeStatementExclusion",
        status: sampleQueries.every((query) => query.readOnlyTransaction) ? "pass" : "blocked",
        required: true,
      },
      {
        id: "auditEnvelope",
        status: resultAuditPlan.auditEnvelope?.includeRowCountOnly ? "pass" : "blocked",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      noWrites: true,
      noProductionReads: true,
      readOnlyTransactionsOnly: true,
      rowLimitRequired: true,
      rawRowsNeverLogged: true,
      rawParameterValuesNeverLogged: true,
      mockRepositoryRemainsPrimary: true,
    },
    blockedReasons,
    nextSteps: [
      "增加 FINANCE_AI_DB_READ_REHEARSAL=true 后只允许 staging 环境运行只读查询预演。",
      "所有预演查询必须使用只读事务、参数数组和行数上限。",
      "预演审计只记录 statement id、方法、row count、耗时和状态，禁止记录原始行。",
      "连续通过只读查询预演后，再进入双读一致性样本比较。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储只读查询预演计划；当前不会打开数据库连接、不会执行 SQL、不会读取生产数据、不会写入数据。",
  };
}

function createExecutionPlan(repositoryContract = {}, config = {}) {
  const sqlPlan = createSqlStatementPlan(repositoryContract, config);
  const writeStatements = sqlPlan.statements.filter((statement) => statement.accessMode === "write");
  const readStatements = sqlPlan.statements.filter((statement) => statement.accessMode === "read");
  const parameterValidators = sqlPlan.statements.flatMap((statement) =>
    statement.parameterNames.map((parameterName, index) => ({
      id: `${statement.id}_${parameterName}`,
      method: statement.method,
      parameterName,
      position: index + 1,
      ...inferParameterValidator(parameterName),
      status: "planned",
    })),
  );
  const blockedReasons = [];
  if (sqlPlan.status !== "draft-ready") {
    blockedReasons.push("SQL 契约尚未准备好，不能生成执行器计划。");
  }

  return {
    id: "production-repository-execution-plan",
    mode: "transaction-audit-execution-plan",
    status: blockedReasons.length ? "blocked" : "draft-ready",
    runtimeMode: "inactive",
    canExecuteSql: false,
    canOpenConnection: false,
    driver: {
      package: config.driverPackage || defaultDriverPackage,
      required: true,
    },
    coverage: {
      statementCount: sqlPlan.statementCount,
      readStatementCount: readStatements.length,
      writeStatementCount: writeStatements.length,
      validatorCount: parameterValidators.length,
      transactionWrappedWriteCount: writeStatements.filter((statement) => statement.transactionRequired).length,
      auditRequiredWriteCount: writeStatements.filter((statement) => statement.auditRequired).length,
    },
    transactionWrapper: {
      isolationLevel: "read committed",
      begin: "BEGIN",
      commit: "COMMIT",
      rollback: "ROLLBACK",
      retryPolicy: "no-auto-retry-for-writes",
      wrapsMethods: writeStatements.map((statement) => statement.method),
    },
    auditWritePolicy: {
      requiredForWriteMethods: true,
      eventTypePrefix: "repository.postgres",
      includeStatementId: true,
      includeParameterShapeOnly: true,
      redactParameterValues: true,
      hashChainRequired: true,
    },
    parameterValidators,
    executionSteps: [
      { id: "validateParameters", status: "planned", required: true },
      { id: "openConnectionFromPool", status: "blocked", required: true },
      { id: "beginTransactionForWrites", status: "planned", required: true },
      { id: "executeParameterizedStatement", status: "blocked", required: true },
      { id: "recordAuditForWrites", status: "planned", required: true },
      { id: "commitOrRollback", status: "planned", required: true },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      noRuntimeSwitch: true,
      validatesBeforeExecution: true,
      transactionRequiredForWrites: true,
      auditRequiredForWrites: true,
      parameterValuesRedactedInAudit: true,
    },
    blockedReasons,
    nextSteps: [
      "实现参数校验器并覆盖边界值测试。",
      "实现连接池获取、事务 begin/commit/rollback 包装器。",
      "写入成功后只记录参数形状和 statement id，不记录敏感参数值。",
      "在 staging 中用 repository contract parity 测试验证执行器行为。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储执行计划；当前不会打开数据库连接、不会执行 SQL、不会写入数据，也不会切换运行时仓储。",
  };
}

function createReadOnlySmokeTestPlan(repositoryContract = {}, config = {}) {
  const driverPackage = config.driverPackage || defaultDriverPackage;
  const driverAvailable = config.driverAvailable === true;
  const connectionConfigured = Boolean(config.databaseUrl);
  const readOnlyProbeEnabled = config.readOnlyProbeEnabled === true;
  const contractReady = repositoryContract.status === "pass";
  const operationContracts = createOperationContracts(repositoryContract);
  const readOnlyContracts = operationContracts.filter(
    (operation) =>
      operation.accessPattern === "select-one" ||
      operation.accessPattern === "select-many" ||
      operation.accessPattern === "adapter-health",
  );
  const tables = createTableCoverage(repositoryContract);
  const criticalTables = [
    "users",
    "auth_sessions",
    "watchlist_items",
    "portfolio_positions",
    "analysis_results",
    "reminder_rules",
    "notification_outbox",
    "audit_events",
    "auth_role_grants",
    "auth_role_events",
  ].filter((table) => tables.some((entry) => entry.table === table));
  const blockedReasons = [];
  if (!connectionConfigured) blockedReasons.push("缺少生产数据库连接串，不能准备只读冒烟测试。");
  if (!driverAvailable) blockedReasons.push(`数据库驱动 ${driverPackage} 尚未可用，不能执行只读冒烟测试。`);
  if (!readOnlyProbeEnabled) blockedReasons.push("只读探测开关未开启，冒烟测试必须保持跳过。");
  if (!contractReady) blockedReasons.push("仓储接口契约未通过，不能验证生产仓储只读行为。");

  return {
    id: "production-repository-readonly-smoke-plan",
    mode: "read-only-smoke-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-readonly-smoke",
    runtimeMode: "inactive",
    canExecuteAutomatically: false,
    driver: {
      package: driverPackage,
      available: driverAvailable,
    },
    connection: {
      configured: connectionConfigured,
      provider: config.provider || "postgres",
      sslMode: config.sslMode || "required",
    },
    coverage: {
      readOnlyOperationCount: readOnlyContracts.length,
      criticalTableCount: criticalTables.length,
      writeOperationCount: operationContracts.filter((operation) => operation.transactionRequired).length,
    },
    smokeQueries: [
      {
        id: "connectionPing",
        statement: "SELECT 1",
        expected: "returns one row without writing data",
        safety: "read-only",
      },
      {
        id: "transactionReadOnly",
        statement: "SHOW transaction_read_only",
        expected: "returns on when a read-only transaction is active",
        safety: "read-only",
      },
      ...criticalTables.slice(0, 10).map((table) => ({
        id: `tableVisible:${table}`,
        statement: `SELECT COUNT(*) FROM ${table} LIMIT 1`,
        expected: "table is visible to the read-only role",
        safety: "read-only",
      })),
    ],
    checks: [
      {
        id: "connectionConfig",
        status: connectionConfigured ? "pass" : "blocked",
        required: true,
      },
      {
        id: "driverAvailability",
        status: driverAvailable ? "pass" : "blocked",
        required: true,
      },
      {
        id: "readOnlyProbeOptIn",
        status: readOnlyProbeEnabled ? "pass" : "pending",
        required: true,
      },
      {
        id: "repositoryContract",
        status: contractReady ? "pass" : "blocked",
        required: true,
      },
      {
        id: "readOnlyTransaction",
        status: "planned",
        required: true,
      },
      {
        id: "criticalTableVisibility",
        status: criticalTables.length ? "planned" : "blocked",
        required: true,
      },
      {
        id: "writeGuard",
        status: "planned",
        required: true,
      },
      {
        id: "auditTrail",
        status: "planned",
        required: true,
      },
    ],
    criticalTables,
    blockedStatements: ["INSERT", "UPDATE", "DELETE", "ALTER", "DROP", "TRUNCATE", "CREATE"],
    blockedReasons,
    nextSteps: [
      "使用只读数据库账号执行连接 ping 与 transaction_read_only 检查。",
      "抽样验证关键业务表对只读账号可见，但不返回用户敏感明细。",
      "确认写入语句在冒烟测试环境被阻断。",
      "记录冒烟测试审计事件和校验结果，再进入 staging 双读验证。",
    ],
    disclaimer:
      "这是生产仓储只读冒烟测试计划；当前不会连接数据库、不会执行 SQL、不会读取用户真实数据，也不会写库。",
  };
}

function createDualReadVerificationPlan(repositoryContract = {}, config = {}) {
  const smokePlan = createReadOnlySmokeTestPlan(repositoryContract, config);
  const parityEnabled = config.parityVerificationEnabled === true;
  const contractReady = repositoryContract.status === "pass";
  const operationContracts = createOperationContracts(repositoryContract);
  const readOnlyContracts = operationContracts.filter(
    (operation) =>
      operation.accessPattern === "select-one" ||
      operation.accessPattern === "select-many" ||
      operation.accessPattern === "adapter-health",
  );
  const sampleDomains = uniqueStrings(readOnlyContracts.map((operation) => operation.domain)).filter(
    (domain) => domain !== "repositoryStatus",
  );
  const blockedReasons = [];
  if (!contractReady) blockedReasons.push("仓储接口契约未通过，不能进行双读一致性验证。");
  if (smokePlan.status !== "ready-for-readonly-smoke") {
    blockedReasons.push("只读冒烟测试尚未准备好，不能进入双读验证。");
  }
  if (!parityEnabled) {
    blockedReasons.push("双读验证开关未开启，当前不能比较 mock/JSON 与生产仓储结果。");
  }

  return {
    id: "production-repository-dual-read-parity-plan",
    mode: "dual-read-parity-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-staging-parity",
    runtimeMode: "inactive",
    canCompareAutomatically: false,
    mockRepositoryRequired: true,
    productionRepositoryRequired: true,
    parityWindow: {
      environment: "staging-first",
      minimumSampleUsers: 3,
      minimumRuns: 3,
      maxAllowedMismatchPercent: 0,
    },
    comparisonPlan: sampleDomains.slice(0, 10).map((domain) => {
      const operations = readOnlyContracts.filter((operation) => operation.domain === domain);
      return {
        domain,
        table: operations[0]?.table || "",
        methods: uniqueStrings(operations.map((operation) => operation.method)),
        keyStrategy: domain === "auditLog" ? "sequence-and-event-type" : "user-scope-and-record-id",
        status: "planned",
      };
    }),
    ignoredFields: [
      "createdAt",
      "updatedAt",
      "generatedAt",
      "ingestedAt",
      "sentAt",
      "readAt",
      "hash",
      "previousHash",
    ],
    checks: [
      {
        id: "repositoryContract",
        status: contractReady ? "pass" : "blocked",
        required: true,
      },
      {
        id: "readOnlySmoke",
        status: smokePlan.status === "ready-for-readonly-smoke" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "parityOptIn",
        status: parityEnabled ? "pass" : "pending",
        required: true,
      },
      {
        id: "mockFallback",
        status: "pass",
        required: true,
      },
      {
        id: "auditTrail",
        status: "planned",
        required: true,
      },
      {
        id: "zeroMismatchThreshold",
        status: "planned",
        required: true,
      },
      {
        id: "rollbackGate",
        status: "planned",
        required: true,
      },
    ],
    safety: {
      noWrites: true,
      noRuntimeSwitch: true,
      secretsRedacted: true,
      userDataMinimized: true,
      mockFallbackRequired: true,
    },
    blockedReasons,
    nextSteps: [
      "先在 staging 环境启用只读冒烟测试。",
      "使用匿名或测试用户样本执行 mock/JSON 与 PostgreSQL 双读比较。",
      "对允许忽略的时间戳和 hash 字段做规范化后再比较。",
      "任何差异都必须写入审计事件并阻断生产切换。",
      "双读连续通过后，再进入双写或受控迁移演练。",
    ],
    disclaimer:
      "这是生产仓储双读一致性验证计划；当前不会连接数据库、不会读取真实生产数据、不会写库，也不会切换运行时仓储。",
  };
}

function createParityEvidencePlan(repositoryContract = {}, config = {}) {
  const readRehearsalPlan = createReadOnlyQueryRehearsalPlan(repositoryContract, config);
  const parityPlan = createDualReadVerificationPlan(repositoryContract, config);
  const comparisonDomains = Array.isArray(parityPlan.comparisonPlan)
    ? parityPlan.comparisonPlan
    : [];
  const evidenceRecords = comparisonDomains.map((entry) => ({
    id: `${entry.domain}_parity_evidence`,
    domain: entry.domain,
    table: entry.table,
    methods: entry.methods,
    keyStrategy: entry.keyStrategy,
    sampleScope: entry.domain === "auditLog" ? "event-sequence-sample" : "user-scoped-sample",
    expectedOutcome: "zero-mismatch",
    status: parityPlan.status === "ready-for-staging-parity" ? "planned" : "blocked",
  }));
  const blockedReasons = [];
  if (readRehearsalPlan.status !== "ready-for-staging-rehearsal") {
    blockedReasons.push("只读查询预演尚未准备好，不能生成双读证据采集计划。");
  }
  if (parityPlan.status !== "ready-for-staging-parity") {
    blockedReasons.push("双读一致性计划尚未准备好，不能生成差异评估证据。");
  }
  if (!evidenceRecords.length) {
    blockedReasons.push("没有可采集双读证据的数据域。");
  }

  return {
    id: "production-repository-parity-evidence-plan",
    mode: "dual-read-parity-evidence-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-evidence-capture",
    runtimeMode: "inactive",
    canCaptureEvidence: false,
    canReadProductionData: false,
    canWriteData: false,
    evidenceCoverage: {
      domainCount: evidenceRecords.length,
      methodCount: evidenceRecords.reduce((total, record) => total + record.methods.length, 0),
      ignoredFieldCount: parityPlan.ignoredFields.length,
      requiredSuccessfulRuns: parityPlan.parityWindow.minimumRuns,
      maxAllowedMismatchPercent: parityPlan.parityWindow.maxAllowedMismatchPercent,
    },
    evidenceRecords,
    mismatchCategories: [
      { id: "missingRecord", severity: "blocker", action: "block-cutover" },
      { id: "extraRecord", severity: "blocker", action: "block-cutover" },
      { id: "fieldValueMismatch", severity: "blocker", action: "block-cutover" },
      { id: "rowCountMismatch", severity: "blocker", action: "block-cutover" },
      { id: "orderingMismatch", severity: "review", action: "normalize-before-blocking" },
      { id: "ignoredTimestampOrHash", severity: "allowed", action: "normalize-and-ignore" },
    ],
    auditEnvelope: {
      eventTypePrefix: "repository.postgres.parity",
      allowedFields: [
        "domain",
        "method",
        "sampleId",
        "mockRowCount",
        "postgresRowCount",
        "mismatchCount",
        "mismatchCategories",
        "durationMs",
        "status",
      ],
      forbiddenFields: ["rawMockRows", "rawPostgresRows", "rawParameterValues", "connectionString"],
      hashChainRequired: true,
    },
    checks: [
      {
        id: "readRehearsalPlan",
        status: readRehearsalPlan.status === "ready-for-staging-rehearsal" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "parityPlan",
        status: parityPlan.status === "ready-for-staging-parity" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "evidenceDomainCoverage",
        status: evidenceRecords.length ? "pass" : "blocked",
        required: true,
      },
      {
        id: "zeroMismatchThreshold",
        status: parityPlan.parityWindow.maxAllowedMismatchPercent === 0 ? "pass" : "blocked",
        required: true,
      },
      {
        id: "rawDataRedaction",
        status: "pass",
        required: true,
      },
      {
        id: "cutoverBlockOnMismatch",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      noProductionReads: true,
      noWrites: true,
      noRuntimeSwitch: true,
      rawRowsNeverLogged: true,
      rawParameterValuesNeverLogged: true,
      mismatchBlocksCutover: true,
      mockFallbackRequired: true,
    },
    blockedReasons,
    nextSteps: [
      "实现 staging-only parity evidence runner，但默认保持不可执行。",
      "采集证据时只记录行数、差异类别、样本 id、耗时和状态，禁止记录原始行。",
      "任何 blocker 级差异必须阻断双写演练和切换门禁。",
      "将 evidence package 接入审计导出和人工审批流程。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储双读证据与差异评估计划；当前不会连接数据库、不会比较真实记录、不会写库，也不会切换运行时仓储。",
  };
}

function createDualWriteRehearsalPlan(repositoryContract = {}, config = {}) {
  const parityPlan = createDualReadVerificationPlan(repositoryContract, config);
  const rehearsalEnabled = config.dualWriteRehearsalEnabled === true;
  const contractReady = repositoryContract.status === "pass";
  const operationContracts = createOperationContracts(repositoryContract);
  const writeContracts = operationContracts.filter((operation) => operation.transactionRequired);
  const rehearsalDomains = uniqueStrings(writeContracts.map((operation) => operation.domain)).filter(
    (domain) => domain !== "auditLog",
  );
  const blockedReasons = [];
  if (!contractReady) blockedReasons.push("仓储接口契约未通过，不能进行双写演练。");
  if (parityPlan.status !== "ready-for-staging-parity") {
    blockedReasons.push("双读一致性验证尚未准备好，不能进入双写演练。");
  }
  if (!rehearsalEnabled) {
    blockedReasons.push("双写演练开关未开启，当前不能把写入同时发送到 mock/JSON 与生产仓储。");
  }

  return {
    id: "production-repository-dual-write-rehearsal-plan",
    mode: "dual-write-rehearsal-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-controlled-rehearsal",
    runtimeMode: "inactive",
    canWriteAutomatically: false,
    canSwitchAutomatically: false,
    mockPrimaryRequired: true,
    productionShadowWriteOnly: true,
    rehearsalWindow: {
      environment: "staging-first",
      minimumSuccessfulRuns: 3,
      maxAllowedWriteMismatchPercent: 0,
      rollbackOnFirstMismatch: true,
    },
    writePlan: rehearsalDomains.slice(0, 10).map((domain) => {
      const operations = writeContracts.filter((operation) => operation.domain === domain);
      return {
        domain,
        table: operations[0]?.table || "",
        methods: uniqueStrings(operations.map((operation) => operation.method)),
        transactionRequired: true,
        auditRequired: true,
        status: "planned",
      };
    }),
    checks: [
      {
        id: "repositoryContract",
        status: contractReady ? "pass" : "blocked",
        required: true,
      },
      {
        id: "dualReadParity",
        status: parityPlan.status === "ready-for-staging-parity" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "dualWriteOptIn",
        status: rehearsalEnabled ? "pass" : "pending",
        required: true,
      },
      {
        id: "mockPrimary",
        status: "pass",
        required: true,
      },
      {
        id: "transactionAudit",
        status: "planned",
        required: true,
      },
      {
        id: "idempotencyKeys",
        status: "planned",
        required: true,
      },
      {
        id: "rollbackOnMismatch",
        status: "planned",
        required: true,
      },
    ],
    safety: {
      noRuntimeSwitch: true,
      mockRemainsSourceOfTruth: true,
      productionWritesShadowOnly: true,
      requiresAuditTrail: true,
      requiresIdempotencyKeys: true,
      requiresRollbackApproval: true,
    },
    blockedReasons,
    rollbackTriggers: [
      "任一写入结果不一致。",
      "任一事务审计事件缺失。",
      "任一幂等键重复或缺失。",
      "生产 shadow write 延迟超过人工审批阈值。",
    ],
    nextSteps: [
      "先完成 staging 双读一致性验证并归档结果。",
      "只允许测试用户或匿名样本进入双写演练。",
      "mock/JSON 仓储继续作为唯一用户可见数据源。",
      "生产仓储写入仅做 shadow write，所有写入必须有事务、幂等键和审计事件。",
      "连续通过后，再设计受控迁移或 feature-flag 切换方案。",
    ],
    disclaimer:
      "这是生产仓储双写/受控迁移演练计划；当前不会连接数据库、不会写入生产仓储、不会改变用户可见数据源，也不会切换运行时仓储。",
  };
}

function createShadowWriteEvidencePlan(repositoryContract = {}, config = {}) {
  const dualWritePlan = createDualWriteRehearsalPlan(repositoryContract, config);
  const writeDomains = Array.isArray(dualWritePlan.writePlan) ? dualWritePlan.writePlan : [];
  const evidenceRecords = writeDomains.map((entry) => ({
    id: `${entry.domain}_shadow_write_evidence`,
    domain: entry.domain,
    table: entry.table,
    methods: entry.methods,
    transactionRequired: entry.transactionRequired === true,
    auditRequired: entry.auditRequired === true,
    idempotencyKeyRequired: true,
    expectedOutcome: "mock-visible-production-shadow-only",
    status: dualWritePlan.status === "ready-for-controlled-rehearsal" ? "planned" : "blocked",
  }));
  const blockedReasons = [];
  if (dualWritePlan.status !== "ready-for-controlled-rehearsal") {
    blockedReasons.push("双写演练尚未准备好，不能生成影子写证据计划。");
  }
  if (!evidenceRecords.length) {
    blockedReasons.push("没有可采集影子写证据的数据域。");
  }

  return {
    id: "production-repository-shadow-write-evidence-plan",
    mode: "shadow-write-evidence-idempotency-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-shadow-evidence",
    runtimeMode: "inactive",
    canWriteProduction: false,
    canChangeUserVisibleData: false,
    canSwitchRuntime: false,
    evidenceCoverage: {
      domainCount: evidenceRecords.length,
      methodCount: evidenceRecords.reduce((total, record) => total + record.methods.length, 0),
      idempotencyKeyRequiredCount: evidenceRecords.filter((record) => record.idempotencyKeyRequired).length,
      transactionRequiredCount: evidenceRecords.filter((record) => record.transactionRequired).length,
      auditRequiredCount: evidenceRecords.filter((record) => record.auditRequired).length,
      requiredSuccessfulRuns: dualWritePlan.rehearsalWindow.minimumSuccessfulRuns,
      maxAllowedWriteMismatchPercent: dualWritePlan.rehearsalWindow.maxAllowedWriteMismatchPercent,
    },
    evidenceRecords,
    idempotencyPolicy: {
      keySource: "mock-write-operation-id-plus-domain-plus-user-scope",
      duplicateHandling: "block-and-rollback-shadow-write",
      ttlHours: 24,
      requiredForEveryWrite: true,
      rawPayloadHashOnly: true,
    },
    auditEnvelope: {
      eventTypePrefix: "repository.postgres.shadow_write",
      allowedFields: [
        "domain",
        "method",
        "sampleId",
        "idempotencyKeyHash",
        "mockWriteStatus",
        "shadowWriteStatus",
        "rowCount",
        "durationMs",
        "status",
      ],
      forbiddenFields: ["rawPayload", "rawMockRecord", "rawPostgresRecord", "rawParameterValues"],
      hashChainRequired: true,
    },
    checks: [
      {
        id: "dualWriteRehearsalPlan",
        status: dualWritePlan.status === "ready-for-controlled-rehearsal" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "shadowOnly",
        status: "pass",
        required: true,
      },
      {
        id: "mockRemainsSourceOfTruth",
        status: "pass",
        required: true,
      },
      {
        id: "idempotencyKeyCoverage",
        status: evidenceRecords.every((record) => record.idempotencyKeyRequired) ? "pass" : "blocked",
        required: true,
      },
      {
        id: "transactionAudit",
        status: evidenceRecords.every((record) => record.transactionRequired && record.auditRequired)
          ? "pass"
          : "blocked",
        required: true,
      },
      {
        id: "rawPayloadRedaction",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noSqlExecution: true,
      noProductionWrites: true,
      noRuntimeSwitch: true,
      mockRemainsSourceOfTruth: true,
      productionWritesShadowOnly: true,
      idempotencyKeysRequired: true,
      rawPayloadNeverLogged: true,
      mismatchRollsBackShadowWrite: true,
    },
    blockedReasons,
    rollbackTriggers: [
      "任一幂等键重复、缺失或过期。",
      "任一 shadow write 事务审计事件缺失。",
      "任一 mock 可见写入与 production shadow 写入结果不一致。",
      "任一 raw payload 或原始记录进入审计 envelope。",
    ],
    nextSteps: [
      "实现 staging-only shadow write evidence runner，但默认保持不可执行。",
      "所有 shadow write 证据必须使用幂等键 hash、事务审计和 row count，不记录原始 payload。",
      "任一差异或幂等失败必须回滚 shadow write，并阻断切换门禁。",
      "将 shadow write evidence package 接入审计导出和人工审批流程。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储影子写证据与幂等计划；当前不会连接数据库、不会写入生产仓储、不会改变用户可见数据源，也不会切换运行时仓储。",
  };
}

function createBackupRestoreEvidencePlan(repositoryContract = {}, config = {}) {
  const shadowWriteEvidencePlan = createShadowWriteEvidencePlan(repositoryContract, config);
  const backupRestoreVerified = config.backupRestoreVerified === true;
  const tableCoverage = createTableCoverage(repositoryContract).filter((entry) => entry.table);
  const criticalTableCandidates = [
    "users",
    "auth_sessions",
    "watchlist_items",
    "portfolio_positions",
    "user_preferences",
    "reminder_rules",
    "notification_outbox",
    "audit_events",
    "audit_archive_receipts",
  ];
  const mappedTables = uniqueStrings(tableCoverage.map((entry) => entry.table));
  const criticalTables = uniqueStrings([
    ...criticalTableCandidates.filter((table) => mappedTables.includes(table)),
    ...mappedTables.slice(0, 4),
  ]);
  const blockedReasons = [];
  if (shadowWriteEvidencePlan.status !== "ready-for-shadow-evidence") {
    blockedReasons.push("影子写证据计划尚未准备好，不能进入备份恢复演练证据门禁。");
  }
  if (!backupRestoreVerified) {
    blockedReasons.push("备份恢复演练验证尚未记录，不能解除生产仓储切换前的恢复门禁。");
  }
  if (!mappedTables.length) {
    blockedReasons.push("没有可纳入备份恢复演练的数据表。");
  }

  const artifactStatus = backupRestoreVerified ? "verified" : "blocked";
  const rehearsalArtifacts = [
    {
      id: "schemaDump",
      artifactType: "schema",
      required: true,
      encrypted: true,
      checksumRequired: true,
      status: artifactStatus,
    },
    {
      id: "dataSnapshot",
      artifactType: "data",
      required: true,
      encrypted: true,
      checksumRequired: true,
      status: artifactStatus,
    },
    {
      id: "restoreDryRun",
      artifactType: "restore-rehearsal",
      required: true,
      encrypted: true,
      checksumRequired: true,
      status: artifactStatus,
    },
    {
      id: "postRestoreParity",
      artifactType: "checksum-and-parity",
      required: true,
      encrypted: false,
      checksumRequired: true,
      status: artifactStatus,
    },
  ];

  return {
    id: "production-repository-backup-restore-evidence-plan",
    mode: "backup-restore-rehearsal-evidence-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-backup-restore-evidence",
    runtimeMode: "inactive",
    canRunBackup: false,
    canRunRestore: false,
    canTouchProductionData: false,
    backupRestoreVerified,
    recoveryObjectives: {
      targetRpoMinutes: 15,
      targetRtoMinutes: 30,
      minimumSuccessfulRestoreRuns: 2,
      maxAllowedDataLossRecords: 0,
    },
    evidenceCoverage: {
      tableCount: mappedTables.length,
      criticalTableCount: criticalTables.length,
      backupArtifactCount: rehearsalArtifacts.length,
      restoreRunCountRequired: 2,
      checksumRequiredCount: rehearsalArtifacts.filter((artifact) => artifact.checksumRequired).length,
    },
    criticalTables,
    rehearsalArtifacts,
    checks: [
      {
        id: "shadowWriteEvidence",
        status: shadowWriteEvidencePlan.status === "ready-for-shadow-evidence" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "backupRestoreOptIn",
        status: backupRestoreVerified ? "pass" : "pending",
        required: true,
      },
      {
        id: "encryptedBackup",
        status: backupRestoreVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "checksumVerification",
        status: backupRestoreVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "restoreRpoRto",
        status: backupRestoreVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "mockFallbackBeforeCutover",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noBackupExecution: true,
      noRestoreExecution: true,
      noProductionDataAccess: true,
      encryptionRequired: true,
      checksumRequired: true,
      mockFallbackRequired: true,
      cutoverBlockedUntilRestoreVerified: true,
    },
    blockedReasons,
    rollbackTriggers: [
      "任一恢复演练超过 RTO 目标。",
      "任一备份 artifact 校验和不一致。",
      "任一关键表恢复后记录缺失或多出。",
      "任一恢复演练需要访问未脱敏生产数据。",
    ],
    nextSteps: [
      "先在 staging 环境生成加密 schema dump 与 data snapshot。",
      "完成至少两次恢复演练，并记录 RPO、RTO、校验和与关键表记录数。",
      "恢复证据包必须进入审计导出，且不能包含原始敏感 payload。",
      "备份恢复证据通过前，生产仓储切换门禁必须保持阻断。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储备份恢复演练证据计划；当前不会连接数据库、不会执行备份或恢复、不会访问生产数据，也不会切换运行时仓储。",
  };
}

function createCutoverMonitoringEvidencePlan(repositoryContract = {}, config = {}) {
  const backupRestoreEvidencePlan = createBackupRestoreEvidencePlan(repositoryContract, config);
  const monitoringVerified = config.cutoverMonitoringVerified === true;
  const tableCoverage = createTableCoverage(repositoryContract).filter((entry) => entry.table);
  const monitoredTables = uniqueStrings(
    tableCoverage
      .filter((entry) => entry.writeOperationCount > 0 || entry.table === "audit_events")
      .map((entry) => entry.table),
  );
  const blockedReasons = [];
  if (backupRestoreEvidencePlan.status !== "ready-for-backup-restore-evidence") {
    blockedReasons.push("备份恢复证据尚未通过，不能进入切换监控证据门禁。");
  }
  if (!monitoringVerified) {
    blockedReasons.push("切换监控验证尚未记录，不能解除生产仓储切换前的可观测性门禁。");
  }
  if (!monitoredTables.length) {
    blockedReasons.push("没有可纳入切换监控的数据表或写入域。");
  }

  const metricStatus = monitoringVerified ? "verified" : "blocked";
  const metricProbes = [
    {
      id: "writeFailureRate",
      signal: "repository.write.failure_rate",
      threshold: "<=0.1%",
      rollbackOnBreach: true,
      status: metricStatus,
    },
    {
      id: "p95WriteLatency",
      signal: "repository.write.p95_latency_ms",
      threshold: "<=750ms",
      rollbackOnBreach: true,
      status: metricStatus,
    },
    {
      id: "auditHashChainContinuity",
      signal: "audit.hash_chain.continuity",
      threshold: "100%",
      rollbackOnBreach: true,
      status: metricStatus,
    },
    {
      id: "readFallbackHealth",
      signal: "repository.fallback.read_success_rate",
      threshold: ">=99.9%",
      rollbackOnBreach: true,
      status: metricStatus,
    },
    {
      id: "parityMismatchCount",
      signal: "repository.parity.mismatch_count",
      threshold: "0",
      rollbackOnBreach: true,
      status: metricStatus,
    },
  ];

  return {
    id: "production-repository-cutover-monitoring-evidence-plan",
    mode: "cutover-monitoring-evidence-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-monitoring-evidence",
    runtimeMode: "inactive",
    canStartMonitoring: false,
    canReadProductionMetrics: false,
    canSwitchRuntime: false,
    monitoringVerified,
    monitoringWindow: {
      environment: "staging-first",
      preCutoverMinutes: 60,
      postCutoverMinutes: 120,
      rollbackDecisionMinutes: 15,
      minimumHealthyWindows: 2,
    },
    evidenceCoverage: {
      metricCount: metricProbes.length,
      monitoredTableCount: monitoredTables.length,
      alertRouteCount: 3,
      rollbackTriggerCount: metricProbes.filter((probe) => probe.rollbackOnBreach).length,
    },
    monitoredTables,
    metricProbes,
    alertRoutes: [
      { id: "engineeringOnCall", channel: "internal-on-call", required: true, status: metricStatus },
      { id: "productOwner", channel: "manual-approval-thread", required: true, status: metricStatus },
      { id: "auditArchive", channel: "audit-export-package", required: true, status: metricStatus },
    ],
    checks: [
      {
        id: "backupRestoreEvidence",
        status:
          backupRestoreEvidencePlan.status === "ready-for-backup-restore-evidence"
            ? "pass"
            : "blocked",
        required: true,
      },
      {
        id: "monitoringOptIn",
        status: monitoringVerified ? "pass" : "pending",
        required: true,
      },
      {
        id: "alertRouting",
        status: monitoringVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "rollbackOwner",
        status: monitoringVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "auditTrailStreaming",
        status: monitoringVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "mockFallbackBeforeCutover",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noMetricSubscription: true,
      noProductionMetricsRead: true,
      noRuntimeSwitch: true,
      mockFallbackRequired: true,
      alertsRequiredBeforeCutover: true,
      rollbackOwnerRequired: true,
      cutoverBlockedUntilMonitoringVerified: true,
    },
    blockedReasons,
    rollbackTriggers: [
      "写入失败率超过 0.1%。",
      "P95 写入延迟超过 750ms。",
      "审计 hash 链出现断裂或延迟。",
      "mock/json 回退读取成功率低于 99.9%。",
      "双读或切换窗口出现任何一致性差异。",
    ],
    nextSteps: [
      "定义 staging 切换监控 dashboard 与告警路由，但默认保持不可订阅。",
      "将写入失败率、P95 延迟、审计链、回退读取和一致性差异纳入同一个证据包。",
      "记录人工回滚负责人和 15 分钟内决策窗口。",
      "监控证据通过前，生产仓储切换门禁必须保持阻断。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储切换监控证据计划；当前不会连接数据库、不会订阅真实监控、不会读取生产指标，也不会切换运行时仓储。",
  };
}

function createRollbackRehearsalEvidencePlan(repositoryContract = {}, config = {}) {
  const cutoverMonitoringEvidencePlan = createCutoverMonitoringEvidencePlan(repositoryContract, config);
  const rollbackVerified = config.rollbackRehearsalVerified === true;
  const tableCoverage = createTableCoverage(repositoryContract).filter((entry) => entry.table);
  const rollbackTables = uniqueStrings(
    tableCoverage
      .filter((entry) => entry.writeOperationCount > 0 || entry.table === "audit_events")
      .map((entry) => entry.table),
  );
  const blockedReasons = [];
  if (cutoverMonitoringEvidencePlan.status !== "ready-for-monitoring-evidence") {
    blockedReasons.push("切换监控证据尚未通过，不能进入回滚演练证据门禁。");
  }
  if (!rollbackVerified) {
    blockedReasons.push("回滚演练验证尚未记录，不能解除生产仓储切换前的回滚门禁。");
  }
  if (!rollbackTables.length) {
    blockedReasons.push("没有可纳入回滚演练的数据表或写入域。");
  }

  const pathStatus = rollbackVerified ? "verified" : "blocked";
  const rollbackPaths = [
    {
      id: "featureFlagRevert",
      action: "set FINANCE_AI_REPOSITORY_MODE back to mock-or-json",
      expectedDurationMinutes: 2,
      status: pathStatus,
    },
    {
      id: "writeFreeze",
      action: "freeze-postgres-primary-writes",
      expectedDurationMinutes: 3,
      status: pathStatus,
    },
    {
      id: "auditExport",
      action: "export-cutover-window-audit-package",
      expectedDurationMinutes: 5,
      status: pathStatus,
    },
    {
      id: "mockJsonFallback",
      action: "restore-user-visible-source-to-mock-json",
      expectedDurationMinutes: 2,
      status: pathStatus,
    },
    {
      id: "postRollbackParity",
      action: "compare-user-visible-state-after-rollback",
      expectedDurationMinutes: 3,
      status: pathStatus,
    },
  ];

  return {
    id: "production-repository-rollback-rehearsal-evidence-plan",
    mode: "rollback-rehearsal-evidence-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-rollback-evidence",
    runtimeMode: "inactive",
    canRollbackRuntime: false,
    canReplayWrites: false,
    canTouchProductionData: false,
    rollbackVerified,
    rollbackObjectives: {
      rollbackDeadlineMinutes: 15,
      targetRtoMinutes: 10,
      minimumSuccessfulRollbackRuns: 2,
      maxAllowedDataLossRecords: 0,
    },
    evidenceCoverage: {
      rollbackPathCount: rollbackPaths.length,
      rollbackTableCount: rollbackTables.length,
      requiredAuditPackageCount: 1,
      requiredSuccessfulRuns: 2,
    },
    rollbackTables,
    rollbackPaths,
    checks: [
      {
        id: "cutoverMonitoringEvidence",
        status:
          cutoverMonitoringEvidencePlan.status === "ready-for-monitoring-evidence"
            ? "pass"
            : "blocked",
        required: true,
      },
      {
        id: "rollbackRehearsalOptIn",
        status: rollbackVerified ? "pass" : "pending",
        required: true,
      },
      {
        id: "featureFlagRollback",
        status: rollbackVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "writeFreeze",
        status: rollbackVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "auditExport",
        status: rollbackVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "mockJsonFallback",
        status: "pass",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noRuntimeRollback: true,
      noWriteFreezeExecution: true,
      noAuditExportExecution: true,
      noProductionDataAccess: true,
      mockFallbackRequired: true,
      rollbackOwnerRequired: true,
      cutoverBlockedUntilRollbackVerified: true,
    },
    blockedReasons,
    rollbackTriggers: [
      "无法在 15 分钟内恢复 mock/json 为用户可见主源。",
      "回滚演练缺少切换窗口审计导出。",
      "回滚后任一用户状态、自选股、持仓或提醒规则不一致。",
      "PostgreSQL 主写入冻结失败或无法确认。",
    ],
    nextSteps: [
      "在 staging 中演练 feature flag 回退，但默认保持不可执行。",
      "记录回滚负责人、回滚命令、写入冻结、审计导出和回退后校验步骤。",
      "回滚演练证据包必须包含耗时、状态对比和审计包引用，不包含原始敏感 payload。",
      "回滚证据通过前，生产仓储切换门禁必须保持阻断。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储回滚演练证据计划；当前不会连接数据库、不会执行运行时回滚、不会冻结写入、不会导出真实审计包，也不会访问生产数据。",
  };
}

function createCutoverAuditTrailEvidencePlan(repositoryContract = {}, config = {}) {
  const rollbackRehearsalEvidencePlan = createRollbackRehearsalEvidencePlan(repositoryContract, config);
  const auditTrailVerified = config.cutoverAuditTrailVerified === true;
  const allowedFields = [
    "eventType",
    "actorId",
    "approvalId",
    "repositoryMode",
    "previousMode",
    "targetMode",
    "durationMs",
    "status",
    "hash",
    "previousHash",
  ];
  const forbiddenFields = [
    "rawPayload",
    "rawUserRecord",
    "rawPortfolio",
    "rawSql",
    "rawParameterValues",
    "accessToken",
    "refreshToken",
  ];
  const blockedReasons = [];
  if (rollbackRehearsalEvidencePlan.status !== "ready-for-rollback-evidence") {
    blockedReasons.push("回滚演练证据尚未通过，不能进入切换审计链证据门禁。");
  }
  if (!auditTrailVerified) {
    blockedReasons.push("切换审计链验证尚未记录，不能解除生产仓储切换前的审计门禁。");
  }

  const eventStatus = auditTrailVerified ? "verified" : "blocked";
  const auditEvents = [
    {
      id: "cutoverRequested",
      eventType: "repository.cutover.requested",
      status: eventStatus,
    },
    {
      id: "featureFlagChanged",
      eventType: "repository.cutover.feature_flag_changed",
      status: eventStatus,
    },
    {
      id: "fallbackVerified",
      eventType: "repository.cutover.fallback_verified",
      status: eventStatus,
    },
    {
      id: "rollbackRehearsalVerified",
      eventType: "repository.cutover.rollback_rehearsal_verified",
      status: eventStatus,
    },
    {
      id: "postCutoverHealthChecked",
      eventType: "repository.cutover.health_checked",
      status: eventStatus,
    },
  ];

  return {
    id: "production-repository-cutover-audit-trail-evidence-plan",
    mode: "cutover-audit-trail-evidence-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-audit-trail-evidence",
    runtimeMode: "inactive",
    canWriteAudit: false,
    canReadProductionAudit: false,
    canSwitchRuntime: false,
    auditTrailVerified,
    auditObjectives: {
      requiredHashChainContinuityPercent: 100,
      maxAuditLagSeconds: 30,
      minimumRetentionDays: 90,
      requiredExportPackageCount: 1,
    },
    evidenceCoverage: {
      eventTypeCount: auditEvents.length,
      auditFieldCount: allowedFields.length,
      forbiddenFieldCount: forbiddenFields.length,
      requiredPackageCount: 1,
    },
    auditEvents,
    auditEnvelope: {
      allowedFields,
      forbiddenFields,
      hashChainRequired: true,
      exportPackageRequired: true,
    },
    checks: [
      {
        id: "rollbackRehearsalEvidence",
        status:
          rollbackRehearsalEvidencePlan.status === "ready-for-rollback-evidence"
            ? "pass"
            : "blocked",
        required: true,
      },
      {
        id: "auditTrailOptIn",
        status: auditTrailVerified ? "pass" : "pending",
        required: true,
      },
      {
        id: "hashChainContinuity",
        status: auditTrailVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "redactionPolicy",
        status: "pass",
        required: true,
      },
      {
        id: "exportPackage",
        status: auditTrailVerified ? "pass" : "planned",
        required: true,
      },
      {
        id: "retentionPolicy",
        status: auditTrailVerified ? "pass" : "planned",
        required: true,
      },
    ],
    safety: {
      metadataOnly: true,
      noDatabaseConnection: true,
      noAuditWrite: true,
      noProductionAuditRead: true,
      noRawPayloadLogging: true,
      hashChainRequired: true,
      exportPackageRequired: true,
      cutoverBlockedUntilAuditVerified: true,
    },
    blockedReasons,
    rollbackTriggers: [
      "任一切换事件缺少 actor、approval 或 repository mode。",
      "审计 hash 链连续性低于 100%。",
      "审计事件写入延迟超过 30 秒。",
      "审计导出包缺失或包含原始敏感 payload。",
    ],
    nextSteps: [
      "定义切换请求、feature flag 变更、回退确认、回滚演练确认和健康检查审计事件。",
      "验证 hash 链连续性、字段脱敏、导出包和保留策略。",
      "审计链证据包必须进入切换审批材料，且不能包含原始 payload 或密钥。",
      "审计链证据通过前，生产仓储切换门禁必须保持阻断。",
    ],
    disclaimer:
      "这是生产 PostgreSQL 仓储切换审计链证据计划；当前不会连接数据库、不会写入审计记录、不会读取生产审计、不会记录原始 payload，也不会切换运行时仓储。",
  };
}

function createCutoverReadinessPlan(repositoryContract = {}, config = {}) {
  const dualWritePlan = createDualWriteRehearsalPlan(repositoryContract, config);
  const backupRestoreEvidencePlan = createBackupRestoreEvidencePlan(repositoryContract, config);
  const cutoverMonitoringEvidencePlan = createCutoverMonitoringEvidencePlan(repositoryContract, config);
  const rollbackRehearsalEvidencePlan = createRollbackRehearsalEvidencePlan(repositoryContract, config);
  const cutoverAuditTrailEvidencePlan = createCutoverAuditTrailEvidencePlan(repositoryContract, config);
  const cutoverApproved = config.cutoverApproved === true;
  const contractReady = repositoryContract.status === "pass";
  const blockedReasons = [];
  if (!contractReady) blockedReasons.push("仓储接口契约未通过，不能准备生产仓储切换。");
  if (dualWritePlan.status !== "ready-for-controlled-rehearsal") {
    blockedReasons.push("双写/受控迁移演练尚未准备好，不能进入正式切换门禁。");
  }
  if (backupRestoreEvidencePlan.status !== "ready-for-backup-restore-evidence") {
    blockedReasons.push("备份恢复演练证据尚未通过，不能进入正式切换门禁。");
  }
  if (cutoverMonitoringEvidencePlan.status !== "ready-for-monitoring-evidence") {
    blockedReasons.push("切换监控证据尚未通过，不能进入正式切换门禁。");
  }
  if (rollbackRehearsalEvidencePlan.status !== "ready-for-rollback-evidence") {
    blockedReasons.push("回滚演练证据尚未通过，不能进入正式切换门禁。");
  }
  if (cutoverAuditTrailEvidencePlan.status !== "ready-for-audit-trail-evidence") {
    blockedReasons.push("切换审计链证据尚未通过，不能进入正式切换门禁。");
  }
  if (!cutoverApproved) {
    blockedReasons.push("人工切换批准未记录，不能把生产仓储设为主数据源。");
  }

  return {
    id: "production-repository-cutover-plan",
    mode: "feature-flag-cutover-plan",
    status: blockedReasons.length ? "blocked" : "ready-for-manual-cutover",
    runtimeMode: "inactive",
    canSwitchAutomatically: false,
    canWriteAutomatically: false,
    featureFlag: {
      name: "FINANCE_AI_REPOSITORY_MODE",
      current: "mock",
      allowedValues: ["mock", "json", "postgres-readonly", "postgres-shadow", "postgres-primary"],
      target: "postgres-primary",
      requiresManualApproval: true,
    },
    cutoverWindow: {
      environment: "staging-first",
      preferredWindow: "low-traffic-manual-window",
      minimumSuccessfulDualWriteRuns: 3,
      maxAllowedMismatchPercent: 0,
      rollbackDeadlineMinutes: 15,
    },
    checks: [
      {
        id: "repositoryContract",
        status: contractReady ? "pass" : "blocked",
        required: true,
      },
      {
        id: "dualWriteRehearsal",
        status: dualWritePlan.status === "ready-for-controlled-rehearsal" ? "pass" : "blocked",
        required: true,
      },
      {
        id: "humanApproval",
        status: cutoverApproved ? "pass" : "pending",
        required: true,
      },
      {
        id: "backupRestore",
        status:
          backupRestoreEvidencePlan.status === "ready-for-backup-restore-evidence"
            ? "pass"
            : "blocked",
        required: true,
      },
      {
        id: "rollbackPlan",
        status:
          rollbackRehearsalEvidencePlan.status === "ready-for-rollback-evidence"
            ? "pass"
            : "blocked",
        required: true,
      },
      {
        id: "auditTrail",
        status:
          cutoverAuditTrailEvidencePlan.status === "ready-for-audit-trail-evidence"
            ? "pass"
            : "blocked",
        required: true,
      },
      {
        id: "readOnlyFallback",
        status: "planned",
        required: true,
      },
      {
        id: "monitoring",
        status:
          cutoverMonitoringEvidencePlan.status === "ready-for-monitoring-evidence"
            ? "pass"
            : "blocked",
        required: true,
      },
    ],
    safety: {
      noAutomaticSwitch: true,
      mockFallbackRequired: true,
      requiresBackup: true,
      requiresAuditTrail: true,
      requiresHumanApproval: true,
      requiresRollbackPlan: true,
      productionPrimaryWritesDisabled: true,
    },
    rollbackTriggers: [
      "切换后 15 分钟内出现任何写入失败率异常。",
      "任一关键表读写延迟超过审批阈值。",
      "任一审计事件缺失或 hash 链断裂。",
      "用户状态、持仓、自选股或提醒规则出现一致性差异。",
    ],
    rollbackPlan: [
      "立即将 FINANCE_AI_REPOSITORY_MODE 从 postgres-primary 切回 mock 或 json。",
      "冻结生产仓储写入并保留只读诊断窗口。",
      "导出切换窗口内审计事件、错误日志和差异样本。",
      "完成数据差异复核后再决定是否重放或放弃切换窗口写入。",
    ],
    blockedReasons,
    nextSteps: [
      "归档只读冒烟、双读一致性和双写演练结果。",
      "确认备份恢复演练、监控告警和人工回滚负责人。",
      "由管理员在低流量窗口手动批准切换。",
      "切换后保持 mock/json 回退路径，直到生产仓储稳定窗口通过。",
    ],
    disclaimer:
      "这是生产仓储 feature flag 切换计划；当前不会切换运行时仓储、不会把 PostgreSQL 设为主数据源，也不会写入真实生产数据。",
  };
}

export function createProductionPostgresRepositoryAdapter(config = {}) {
  const driverPackage = config.driverPackage || defaultDriverPackage;
  const driverAvailable = config.driverAvailable === true;
  const connectionConfigured = Boolean(config.databaseUrl);
  const readOnlyProbeEnabled = config.readOnlyProbeEnabled === true;

  function status(repositoryContract = {}) {
    const operationContracts = createOperationContracts(repositoryContract);
    const mappedMethods = uniqueStrings(operationContracts.map((operation) => operation.method));
    const requiredMethods = Array.isArray(repositoryContract.requiredMethods) && repositoryContract.requiredMethods.length
      ? repositoryContract.requiredMethods
      : mappedMethods;
    const missingMethods = Array.isArray(repositoryContract.missingMethods)
      ? repositoryContract.missingMethods
      : [];
    const implementedMethods = mappedMethods;
    const missingAdapterMethods = requiredMethods.filter((method) => !implementedMethods.includes(method));
    const blockedReasons = [];
    if (!connectionConfigured) blockedReasons.push("缺少生产数据库连接串。");
    if (!driverAvailable) blockedReasons.push(`数据库驱动 ${driverPackage} 尚未安装或未标记可用。`);
    if (!readOnlyProbeEnabled) blockedReasons.push("只读探测开关未开启，不能验证 adapter 连接。");
    if (repositoryContract.status !== "pass") blockedReasons.push("仓储接口契约未通过。");
    if (missingMethods.length || missingAdapterMethods.length) {
      blockedReasons.push("生产仓储 adapter 方法覆盖不完整。");
    }

    return {
      id: "production-postgres-repository-adapter",
      name: "Production PostgreSQL Repository Adapter Skeleton",
      mode: "planned",
      status: blockedReasons.length ? "blocked" : "ready-for-implementation",
      runtimeMode: "inactive",
      active: false,
      driver: {
        package: driverPackage,
        available: driverAvailable,
      },
      methodCoverage: {
        requiredCount: requiredMethods.length,
        plannedCount: implementedMethods.length,
        missingCount: missingAdapterMethods.length,
        missingMethods: missingAdapterMethods,
      },
      tableCoverage: createTableCoverage(repositoryContract),
      operationContracts,
      transactionPolicy: {
        defaultIsolation: "read committed",
        writeTransactionsRequired: true,
        auditWritesRequireHashChain: true,
        idempotentUpsertsRequired: true,
      },
      sqlStatementPlan: createSqlStatementPlan(repositoryContract, config),
      executionPlan: createExecutionPlan(repositoryContract, config),
      parameterValidationPlan: createParameterValidationPlan(repositoryContract, config),
      connectionPoolPlan: createConnectionPoolPlan(repositoryContract, config),
      connectionProbeTimeoutPolicy: createConnectionProbeTimeoutPolicy(config),
      sqlExecutorPlan: createSqlExecutorPlan(repositoryContract, config),
      resultMappingAuditPlan: createResultMappingAuditPlan(repositoryContract, config),
      readOnlyQueryRehearsalPlan: createReadOnlyQueryRehearsalPlan(repositoryContract, config),
      readOnlySmokeTestPlan: createReadOnlySmokeTestPlan(repositoryContract, config),
      dualReadVerificationPlan: createDualReadVerificationPlan(repositoryContract, config),
      parityEvidencePlan: createParityEvidencePlan(repositoryContract, config),
      dualWriteRehearsalPlan: createDualWriteRehearsalPlan(repositoryContract, config),
      shadowWriteEvidencePlan: createShadowWriteEvidencePlan(repositoryContract, config),
      backupRestoreEvidencePlan: createBackupRestoreEvidencePlan(repositoryContract, config),
      cutoverMonitoringEvidencePlan: createCutoverMonitoringEvidencePlan(repositoryContract, config),
      rollbackRehearsalEvidencePlan: createRollbackRehearsalEvidencePlan(repositoryContract, config),
      cutoverAuditTrailEvidencePlan: createCutoverAuditTrailEvidencePlan(repositoryContract, config),
      cutoverReadinessPlan: createCutoverReadinessPlan(repositoryContract, config),
      safety: {
        noNetworkCalls: true,
        noRuntimeSwitch: true,
        noWrites: true,
        secretsRedacted: true,
        requiresReadOnlySmokeTest: true,
        requiresMigrationApproval: true,
        requiresTimeboxedReadOnlyProbe: true,
      },
      blockedReasons,
      implementationSteps: [
        "安装并锁定 PostgreSQL driver 版本。",
        "实现每个 operation contract 对应的参数化 SQL。",
        "所有写入必须进入事务并记录审计事件。",
        "用 staging 数据执行 repository contract parity test。",
        "通过只读 smoke test、迁移审批和回滚演练后再考虑 runtime 切换。",
      ],
      disclaimer:
        "这是生产 PostgreSQL 仓储适配器骨架；当前不会导入数据库驱动、不会联网、不会写库，也不会替换 mock repository。",
    };
  }

  return {
    id: "production-postgres-repository-adapter",
    status,
    readOnlySmokeTestPlan(repositoryContract = {}) {
      return createReadOnlySmokeTestPlan(repositoryContract, config);
    },
    sqlStatementPlan(repositoryContract = {}) {
      return createSqlStatementPlan(repositoryContract, config);
    },
    executionPlan(repositoryContract = {}) {
      return createExecutionPlan(repositoryContract, config);
    },
    parameterValidationPlan(repositoryContract = {}) {
      return createParameterValidationPlan(repositoryContract, config);
    },
    connectionPoolPlan(repositoryContract = {}) {
      return createConnectionPoolPlan(repositoryContract, config);
    },
    sqlExecutorPlan(repositoryContract = {}) {
      return createSqlExecutorPlan(repositoryContract, config);
    },
    resultMappingAuditPlan(repositoryContract = {}) {
      return createResultMappingAuditPlan(repositoryContract, config);
    },
    readOnlyQueryRehearsalPlan(repositoryContract = {}) {
      return createReadOnlyQueryRehearsalPlan(repositoryContract, config);
    },
    dualReadVerificationPlan(repositoryContract = {}) {
      return createDualReadVerificationPlan(repositoryContract, config);
    },
    parityEvidencePlan(repositoryContract = {}) {
      return createParityEvidencePlan(repositoryContract, config);
    },
    dualWriteRehearsalPlan(repositoryContract = {}) {
      return createDualWriteRehearsalPlan(repositoryContract, config);
    },
    shadowWriteEvidencePlan(repositoryContract = {}) {
      return createShadowWriteEvidencePlan(repositoryContract, config);
    },
    backupRestoreEvidencePlan(repositoryContract = {}) {
      return createBackupRestoreEvidencePlan(repositoryContract, config);
    },
    cutoverMonitoringEvidencePlan(repositoryContract = {}) {
      return createCutoverMonitoringEvidencePlan(repositoryContract, config);
    },
    rollbackRehearsalEvidencePlan(repositoryContract = {}) {
      return createRollbackRehearsalEvidencePlan(repositoryContract, config);
    },
    cutoverAuditTrailEvidencePlan(repositoryContract = {}) {
      return createCutoverAuditTrailEvidencePlan(repositoryContract, config);
    },
    cutoverReadinessPlan(repositoryContract = {}) {
      return createCutoverReadinessPlan(repositoryContract, config);
    },
  };
}
