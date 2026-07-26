/// <reference lib="webworker" />

import type { MissionTest } from "@/types";

interface WorkerRequest {
  code: string;
  tests: MissionTest[];
}

interface PyodideRuntime {
  globals: { set: (name: string, value: unknown) => void };
  runPythonAsync: (source: string) => Promise<string>;
}

let runtimePromise: Promise<PyodideRuntime> | undefined;

async function loadRuntime() {
  if (!runtimePromise) {
    const runtimeUrl =
      "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.mjs";
    runtimePromise = import(/* @vite-ignore */ runtimeUrl).then((module) =>
      module.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/",
      }),
    );
  }
  return runtimePromise;
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    const runtime = await loadRuntime();
    runtime.globals.set("__tomatin_code", data.code);
    runtime.globals.set("__tomatin_tests_json", JSON.stringify(data.tests));
    const payload = await runtime.runPythonAsync(`
import contextlib
import io
import json
import traceback

_namespace = {}
_stdout = io.StringIO()
_resultados = []
_error = None

try:
    with contextlib.redirect_stdout(_stdout), contextlib.redirect_stderr(_stdout):
        exec(__tomatin_code, _namespace)
        for _prueba in json.loads(__tomatin_tests_json):
            try:
                _paso = bool(eval(_prueba["expression"], _namespace))
                _actual = None
                if _prueba.get("actualExpression"):
                    _actual = repr(eval(_prueba["actualExpression"], _namespace))
                _resultados.append({
                    "id": _prueba["id"],
                    "label": _prueba["label"],
                    "passed": _paso,
                    "expected": _prueba["expected"],
                    "actual": _actual,
                    "feedback": _prueba["feedback"],
                })
            except Exception as _test_error:
                _resultados.append({
                    "id": _prueba["id"],
                    "label": _prueba["label"],
                    "passed": False,
                    "expected": _prueba["expected"],
                    "actual": str(_test_error),
                    "feedback": _prueba["feedback"],
                })
except Exception:
    _error = traceback.format_exc()

json.dumps({
    "ok": _error is None,
    "logs": _stdout.getvalue().splitlines(),
    "tests": _resultados,
    "error": _error,
})
`);
    self.postMessage(JSON.parse(payload));
  } catch (error) {
    self.postMessage({
      ok: false,
      logs: [],
      tests: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
