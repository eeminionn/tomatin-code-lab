import {
  type Diagnostic,
  type Language,
  type MissionTest,
  type RunResult,
  type RunStatus,
  type TestResult,
} from "@/types";

const JUDGE0_URL = "https://ce.judge0.com";
const LANGUAGE_IDS: Record<Language, number> = {
  javascript: 102,
  python: 100,
  cpp: 105,
};

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  status: { id: number; description: string };
}

function markerResult(test: MissionTest, passedExpression: string): string {
  return JSON.stringify({
    id: test.id,
    label: test.label,
    expected: test.expected,
    feedback: test.feedback,
    passedExpression,
  });
}

export function buildJudge0Source(
  language: Language,
  code: string,
  tests: MissionTest[],
): string {
  if (language === "javascript") {
    const checks = tests
      .map(
        (entry) => `(() => {
  let passed = false;
  let actual;
  try {
    passed = Boolean(${entry.expression});
    actual = ${entry.actualExpression ? `(${entry.actualExpression})` : "undefined"};
  } catch (error) {
    actual = error instanceof Error ? error.message : String(error);
  }
  return {
    id: ${JSON.stringify(entry.id)},
    label: ${JSON.stringify(entry.label)},
    passed,
    expected: ${JSON.stringify(entry.expected)},
    actual,
    feedback: ${JSON.stringify(entry.feedback)}
  };
})()`,
      )
      .join(",\n");
    return `${code}

const __tomatinResultados = [
${checks}
];
console.log("__TOMATIN_RESULTS__" + JSON.stringify(__tomatinResultados));
`;
  }

  if (language === "python") {
    const serializedTests = JSON.stringify(tests);
    return `${code}

import json as __tomatin_json

__tomatin_resultados = []
for __tomatin_prueba in __tomatin_json.loads(${JSON.stringify(serializedTests)}):
    try:
        __tomatin_paso = bool(eval(__tomatin_prueba["expression"], globals()))
        __tomatin_actual = None
        if __tomatin_prueba.get("actualExpression"):
            __tomatin_actual = repr(eval(__tomatin_prueba["actualExpression"], globals()))
        __tomatin_resultados.append({
            "id": __tomatin_prueba["id"],
            "label": __tomatin_prueba["label"],
            "passed": __tomatin_paso,
            "expected": __tomatin_prueba["expected"],
            "actual": __tomatin_actual,
            "feedback": __tomatin_prueba["feedback"],
        })
    except Exception as __tomatin_error:
        __tomatin_resultados.append({
            "id": __tomatin_prueba["id"],
            "label": __tomatin_prueba["label"],
            "passed": False,
            "expected": __tomatin_prueba["expected"],
            "actual": str(__tomatin_error),
            "feedback": __tomatin_prueba["feedback"],
        })

print("__TOMATIN_RESULTS__" + __tomatin_json.dumps(__tomatin_resultados))
`;
  }

  const checks = tests
    .map(
      (entry) => `  __tomatin_check(
    bool(${entry.expression}),
    ${JSON.stringify(markerResult(entry, entry.expression))}
  );`,
    )
    .join("\n");
  return `${code}

int main() {
  int __tomatin_fallidos = 0;
  auto __tomatin_check = [&](bool paso, const string& metadata) {
    cout << "__TOMATIN_TEST__" << (paso ? "1" : "0") << "|" << metadata << "\\n";
    if (!paso) ++__tomatin_fallidos;
  };
${checks}
  return __tomatin_fallidos == 0 ? 0 : 1;
}
`;
}

function parseDiagnostics(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const line of output.split("\n")) {
    const cpp = line.match(/:(\d+):(\d+):\s+(error|warning):\s+(.+)/);
    const python = line.match(/line\s+(\d+).*?\n?/);
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

function statusFromResponse(response: Judge0Response): RunStatus {
  const id = response.status.id;
  if (id === 3) return "passed";
  if (id === 5) return "timeout";
  if (id === 6) return "compile_error";
  if (id >= 7 && id <= 12) return "runtime_error";
  return "failed";
}

function parseTests(
  language: Language,
  stdout: string,
  tests: MissionTest[],
): TestResult[] {
  if (language === "cpp") {
    const byId = new Map(tests.map((entry) => [entry.id, entry]));
    return stdout
      .split("\n")
      .filter((line) => line.startsWith("__TOMATIN_TEST__"))
      .map((line) => {
        const passed = line.slice("__TOMATIN_TEST__".length, line.indexOf("|")) === "1";
        const metadata = JSON.parse(line.slice(line.indexOf("|") + 1)) as {
          id: string;
          label: string;
          expected: string;
          feedback: string;
        };
        const source = byId.get(metadata.id);
        return {
          id: metadata.id,
          label: metadata.label,
          passed,
          expected: metadata.expected,
          feedback: passed ? undefined : source?.feedback ?? metadata.feedback,
        };
      });
  }

  const marker = stdout
    .split("\n")
    .find((line) => line.startsWith("__TOMATIN_RESULTS__"));
  if (!marker) return [];
  return JSON.parse(marker.slice("__TOMATIN_RESULTS__".length)) as TestResult[];
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

export async function runWithJudge0(
  language: Language,
  code: string,
  tests: MissionTest[],
): Promise<RunResult> {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
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

    if (!response.ok) {
      throw new Error(`Judge0 respondió ${response.status}`);
    }

    const payload = (await response.json()) as Judge0Response;
    const stderr = [payload.compile_output, payload.stderr, payload.message]
      .filter(Boolean)
      .join("\n")
      .slice(0, 32_768);
    const stdout = (payload.stdout ?? "").slice(0, 32_768);
    const testsResult = parseTests(language, stdout, tests);
    const allPassed =
      testsResult.length === tests.length && testsResult.every((entry) => entry.passed);
    const providerStatus = statusFromResponse(payload);

    const normalizedStatus =
      testsResult.length === tests.length
        ? allPassed
          ? "passed"
          : "failed"
        : providerStatus;

    return {
      id: crypto.randomUUID(),
      status: normalizedStatus,
      stdout: cleanStdout(stdout),
      stderr,
      diagnostics: parseDiagnostics(stderr),
      tests: testsResult,
      durationMs: Math.round(Number(payload.time ?? 0) * 1000),
      memoryKb: payload.memory ?? undefined,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id: crypto.randomUUID(),
      status: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "provider_error",
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      diagnostics: [],
      tests: [],
      durationMs: Math.round(performance.now() - startedAt),
      createdAt: new Date().toISOString(),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
