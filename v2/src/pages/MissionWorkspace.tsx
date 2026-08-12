import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
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
  Copy,
  ExternalLink,
  FileCode2,
  Github,
  GripVertical,
  History,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  TerminalSquare,
  TestTube2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import type { BeforeMount, OnMount } from "@monaco-editor/react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, isOverdue, relativeDueDate } from "@/lib/format";
import {
  languageContract,
  learningFeedback,
} from "@/lib/learning-feedback";
import { publishedAssignmentsForStudent } from "@/lib/mission-access";
import {
  createDraftKey,
  loadDraft,
  saveDraft,
} from "@/services/draft-store";
import { runMissionCode } from "@/services/runner";
import {
  runMissionAdmin,
  type MissionSolution,
} from "@/services/mission-admin";
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
type BriefTab = "problem" | "hints" | "history" | "solution";
type SaveState = "loading" | "saving" | "synced" | "local" | "error";

const RESULTS_WIDTH_KEY = "tomatin.v3.workspace-results-width";
const MIN_RESULTS_WIDTH = 290;
const MIN_EDITOR_WIDTH = 420;
const RESIZER_WIDTH = 7;
const DEFAULT_RESULTS_WIDTH = 320;
let cppIncludeFoldingRegistered = false;

function readResultsWidth() {
  const stored = Number(window.localStorage.getItem(RESULTS_WIDTH_KEY));
  return Number.isFinite(stored) && stored >= MIN_RESULTS_WIDTH
    ? stored
    : DEFAULT_RESULTS_WIDTH;
}

function executionFingerprint(
  missionId: string,
  missionVersion: number,
  language: Language,
  code: string,
) {
  return `${missionId}:${missionVersion}:${language}:${code}`;
}

const configureMonaco: BeforeMount = (monaco) => {
  if (!cppIncludeFoldingRegistered) {
    monaco.languages.registerFoldingRangeProvider("cpp", {
      provideFoldingRanges(model) {
        let includeStart = 0;
        let includeEnd = 0;

        for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber += 1) {
          const line = model.getLineContent(lineNumber);

          if (/^\s*#include\b/.test(line)) {
            includeStart ||= lineNumber;
            includeEnd = lineNumber;
            continue;
          }

          if (includeStart && line.trim() === "") {
            break;
          }

          if (line.trim() !== "") {
            break;
          }
        }

        return includeStart && includeEnd > includeStart
          ? [
              {
                start: includeStart,
                end: includeEnd,
                kind: monaco.languages.FoldingRangeKind.Imports,
              },
            ]
          : [];
      },
    });
    cppIncludeFoldingRegistered = true;
  }

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

function ResultSummary({
  result,
  testInputs,
  language,
  code,
  onDiagnosticLine,
}: {
  result: RunResult | null;
  testInputs: Record<string, string>;
  language: Language;
  code: string;
  onDiagnosticLine: (line: number) => void;
}) {
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
  const learningNotices = learningFeedback(language, code, result);
  const statusLabel: Record<RunResult["status"], string> = {
    idle: "Sin ejecutar",
    queued: "En cola",
    running: "Ejecutando",
    passed: "Todos los tests pasaron",
    failed: "El código corre, pero aún no pasa todos los tests",
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

      {learningNotices.length > 0 ? (
        <section className="learning-notices" aria-labelledby="next-step-title">
          <h3 id="next-step-title">Qué hacer ahora</h3>
          {learningNotices.map((notice) => (
            <article className={`learning-notice tone-${notice.tone}`} key={notice.title}>
              {notice.tone === "success" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <Lightbulb aria-hidden="true" />
              )}
              <div>
                <strong>{notice.title}</strong>
                <p>{notice.detail}</p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {result.repositorySync &&
      result.repositorySync.status !== "not_applicable" ? (
        <div
          className={`repository-sync repository-sync-${result.repositorySync.status}`}
          role="status"
        >
          <Github aria-hidden="true" />
          <span>
            <strong>
              {result.repositorySync.status === "synced"
                ? "Entrega guardada en GitHub"
                : result.repositorySync.status === "pending_setup"
                  ? "GitHub pendiente"
                  : "GitHub no se actualizó"}
            </strong>
            <small>{result.repositorySync.message}</small>
          </span>
          {result.repositorySync.fileUrl ? (
            <a
              className="icon-button"
              href={result.repositorySync.fileUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir entrega en GitHub"
              title="Abrir entrega en GitHub"
            >
              <ExternalLink aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}

      {result.diagnostics.length > 0 ? (
        <section className="diagnostic-list" aria-labelledby="diagnostics-title">
          <h3 id="diagnostics-title">Diagnósticos</h3>
          {result.diagnostics.map((diagnostic, index) => (
            <button
              className={`diagnostic ${diagnostic.severity}`}
              disabled={!diagnostic.line}
              key={`${diagnostic.message}-${index}`}
              onClick={() =>
                diagnostic.line ? onDiagnosticLine(diagnostic.line) : undefined
              }
              type="button"
            >
              <CircleAlert aria-hidden="true" />
              <span>
                {diagnostic.line ? `Línea ${diagnostic.line}: ` : ""}
                {diagnostic.message}
              </span>
            </button>
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
                    {!test.hidden ? (
                      <dl>
                        {testInputs[test.id] ? (
                          <div>
                            <dt>Llamada</dt>
                            <dd>
                              <code>{testInputs[test.id]}</code>
                            </dd>
                          </div>
                        ) : null}
                        <div>
                          <dt>Esperado</dt>
                          <dd>{test.expected}</dd>
                        </div>
                        {test.actual !== undefined ? (
                          <div>
                            <dt>Obtenido</dt>
                            <dd>{test.actual}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="hidden-test-feedback">
                        Un caso privado encontró un comportamiento pendiente.
                      </p>
                    )}
                    {test.feedback ? (
                      <p>
                        <strong>Siguiente paso:</strong> {test.feedback}
                      </p>
                    ) : null}
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
  const { getMissionById, getMissionBySlug } = useCatalog();
  const {
    profile,
    viewProfile,
    isStudentPreview,
    snapshot,
    recordAttempt,
    recordHint,
    recordActivity,
    backendMode,
    frontendOnly,
  } = useClassroom();
  const assignmentId = searchParams.get("assignment") ?? undefined;
  const linkedAttemptId = searchParams.get("attempt") ?? undefined;
  const linkedReviewId = searchParams.get("review") ?? undefined;
  const studentView = viewProfile?.role === "student";
  const latestMission = slug ? getMissionBySlug(slug) : undefined;
  const studentAssignments =
    snapshot && viewProfile
      ? publishedAssignmentsForStudent(snapshot.assignments, viewProfile.id)
      : [];
  const requestedAssignment = snapshot?.assignments.find(
    (entry) => entry.id === assignmentId,
  );
  const fallbackAssignment =
    studentView && !assignmentId && latestMission
      ? studentAssignments.find(
          (entry) => entry.missionId === latestMission.id,
        )
      : undefined;
  const assignment = requestedAssignment ?? fallbackAssignment;
  const assignmentIsAvailable =
    assignment &&
    (!studentView ||
      (assignment.status === "published" &&
        assignment.studentIds.includes(viewProfile?.id ?? "")));
  const progress = snapshot?.progress.find(
    (entry) =>
      entry.userId === viewProfile?.id &&
      entry.assignmentId === assignment?.id,
  );
  const missionVersion = progress?.missionVersion ?? assignment?.missionVersion;
  const resolvedMission = slug
    ? getMissionBySlug(slug, missionVersion)
    : undefined;
  const validAssignment =
    assignmentIsAvailable && assignment.missionId === resolvedMission?.id
      ? assignment
      : undefined;
  const mission =
    studentView && !validAssignment ? undefined : resolvedMission;
  const assignmentStatus = progress?.status ?? "not_started";
  const assignmentOverdue = validAssignment
    ? isOverdue(validAssignment.dueAt, assignmentStatus)
    : false;
  const initialLanguage =
    progress?.language &&
    validAssignment?.allowedLanguages.includes(progress.language)
      ? progress.language
      : validAssignment?.allowedLanguages[0] ?? "javascript";
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
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [saveMessage, setSaveMessage] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState<AttemptKind | null>(null);
  const [briefTab, setBriefTab] = useState<BriefTab>(
    linkedAttemptId || linkedReviewId ? "history" : "problem",
  );
  const [mobilePane, setMobilePane] = useState<MobilePane>("brief");
  const [revealedHints, setRevealedHints] = useState(0);
  const [solution, setSolution] = useState<MissionSolution | null>(null);
  const [solutionError, setSolutionError] = useState("");
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [resultsWidth, setResultsWidth] = useState(readResultsWidth);
  const [executedFingerprints, setExecutedFingerprints] = useState<Set<string>>(
    new Set(),
  );
  const saveTimer = useRef<number | undefined>(undefined);
  const lastEditingSignal = useRef(0);
  const openedActivityKey = useRef("");
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const isStaff = profile?.role === "owner" || profile?.role === "mentor";
  const canViewSolution = isStaff && !isStudentPreview;

  const history = useMemo(
    () =>
      snapshot?.attempts.filter(
        (entry) =>
          entry.userId === viewProfile?.id &&
          entry.missionId === mission?.id &&
          entry.assignmentId === validAssignment?.id,
      ) ?? [],
    [
      mission?.id,
      snapshot?.attempts,
      validAssignment?.id,
      viewProfile?.id,
    ],
  );
  const linkedReview = snapshot?.reviews.find(
    (entry) => entry.id === linkedReviewId,
  );

  useEffect(() => {
    if (!mission) return;
    setCodeByLanguage({
      javascript: mission.variants.javascript.starterCode,
      python: mission.variants.python.starterCode,
      cpp: mission.variants.cpp.starterCode,
    });
    setLoadedLanguages(new Set());
    setResult(null);
    setSolution(null);
  }, [mission?.id, mission?.version]);

  useEffect(() => {
    if (!linkedAttemptId) return;
    const linkedAttempt = history.find(
      (attempt) => attempt.id === linkedAttemptId,
    );
    if (!linkedAttempt) return;
    setBriefTab("history");
    setMobilePane("brief");
    setLanguage(linkedAttempt.language);
    setCodeByLanguage((current) => ({
      ...current,
      [linkedAttempt.language]: linkedAttempt.code,
    }));
    setResult(linkedAttempt.result);
  }, [history, linkedAttemptId]);

  useEffect(() => {
    if (!viewProfile || !mission || loadedLanguages.has(language)) return;
    if (isStudentPreview) {
      const latestAttempt = history.find(
        (attempt) => attempt.language === language,
      );
      if (latestAttempt) {
        setCodeByLanguage((current) => ({
          ...current,
          [language]: latestAttempt.code,
        }));
      }
      setLoadedLanguages((current) => new Set(current).add(language));
      setSaveState("local");
      setSaveMessage("Vista de solo lectura; no se cargan borradores privados.");
      return;
    }
    let active = true;
    setSaveState("loading");
    setSaveMessage("");
    const key = createDraftKey(
      viewProfile.id,
      mission.id,
      mission.version,
      language,
      validAssignment?.id,
    );
    void loadDraft(key, {
      userId: viewProfile.id,
      missionId: mission.id,
      missionVersion: mission.version,
      assignmentId: validAssignment?.id,
      language,
    })
      .then((draft) => {
        if (!active) return;
        if (draft) {
          setCodeByLanguage((current) => ({
            ...current,
            [language]: draft.code,
          }));
        }
        setLoadedLanguages((current) => new Set(current).add(language));
        setSaveState(backendMode === "supabase" ? "synced" : "local");
      })
      .catch(() => {
        if (!active) return;
        setLoadedLanguages((current) => new Set(current).add(language));
        setSaveState("error");
        setSaveMessage("No se pudo recuperar el borrador guardado.");
      });
    return () => {
      active = false;
    };
  }, [
    backendMode,
    history,
    isStudentPreview,
    language,
    loadedLanguages,
    mission,
    validAssignment?.id,
    viewProfile,
  ]);

  useEffect(() => {
    if (
      !viewProfile ||
      !mission ||
      isStudentPreview ||
      !loadedLanguages.has(language)
    ) {
      return;
    }
    window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = window.setTimeout(() => {
      const code = codeByLanguage[language];
      void saveDraft({
        key: createDraftKey(
          viewProfile.id,
          mission.id,
          mission.version,
          language,
          validAssignment?.id,
        ),
        userId: viewProfile.id,
        missionId: mission.id,
        missionVersion: mission.version,
        assignmentId: validAssignment?.id,
        language,
        code,
        updatedAt: new Date().toISOString(),
      })
        .then((saveResult) => {
          if (saveResult.remote === "synced") {
            setSaveState("synced");
            setSaveMessage("");
          } else if (saveResult.remote === "local_only") {
            setSaveState("local");
            setSaveMessage("Guardado en este navegador.");
          } else {
            setSaveState("error");
            setSaveMessage(saveResult.message ?? "Error de sincronización.");
          }
        })
        .catch(() => {
          setSaveState("error");
          setSaveMessage("No se pudo guardar el borrador.");
        });
    }, 500);
    return () => window.clearTimeout(saveTimer.current);
  }, [
    codeByLanguage,
    language,
    loadedLanguages,
    mission,
    isStudentPreview,
    validAssignment?.id,
    viewProfile,
  ]);

  useEffect(() => {
    if (
      !profile ||
      profile.role !== "student" ||
      !validAssignment ||
      !mission
    ) {
      return;
    }
    const activityKey = `${profile.id}:${validAssignment.id}:${mission.version}`;
    if (openedActivityKey.current === activityKey) return;
    openedActivityKey.current = activityKey;
    recordActivity(validAssignment.id, language, "opened");
  }, [
    mission?.id,
    mission?.version,
    profile,
    recordActivity,
    validAssignment,
  ]);

  useEffect(() => {
    if (!canViewSolution || briefTab !== "solution" || !mission) return;
    if (frontendOnly) {
      setSolution(null);
      setSolutionError("Las soluciones privadas requieren el backend oficial.");
      setSolutionLoading(false);
      return;
    }
    let active = true;
    setSolutionLoading(true);
    setSolutionError("");
    void runMissionAdmin({
      action: "get-solution",
      missionId: mission.id,
      missionVersion: mission.version,
      language,
    })
      .then((response) => {
        if (!active) return;
        setSolution(response.solution ?? null);
        if (!response.solution) {
          setSolutionError("La solución no está disponible.");
        }
      })
      .catch((error) => {
        if (!active) return;
        setSolution(null);
        setSolutionError(
          backendMode === "demo"
            ? "La solución privada está disponible en el aula conectada."
            : error instanceof Error
              ? error.message
              : "No se pudo cargar la solución.",
        );
      })
      .finally(() => {
        if (active) setSolutionLoading(false);
      });
    return () => {
      active = false;
    };
  }, [backendMode, briefTab, canViewSolution, frontendOnly, language, mission]);

  useEffect(() => {
    if (!canViewSolution && briefTab === "solution") {
      setBriefTab("problem");
    }
  }, [briefTab, canViewSolution]);

  useEffect(() => {
    const workbench = workbenchRef.current;
    if (!workbench || typeof ResizeObserver === "undefined") return;
    const clampCurrentWidth = () => {
      const maxWidth = Math.max(
        MIN_RESULTS_WIDTH,
        workbench.clientWidth - MIN_EDITOR_WIDTH - RESIZER_WIDTH,
      );
      setResultsWidth((current) =>
        Math.min(Math.max(current, MIN_RESULTS_WIDTH), maxWidth),
      );
    };
    const observer = new ResizeObserver(clampCurrentWidth);
    observer.observe(workbench);
    clampCurrentWidth();
    return () => observer.disconnect();
  }, []);

  if (!mission) return <Navigate to="/missions" replace />;
  if (!profile || !viewProfile || !snapshot) return null;

  const activeMission = mission;
  const activeProfile = viewProfile;
  const allowedLanguages = validAssignment?.allowedLanguages ?? [...LANGUAGES];
  const currentCode = codeByLanguage[language];
  const currentExecutionFingerprint = executionFingerprint(
    activeMission.id,
    activeMission.version,
    language,
    currentCode,
  );
  const hasRunCurrentCode =
    executedFingerprints.has(currentExecutionFingerprint) ||
    history.some(
      (attempt) =>
        attempt.kind === "run" &&
        attempt.missionVersion === activeMission.version &&
        attempt.language === language &&
        attempt.code === currentCode,
    );
  const submitNeedsRun = Boolean(validAssignment) && !hasRunCurrentCode;
  const testInputs = Object.fromEntries(
    activeMission.variants[language].publicTests.map((testCase) => [
      testCase.id,
      testCase.actualExpression ?? testCase.expression,
    ]),
  );
  const contractGuide = languageContract(language);
  const visibleExample = activeMission.variants[language].examples[0];
  const visibleCall =
    activeMission.variants[language].publicTests[0]?.actualExpression ??
    activeMission.variants[language].publicTests[0]?.expression;
  const visiblePrerequisites = activeMission.prerequisites
    .map((missionId) => {
      const prerequisite = getMissionById(missionId);
      const prerequisiteAssignment = studentAssignments.find(
        (entry) => entry.missionId === missionId,
      );
      if (studentView && !prerequisiteAssignment) return null;
      return prerequisite
        ? { mission: prerequisite, assignment: prerequisiteAssignment }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  async function execute(kind: AttemptKind) {
    if (
      isStudentPreview ||
      (kind === "submit" && submitNeedsRun) ||
      (frontendOnly && (kind === "submit" || language === "cpp"))
    ) return;
    setRunning(kind);
    setResult(null);
    setMobilePane("results");
    const rawResult = await runMissionCode({
      mission: activeMission,
      language,
      code: currentCode,
      kind,
      assignmentId: validAssignment?.id,
    });
    const annotatedResult = {
      ...rawResult,
      tests: rawResult.tests.map((entry) => ({
        ...entry,
        hidden: entry.hidden,
      })),
    };
    setResult(annotatedResult);
    if (kind === "run") {
      setExecutedFingerprints((current) => {
        const next = new Set(current);
        next.add(currentExecutionFingerprint);
        return next;
      });
    }
    const attempt: Attempt = {
      id: annotatedResult.id,
      userId: activeProfile.id,
      missionId: activeMission.id,
      assignmentId: validAssignment?.id,
      missionVersion: activeMission.version,
      language,
      kind,
      code: currentCode,
      result: annotatedResult,
      createdAt: annotatedResult.createdAt,
    };
    recordAttempt(attempt);
    if (validAssignment && activeProfile.role === "student") {
      recordActivity(
        validAssignment.id,
        language,
        kind === "submit" ? "submitted" : "ran",
      );
    }
    setRunning(null);
  }

  function clampResultsWidth(nextWidth: number) {
    const workbenchWidth = workbenchRef.current?.clientWidth ?? 0;
    const maxWidth = Math.max(
      MIN_RESULTS_WIDTH,
      workbenchWidth - MIN_EDITOR_WIDTH - RESIZER_WIDTH,
    );
    return Math.min(Math.max(nextWidth, MIN_RESULTS_WIDTH), maxWidth);
  }

  function resizeResults(event: ReactPointerEvent<HTMLButtonElement>) {
    const workbench = workbenchRef.current;
    if (!workbench) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setResultsWidth(
      clampResultsWidth(workbench.getBoundingClientRect().right - event.clientX),
    );
  }

  function finishResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const workbench = workbenchRef.current;
    const next = workbench
      ? clampResultsWidth(
          workbench.getBoundingClientRect().right - event.clientX,
        )
      : resultsWidth;
    setResultsWidth(next);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.localStorage.setItem(RESULTS_WIDTH_KEY, String(next));
  }

  function resizeResultsWithKeyboard(direction: -1 | 1) {
    setResultsWidth((current) => {
      const next = clampResultsWidth(current + direction * 24);
      window.localStorage.setItem(RESULTS_WIDTH_KEY, String(next));
      return next;
    });
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
          {validAssignment ? (
            <span className="due-chip">
              <Clock3 aria-hidden="true" />
              {relativeDueDate(validAssignment.dueAt)}
            </span>
          ) : (
            <span className="practice-label">Práctica libre</span>
          )}
          <span
            className={`sync-state ${saveState}`}
            role="status"
            title={saveMessage || undefined}
          >
            {isStudentPreview ||
            saveState === "synced" ||
            saveState === "local" ? (
              <Check />
            ) : saveState === "error" ? (
              <CircleAlert />
            ) : (
              <LoaderCircle className="spin" />
            )}
            {isStudentPreview
              ? "Solo lectura"
              : saveState === "synced"
              ? "Sincronizado"
              : saveState === "local"
                ? "Guardado local"
                : saveState === "error"
                  ? "Error de sincronización"
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
            {(
              [
                ["problem", "Misión"],
                ["hints", "Pistas"],
                ["history", "Historial"],
                ...(canViewSolution ? [["solution", "Solución"]] : []),
              ] as [BriefTab, string][]
            ).map(([value, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={briefTab === value}
                className={briefTab === value ? "is-active" : ""}
                key={value}
                onClick={() => setBriefTab(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="brief-scroll">
            {briefTab === "problem" ? (
              <>
                {validAssignment ? (
                  <section
                    className={`assignment-note assignment-note-priority ${
                      assignmentOverdue ? "is-overdue" : ""
                    }`}
                  >
                    <p className="eyebrow">ENCARGO DEL MENTOR</p>
                    <h2>{validAssignment.title}</h2>
                    <p>
                      {validAssignment.instructions ||
                        "Completa esta misión y envíala antes del vencimiento."}
                    </p>
                    <div className="assignment-note-meta">
                      <span>
                        <Clock3 aria-hidden="true" />
                        <strong>{relativeDueDate(validAssignment.dueAt)}</strong>
                        <small>{formatDate(validAssignment.dueAt, true)}</small>
                      </span>
                      <StatusBadge
                        status={assignmentStatus}
                        overdue={assignmentOverdue}
                      />
                    </div>
                  </section>
                ) : null}
                <section className="brief-section evaluation-flow">
                  <p className="eyebrow">ASÍ SE EVALÚA</p>
                  <h2>Los datos llegan solos a tu función</h2>
                  <div className="evaluation-flow-steps">
                    <article>
                      <span>1</span>
                      <div>
                        <strong>El test prepara los valores</strong>
                        <code>{visibleExample?.input ?? "Datos del caso de prueba"}</code>
                      </div>
                    </article>
                    <article>
                      <span>2</span>
                      <div>
                        <strong>Llama a tu función</strong>
                        <code>
                          {visibleCall ??
                            activeMission.variants[language].expectedSignature}
                        </code>
                      </div>
                    </article>
                    <article>
                      <span>3</span>
                      <div>
                        <strong>Tu código usa los parámetros</strong>
                        <p>
                          No uses <code>{contractGuide.manualInput}</code> ni
                          escribas los valores del ejemplo dentro de la función.
                        </p>
                      </div>
                    </article>
                    <article>
                      <span>4</span>
                      <div>
                        <strong>La respuesta sale por return</strong>
                        <p>
                          Termina con <code>{contractGuide.returnExample}</code>.
                          <code>{contractGuide.consoleOutput}</code> solo muestra
                          notas y no responde la misión.
                        </p>
                      </div>
                    </article>
                  </div>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">CONTEXTO</p>
                  <p>{mission.context}</p>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">TU MISIÓN</p>
                  <h2>{mission.goal}</h2>
                  <p>{mission.brief}</p>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">IDEA CLAVE</p>
                  <p>{mission.conceptIntro}</p>
                </section>
                <section className="brief-section contract-section">
                  <p className="eyebrow">CONTRATO</p>
                  <code>
                    {mission.variants[language].expectedSignature ||
                      LANGUAGE_META[language].fileName}
                  </code>
                  <p>
                    Conserva esta firma: los tests llaman directamente a esta
                    función.
                  </p>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">EJEMPLOS</p>
                  <div className="mission-examples">
                    {mission.variants[language].examples.map((example) => (
                      <article key={example.id}>
                        <strong>{example.label}</strong>
                        <dl>
                          <div>
                            <dt>Entrada</dt>
                            <dd>
                              <code>{example.input}</code>
                            </dd>
                          </div>
                          <div>
                            <dt>Salida</dt>
                            <dd>
                              <code>{example.output}</code>
                            </dd>
                          </div>
                        </dl>
                        <p>{example.explanation}</p>
                      </article>
                    ))}
                  </div>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">PASOS SUGERIDOS</p>
                  <ol className="mission-steps">
                    {mission.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">RESTRICCIONES</p>
                  <ul className="mission-constraints">
                    {mission.constraints.map((constraint) => (
                      <li key={constraint}>{constraint}</li>
                    ))}
                  </ul>
                </section>
                <section className="brief-section">
                  <p className="eyebrow">LISTO CUANDO</p>
                  <ul className="objective-list">
                    {mission.successCriteria.map((criterion) => (
                      <li key={criterion}>
                        <CheckCircle2 aria-hidden="true" />
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </section>
                {visiblePrerequisites.length > 0 ? (
                  <section className="brief-section prerequisites">
                    <p className="eyebrow">ANTES DE ESTA MISIÓN</p>
                    {visiblePrerequisites.map((entry) => {
                      return (
                        <Link
                          key={entry.mission.id}
                          to={`/mission/${entry.mission.slug}${
                            entry.assignment
                              ? `?assignment=${entry.assignment.id}`
                              : ""
                          }`}
                        >
                          {entry.mission.title}
                          <ChevronRight aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </section>
                ) : null}
                <section className="brief-facts">
                  <span>
                    <Clock3 aria-hidden="true" /> {mission.duration} min
                  </span>
                  <span>
                    <Zap aria-hidden="true" />{" "}
                    {validAssignment?.points ?? mission.points} XP
                  </span>
                  <span>{mission.difficulty}</span>
                </section>
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
                        if (validAssignment) {
                          recordHint(validAssignment.id, next);
                        }
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
                {linkedReview ? (
                  <article className="linked-review">
                    <span>
                      {linkedReview.decision === "approved"
                        ? "Entrega aprobada"
                        : linkedReview.decision === "changes_requested"
                          ? "Cambios solicitados"
                          : "Comentario del mentor"}
                    </span>
                    <p>{linkedReview.comment}</p>
                    {linkedReview.criteria.length > 0 ? (
                      <div className="linked-review-criteria">
                        {linkedReview.criteria.map((criterion) => (
                          <span
                            className={criterion.met ? "is-met" : ""}
                            key={criterion.id}
                          >
                            {criterion.met ? "Cumple" : "Revisar"} ·{" "}
                            {criterion.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {linkedReview.inlineComments.map((comment, index) => (
                      <blockquote key={`${comment.line}-${index}`}>
                        <strong>Línea {comment.line}</strong>
                        {comment.body}
                      </blockquote>
                    ))}
                  </article>
                ) : null}
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
                        {LANGUAGE_META[attempt.language].shortLabel} · v
                        {attempt.missionVersion}
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

            {briefTab === "solution" && canViewSolution ? (
              <section className="solution-panel">
                <div className="solution-heading">
                  <ShieldCheck aria-hidden="true" />
                  <div>
                    <h2>Solución de referencia</h2>
                    <p>
                      Visible solo para staff y para la versión evaluada.
                    </p>
                  </div>
                </div>
                {solutionLoading ? (
                  <div className="empty-inline">
                    <LoaderCircle className="spin" aria-hidden="true" />
                    <span>Cargando solución privada...</span>
                  </div>
                ) : solution ? (
                  <>
                    <div className="solution-contract">
                      <span>Firma</span>
                      <code>{solution.expectedSignature}</code>
                    </div>
                    <p>{solution.explanation}</p>
                    <div className="solution-code-heading">
                      <span>{LANGUAGE_META[solution.language].fileName}</span>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Copiar solución"
                        title="Copiar solución"
                        onClick={() =>
                          void navigator.clipboard.writeText(
                            solution.referenceSolution,
                          )
                        }
                      >
                        <Copy aria-hidden="true" />
                      </button>
                    </div>
                    <pre className="solution-code">
                      <code>{solution.referenceSolution}</code>
                    </pre>
                  </>
                ) : (
                  <div className="empty-state compact-empty">
                    <CircleAlert aria-hidden="true" />
                    <h2>Solución no disponible</h2>
                    <p>{solutionError}</p>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </aside>

        <div
          className="workbench-panes"
          ref={workbenchRef}
          style={
            {
              "--results-panel-width": `${resultsWidth}px`,
            } as CSSProperties
          }
        >
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
              disabled={isStudentPreview}
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
                  editorRef.current = editor;
                  if (import.meta.env.DEV) {
                    window.__TOMATIN_EDITOR__ = editor;
                  }
                }}
                onChange={(value) => {
                  setCodeByLanguage((current) => ({
                    ...current,
                    [language]: value ?? "",
                  }));
                  if (
                    validAssignment &&
                    profile.role === "student" &&
                    Date.now() - lastEditingSignal.current >= 60_000
                  ) {
                    lastEditingSignal.current = Date.now();
                    recordActivity(validAssignment.id, language, "editing");
                  }
                }}
                options={{
                  automaticLayout: true,
                  accessibilitySupport: "auto",
                  readOnly: isStudentPreview,
                  domReadOnly: isStudentPreview,
                  fontSize: 14,
                  fontFamily:
                    '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
                  lineHeight: 22,
                  minimap: { enabled: false },
                  padding: { top: 16, bottom: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  tabSize: language === "python" ? 4 : 2,
                  wordWrap: "off",
                  scrollBeyondLastColumn: 5,
                  folding: true,
                  foldingImportsByDefault: language === "cpp",
                  showFoldingControls: "always",
                  scrollbar: {
                    horizontal: "auto",
                    vertical: "auto",
                    alwaysConsumeMouseWheel: false,
                  },
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
              disabled={
                Boolean(running) ||
                isStudentPreview ||
                (frontendOnly && language === "cpp")
              }
              title={
                frontendOnly && language === "cpp"
                  ? "C++ requiere el ejecutor remoto y está desactivado en este sandbox"
                  : undefined
              }
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
              disabled={
                Boolean(running) ||
                isStudentPreview ||
                submitNeedsRun ||
                frontendOnly
              }
              title={
                frontendOnly
                  ? "Las entregas requieren el backend oficial"
                  : submitNeedsRun
                  ? "Ejecuta este código antes de entregarlo"
                  : undefined
              }
              onClick={() => void execute("submit")}
            >
              {running === "submit" ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {validAssignment ? "Entregar" : "Comprobar"}
            </button>
          </div>
          </section>

          <button
            className="workspace-resizer"
            type="button"
            role="separator"
            aria-label="Ajustar ancho de Resultados"
            aria-orientation="vertical"
            aria-valuemin={MIN_RESULTS_WIDTH}
            aria-valuenow={Math.round(resultsWidth)}
            title="Arrastra para ajustar Resultados"
            onPointerDown={resizeResults}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                resizeResults(event);
              }
            }}
            onPointerUp={finishResize}
            onPointerCancel={finishResize}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                resizeResultsWithKeyboard(1);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                resizeResultsWithKeyboard(-1);
              }
            }}
          >
            <GripVertical aria-hidden="true" />
          </button>

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
            <ResultSummary
              result={result}
              testInputs={testInputs}
              language={language}
              code={currentCode}
              onDiagnosticLine={(line) => {
                setMobilePane("code");
                window.setTimeout(() => {
                  editorRef.current?.revealLineInCenter(line);
                  editorRef.current?.setPosition({ lineNumber: line, column: 1 });
                  editorRef.current?.focus();
                }, 0);
              }}
            />
          )}
          </section>
        </div>
      </div>
    </main>
  );
}
