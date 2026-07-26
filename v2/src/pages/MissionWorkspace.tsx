import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  FileCode2,
  History,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  Send,
  TerminalSquare,
  TestTube2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import type { BeforeMount } from "@monaco-editor/react";
import { formatDate, relativeDueDate } from "@/lib/format";
import {
  createDraftKey,
  loadDraft,
  saveDraft,
} from "@/services/draft-store";
import { runMissionCode } from "@/services/runner";
import { useClassroom } from "@/state/classroom-context";
import { useCatalog } from "@/state/catalog";
import {
  LANGUAGE_META,
  LANGUAGES,
  type Attempt,
  type AttemptKind,
  type Language,
  type RunResult,
} from "@/types";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

type MobilePane = "brief" | "code" | "results";
type BriefTab = "problem" | "hints" | "history";

const configureMonaco: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("tomatin-terminal", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "718078" },
      { token: "keyword", foreground: "67E8A5" },
      { token: "string", foreground: "F4C96B" },
      { token: "number", foreground: "65C9E8" },
    ],
    colors: {
      "editor.background": "#07100C",
      "editor.foreground": "#DCE7E1",
      "editorLineNumber.foreground": "#506059",
      "editorLineNumber.activeForeground": "#A9F6C6",
      "editorCursor.foreground": "#67E8A5",
      "editor.selectionBackground": "#1A513655",
      "editor.inactiveSelectionBackground": "#18362966",
      "editorIndentGuide.background1": "#173025",
      "editorIndentGuide.activeBackground1": "#315C47",
    },
  });
};

function ResultSummary({ result }: { result: RunResult | null }) {
  if (!result) {
    return (
      <div className="result-empty">
        <TerminalSquare aria-hidden="true" />
        <strong>Esperando una ejecución</strong>
        <span>Los tests y diagnósticos aparecerán aquí.</span>
      </div>
    );
  }

  const passed = result.tests.filter((test) => test.passed).length;
  const statusLabel: Record<RunResult["status"], string> = {
    idle: "Sin ejecutar",
    queued: "En cola",
    running: "Ejecutando",
    passed: "Todos los tests pasaron",
    failed: "Hay tests por corregir",
    compile_error: "Error de compilación",
    runtime_error: "Error de ejecución",
    timeout: "Tiempo agotado",
    provider_error: "Ejecutor no disponible",
  };

  return (
    <div className="result-content">
      <div className={`result-summary result-${result.status}`}>
        {result.status === "passed" ? (
          <CheckCircle2 aria-hidden="true" />
        ) : (
          <CircleAlert aria-hidden="true" />
        )}
        <div>
          <strong>{statusLabel[result.status]}</strong>
          <span>
            {passed}/{result.tests.length} tests
            {result.durationMs !== undefined ? ` · ${result.durationMs} ms` : ""}
            {result.memoryKb !== undefined ? ` · ${result.memoryKb} KB` : ""}
          </span>
        </div>
      </div>

      {result.diagnostics.length > 0 ? (
        <section className="diagnostic-list" aria-labelledby="diagnostics-title">
          <h3 id="diagnostics-title">Diagnósticos</h3>
          {result.diagnostics.map((diagnostic, index) => (
            <div className={`diagnostic ${diagnostic.severity}`} key={`${diagnostic.message}-${index}`}>
              <CircleAlert aria-hidden="true" />
              <span>
                {diagnostic.line ? `Línea ${diagnostic.line}: ` : ""}
                {diagnostic.message}
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {result.tests.length > 0 ? (
        <section className="test-results" aria-labelledby="tests-title">
          <h3 id="tests-title">Tests</h3>
          {result.tests.map((test) => (
            <article className={`test-result ${test.passed ? "passed" : "failed"}`} key={test.id}>
              {test.passed ? (
                <Check aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
              <div>
                <strong>
                  {test.label}
                  {test.hidden ? <span className="hidden-test-label">oculto</span> : null}
                </strong>
                {!test.passed ? (
                  <>
                    <dl>
                      <div>
                        <dt>Esperado</dt>
                        <dd>{test.expected}</dd>
                      </div>
                      {test.actual ? (
                        <div>
                          <dt>Obtenido</dt>
                          <dd>{test.actual}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {test.feedback ? <p>{test.feedback}</p> : null}
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {result.stdout || result.stderr ? (
        <section className="console-output" aria-labelledby="console-output-title">
          <h3 id="console-output-title">Consola</h3>
          <pre>
            {result.stdout ? `$ ${result.stdout}\n` : ""}
            {result.stderr ? `[stderr]\n${result.stderr}` : ""}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

export function Component() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { getMissionBySlug } = useCatalog();
  const mission = slug ? getMissionBySlug(slug) : undefined;
  const { profile, snapshot, recordAttempt, recordHint, backendMode } = useClassroom();
  const assignmentId = searchParams.get("assignment") ?? undefined;
  const assignment = snapshot?.assignments.find(
    (entry) => entry.id === assignmentId && entry.missionId === mission?.id,
  );
  const progress = snapshot?.progress.find(
    (entry) =>
      entry.userId === profile?.id && entry.assignmentId === assignment?.id,
  );
  const initialLanguage =
    progress?.language && assignment?.allowedLanguages.includes(progress.language)
      ? progress.language
      : assignment?.allowedLanguages[0] ?? "javascript";
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [codeByLanguage, setCodeByLanguage] = useState<Record<Language, string>>(
    () =>
      mission
        ? {
            javascript: mission.variants.javascript.starterCode,
            python: mission.variants.python.starterCode,
            cpp: mission.variants.cpp.starterCode,
          }
        : { javascript: "", python: "", cpp: "" },
  );
  const [loadedLanguages, setLoadedLanguages] = useState<Set<Language>>(new Set());
  const [saveState, setSaveState] = useState<"loading" | "saving" | "saved">(
    "loading",
  );
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState<AttemptKind | null>(null);
  const [briefTab, setBriefTab] = useState<BriefTab>("problem");
  const [mobilePane, setMobilePane] = useState<MobilePane>("brief");
  const [revealedHints, setRevealedHints] = useState(0);
  const saveTimer = useRef<number | undefined>(undefined);

  const history = useMemo(
    () =>
      snapshot?.attempts.filter(
        (entry) =>
          entry.userId === profile?.id &&
          entry.missionId === mission?.id &&
          entry.assignmentId === assignment?.id,
      ) ?? [],
    [assignment?.id, mission?.id, profile?.id, snapshot?.attempts],
  );

  useEffect(() => {
    if (!profile || !mission || loadedLanguages.has(language)) return;
    let active = true;
    setSaveState("loading");
    const key = createDraftKey(
      profile.id,
      mission.id,
      language,
      assignment?.id,
    );
    void loadDraft(key, {
      userId: profile.id,
      missionId: mission.id,
      assignmentId: assignment?.id,
      language,
    }).then((draft) => {
      if (!active) return;
      if (draft) {
        setCodeByLanguage((current) => ({
          ...current,
          [language]: draft.code,
        }));
      }
      setLoadedLanguages((current) => new Set(current).add(language));
      setSaveState("saved");
    });
    return () => {
      active = false;
    };
  }, [assignment?.id, language, loadedLanguages, mission, profile]);

  useEffect(() => {
    if (!profile || !mission || !loadedLanguages.has(language)) return;
    window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = window.setTimeout(() => {
      const code = codeByLanguage[language];
      void saveDraft({
        key: createDraftKey(
          profile.id,
          mission.id,
          language,
          assignment?.id,
        ),
        userId: profile.id,
        missionId: mission.id,
        assignmentId: assignment?.id,
        language,
        code,
        updatedAt: new Date().toISOString(),
      }).then(() => setSaveState("saved"));
    }, 500);
    return () => window.clearTimeout(saveTimer.current);
  }, [
    assignment?.id,
    codeByLanguage,
    language,
    loadedLanguages,
    mission,
    profile,
  ]);

  if (!mission) return <Navigate to="/missions" replace />;
  if (!profile || !snapshot) return null;

  const activeMission = mission;
  const activeProfile = profile;
  const allowedLanguages = assignment?.allowedLanguages ?? [...LANGUAGES];
  const currentCode = codeByLanguage[language];

  async function execute(kind: AttemptKind) {
    setRunning(kind);
    setResult(null);
    setMobilePane("results");
    const rawResult = await runMissionCode({
      mission: activeMission,
      language,
      code: currentCode,
      kind,
      assignmentId: assignment?.id,
    });
    const annotatedResult = {
      ...rawResult,
      tests: rawResult.tests.map((entry) => ({
        ...entry,
        hidden: entry.hidden,
      })),
    };
    setResult(annotatedResult);
    const attempt: Attempt = {
      id: annotatedResult.id,
      userId: activeProfile.id,
      missionId: activeMission.id,
      assignmentId: assignment?.id,
      missionVersion: activeMission.version,
      language,
      kind,
      code: currentCode,
      result: annotatedResult,
      createdAt: annotatedResult.createdAt,
    };
    recordAttempt(attempt);
    setRunning(null);
  }

  function resetStarter() {
    setCodeByLanguage((current) => ({
      ...current,
      [language]: activeMission.variants[language].starterCode,
    }));
    setResult(null);
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <div className="workspace-title">
          <Link className="icon-button" to="/missions" aria-label="Volver a misiones">
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div>
            <p>
              {mission.courseLabel} · Misión {String(mission.order).padStart(2, "0")}
            </p>
            <h1>{mission.title}</h1>
          </div>
        </div>
        <div className="workspace-header-meta">
          {assignment ? (
            <span className="due-chip">
              <Clock3 aria-hidden="true" />
              {relativeDueDate(assignment.dueAt)}
            </span>
          ) : (
            <span className="practice-label">Práctica libre</span>
          )}
          <span className={`sync-state ${saveState}`}>
            {saveState === "saved" ? <Check /> : <LoaderCircle className="spin" />}
            {saveState === "saved"
              ? "Borrador guardado"
              : saveState === "saving"
                ? "Guardando"
                : "Cargando"}
          </span>
        </div>
      </header>

      <div className="mobile-workspace-tabs" role="tablist" aria-label="Panel del workspace">
        {[
          ["brief", "Enunciado", BookOpen],
          ["code", "Código", Code2],
          ["results", "Resultados", TestTube2],
        ].map(([value, label, Icon]) => (
          <button
            key={value as string}
            type="button"
            role="tab"
            aria-selected={mobilePane === value}
            className={mobilePane === value ? "is-active" : ""}
            onClick={() => setMobilePane(value as MobilePane)}
          >
            <Icon aria-hidden="true" />
            {label as string}
          </button>
        ))}
      </div>

      <div className="workspace-layout">
        <aside className={`brief-pane mobile-${mobilePane === "brief" ? "visible" : "hidden"}`}>
          <div className="brief-tabs" role="tablist" aria-label="Información de la misión">
            {[
              ["problem", "Problema"],
              ["hints", "Pistas"],
              ["history", "Historial"],
            ].map(([value, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={briefTab === value}
                className={briefTab === value ? "is-active" : ""}
                key={value}
                onClick={() => setBriefTab(value as BriefTab)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="brief-scroll">
            {briefTab === "problem" ? (
              <>
                <section className="brief-section">
                  <p className="eyebrow">CONTEXTO</p>
                  <p>{mission.context}</p>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">TAREA</p>
                  <h2>{mission.summary}</h2>
                  <p>{mission.brief}</p>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">OBJETIVOS</p>
                  <ul className="objective-list">
                    {mission.objectives.map((objective) => (
                      <li key={objective}>
                        <CheckCircle2 aria-hidden="true" />
                        {objective}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="brief-facts">
                  <span>
                    <Clock3 aria-hidden="true" /> {mission.duration} min
                  </span>
                  <span>
                    <Zap aria-hidden="true" /> {assignment?.points ?? mission.points} XP
                  </span>
                  <span>{mission.difficulty}</span>
                </section>
                {assignment ? (
                  <section className="assignment-note">
                    <strong>{assignment.title}</strong>
                    <p>{assignment.instructions}</p>
                    <small>Entrega: {formatDate(assignment.dueAt, true)}</small>
                  </section>
                ) : null}
              </>
            ) : null}

            {briefTab === "hints" ? (
              <section className="hints-panel">
                <div className="hint-intro">
                  <Lightbulb aria-hidden="true" />
                  <div>
                    <h2>Pistas progresivas</h2>
                    <p>Usarlas no descuenta XP.</p>
                  </div>
                </div>
                {mission.hints.slice(0, revealedHints).map((hint, index) => (
                  <article className="hint-item" key={hint}>
                    <span>{index + 1}</span>
                    <p>{hint}</p>
                  </article>
                ))}
                {revealedHints < mission.hints.length ? (
                  <button
                    className="button secondary wide"
                    type="button"
                    onClick={() =>
                      setRevealedHints((current) => {
                        const next = current + 1;
                        if (assignment) recordHint(assignment.id, next);
                        return next;
                      })
                    }
                  >
                    <Lightbulb aria-hidden="true" />
                    Mostrar pista {revealedHints + 1}
                  </button>
                ) : (
                  <p className="all-hints-shown">Ya viste todas las pistas disponibles.</p>
                )}
              </section>
            ) : null}

            {briefTab === "history" ? (
              <section className="history-panel">
                <div className="history-heading">
                  <History aria-hidden="true" />
                  <div>
                    <h2>Intentos</h2>
                    <p>{history.length} ejecuciones registradas</p>
                  </div>
                </div>
                {history.map((attempt) => (
                  <button
                    className="history-item"
                    type="button"
                    key={attempt.id}
                    onClick={() => {
                      setLanguage(attempt.language);
                      setCodeByLanguage((current) => ({
                        ...current,
                        [attempt.language]: attempt.code,
                      }));
                      setResult(attempt.result);
                      setMobilePane("results");
                    }}
                  >
                    <span className={`history-status ${attempt.result.status}`} />
                    <span>
                      <strong>
                        {attempt.kind === "submit" ? "Entrega" : "Ejecución"} ·{" "}
                        {LANGUAGE_META[attempt.language].shortLabel}
                      </strong>
                      <small>{formatDate(attempt.createdAt, true)}</small>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </button>
                ))}
                {history.length === 0 ? (
                  <div className="empty-inline">
                    <History aria-hidden="true" />
                    <span>Aún no hay intentos.</span>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </aside>

        <section className={`code-pane mobile-${mobilePane === "code" ? "visible" : "hidden"}`}>
          <div className="code-toolbar">
            <div className="language-switcher" role="group" aria-label="Lenguaje">
              {allowedLanguages.map((entry) => (
                <button
                  type="button"
                  key={entry}
                  className={language === entry ? "is-active" : ""}
                  aria-pressed={language === entry}
                  onClick={() => {
                    setLanguage(entry);
                    setResult(null);
                  }}
                >
                  {LANGUAGE_META[entry].shortLabel}
                </button>
              ))}
            </div>
            <div className="file-tab">
              <FileCode2 aria-hidden="true" />
              <span>{LANGUAGE_META[language].fileName}</span>
              <small>{LANGUAGE_META[language].runtime}</small>
            </div>
            <button
              className="icon-button"
              type="button"
              title="Restaurar starter code"
              aria-label="Restaurar starter code"
              onClick={resetStarter}
            >
              <RotateCcw aria-hidden="true" />
            </button>
          </div>

          <div className="editor-shell">
            <Suspense
              fallback={
                <div className="editor-loading">
                  <LoaderCircle className="spin" aria-hidden="true" />
                  Preparando editor...
                </div>
              }
            >
              <MonacoEditor
                language={LANGUAGE_META[language].monaco}
                theme="tomatin-terminal"
                value={currentCode}
                beforeMount={configureMonaco}
                onMount={(editor) => {
                  if (import.meta.env.DEV) {
                    window.__TOMATIN_EDITOR__ = editor;
                  }
                }}
                onChange={(value) =>
                  setCodeByLanguage((current) => ({
                    ...current,
                    [language]: value ?? "",
                  }))
                }
                options={{
                  automaticLayout: true,
                  accessibilitySupport: "auto",
                  fontSize: 14,
                  fontFamily:
                    '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
                  lineHeight: 22,
                  minimap: { enabled: false },
                  padding: { top: 16, bottom: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  tabSize: language === "python" ? 4 : 2,
                  wordWrap: "on",
                  stickyScroll: { enabled: false },
                }}
              />
            </Suspense>
          </div>

          <div className="workspace-actions">
            <span className="runner-mode">
              <span className={`system-dot ${backendMode}`} aria-hidden="true" />
              {language === "cpp" || running === "submit"
                ? "Ejecución aislada"
                : language === "python"
                  ? "Pyodide Worker"
                  : "Web Worker"}
            </span>
            <button
              className="button secondary"
              type="button"
              disabled={Boolean(running)}
              onClick={() => void execute("run")}
            >
              {running === "run" ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <Play aria-hidden="true" />
              )}
              Ejecutar
            </button>
            <button
              className="button primary"
              type="button"
              disabled={Boolean(running)}
              onClick={() => void execute("submit")}
            >
              {running === "submit" ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {assignment ? "Entregar" : "Comprobar"}
            </button>
          </div>
        </section>

        <section
          className={`results-pane mobile-${mobilePane === "results" ? "visible" : "hidden"}`}
          aria-live="polite"
        >
          <div className="results-titlebar">
            <span>
              <TestTube2 aria-hidden="true" />
              Resultados
            </span>
            <div>
              {result ? <small>{formatDate(result.createdAt, true)}</small> : null}
              <button
                className="icon-button results-close"
                type="button"
                aria-label="Cerrar resultados"
                title="Cerrar resultados"
                onClick={() => setMobilePane("code")}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </div>
          {running ? (
            <div className="result-running">
              <LoaderCircle className="spin" aria-hidden="true" />
              <strong>
                {running === "submit" ? "Verificando entrega" : "Ejecutando código"}
              </strong>
              <span>
                {language === "cpp" || running === "submit"
                  ? "Compilando en el entorno aislado..."
                  : "Ejecutando tests visibles..."}
              </span>
            </div>
          ) : (
            <ResultSummary result={result} />
          )}
        </section>
      </div>
    </main>
  );
}
