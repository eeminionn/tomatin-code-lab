import { describe, expect, it } from "vitest";
import { learningFeedback } from "@/lib/learning-feedback";
import type { RunResult } from "@/types";

function result(overrides: Partial<RunResult> = {}): RunResult {
  return {
    id: "run-1",
    status: "failed",
    stdout: "",
    stderr: "",
    diagnostics: [],
    tests: [
      {
        id: "visible-1",
        label: "Caso visible",
        passed: false,
        expected: "4950",
        actual: "None",
      },
    ],
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe("learning feedback", () => {
  it("explains that printing is not returning", () => {
    const notices = learningFeedback(
      "python",
      "def total_once(a, b):\n    print(4950)",
      result({ stdout: "4950" }),
    );

    expect(notices[0].title).toContain("no devolvió");
    expect(notices[0].detail).toContain("imprimir no es devolver");
    expect(notices[0].detail).toContain("return resultado");
  });

  it.each([
    ["javascript", "const value = prompt('dato')", "prompt()"],
    ["python", "value = input()", "input()"],
    ["cpp", "int value; cin >> value;", "cin"],
  ] as const)("rejects manual input in %s", (language, code, name) => {
    const notices = learningFeedback(language, code, result());
    expect(notices[0].title).toBe("No pidas los datos al usuario");
    expect(notices[0].detail).toContain(name);
  });

  it("celebrates a returned result without implying stdout was checked", () => {
    const notices = learningFeedback(
      "javascript",
      "function solve() { return 42; }",
      result({
        status: "passed",
        tests: [{ id: "1", label: "Caso", passed: true, expected: "42", actual: "42" }],
      }),
    );
    expect(notices).toHaveLength(1);
    expect(notices[0].title).toContain("devolvió");
  });
});
