// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { secureMissions as missions } from "@/data/missions-secure";
import { LANGUAGES, type MissionTest } from "@/types";

const scratch = mkdtempSync(join(tmpdir(), "tomatin-catalog-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

function allTests(publicTests: MissionTest[], hiddenTests: MissionTest[]) {
  return [...publicTests, ...hiddenTests];
}

function verifyJavaScript(source: string, tests: MissionTest[]) {
  const checks = tests.map((entry) => `Boolean(${entry.expression})`).join(",");
  const execute = new Function(`${source}\nreturn [${checks}];`);
  return execute() as boolean[];
}

function verifyPython(source: string, tests: MissionTest[], id: string) {
  const file = join(scratch, `${id}.py`);
  const checks = tests
    .map((entry) => `    (${JSON.stringify(entry.id)}, bool(${entry.expression})),`)
    .join("\n");
  writeFileSync(
    file,
    `${source}

resultados = [
${checks}
]
fallidos = [nombre for nombre, paso in resultados if not paso]
if fallidos:
    raise SystemExit("Fallaron: " + ", ".join(fallidos))
`,
  );
  execFileSync("python3", [file], { stdio: "pipe" });
}

function verifyCpp(source: string, tests: MissionTest[], id: string) {
  const file = join(scratch, `${id}.cpp`);
  const binary = join(scratch, `${id}.out`);
  const checks = tests
    .map(
      (entry) =>
        `  comprobar(bool(${entry.expression}), ${JSON.stringify(entry.id)});`,
    )
    .join("\n");
  writeFileSync(
    file,
    `${source}

int main() {
  int fallidos = 0;
  auto comprobar = [&](bool paso, const char* nombre) {
    if (!paso) {
      cerr << nombre << "\\n";
      ++fallidos;
    }
  };
${checks}
  return fallidos == 0 ? 0 : 1;
}
`,
  );
  execFileSync("clang++", ["-std=c++20", "-O0", file, "-o", binary], {
    stdio: "pipe",
  });
  execFileSync(binary, [], { stdio: "pipe" });
}

describe("mission catalog", () => {
  it("contains 20 missions and 60 complete language variants", () => {
    expect(missions).toHaveLength(20);
    expect(new Set(missions.map((mission) => mission.id)).size).toBe(20);
    expect(new Set(missions.map((mission) => mission.slug)).size).toBe(20);

    for (const mission of missions) {
      expect(mission.version).toBe(2);
      expect(mission.goal.length).toBeGreaterThan(30);
      expect(mission.conceptIntro.length).toBeGreaterThan(60);
      expect(mission.steps.length).toBeGreaterThanOrEqual(3);
      expect(mission.constraints.length).toBeGreaterThanOrEqual(2);
      expect(mission.successCriteria.length).toBeGreaterThanOrEqual(2);
      expect(mission.hints.length).toBeGreaterThanOrEqual(3);
      for (const language of LANGUAGES) {
        const variant = mission.variants[language];
        expect(variant.language).toBe(language);
        expect(variant.starterCode.length).toBeGreaterThan(40);
        expect(variant.expectedSignature.length).toBeGreaterThan(5);
        expect(variant.examples.length).toBeGreaterThanOrEqual(2);
        expect(variant.referenceSolution?.length).toBeGreaterThan(60);
        expect(variant.publicTests.length).toBeGreaterThanOrEqual(2);
        expect(variant.hiddenTests?.length).toBeGreaterThanOrEqual(1);
      }
    }

    for (const mission of missions.filter(
      (entry) => entry.course === "programming-1",
    )) {
      for (const language of LANGUAGES) {
        expect(mission.variants[language].starterCode).toContain("TODO");
      }
    }
  });

  it("passes every JavaScript reference solution", () => {
    for (const mission of missions) {
      const variant = mission.variants.javascript;
      const results = verifyJavaScript(
        variant.referenceSolution!,
        allTests(variant.publicTests, variant.hiddenTests!),
      );
      expect(results, mission.id).toEqual(results.map(() => true));
    }
  });

  it("passes every Python reference solution", () => {
    for (const mission of missions) {
      const variant = mission.variants.python;
      expect(() =>
        verifyPython(
          variant.referenceSolution!,
          allTests(variant.publicTests, variant.hiddenTests!),
          mission.id,
        ),
      ).not.toThrow();
    }
  });

  it("compiles and passes every C++ reference solution", () => {
    for (const mission of missions) {
      const variant = mission.variants.cpp;
      expect(() =>
        verifyCpp(
          variant.referenceSolution!,
          allTests(variant.publicTests, variant.hiddenTests!),
          mission.id,
        ),
      ).not.toThrow();
    }
  });
});
