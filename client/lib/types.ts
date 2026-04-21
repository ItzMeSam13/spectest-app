export interface TestResult {
  id: number;
  requirement: string;
  reqId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  payload: string;
  statusCode: number;
  expected: number;
  result: "passed" | "failed" | "pending" | "running";
  time: number;
  selfHealed: boolean;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export interface RequirementGap {
  id: string;
  type: "GAP" | "DRIFT";
  reqId: string;
  title: string;
  description: string;
  aiAnalysis: string;
  selfHealed: boolean;
}

export interface AgentLog {
  type: string;
  level: string;
  message: string;
}
