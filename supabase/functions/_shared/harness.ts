import type { Language, MissionTest } from "./types.ts";

function cppMetadata(test: MissionTest): string {
  return JSON.stringify({
    id: test.id,
    label: test.label,
    expected: test.expected,
    feedback: test.feedback,
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
    ${JSON.stringify(cppMetadata(entry))}
  );`,
    )
    .join("\n");

  return `${code}

int main() {
  int __tomatin_fallidos = 0;
  auto __tomatin_check = [&](bool paso, const std::string& metadata) {
    std::cout << "__TOMATIN_TEST__" << (paso ? "1" : "0") << "|" << metadata << "\\n";
    if (!paso) ++__tomatin_fallidos;
  };
${checks}
  return __tomatin_fallidos == 0 ? 0 : 1;
}
`;
}
