export type Language = "javascript" | "python" | "cpp";
export type RunStatus =
  | "passed"
  | "failed"
  | "compile_error"
  | "runtime_error"
  | "timeout"
  | "provider_error";

export interface MissionTest {
  id: string;
  label: string;
  expression: string;
  actualExpression?: string;
  expected: string;
  feedback: string;
}

export interface MissionExample {
  id: string;
  label: string;
  input: string;
  output: string;
  explanation: string;
}

export interface TestResult {
  id: string;
  label: string;
  passed: boolean;
  expected: string;
  actual?: string;
  feedback?: string;
  hidden?: boolean;
}

export interface RunResult {
  id: string;
  status: RunStatus;
  stdout: string;
  stderr: string;
  diagnostics: Array<{
    line?: number;
    column?: number;
    severity: "error" | "warning" | "info";
    message: string;
  }>;
  tests: TestResult[];
  durationMs?: number;
  memoryKb?: number;
  createdAt: string;
}
