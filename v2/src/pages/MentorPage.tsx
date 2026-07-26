import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookCopy,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clipboard,
  ClipboardCheck,
  Clock3,
  Code2,
  Copy,
  Eye,
  FilePlus2,
  Filter,
  Link2,
  MailPlus,
  MessageSquareText,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, initials, isOverdue } from "@/lib/format";
import { useCatalog } from "@/state/catalog";
import { useClassroom } from "@/state/classroom-context";
import {
  runMissionAdmin,
  type MissionAdminDraft,
} from "@/services/mission-admin";
import {
  LANGUAGE_META,
  LANGUAGES,
  type CreateAssignmentInput,
  type Language,
  type MissionDraftInput,
} from "@/types";

type MentorTab = "overview" | "reviews" | "assignments" | "missions" | "invitations";

interface LocalMissionDraft extends MissionDraftInput {
  id: string;
  version: number;
  status: "draft" | "published";
  languages: Record<Language, boolean>;
  updatedAt: string;
}

const MISSION_DRAFTS_KEY = "tomatin.v2.mission-drafts";

function readMissionDrafts(): LocalMissionDraft[] {
  try {
    return JSON.parse(localStorage.getItem(MISSION_DRAFTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function MentorOverview({
  onOpenReviews,
}: {
  onOpenReviews: () => void;
}) {
  const { snapshot } = useClassroom();
  if (!snapshot) return null;
  const students = snapshot.profiles.filter((entry) => entry.role === "student");
  const reviewCount = snapshot.progress.filter(
    (entry) => entry.status === "awaiting_review",
  ).length;
  const overdueCount = snapshot.progress.filter((entry) => {
    const assignment = snapshot.assignments.find(
      (item) => item.id === entry.assignmentId,
    );
    return assignment ? isOverdue(assignment.dueAt, entry.status) : false;
  }).length;
  const activeToday = new Set(
    snapshot.progress
      .filter(
        (entry) =>
          entry.lastActivityAt &&
          Date.now() - new Date(entry.lastActivityAt).getTime() < 86_400_000,
      )
      .map((entry) => entry.userId),
  ).size;

  return (
    <>
      <section className="metrics-strip mentor-metrics" aria-label="Resumen del curso">
        <article>
          <span className="metric-icon info"><Users /></span>
          <div><strong>{students.length}</strong><span>estudiantes</span></div>
        </article>
        <article>
          <span className="metric-icon warning"><ClipboardCheck /></span>
          <div><strong>{reviewCount}</strong><span>por revisar</span></div>
        </article>
        <article>
          <span className="metric-icon danger"><Clock3 /></span>
          <div><strong>{overdueCount}</strong><span>atrasos</span></div>
        </article>
        <article>
          <span className="metric-icon success"><Code2 /></span>
          <div><strong>{activeToday}</strong><span>activos hoy</span></div>
        </article>
      </section>

      {reviewCount > 0 ? (
        <button className="review-callout" type="button" onClick={onOpenReviews}>
          <span className="review-callout-icon"><ClipboardCheck /></span>
          <span>
            <strong>{reviewCount} entregas esperan revisión</strong>
            <small>La entrega más antigua lleva menos de 24 horas.</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}

      <section className="mentor-section" aria-labelledby="matrix-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">SEGUIMIENTO</p>
            <h2 id="matrix-title">Matriz del curso</h2>
          </div>
          <span className="section-note">Últimas 4 tareas</span>
        </div>
        <div className="progress-matrix">
          <div className="matrix-row matrix-head">
            <span>Estudiante</span>
            {snapshot.assignments.slice(0, 4).map((assignment) => (
              <span key={assignment.id}>{assignment.title}</span>
            ))}
          </div>
          {students.map((student) => (
            <div className="matrix-row" key={student.id}>
              <div className="matrix-student">
                <span className="avatar">{initials(student.displayName)}</span>
                <span>
                  <strong>{student.displayName}</strong>
                  <small>{student.githubLogin ? `@${student.githubLogin}` : student.email}</small>
                </span>
              </div>
              {snapshot.assignments.slice(0, 4).map((assignment) => {
                const progress = snapshot.progress.find(
                  (entry) =>
                    entry.userId === student.id &&
                    entry.assignmentId === assignment.id,
                );
                return (
                  <div className="matrix-status" key={assignment.id}>
                    <StatusBadge status={progress?.status ?? "not_started"} />
                    <small>
                      {progress?.lastActivityAt
                        ? formatDate(progress.lastActivityAt, true)
                        : "Sin actividad"}
                    </small>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ReviewQueue() {
  const { profile, snapshot, reviewAttempt } = useClassroom();
  const { getMissionById } = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  if (!profile || !snapshot) return null;

  const queue = snapshot.progress
    .filter((entry) => entry.status === "awaiting_review")
    .map((progress) => {
      const attempts = snapshot.attempts
        .filter(
          (attempt) =>
            attempt.userId === progress.userId &&
            attempt.assignmentId === progress.assignmentId &&
            attempt.kind === "submit",
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      return {
        progress,
        attempt: attempts[0],
        student: snapshot.profiles.find((entry) => entry.id === progress.userId),
        assignment: snapshot.assignments.find(
          (entry) => entry.id === progress.assignmentId,
        ),
      };
    })
    .filter((entry) => entry.attempt && entry.assignment && entry.student);
  const selected =
    queue.find((entry) => entry.attempt?.id === selectedId) ?? queue[0];

  function decide(decision: "approved" | "changes_requested") {
    if (!selected?.attempt) return;
    const fallback =
      decision === "approved"
        ? "Buen trabajo. La entrega cumple los objetivos de la misión."
        : "Revisa los puntos marcados y envía una nueva versión.";
    reviewAttempt(selected.attempt.id, decision, comment.trim() || fallback);
    setComment("");
    setSelectedId(null);
  }

  return (
    <section className="review-workspace" aria-label="Cola de revisiones">
      <div className="review-list">
        <div className="review-list-heading">
          <div>
            <p className="eyebrow">COLA</p>
            <h2>{queue.length} entregas</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Filtrar revisiones">
            <Filter aria-hidden="true" />
          </button>
        </div>
        {queue.map((entry) => (
          <button
            className={`review-list-item ${selected?.attempt?.id === entry.attempt?.id ? "is-active" : ""}`}
            type="button"
            key={entry.attempt?.id}
            onClick={() => setSelectedId(entry.attempt?.id ?? null)}
          >
            <span className="avatar">{initials(entry.student?.displayName ?? "?")}</span>
            <span>
              <strong>{entry.student?.displayName}</strong>
              <small>{entry.assignment?.title}</small>
              <em>
                {entry.attempt
                  ? `${LANGUAGE_META[entry.attempt.language].shortLabel} · ${formatDate(entry.attempt.createdAt, true)}`
                  : ""}
              </em>
            </span>
            <ArrowRight aria-hidden="true" />
          </button>
        ))}
        {queue.length === 0 ? (
          <div className="empty-state compact-empty">
            <CheckCircle2 aria-hidden="true" />
            <h2>Cola al día</h2>
            <p>No hay entregas esperando revisión.</p>
          </div>
        ) : null}
      </div>

      {selected?.attempt && selected.student && selected.assignment ? (
        <div className="review-detail">
          <header className="review-detail-header">
            <div>
              <p className="eyebrow">ENTREGA</p>
              <h2>{selected.assignment.title}</h2>
              <span>
                {selected.student.displayName} ·{" "}
                {LANGUAGE_META[selected.attempt.language].label}
              </span>
            </div>
            <Link
              className="button secondary"
              to={`/mission/${getMissionById(selected.assignment.missionId)?.slug}?assignment=${selected.assignment.id}`}
            >
              <Eye aria-hidden="true" />
              Ver misión
            </Link>
          </header>

          <div className="review-result-strip">
            <span className="tone-success">
              <CheckCircle2 aria-hidden="true" />
              {selected.attempt.result.tests.filter((entry) => entry.passed).length}/
              {selected.attempt.result.tests.length} tests
            </span>
            <span>{selected.attempt.result.durationMs ?? "—"} ms</span>
            <span>{selected.progress.attempts} intentos</span>
            <span>{selected.progress.hintsUsed} pistas</span>
          </div>

          <div className="review-code">
            <div className="review-code-title">
              <Code2 aria-hidden="true" />
              {LANGUAGE_META[selected.attempt.language].fileName}
            </div>
            <pre><code>{selected.attempt.code}</code></pre>
          </div>

          <div className="review-feedback-form">
            <label htmlFor="mentor-comment">Comentario para {selected.student.displayName}</label>
            <textarea
              id="mentor-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Describe qué está bien o qué debería revisar..."
              rows={4}
            />
            <div className="review-actions">
              <button
                className="button danger"
                type="button"
                onClick={() => decide("changes_requested")}
              >
                <XCircle aria-hidden="true" />
                Solicitar cambios
              </button>
              <button
                className="button primary"
                type="button"
                onClick={() => decide("approved")}
              >
                <Check aria-hidden="true" />
                Aprobar y asignar XP
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AssignmentsManager() {
  const { snapshot, createAssignment } = useClassroom();
  const { missions, getMissionById } = useCatalog();
  const [creating, setCreating] = useState(false);
  const students = snapshot?.profiles.filter((entry) => entry.role === "student") ?? [];
  const [languageSelection, setLanguageSelection] = useState<Language[]>([
    ...LANGUAGES,
  ]);
  const [studentSelection, setStudentSelection] = useState<string[]>(
    students.map((entry) => entry.id),
  );
  if (!snapshot) return null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const missionId = String(data.get("missionId"));
    const selectedMission = getMissionById(missionId);
    if (!selectedMission) return;
    const input: CreateAssignmentInput = {
      missionId,
      title: String(data.get("title") || selectedMission.title),
      instructions: String(data.get("instructions") || ""),
      dueAt: new Date(String(data.get("dueAt"))).toISOString(),
      points: Number(data.get("points") || selectedMission.points),
      allowedLanguages: languageSelection,
      studentIds: studentSelection,
    };
    createAssignment(input);
    setCreating(false);
    event.currentTarget.reset();
  }

  return (
    <section className="mentor-section" aria-labelledby="assignments-manager-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">PLANIFICACIÓN</p>
          <h2 id="assignments-manager-title">Asignaciones</h2>
        </div>
        <button className="button primary" type="button" onClick={() => setCreating(!creating)}>
          <CalendarPlus aria-hidden="true" />
          Nueva tarea
        </button>
      </div>

      {creating ? (
        <form className="assignment-form" onSubmit={submit}>
          <label>
            <span>Misión</span>
            <select name="missionId" required defaultValue="">
              <option value="" disabled>Selecciona una misión</option>
              {missions.map((mission) => (
                <option value={mission.id} key={mission.id}>
                  {mission.courseLabel} · {mission.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Título de la tarea</span>
            <input name="title" required placeholder="Ej. Condiciones y casos límite" />
          </label>
          <label className="form-span-2">
            <span>Instrucciones</span>
            <textarea name="instructions" rows={3} placeholder="Criterios específicos para el curso" />
          </label>
          <label>
            <span>Fecha de entrega</span>
            <input
              name="dueAt"
              type="datetime-local"
              required
              defaultValue={new Date(Date.now() + 7 * 86_400_000)
                .toISOString()
                .slice(0, 16)}
            />
          </label>
          <label>
            <span>XP</span>
            <input name="points" type="number" min="10" max="2000" step="10" defaultValue="100" required />
          </label>
          <fieldset className="language-fieldset form-span-2">
            <legend>Lenguajes permitidos</legend>
            {LANGUAGES.map((language) => (
              <label key={language}>
                <input
                  type="checkbox"
                  checked={languageSelection.includes(language)}
                  onChange={(event) =>
                    setLanguageSelection((current) =>
                      event.target.checked
                        ? [...current, language]
                        : current.filter((entry) => entry !== language),
                    )
                  }
                />
                {LANGUAGE_META[language].label}
              </label>
            ))}
          </fieldset>
          <fieldset className="student-fieldset form-span-2">
            <legend>Estudiantes</legend>
            <div className="fieldset-actions">
              <button
                type="button"
                onClick={() => setStudentSelection(students.map((entry) => entry.id))}
              >
                Seleccionar todos
              </button>
              <button type="button" onClick={() => setStudentSelection([])}>
                Limpiar
              </button>
            </div>
            <div className="student-checkbox-grid">
              {students.map((student) => (
                <label key={student.id}>
                  <input
                    type="checkbox"
                    checked={studentSelection.includes(student.id)}
                    onChange={(event) =>
                      setStudentSelection((current) =>
                        event.target.checked
                          ? [...current, student.id]
                          : current.filter((entry) => entry !== student.id),
                      )
                    }
                  />
                  {student.displayName}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-actions form-span-2">
            <span>
              Se asignará a {studentSelection.length} de {students.length} estudiantes.
            </span>
            <button className="button ghost" type="button" onClick={() => setCreating(false)}>
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={
                languageSelection.length === 0 || studentSelection.length === 0
              }
            >
              <Send aria-hidden="true" />
              Publicar tarea
            </button>
          </div>
        </form>
      ) : null}

      <div className="admin-list">
        {snapshot.assignments.map((assignment) => {
          const mission = getMissionById(assignment.missionId);
          const assignmentProgress = snapshot.progress.filter(
            (entry) => entry.assignmentId === assignment.id,
          );
          return (
            <article className="admin-row" key={assignment.id}>
              <div className="admin-row-main">
                <span>{mission?.courseLabel}</span>
                <strong>{assignment.title}</strong>
                <small>{mission?.title}</small>
              </div>
              <div>
                <span>Entrega</span>
                <strong>{formatDate(assignment.dueAt)}</strong>
              </div>
              <div>
                <span>Aprobadas</span>
                <strong>
                  {assignmentProgress.filter((entry) => entry.status === "approved").length}/
                  {assignment.studentIds.length}
                </strong>
              </div>
              <div className="admin-language-list">
                {assignment.allowedLanguages.map((language) => (
                  <span key={language}>{LANGUAGE_META[language].shortLabel}</span>
                ))}
              </div>
              <Link
                className="icon-button"
                to={`/mission/${mission?.slug}?assignment=${assignment.id}`}
                aria-label={`Abrir ${assignment.title}`}
              >
                <ArrowRight aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ServerDraftEditor({
  draft,
  onSaved,
  onClose,
  onArchived,
}: {
  draft: MissionAdminDraft;
  onSaved: (drafts: MissionAdminDraft[]) => void;
  onClose: () => void;
  onArchived: (drafts: MissionAdminDraft[]) => void;
}) {
  const [language, setLanguage] = useState<Language>("javascript");
  const [starterCode, setStarterCode] = useState("");
  const [referenceSolution, setReferenceSolution] = useState("");
  const [publicTests, setPublicTests] = useState("[]");
  const [hiddenTests, setHiddenTests] = useState("[]");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const variant = draft.variants.find((entry) => entry.language === language);

  useEffect(() => {
    setStarterCode(variant?.starterCode ?? "");
    setReferenceSolution(variant?.referenceSolution ?? "");
    setPublicTests(JSON.stringify(variant?.publicTests ?? [], null, 2));
    setHiddenTests(JSON.stringify(variant?.hiddenTests ?? [], null, 2));
    setMessage("");
  }, [draft.id, language, variant]);

  async function updateContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await runMissionAdmin({
        action: "update-content",
        versionId: draft.id,
        content: {
          title: String(data.get("title")),
          summary: String(data.get("summary")),
          brief: String(data.get("brief")),
        },
      });
      onSaved(response.drafts ?? []);
      setMessage("Contenido guardado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function updateVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const parsedPublic = JSON.parse(publicTests) as MissionAdminDraft["variants"][number]["publicTests"];
      const parsedHidden = JSON.parse(hiddenTests) as MissionAdminDraft["variants"][number]["hiddenTests"];
      if (!Array.isArray(parsedPublic) || !Array.isArray(parsedHidden)) {
        throw new Error("Los tests deben ser arreglos JSON.");
      }
      const response = await runMissionAdmin({
        action: "update-variant",
        versionId: draft.id,
        language,
        starterCode,
        referenceSolution,
        publicTests: parsedPublic,
        hiddenTests: parsedHidden,
      });
      onSaved(response.drafts ?? []);
      setMessage(`${LANGUAGE_META[language].label} guardado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    setBusy(true);
    try {
      const response = await runMissionAdmin({
        action: "archive",
        versionId: draft.id,
      });
      onArchived(response.drafts ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  return (
    <section className="mission-editor" aria-labelledby="mission-editor-title">
      <header>
        <div>
          <p className="eyebrow">BORRADOR // V{draft.version}</p>
          <h3 id="mission-editor-title">
            {String(draft.content.title ?? "Misión sin título")}
          </h3>
        </div>
        <button className="button ghost" type="button" onClick={onClose}>
          Cerrar
        </button>
      </header>

      <form className="mission-content-form" onSubmit={updateContent}>
        <label>
          <span>Título</span>
          <input name="title" required defaultValue={String(draft.content.title ?? "")} />
        </label>
        <label>
          <span>Resumen</span>
          <input name="summary" required defaultValue={String(draft.content.summary ?? "")} />
        </label>
        <label className="form-span-2">
          <span>Enunciado</span>
          <textarea name="brief" rows={4} required defaultValue={String(draft.content.brief ?? "")} />
        </label>
        <div className="form-actions form-span-2">
          <button className="button secondary" disabled={busy}>
            <Save aria-hidden="true" />
            Guardar contenido
          </button>
        </div>
      </form>

      <div className="language-switcher mission-editor-languages" role="group" aria-label="Variante">
        {LANGUAGES.map((entry) => (
          <button
            type="button"
            key={entry}
            className={language === entry ? "is-active" : ""}
            onClick={() => setLanguage(entry)}
          >
            {LANGUAGE_META[entry].shortLabel}
          </button>
        ))}
      </div>

      <form className="variant-editor-form" onSubmit={updateVariant}>
        <label>
          <span>Starter code</span>
          <textarea
            value={starterCode}
            onChange={(event) => setStarterCode(event.target.value)}
            rows={10}
            spellCheck={false}
          />
        </label>
        <label>
          <span>Solución de referencia</span>
          <textarea
            value={referenceSolution}
            onChange={(event) => setReferenceSolution(event.target.value)}
            rows={10}
            spellCheck={false}
          />
        </label>
        <label>
          <span>Tests públicos (JSON)</span>
          <textarea
            value={publicTests}
            onChange={(event) => setPublicTests(event.target.value)}
            rows={11}
            spellCheck={false}
          />
        </label>
        <label>
          <span>Tests ocultos (JSON)</span>
          <textarea
            value={hiddenTests}
            onChange={(event) => setHiddenTests(event.target.value)}
            rows={11}
            spellCheck={false}
          />
        </label>
        <div className="form-actions form-span-2">
          <button className="button danger" type="button" onClick={() => void archive()} disabled={busy}>
            Archivar borrador
          </button>
          <button className="button primary" disabled={busy}>
            <Save aria-hidden="true" />
            Guardar variante
          </button>
        </div>
      </form>
      <p className="editor-message" aria-live="polite">{message}</p>
    </section>
  );
}

function MissionManager() {
  const { backendMode } = useClassroom();
  const { missions, getMissionById, refreshCatalog } = useCatalog();
  const [drafts, setDrafts] = useState<LocalMissionDraft[]>(readMissionDrafts);
  const [serverDrafts, setServerDrafts] = useState<MissionAdminDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (backendMode !== "supabase") return;
    void runMissionAdmin({ action: "list" })
      .then((response) => setServerDrafts(response.drafts ?? []))
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : String(error)),
      );
  }, [backendMode]);

  function persist(next: LocalMissionDraft[]) {
    setDrafts(next);
    localStorage.setItem(MISSION_DRAFTS_KEY, JSON.stringify(next));
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const sourceMissionId = String(data.get("sourceMissionId"));
    const content = {
      title: String(data.get("title")),
      summary: String(data.get("summary")),
      brief: String(data.get("brief")),
      course: String(data.get("course")) as LocalMissionDraft["course"],
      courseLabel:
        String(data.get("course")) === "programming-1"
          ? "Programación I"
          : "Programación II",
    };
    if (backendMode === "supabase") {
      setBusyId("create");
      setMessage("");
      try {
        const response = await runMissionAdmin({
          action: "create",
          sourceMissionId,
          content,
        });
        setServerDrafts(response.drafts ?? []);
        setCreating(false);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusyId(null);
      }
      return;
    }
    persist([
      {
        id: crypto.randomUUID(),
        title: content.title,
        summary: content.summary,
        brief: content.brief,
        course: content.course,
        version: 1,
        status: "draft",
        languages: { javascript: true, python: true, cpp: true },
        updatedAt: new Date().toISOString(),
      },
      ...drafts,
    ]);
    setCreating(false);
  }

  async function duplicateMission(id: string) {
    const source = getMissionById(id);
    if (!source) return;
    if (backendMode === "supabase") {
      setBusyId(id);
      setMessage("");
      try {
        const response = await runMissionAdmin({
          action: "duplicate",
          missionId: id,
        });
        setServerDrafts(response.drafts ?? []);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusyId(null);
      }
      return;
    }
    persist([
      {
        id: crypto.randomUUID(),
        missionId: source.id,
        title: `${source.title} · copia`,
        summary: source.summary,
        brief: source.brief,
        course: source.course,
        version: source.version + 1,
        status: "draft",
        languages: { javascript: true, python: true, cpp: true },
        updatedAt: new Date().toISOString(),
      },
      ...drafts,
    ]);
  }

  async function publishDraft(id: string) {
    if (backendMode === "supabase") {
      setBusyId(id);
      setMessage("Validando JavaScript, Python y C++...");
      try {
        await runMissionAdmin({ action: "publish", versionId: id });
        setServerDrafts((current) => current.filter((draft) => draft.id !== id));
        setEditingId(null);
        await refreshCatalog();
        setMessage("Misión publicada.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusyId(null);
      }
      return;
    }
    persist(
      drafts.map((draft) =>
        draft.id === id &&
        LANGUAGES.every((language) => draft.languages[language])
          ? { ...draft, status: "published", updatedAt: new Date().toISOString() }
          : draft,
      ),
    );
  }

  const displayDrafts =
    backendMode === "supabase"
      ? serverDrafts.map((draft) => ({
          id: draft.id,
          title: String(draft.content.title ?? "Misión sin título"),
          version: draft.version,
          status: "draft" as const,
          updatedAt: draft.createdAt,
          languages: Object.fromEntries(
            LANGUAGES.map((language) => [
              language,
              draft.variants.some(
                (variant) =>
                  variant.language === language &&
                  variant.referenceSolution.length > 0 &&
                  variant.publicTests.length > 0 &&
                  variant.hiddenTests.length > 0,
              ),
            ]),
          ) as Record<Language, boolean>,
        }))
      : drafts;
  const editingDraft = serverDrafts.find((draft) => draft.id === editingId);

  return (
    <section className="mentor-section" aria-labelledby="missions-manager-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">CONTENIDO VERSIONADO</p>
          <h2 id="missions-manager-title">Misiones</h2>
        </div>
        <button className="button primary" type="button" onClick={() => setCreating(!creating)}>
          <FilePlus2 aria-hidden="true" />
          Nueva misión
        </button>
      </div>

      {creating ? (
        <form className="assignment-form" onSubmit={createDraft}>
          <label>
            <span>Plantilla de ejercicios</span>
            <select name="sourceMissionId" required defaultValue={missions[0]?.id}>
              {missions.map((mission) => (
                <option value={mission.id} key={mission.id}>{mission.title}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Curso</span>
            <select name="course" defaultValue="programming-1">
              <option value="programming-1">Programación I</option>
              <option value="programming-2">Programación II</option>
            </select>
          </label>
          <label className="form-span-2">
            <span>Título</span>
            <input name="title" required />
          </label>
          <label className="form-span-2">
            <span>Resumen</span>
            <input name="summary" required />
          </label>
          <label className="form-span-2">
            <span>Enunciado</span>
            <textarea name="brief" rows={4} required />
          </label>
          <div className="form-actions form-span-2">
            <span>Se creará como borrador sin publicar.</span>
            <button className="button ghost" type="button" onClick={() => setCreating(false)}>Cancelar</button>
            <button className="button primary" disabled={busyId === "create"}>
              <Save aria-hidden="true" /> Guardar borrador
            </button>
          </div>
        </form>
      ) : null}

      {editingDraft ? (
        <ServerDraftEditor
          draft={editingDraft}
          onClose={() => setEditingId(null)}
          onSaved={setServerDrafts}
          onArchived={(next) => {
            setServerDrafts(next);
            setEditingId(null);
          }}
        />
      ) : null}

      {displayDrafts.length > 0 ? (
        <div className="draft-section">
          <h3>Borradores y versiones nuevas</h3>
          {displayDrafts.map((draft) => {
            const ready = LANGUAGES.every((language) => draft.languages[language]);
            return (
              <article className="admin-row mission-admin-row" key={draft.id}>
                <div className="admin-row-main">
                  <span>v{draft.version} · {draft.status}</span>
                  <strong>{draft.title}</strong>
                  <small>Actualizada {formatDate(draft.updatedAt, true)}</small>
                </div>
                <div className="variant-readiness">
                  {LANGUAGES.map((language) => (
                    <span className={draft.languages[language] ? "ready" : ""} key={language}>
                      {draft.languages[language] ? <Check /> : <XCircle />}
                      {LANGUAGE_META[language].shortLabel}
                    </span>
                  ))}
                </div>
                {backendMode === "supabase" ? (
                  <button className="button ghost" type="button" onClick={() => setEditingId(draft.id)}>
                    Editar
                  </button>
                ) : null}
                <button
                  className="button secondary"
                  type="button"
                  disabled={
                    !ready ||
                    busyId === draft.id ||
                    draft.status === "published"
                  }
                  onClick={() => void publishDraft(draft.id)}
                >
                  <Send aria-hidden="true" />
                  {draft.status === "published" ? "Publicada" : "Publicar"}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      <p className="editor-message" aria-live="polite">{message}</p>

      <div className="admin-list">
        {missions.map((mission) => {
          const testCount = LANGUAGES.reduce(
            (total, language) =>
              total +
              mission.variants[language].publicTests.length +
              (mission.variants[language].hiddenTestCount ?? 0),
            0,
          );
          return (
            <article className="admin-row mission-admin-row" key={mission.id}>
              <div className="admin-row-main">
                <span>{mission.courseLabel} · v{mission.version}</span>
                <strong>{mission.title}</strong>
                <small>{mission.module}</small>
              </div>
              <div><span>Variantes</span><strong>3/3</strong></div>
              <div><span>Tests</span><strong>{testCount}</strong></div>
              <span className="published-label"><CheckCircle2 /> Publicada</span>
              <button
                className="icon-button"
                type="button"
                aria-label={`Duplicar ${mission.title}`}
                disabled={busyId === mission.id}
                onClick={() => void duplicateMission(mission.id)}
              >
                <Copy aria-hidden="true" />
              </button>
              <Link className="icon-button" to={`/mission/${mission.slug}`} aria-label={`Vista previa de ${mission.title}`}>
                <Eye aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InvitationsManager() {
  const { snapshot, createInvitations } = useClassroom();
  const [copied, setCopied] = useState<string | null>(null);
  if (!snapshot) return null;

  async function copyInvitation(token: string) {
    const url = `${window.location.origin}${window.location.pathname}#/join/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className="mentor-section" aria-labelledby="invitations-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">ACCESO AL CURSO</p>
          <h2 id="invitations-title">Invitaciones</h2>
        </div>
        <button className="button primary" type="button" onClick={() => createInvitations(1)}>
          <MailPlus aria-hidden="true" />
          Generar invitación
        </button>
      </div>
      <div className="invitation-note">
        <ShieldCheck aria-hidden="true" />
        <p>
          Cada enlace es individual, vence en siete días y solo puede usarse una vez.
          El estudiante podrá entrar con GitHub o mediante un enlace por correo.
        </p>
      </div>
      <div className="admin-list">
        {snapshot.invitations.map((invitation) => (
          <article className="admin-row invitation-row" key={invitation.id}>
            <span className="invitation-icon"><Link2 aria-hidden="true" /></span>
            <div className="admin-row-main">
              <span>{invitation.usedAt ? "UTILIZADA" : "DISPONIBLE"}</span>
              <strong>{invitation.label}</strong>
              <small>Vence {formatDate(invitation.expiresAt, true)}</small>
            </div>
            <code>{invitation.token.slice(0, 8)}••••</code>
            <button
              className="button secondary"
              type="button"
              disabled={Boolean(invitation.usedAt)}
              onClick={() => void copyInvitation(invitation.token)}
            >
              {copied === invitation.token ? <Check /> : <Clipboard />}
              {copied === invitation.token ? "Copiado" : "Copiar enlace"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Component() {
  const { profile, snapshot } = useClassroom();
  const [tab, setTab] = useState<MentorTab>("overview");
  if (!profile || !snapshot) return null;
  if (profile.role !== "owner" && profile.role !== "mentor") {
    return <Navigate to="/" replace />;
  }

  const reviewCount = snapshot.progress.filter(
    (entry) => entry.status === "awaiting_review",
  ).length;

  return (
    <main className="page mentor-page">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">MENTOR // {snapshot.classroom.timezone}</p>
          <h1>Panel de eeminionn</h1>
          <p>Seguimiento, revisiones, tareas y contenido del curso.</p>
        </div>
        <span className="mentor-role">
          <ShieldCheck aria-hidden="true" />
          Propietario
        </span>
      </header>

      <nav className="mentor-tabs" aria-label="Secciones del panel mentor">
        {[
          ["overview", "Resumen", Users],
          ["reviews", "Revisiones", ClipboardCheck],
          ["assignments", "Asignaciones", CalendarPlus],
          ["missions", "Misiones", BookCopy],
          ["invitations", "Invitaciones", MailPlus],
        ].map(([value, label, Icon]) => (
          <button
            type="button"
            className={tab === value ? "is-active" : ""}
            aria-current={tab === value ? "page" : undefined}
            key={value as string}
            onClick={() => setTab(value as MentorTab)}
          >
            <Icon aria-hidden="true" />
            {label as string}
            {value === "reviews" && reviewCount > 0 ? (
              <span>{reviewCount}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mentor-content">
        {tab === "overview" ? (
          <MentorOverview onOpenReviews={() => setTab("reviews")} />
        ) : null}
        {tab === "reviews" ? <ReviewQueue /> : null}
        {tab === "assignments" ? <AssignmentsManager /> : null}
        {tab === "missions" ? <MissionManager /> : null}
        {tab === "invitations" ? <InvitationsManager /> : null}
      </div>
    </main>
  );
}
