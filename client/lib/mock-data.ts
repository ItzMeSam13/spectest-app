// SpecTest Mock Data

export type RunStatus = "completed" | "running" | "failed";
export type TestResult = "passed" | "failed" | "pending" | "running";
export type SecuritySeverity = "HIGH" | "MEDIUM" | "LOW" | "PASS" | "WARN";
export type Priority = "P0" | "P1" | "P2";

export interface TestRun {
  id: string;
  project: string;
  specScore: number;
  tests: number;
  passed: number;
  gaps: number;
  securityIssues: number;
  date: string;
  duration: string;
  status: RunStatus;
}

export interface TestResultRow {
  id: number;
  requirement: string;
  reqId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  payload: string;
  statusCode: number;
  expected: number;
  result: TestResult;
  time: number;
  selfHealed: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export interface GapItem {
  id: string;
  type: "GAP" | "DRIFT";
  reqId: string;
  title: string;
  description: string;
  aiAnalysis: string;
  selfHealed: boolean;
}

export interface SecurityFinding {
  id: string;
  severity: SecuritySeverity;
  title: string;
  endpoint: string;
  method: string;
  payload: string;
  response: string;
  meaning: string;
  fix: string;
}

export interface Recommendation {
  id: string;
  priority: Priority;
  title: string;
  description: string;
  codeExample: string;
  resolved: boolean;
}

export interface RunDetails {
  id: string;
  project: string;
  specScore: number;
  status: RunStatus;
  startTime: string;
  endTime: string;
  duration: string;
  scores: {
    requirementsCoverage: number;
    securityPosture: number;
    documentationHealth: number;
    authRobustness: number;
  };
  summary: {
    totalRequirements: number;
    totalTests: number;
    passed: number;
    failed: number;
    gaps: number;
    vulnerabilities: number;
  };
  testResults: TestResultRow[];
  gaps: GapItem[];
  security: SecurityFinding[];
  recommendations: Recommendation[];
}

export const mockRuns: TestRun[] = [
  {
    id: "run-247",
    project: "E-Commerce API v2.1",
    specScore: 87,
    tests: 18,
    passed: 16,
    gaps: 2,
    securityIssues: 0,
    date: "2026-04-21T14:32:00Z",
    duration: "3m 12s",
    status: "completed",
  },
  {
    id: "run-246",
    project: "Auth Service",
    specScore: 73,
    tests: 12,
    passed: 9,
    gaps: 3,
    securityIssues: 1,
    date: "2026-04-20T11:15:00Z",
    duration: "2m 45s",
    status: "completed",
  },
  {
    id: "run-245",
    project: "Payment Gateway",
    specScore: 91,
    tests: 24,
    passed: 22,
    gaps: 1,
    securityIssues: 0,
    date: "2026-04-19T09:00:00Z",
    duration: "5m 08s",
    status: "completed",
  },
  {
    id: "run-244",
    project: "User Profile API",
    specScore: 58,
    tests: 10,
    passed: 6,
    gaps: 4,
    securityIssues: 2,
    date: "2026-04-18T16:45:00Z",
    duration: "2m 30s",
    status: "failed",
  },
  {
    id: "run-243",
    project: "Order Management",
    specScore: 82,
    tests: 15,
    passed: 13,
    gaps: 2,
    securityIssues: 0,
    date: "2026-04-17T13:20:00Z",
    duration: "4m 01s",
    status: "completed",
  },
  {
    id: "run-242",
    project: "Notification Service",
    specScore: 65,
    tests: 8,
    passed: 6,
    gaps: 2,
    securityIssues: 1,
    date: "2026-04-16T10:10:00Z",
    duration: "1m 55s",
    status: "completed",
  },
  {
    id: "run-241",
    project: "Analytics API",
    specScore: 79,
    tests: 20,
    passed: 16,
    gaps: 3,
    securityIssues: 1,
    date: "2026-04-15T08:30:00Z",
    duration: "4m 22s",
    status: "completed",
  },
];

export const mockRunDetails: RunDetails = {
  id: "run-246",
  project: "Auth Service",
  specScore: 73,
  status: "completed",
  startTime: "2026-04-20T11:12:15Z",
  endTime: "2026-04-20T11:15:00Z",
  duration: "2m 45s",
  scores: {
    requirementsCoverage: 78,
    securityPosture: 95,
    documentationHealth: 62,
    authRobustness: 100,
  },
  summary: {
    totalRequirements: 8,
    totalTests: 18,
    passed: 14,
    failed: 4,
    gaps: 3,
    vulnerabilities: 1,
  },
  testResults: [
    {
      id: 1,
      reqId: "REQ-01",
      requirement: "User can register with email/password",
      method: "POST",
      endpoint: "/auth/register",
      payload: '{"email":"test@example.com","password":"Test1234!"}',
      statusCode: 201,
      expected: 201,
      result: "passed",
      time: 142,
      selfHealed: false,
      requestHeaders: { "Content-Type": "application/json", "Accept": "application/json" },
      requestBody: '{\n  "email": "test@example.com",\n  "password": "Test1234!",\n  "name": "Test User"\n}',
      responseHeaders: { "Content-Type": "application/json", "X-Request-Id": "abc-123" },
      responseBody: '{\n  "id": "usr_9f3k2",\n  "email": "test@example.com",\n  "created_at": "2026-04-20T11:12:16Z"\n}',
    },
    {
      id: 2,
      reqId: "REQ-02",
      requirement: "User can login and receive JWT token",
      method: "POST",
      endpoint: "/auth/login",
      payload: '{"email":"test@example.com","password":"Test1234!"}',
      statusCode: 200,
      expected: 200,
      result: "passed",
      time: 98,
      selfHealed: true,
      requestHeaders: { "Content-Type": "application/json" },
      requestBody: '{\n  "email": "test@example.com",\n  "password": "Test1234!"\n}',
      responseHeaders: { "Content-Type": "application/json" },
      responseBody: '{\n  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "token_type": "bearer",\n  "expires_in": 3600\n}',
    },
    {
      id: 3,
      reqId: "REQ-02",
      requirement: "Login fails with wrong password",
      method: "POST",
      endpoint: "/auth/login",
      payload: '{"email":"test@example.com","password":"wrongpass"}',
      statusCode: 401,
      expected: 401,
      result: "passed",
      time: 76,
      selfHealed: false,
      requestHeaders: { "Content-Type": "application/json" },
      requestBody: '{\n  "email": "test@example.com",\n  "password": "wrongpass"\n}',
      responseHeaders: { "Content-Type": "application/json" },
      responseBody: '{\n  "error": "invalid_credentials",\n  "message": "Email or password is incorrect"\n}',
    },
    {
      id: 4,
      reqId: "REQ-04",
      requirement: "Get current user profile",
      method: "GET",
      endpoint: "/users/me",
      payload: "",
      statusCode: 200,
      expected: 200,
      result: "passed",
      time: 55,
      selfHealed: false,
      requestHeaders: { "Authorization": "Bearer eyJhbGci...", "Accept": "application/json" },
      requestBody: "",
      responseHeaders: { "Content-Type": "application/json" },
      responseBody: '{\n  "id": "usr_9f3k2",\n  "email": "test@example.com",\n  "name": "Test User",\n  "role": "user"\n}',
    },
    {
      id: 5,
      reqId: "REQ-05",
      requirement: "Update user profile information",
      method: "PUT",
      endpoint: "/users/me",
      payload: '{"name":"Updated Name"}',
      statusCode: 200,
      expected: 200,
      result: "passed",
      time: 112,
      selfHealed: false,
      requestHeaders: { "Authorization": "Bearer eyJhbGci...", "Content-Type": "application/json" },
      requestBody: '{\n  "name": "Updated Name",\n  "bio": "Software Engineer"\n}',
      responseHeaders: { "Content-Type": "application/json" },
      responseBody: '{\n  "id": "usr_9f3k2",\n  "name": "Updated Name",\n  "updated_at": "2026-04-20T11:12:45Z"\n}',
    },
    {
      id: 6,
      reqId: "REQ-07",
      requirement: "Refresh access token using refresh token",
      method: "POST",
      endpoint: "/auth/refresh",
      payload: '{"refresh_token":"..."}',
      statusCode: 200,
      expected: 200,
      result: "passed",
      time: 88,
      selfHealed: false,
      requestHeaders: { "Content-Type": "application/json" },
      requestBody: '{\n  "refresh_token": "rt_abc123xyz"\n}',
      responseHeaders: { "Content-Type": "application/json" },
      responseBody: '{\n  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "expires_in": 3600\n}',
    },
    {
      id: 7,
      reqId: "REQ-08",
      requirement: "Logout invalidates token",
      method: "POST",
      endpoint: "/auth/logout",
      payload: "",
      statusCode: 204,
      expected: 204,
      result: "passed",
      time: 45,
      selfHealed: false,
      requestHeaders: { "Authorization": "Bearer eyJhbGci..." },
      requestBody: "",
      responseHeaders: {},
      responseBody: "",
    },
    {
      id: 8,
      reqId: "REQ-04",
      requirement: "Unauthenticated request to /users/me returns 401",
      method: "GET",
      endpoint: "/users/me",
      payload: "",
      statusCode: 200,
      expected: 401,
      result: "failed",
      time: 34,
      selfHealed: false,
      requestHeaders: { "Accept": "application/json" },
      requestBody: "",
      responseHeaders: { "Content-Type": "application/json" },
      responseBody: '{\n  "error": "Missing or invalid authentication"\n}',
    },
  ],
  gaps: [
    {
      id: "gap-1",
      type: "GAP",
      reqId: "REQ-03",
      title: "Admin can delete any user",
      description: "No matching endpoint found in the API specification.",
      aiAnalysis:
        "This requirement implies a DELETE endpoint with admin role validation. Consider adding DELETE /users/{id} with admin scope enforced via middleware. The response should return 204 No Content on success and 403 Forbidden if the requesting user lacks admin privileges.",
      selfHealed: false,
    },
    {
      id: "gap-2",
      type: "DRIFT",
      reqId: "REQ-06",
      title: "Returns JWT on login",
      description: "Endpoint exists but returns different field name than documented.",
      aiAnalysis:
        "The /auth/login endpoint returns 'access_token' but the specification defines the field as 'token'. This naming mismatch caused the initial test to fail with a key-not-found error. The agent self-healed by detecting the actual key name from the response and retrying. Update your spec to match the implementation or vice versa.",
      selfHealed: true,
    },
    {
      id: "gap-3",
      type: "GAP",
      reqId: "REQ-09",
      title: "Password reset via email link",
      description: "No /auth/password-reset or /auth/forgot-password endpoint found.",
      aiAnalysis:
        "The requirements document mentions password reset functionality but no corresponding endpoint exists in the OpenAPI spec. This is a common omission. Add POST /auth/forgot-password (accepts email) and POST /auth/reset-password (accepts token + new password).",
      selfHealed: false,
    },
  ],
  security: [
    {
      id: "sec-1",
      severity: "HIGH",
      title: "SQL Injection on POST /users/search",
      endpoint: "/users/search",
      method: "POST",
      payload: '{"query": "admin\' OR \'1\'=\'1"}',
      response: '{"users": [...all users returned...], "count": 247}',
      meaning:
        "The search endpoint appears to interpolate user input directly into a SQL query without parameterization. This allows an attacker to extract all user records by injecting a tautology.",
      fix: "Use parameterized queries or an ORM. Never concatenate user input into SQL strings. Example: db.query('SELECT * FROM users WHERE name = $1', [query])",
    },
    {
      id: "sec-2",
      severity: "WARN",
      title: "No rate limiting on POST /auth/login",
      endpoint: "/auth/login",
      method: "POST",
      payload: "1000 rapid requests",
      response: "All 1000 requests returned 200 or 401 — no throttling observed",
      meaning:
        "Without rate limiting, an attacker can perform credential stuffing or brute-force attacks against the login endpoint indefinitely.",
      fix: "Implement rate limiting (e.g. 5 attempts per minute per IP). Use exponential backoff and temporary lockout after repeated failures. Consider a CAPTCHA after 3 failed attempts.",
    },
    {
      id: "sec-3",
      severity: "PASS",
      title: "XSS on POST /comments",
      endpoint: "/comments",
      method: "POST",
      payload: '{"content": "<script>alert(1)</script>"}',
      response: "200 OK — content stored as escaped HTML entity",
      meaning: "The endpoint correctly sanitizes HTML special characters before storage.",
      fix: "No action required. Current implementation is safe.",
    },
    {
      id: "sec-4",
      severity: "PASS",
      title: "Auth bypass on GET /admin/users",
      endpoint: "/admin/users",
      method: "GET",
      payload: "Request without Authorization header",
      response: "403 Forbidden — access correctly denied",
      meaning: "Admin endpoint correctly rejects unauthenticated requests.",
      fix: "No action required.",
    },
    {
      id: "sec-5",
      severity: "PASS",
      title: "JWT signature validation",
      endpoint: "/users/me",
      method: "GET",
      payload: "Modified JWT token with invalid signature",
      response: "401 Unauthorized — token rejected",
      meaning: "Token signature is correctly validated server-side.",
      fix: "No action required.",
    },
  ],
  recommendations: [
    {
      id: "rec-1",
      priority: "P0",
      title: "Fix SQL injection vulnerability in user search",
      description:
        "A critical SQL injection vulnerability was found in POST /users/search. This allows attackers to extract your entire user database. This must be fixed immediately before any further deployment.",
      codeExample:
        "// UNSAFE\nconst query = `SELECT * FROM users WHERE name = '${req.body.query}'`;\n\n// SAFE\nconst query = 'SELECT * FROM users WHERE name = $1';\nconst result = await db.query(query, [req.body.query]);",
      resolved: false,
    },
    {
      id: "rec-2",
      priority: "P1",
      title: "Implement rate limiting on authentication endpoints",
      description:
        "The /auth/login endpoint has no rate limiting, making it vulnerable to brute-force and credential stuffing attacks. Add rate limiting of 5 requests per minute per IP.",
      codeExample:
        "// Using express-rate-limit\nimport rateLimit from 'express-rate-limit';\n\nconst loginLimiter = rateLimit({\n  windowMs: 60 * 1000, // 1 minute\n  max: 5,\n  message: { error: 'Too many login attempts' }\n});\n\napp.post('/auth/login', loginLimiter, loginHandler);",
      resolved: false,
    },
    {
      id: "rec-3",
      priority: "P1",
      title: "Add DELETE /users/{id} admin endpoint",
      description:
        "REQ-03 requires admin user deletion capability but no endpoint exists. Add a properly authorized DELETE endpoint.",
      codeExample:
        "// DELETE /users/:id\nrouter.delete('/users/:id',\n  requireAuth,\n  requireRole('admin'),\n  async (req, res) => {\n    await User.delete(req.params.id);\n    res.status(204).send();\n  }\n);",
      resolved: false,
    },
    {
      id: "rec-4",
      priority: "P1",
      title: "Implement password reset flow",
      description:
        "REQ-09 specifies a password reset feature but no endpoints exist. Add forgot-password and reset-password endpoints.",
      codeExample:
        "// POST /auth/forgot-password\n// Accepts: { email: string }\n// Sends reset email with signed token\n\n// POST /auth/reset-password  \n// Accepts: { token: string, password: string }\n// Validates token, updates password",
      resolved: false,
    },
    {
      id: "rec-5",
      priority: "P2",
      title: "Align field naming between spec and implementation",
      description:
        "The login response uses 'access_token' but the spec documents 'token'. Standardize on one convention throughout your API to avoid client integration issues.",
      codeExample:
        '// Update OpenAPI spec to match implementation:\nresponses:\n  200:\n    content:\n      application/json:\n        schema:\n          properties:\n            access_token:  # was: token\n              type: string',
      resolved: false,
    },
  ],
};

export const specScoreTrend = [
  { run: "Run 241", score: 79 },
  { run: "Run 242", score: 65 },
  { run: "Run 243", score: 82 },
  { run: "Run 244", score: 58 },
  { run: "Run 245", score: 91 },
  { run: "Run 246", score: 73 },
  { run: "Run 247", score: 87 },
];

export const mockLogLines = [
  { type: "INFO", level: "INFO", message: "SpecTest Agent initializing..." },
  { type: "INFO", level: "INFO", message: "Loading configuration and credentials" },
  { type: "READER", level: "READER", message: "Parsing requirements document... (auth-requirements.pdf)" },
  { type: "READER", level: "READER", message: "Extracted 8 requirements from document" },
  { type: "READER", level: "READER", message: "REQ-01: User registration with email/password" },
  { type: "READER", level: "READER", message: "REQ-02: Login and JWT token issuance" },
  { type: "READER", level: "READER", message: "REQ-03: Admin user deletion" },
  { type: "READER", level: "READER", message: "REQ-04: Authenticated profile retrieval" },
  { type: "READER", level: "READER", message: "REQ-05: Profile update" },
  { type: "READER", level: "READER", message: "REQ-06: JWT returned on login (field: token)" },
  { type: "READER", level: "READER", message: "REQ-07: Token refresh" },
  { type: "READER", level: "READER", message: "REQ-08: Logout and token invalidation" },
  { type: "READER", level: "READER", message: "Parsing OpenAPI spec... (auth-api.yaml)" },
  { type: "READER", level: "READER", message: "Found 6 endpoints in specification" },
  { type: "PLANNER", level: "PLANNER", message: "Starting requirement-to-endpoint mapping..." },
  { type: "PLANNER", level: "PLANNER", message: "Mapping REQ-01 → POST /auth/register [HIGH confidence]" },
  { type: "PLANNER", level: "PLANNER", message: "Mapping REQ-02 → POST /auth/login [HIGH confidence]" },
  { type: "PLANNER", level: "PLANNER", message: "Mapping REQ-03 → ??? [NO MATCH FOUND — flagging as gap]" },
  { type: "PLANNER", level: "PLANNER", message: "Mapping REQ-04 → GET /users/me [HIGH confidence]" },
  { type: "PLANNER", level: "PLANNER", message: "Mapping REQ-05 → PUT /users/me [HIGH confidence]" },
  { type: "PLANNER", level: "PLANNER", message: "Mapping REQ-06 → POST /auth/login [MEDIUM confidence — field mismatch]" },
  { type: "PLANNER", level: "PLANNER", message: "Mapping REQ-07 → POST /auth/refresh [HIGH confidence]" },
  { type: "PLANNER", level: "PLANNER", message: "Mapping REQ-08 → POST /auth/logout [HIGH confidence]" },
  { type: "PLANNER", level: "PLANNER", message: "Generated 18 test cases across 6 endpoints" },
  { type: "PLANNER", level: "PLANNER", message: "Resolving dependency chain: login → profile → update → logout" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Starting test execution..." },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 1/18: POST /auth/register" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Test passed — 201 Created (142ms)" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 2/18: POST /auth/login (happy path)" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Test passed — 200 OK (98ms)" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 3/18: POST /auth/login (wrong password)" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Test passed — 401 Unauthorized (76ms)" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 4/18: GET /users/me (authenticated)" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Test passed — 200 OK (55ms)" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 5/18: GET /users/me (unauthenticated)" },
  { type: "FAIL", level: "EXECUTOR", message: "✗ Test failed — Expected 401, got 200 (34ms)" },
  { type: "REVIEWER", level: "REVIEWER", message: "⚠ Self-healing attempt: checking response for auth middleware bypass" },
  { type: "REVIEWER", level: "REVIEWER", message: "Analysis: missing auth middleware on GET /users/me — logging as finding" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 6/18: PUT /users/me" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Test passed — 200 OK (112ms)" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 7/18: REQ-06 field validation — checking for 'token' key" },
  { type: "FAIL", level: "EXECUTOR", message: "✗ Test failed — Field 'token' not found in response body" },
  { type: "REVIEWER", level: "REVIEWER", message: "⚠ Self-healing: scanning response for alternative field names..." },
  { type: "REVIEWER", level: "REVIEWER", message: "Found 'access_token' — retrying test with adapted assertion" },
  { type: "HEAL", level: "REVIEWER", message: "✓ Self-healed successfully — Test now passes with 'access_token'" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 8/18: POST /auth/refresh" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Test passed — 200 OK (88ms)" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 9/18: POST /auth/logout" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Test passed — 204 No Content (45ms)" },
  { type: "SECURITY", level: "SECURITY", message: "🔴 Vulnerability detected! SQL Injection on POST /users/search" },
  { type: "SECURITY", level: "SECURITY", message: "   Payload: {\"query\": \"admin' OR '1'='1\"} → returned all 247 users" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 10/18: POST /auth/login (rate limit check)" },
  { type: "WARN", level: "REVIEWER", message: "⚠ No rate limiting detected after 20 rapid requests" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 11/18: XSS on POST /comments" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Security test passed — XSS payload sanitized (67ms)" },
  { type: "EXECUTOR", level: "EXECUTOR", message: "Test 12/18: Auth bypass on GET /admin/users" },
  { type: "PASS", level: "EXECUTOR", message: "✓ Security test passed — 403 Forbidden (42ms)" },
  { type: "REPORTER", level: "REPORTER", message: "Generating final report..." },
  { type: "REPORTER", level: "REPORTER", message: "SpecScore calculation: 73/100" },
  { type: "REPORTER", level: "REPORTER", message: "Requirements Coverage: 78% | Security Posture: 95%" },
  { type: "REPORTER", level: "REPORTER", message: "Documentation Health: 62% | Auth Robustness: 100%" },
  { type: "REPORTER", level: "REPORTER", message: "Identified 3 gaps, 1 vulnerability, 2 self-heals" },
  { type: "INFO", level: "INFO", message: "✓ Run complete. Results available below." },
];
