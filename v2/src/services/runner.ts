import type {
  MissionTest,
  RunnerRequest,
  RunResult,
  RunStatus,
  TestResult,
} from "@/types";
import { frontendOnlyMessage, isFrontendOnly } from "@/config/runtime";
import { runWithJudge0 } from "./judge0";
import { isSupabaseConfigured, supabase } from "./supabase";

interface WorkerResponse {
  ok: boolean;
  logs: string[];
  tests: TestResult[];
  error?: string;
  stack?: string;
}

export async function edgeFunctionErrorMessage(
  error: unknown,
): Promise<string> {
  const fallback =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "El ejecutor remoto no respondió.";
  const context =
    typeof error === "object" && error !== null && "context" in error
      ? error.context
      : null;
  if (!(context instanceof Response)) return fallback;

  try {
    const payload = (await context.clone().json()) as {
      error?: unknown;
      message?: unknown;
    };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Keep the SDK message when the function did not return JSON.
  }
  return fallback;
}

function localRunStatus(response: WorkerResponse): RunStatus {
  if (!response.ok) return "runtime_error";
  return response.tests.length > 0 && response.tests.every((entry) => entry.passed)
    ? "passed"
    : "failed";
}

function runInWorker(
  worker: Worker,
  code: string,
  tests: MissionTest[],
  timeoutMs: number,
): Promise<RunResult> {
  const startedAt = performance.now();

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      worker.terminate();
      resolve({
        id: crypto.randomUUID(),
        status: "timeout",
        stdout: "",
        stderr: `La ejecución superó ${timeoutMs} ms.`,
        diagnostics: [],
        tests: [],
        durationMs: timeoutMs,
        createdAt: new Date().toISOString(),
      });
    }, timeoutMs);

    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      window.clearTimeout(timeout);
      worker.terminate();
      resolve({
        id: crypto.randomUUID(),
        status: localRunStatus(data),
        stdout: data.logs.join("\n").slice(0, 32_768),
        stderr: data.error ?? "",
        diagnostics: data.error
          ? [{ severity: "error", message: data.error }]
          : [],
        tests: data.tests,
        durationMs: Math.round(performance.now() - startedAt),
        createdAt: new Date().toISOString(),
      });
    };

    worker.onerror = (event) => {
      window.clearTimeout(timeout);
      worker.terminate();
      resolve({
        id: crypto.randomUUID(),
        status: "runtime_error",
        stdout: "",
        stderr: event.message,
        diagnostics: [{ severity: "error", message: event.message }],
        tests: [],
        durationMs: Math.round(performance.now() - startedAt),
        createdAt: new Date().toISOString(),
      });
    };

    worker.postMessage({ code, tests });
  });
}

export async function runMissionCode(request: RunnerRequest): Promise<RunResult> {
  const variant = request.mission.variants[request.language];
  const tests = variant.publicTests;

  if (request.code.length > 65_536) {
    return {
      id: crypto.randomUUID(),
      status: "failed",
      stdout: "",
      stderr: "El código supera el límite de 64 KB.",
      diagnostics: [],
      tests: [],
      createdAt: new Date().toISOString(),
    };
  }

  if (
    isFrontendOnly &&
    (request.kind === "submit" || request.language === "cpp")
  ) {
    return {
      id: crypto.randomUUID(),
      status: "provider_error",
      stdout: "",
      stderr: frontendOnlyMessage,
      diagnostics: [],
      tests: [],
      createdAt: new Date().toISOString(),
    };
  }

  if (
    isSupabaseConfigured &&
    supabase &&
    (request.kind === "submit" || request.language === "cpp")
  ) {
    const { data, error } = await supabase.functions.invoke<RunResult>(
      request.kind === "submit" ? "submit-code" : "run-code",
      {
        body: {
          missionId: request.mission.id,
          missionVersion: request.mission.version,
          assignmentId: request.assignmentId,
          language: request.language,
          code: request.code,
        },
      },
    );
    if (error || !data) {
      return {
        id: crypto.randomUUID(),
        status: "provider_error",
        stdout: "",
        stderr: await edgeFunctionErrorMessage(error),
        diagnostics: [],
        tests: [],
        createdAt: new Date().toISOString(),
      };
    }
    return data;
  }

  if (request.kind === "submit" || request.language === "cpp") {
    return runWithJudge0(request.language, request.code, tests);
  }

  if (request.language === "javascript") {
    return runInWorker(
      new Worker(
        new URL("../workers/javascript-runner.worker.ts", import.meta.url),
        { type: "module" },
      ),
      request.code,
      tests,
      1_500,
    );
  }

  return runInWorker(
    new Worker(new URL("../workers/python-runner.worker.ts", import.meta.url), {
      type: "module",
    }),
    request.code,
    tests,
    30_000,
  );
}
