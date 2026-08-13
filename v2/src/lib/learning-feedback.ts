import type { Language, RunResult } from "@/types";

export interface LearningNotice {
  tone: "success" | "warning" | "error" | "info";
  title: string;
  detail: string;
}

const LANGUAGE_WORDS: Record<
  Language,
  { input: string; print: string; return: string }
> = {
  javascript: {
    input: "prompt()",
    print: "console.log()",
    return: "return resultado;",
  },
  python: {
    input: "input()",
    print: "print()",
    return: "return resultado",
  },
  cpp: {
    input: "cin",
    print: "cout",
    return: "return resultado;",
  },
};

function usesManualInput(language: Language, code: string) {
  if (language === "javascript") return /\b(?:window\.)?prompt\s*\(/.test(code);
  if (language === "python") return /\binput\s*\(/.test(code);
  return /\b(?:std::)?cin\b/.test(code);
}

function usesConsoleOutput(language: Language, code: string) {
  if (language === "javascript") return /\bconsole\.(?:log|info|warn|error)\s*\(/.test(code);
  if (language === "python") return /\bprint\s*\(/.test(code);
  return /\b(?:std::)?cout\b/.test(code);
}

function missingReturnedValue(code: string, result: RunResult) {
  const explicitMissingValue = result.tests.some((test) => {
    if (test.passed || test.hidden) return false;
    const actual = test.actual?.trim().toLowerCase();
    return Boolean(actual && ["undefined", "none", "null", "void"].includes(actual));
  });
  return explicitMissingValue || !/\breturn\b/.test(code);
}

export function learningFeedback(
  language: Language,
  code: string,
  result: RunResult,
): LearningNotice[] {
  const words = LANGUAGE_WORDS[language];
  const notices: LearningNotice[] = [];

  if (usesManualInput(language, code)) {
    notices.push({
      tone: "warning",
      title: "No pidas los datos al usuario",
      detail: `El evaluador ya entrega los valores en los parámetros. Quita ${words.input} y trabaja con las variables de la firma.`,
    });
  }

  if (result.status === "passed") {
    notices.push({
      tone: "success",
      title: "Tu función devolvió el valor correcto",
      detail: "Los tests llamaron a tu función con distintos datos y recibieron la respuesta esperada.",
    });
    if (usesConsoleOutput(language, code) || result.stdout.trim()) {
      notices.push({
        tone: "info",
        title: "La consola no cuenta como respuesta",
        detail: `Puedes usar ${words.print} para observar valores, pero la entrega se evalúa únicamente con return.`,
      });
    }
    return notices.slice(0, 3);
  }

  if (missingReturnedValue(code, result)) {
    notices.push({
      tone: "error",
      title: "Tu función no devolvió la respuesta esperada",
      detail: usesConsoleOutput(language, code) || result.stdout.trim()
        ? `Vemos datos en la consola, pero imprimir no es devolver. Guarda el resultado y termina la función con ${words.return}`
        : `Calcula el resultado dentro de la función y entrégalo al final con ${words.return}`,
    });
  } else if (result.status === "compile_error") {
    notices.push({
      tone: "error",
      title: "Primero corrige la sintaxis",
      detail: "Abre el diagnóstico marcado y revisa esa línea antes de volver a ejecutar.",
    });
  } else if (result.status === "runtime_error") {
    notices.push({
      tone: "error",
      title: "El programa se detuvo durante la prueba",
      detail: "Revisa el diagnóstico y prueba qué ocurre con el primer caso visible.",
    });
  } else if (result.status === "timeout") {
    notices.push({
      tone: "warning",
      title: "La función no terminó a tiempo",
      detail: "Revisa la condición del bucle: debe acercarse a su final en cada vuelta.",
    });
  } else if (result.status === "provider_error") {
    notices.push({
      tone: "warning",
      title: "Tu código no alcanzó a ser evaluado",
      detail: "El ejecutor no respondió. Tu borrador sigue guardado; vuelve a intentarlo en un momento.",
    });
  }

  if (notices.length === 0 && result.tests.some((test) => !test.passed)) {
    notices.push({
      tone: "info",
      title: "Compara un caso paso a paso",
      detail: "Mira la entrada, calcula a mano el resultado esperado y ubica la primera operación distinta en tu función.",
    });
  }

  return notices.slice(0, 3);
}

export function languageContract(language: Language) {
  const words = LANGUAGE_WORDS[language];
  return {
    manualInput: words.input,
    consoleOutput: words.print,
    returnExample: words.return,
  };
}
