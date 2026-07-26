import { buildJudge0Source } from "./harness.ts";
import type {
  Language,
  MissionTest,
  RunResult,
  RunStatus,
  TestResult,
} from "./types.ts";

const LANGUAGE_IDS: Record<Language, number> = {
  javascript: 102,
  python: 100,
  cpp: 105,
};

interface Judge0Response {
  token?: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  status?: { id: number; description: string };
}

function providerStatus(response: Judge0Response): RunStatus {
  const id = response.status?.id;
  if (id === 3) return "passed";
  if (id === 5) return "timeout";
  if (id === 6) return "compile_error";
  if (id !== undefined && id >= 7 && id <= 12) return "runtime_error";
  return "failed";
}

function parseDiagnostics(output: string): RunResult["diagnostics"] {
  const diagnostics: RunResult["diagnostics"] = [];
  for (const line of output.split("\n")) {
    const cpp = line.match(/:(\d+):(\d+):\s+(error|warning):\s+(.+)/);
    const python = line.match(/line\s+(\d+)/);
    if (cpp) {
      diagnostics.push({
        line: Number(cpp[1]),
        column: Number(cpp[2]),
        severity: cpp[3] === "warning" ? "warning" : "error",
        message: cpp[4],
      });
    } else if (python) {
      diagnostics.push({
        line: Number(python[1]),
        severity: "error",
        message: line.trim(),
      });
    }
  }
  return diagnostics.slice(0, 20);
}

function parseTests(
  language: Language,
  stdout: string,
  tests: MissionTest[],
): TestResult[] {
  if (language === "cpp") {
    const sourceTests = new Map(tests.map((entry) => [entry.id, entry]));
    return stdout
      .split("\n")
      .filter((line) => line.startsWith("__TOMATIN_TEST__"))
      .flatMap((line) => {
        try {
          const separator = line.indexOf("|");
          const metadata = JSON.parse(line.slice(separator + 1)) as {
            id: string;
            label: string;
            expected: string;
            feedback: string;
          };
          const source = sourceTests.get(metadata.id);
          const passed =
            line.slice("__TOMATIN_TEST__".length, separator) === "1";
          return [{
            id: metadata.id,
            label: metadata.label,
            passed,
            expected: metadata.expected,
            feedback: passed ? undefined : source?.feedback ?? metadata.feedback,
          }];
        } catch {
          return [];
        }
      });
  }

  const marker = stdout
    .split("\n")
    .find((line) => line.startsWith("__TOMATIN_RESULTS__"));
  if (!marker) return [];
  try {
    return JSON.parse(marker.slice("__TOMATIN_RESULTS__".length)) as TestResult[];
  } catch {
    return [];
  }
}

function cleanStdout(stdout: string): string {
  return stdout
    .split("\n")
    .filter(
      (line) =>
        !line.startsWith("__TOMATIN_RESULTS__") &&
        !line.startsWith("__TOMATIN_TEST__"),
    )
    .join("\n")
    .trim();
}

function judgeHeaders(): HeadersInit {
  const apiKey = Deno.env.get("JUDGE0_API_KEY");
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "X-Auth-Token": apiKey } : {}),
  };
}

async function waitForSubmission(
  baseUrl: string,
  initial: Judge0Response,
  signal: AbortSignal,
): Promise<Judge0Response> {
  if (initial.status || !initial.token) return initial;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const response = await fetch(
      `${baseUrl}/submissions/${initial.token}?base64_encoded=false`,
      { headers: judgeHeaders(), signal },
    );
    if (!response.ok) throw new Error(`Judge0 respondió ${response.status}.`);
    const payload = (await response.json()) as Judge0Response;
    if (payload.status && payload.status.id > 2) return payload;
  }
  throw new DOMException("Tiempo de ejecución agotado.", "TimeoutError");
}

function protectHiddenResults(
  results: TestResult[],
  hiddenTests: MissionTest[],
): TestResult[] {
  const hidden = new Map(hiddenTests.map((test, index) => [test.id, { test, index }]));
  return results.map((result) => {
    const match = hidden.get(result.id);
    if (!match) return result;
    return {
      id: `hidden-${match.index + 1}`,
      label: `Test oculto ${match.index + 1}`,
      passed: result.passed,
      expected: "Comportamiento esperado protegido",
      feedback: result.passed ? undefined : match.test.feedback,
      hidden: true,
    };
  });
}

export async function executeJudge0(
  language: Language,
  code: string,
  publicTests: MissionTest[],
  hiddenTests: MissionTest[] = [],
): Promise<RunResult> {
  const startedAt = performance.now();
  const tests = [...publicTests, ...hiddenTests];
  const baseUrl = (Deno.env.get("JUDGE0_URL") ?? "https://ce.judge0.com")
    .replace(/\/$/, "");
  const signal = AbortSignal.timeout(20_000);

  try {
    const response = await fetch(
      `${baseUrl}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: judgeHeaders(),
        signal,
        body: JSON.stringify({
          language_id: LANGUAGE_IDS[language],
          source_code: buildJudge0Source(language, code, tests),
          cpu_time_limit: 2,
          wall_time_limit: 5,
          memory_limit: 128000,
          max_file_size: 1024,
        }),
      },
    );
    if (!response.ok) throw new Error(`Judge0 respondió ${response.status}.`);

    const initial = (await response.json()) as Judge0Response;
    const payload = await waitForSubmission(baseUrl, initial, signal);
    const stderr = [payload.compile_output, payload.stderr, payload.message]
      .filter(Boolean)
      .join("\n")
      .slice(0, 32_768);
    const stdout = (payload.stdout ?? "").slice(0, 32_768);
    const parsedTests = parseTests(language, stdout, tests);
    const allPassed =
      parsedTests.length === tests.length &&
      parsedTests.every((entry) => entry.passed);
    const status =
      parsedTests.length === tests.length
        ? allPassed
          ? "passed"
          : "failed"
        : providerStatus(payload);

    return {
      id: crypto.randomUUID(),
      status,
      stdout: cleanStdout(stdout),
      stderr,
      diagnostics: parseDiagnostics(stderr),
      tests: protectHiddenResults(parsedTests, hiddenTests),
      durationMs: Math.round(Number(payload.time ?? 0) * 1000),
      memoryKb: payload.memory ?? undefined,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    const timedOut =
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    return {
      id: crypto.randomUUID(),
      status: timedOut ? "timeout" : "provider_error",
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      diagnostics: [],
      tests: [],
      durationMs: Math.round(performance.now() - startedAt),
      createdAt: new Date().toISOString(),
    };
  }
}
