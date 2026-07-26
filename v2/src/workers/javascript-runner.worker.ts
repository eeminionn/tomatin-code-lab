/// <reference lib="webworker" />

import type { MissionTest, TestResult } from "@/types";

interface WorkerRequest {
  code: string;
  tests: MissionTest[];
}

function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
  const logs: string[] = [];
  const consoleProxy = {
    log: (...values: unknown[]) => logs.push(values.map(serialize).join(" ")),
    warn: (...values: unknown[]) => logs.push(`[WARN] ${values.map(serialize).join(" ")}`),
    error: (...values: unknown[]) => logs.push(`[ERROR] ${values.map(serialize).join(" ")}`),
  };

  try {
    const checks = data.tests
      .map((entry) => {
        const actual = entry.actualExpression
          ? `serializeValue(${entry.actualExpression})`
          : "undefined";
        return `(() => {
          try {
            return {
              id: ${JSON.stringify(entry.id)},
              label: ${JSON.stringify(entry.label)},
              passed: Boolean(${entry.expression}),
              expected: ${JSON.stringify(entry.expected)},
              actual: ${actual},
              feedback: ${JSON.stringify(entry.feedback)}
            };
          } catch (error) {
            return {
              id: ${JSON.stringify(entry.id)},
              label: ${JSON.stringify(entry.label)},
              passed: false,
              expected: ${JSON.stringify(entry.expected)},
              actual: error instanceof Error ? error.message : String(error),
              feedback: ${JSON.stringify(entry.feedback)}
            };
          }
        })()`;
      })
      .join(",");

    const execute = new Function(
      "console",
      "serializeValue",
      `"use strict";
${data.code}
return [${checks}];`,
    );
    const tests = execute(consoleProxy, serialize) as TestResult[];
    self.postMessage({ ok: true, logs, tests });
  } catch (error) {
    self.postMessage({
      ok: false,
      logs,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};

export {};
