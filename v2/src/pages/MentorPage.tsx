import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
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
  Gift,
  Link2,
  LoaderCircle,
  MailPlus,
  MessageSquareText,
  Pencil,
  Plus,
  RotateCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { RankingBoard } from "@/components/RankingBoard";
import { RewardsManager } from "@/components/RewardsManager";
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
  type Invitation,
  type InvitationInput,
  type Language,
  type MissionDraftInput,
} from "@/types";

type MentorTab =
  | "overview"
  | "reviews"
  | "students"
  | "ranking"
  | "assignments"
  | "missions"
  | "invitations"
  | "rewards";

interface LocalMissionDraft extends MissionDraftInput {
  id: string;
  version: number;
  status: "draft" | "published";
  languages: Record<Language, boolean>;
  updatedAt: string;
}

const MISSION_DRAFTS_KEY = "tomatin.v2.mission-drafts";
const REVIEW_CRITERIA = [
  { id: "correctness", label: "Correctitud" },
  { id: "readability", label: "Claridad del código" },
  { id: "edge-cases", label: "Casos límite" },
] as const;

function readMissionDrafts(): LocalMissionDraft[] {
  try {
    return JSON.parse(localStorage.getItem(MISSION_DRAFTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function formLines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function MentorOverview({
  onOpenReviews,
}: {
  onOpenReviews: () => void;
}) {
  const { snapshot } = useClassroom();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  if (!snapshot) return null;
  const students = snapshot.profiles.filter((entry) => entry.role === "student");
  const now = Date.now();
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
          now - new Date(entry.lastActivityAt).getTime() < 86_400_000,
      )
      .map((entry) => entry.userId),
  ).size;
  const activeNow = new Set(
    snapshot.progress
      .filter(
        (entry) =>
          entry.lastActivityAt &&
          now - new Date(entry.lastActivityAt).getTime() < 5 * 60_000,
      )
      .map((entry) => entry.userId),
  ).size;
  const inactiveSevenDays = students.filter((student) => {
    const latest = snapshot.progress
      .filter((entry) => entry.userId === student.id && entry.lastActivityAt)
      .map((entry) => new Date(entry.lastActivityAt!).getTime())
      .sort((a, b) => b - a)[0];
    return !latest || now - latest >= 7 * 86_400_000;
  }).length;
  const approvedCount = snapshot.progress.filter(
    (entry) => entry.status === "approved",
  ).length;
  const startedCount = snapshot.progress.filter(
    (entry) => entry.status !== "not_started",
  ).length;
  const approvalRate =
    startedCount > 0 ? Math.round((approvedCount / startedCount) * 100) : 0;
  const reviewWaits = snapshot.progress
    .filter(
      (entry) =>
        entry.status === "awaiting_review" && Boolean(entry.submittedAt),
    )
    .map((entry) => now - new Date(entry.submittedAt!).getTime());
  const averageReviewHours =
    reviewWaits.length > 0
      ? Math.round(
          reviewWaits.reduce((total, value) => total + value, 0) /
            reviewWaits.length /
            3_600_000,
        )
      : 0;
  const oldestReviewHours =
    reviewWaits.length > 0
      ? Math.max(1, Math.round(Math.max(...reviewWaits) / 3_600_000))
      : 0;
  const visibleAssignments = [...snapshot.assignments]
    .filter((entry) => entry.status === "published")
    .sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    )
    .slice(0, 4);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleStudents = students.filter((student) => {
    if (
      normalizedQuery &&
      !`${student.displayName} ${student.githubLogin ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery)
    ) {
      return false;
    }
    if (statusFilter === "all") return true;
    return snapshot.progress.some(
      (entry) =>
        entry.userId === student.id && entry.status === statusFilter,
    );
  });
  const recentActivity = snapshot.progress
    .filter((entry) => entry.lastActivityAt)
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt!).getTime() -
        new Date(a.lastActivityAt!).getTime(),
    )
    .slice(0, 8);
  const eventLabels = {
    opened: "abrió",
    editing: "está editando",
    hint_revealed: "reveló una pista de",
    ran: "ejecutó",
    submitted: "entregó",
  } as const;

  return (
    <>
      <section className="metrics-strip mentor-metrics" aria-label="Resumen del curso">
        <article>
          <span className="metric-icon info"><Users /></span>
          <div><strong>{students.length}</strong><span>estudiantes</span></div>
        </article>
        <article>
          <span className="metric-icon success"><Activity /></span>
          <div><strong>{activeNow}</strong><span>activos ahora</span></div>
        </article>
        <article>
          <span className="metric-icon info"><Code2 /></span>
          <div><strong>{activeToday}</strong><span>activos hoy</span></div>
        </article>
        <article>
          <span className="metric-icon danger"><Clock3 /></span>
          <div><strong>{overdueCount}</strong><span>atrasos</span></div>
        </article>
        <article>
          <span className="metric-icon warning"><ClipboardCheck /></span>
          <div><strong>{reviewCount}</strong><span>por revisar</span></div>
        </article>
        <article>
          <span className="metric-icon success"><TrendingUp /></span>
          <div><strong>{approvalRate}%</strong><span>aprobación</span></div>
        </article>
        <article>
          <span className="metric-icon warning"><Timer /></span>
          <div><strong>{averageReviewHours} h</strong><span>espera media</span></div>
        </article>
        <article>
          <span className="metric-icon neutral"><Users /></span>
          <div><strong>{inactiveSevenDays}</strong><span>inactivos 7 días</span></div>
        </article>
      </section>

      {reviewCount > 0 ? (
        <button className="review-callout" type="button" onClick={onOpenReviews}>
          <span className="review-callout-icon"><ClipboardCheck /></span>
          <span>
            <strong>{reviewCount} entregas esperan revisión</strong>
            <small>
              La entrega más antigua espera {oldestReviewHours}{" "}
              {oldestReviewHours === 1 ? "hora" : "horas"}.
            </small>
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
          <span className="section-note">Próximas 4 tareas</span>
        </div>
        <div className="mentor-filters">
          <label className="search-field">
            <Search aria-hidden="true" />
            <span className="sr-only">Buscar estudiante</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar estudiante"
            />
          </label>
          <label>
            <span className="sr-only">Filtrar por estado</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="not_started">Pendiente</option>
              <option value="in_progress">En progreso</option>
              <option value="awaiting_review">En revisión</option>
              <option value="changes_requested">Con cambios</option>
              <option value="approved">Aprobada</option>
            </select>
          </label>
        </div>
        <div className="progress-matrix">
          <div className="matrix-row matrix-head">
            <span>Estudiante</span>
            {visibleAssignments.map((assignment) => (
              <span key={assignment.id}>{assignment.title}</span>
            ))}
          </div>
          {visibleStudents.map((student) => (
            <div className="matrix-row" key={student.id}>
              <Link
                className="matrix-student"
                to={`/admin/students/${student.id}`}
              >
                <span className="avatar">{initials(student.displayName)}</span>
                <span>
                  <strong>{student.displayName}</strong>
                  <small>{student.githubLogin ? `@${student.githubLogin}` : student.email}</small>
                </span>
              </Link>
              {visibleAssignments.map((assignment) => {
                const progress = snapshot.progress.find(
                  (entry) =>
                    entry.userId === student.id &&
                    entry.assignmentId === assignment.id,
                );
                return (
                  <Link
                    className="matrix-status"
                    key={assignment.id}
                    to={`/admin/students/${student.id}?assignment=${assignment.id}`}
                  >
                    <StatusBadge status={progress?.status ?? "not_started"} />
                    <small>
                      {progress?.lastActivityAt
                        ? formatDate(progress.lastActivityAt, true)
                        : "Sin actividad"}
                    </small>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="mentor-section" aria-labelledby="activity-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">TIEMPO REAL</p>
            <h2 id="activity-title">Actividad reciente</h2>
          </div>
          <span className="section-note">Actualización por Realtime</span>
        </div>
        <div className="mentor-activity-list">
          {recentActivity.map((entry) => {
            const student = snapshot.profiles.find(
              (profile) => profile.id === entry.userId,
            );
            const assignment = snapshot.assignments.find(
              (item) => item.id === entry.assignmentId,
            );
            return (
              <Link
                className="mentor-activity-row"
                key={`${entry.userId}-${entry.assignmentId}`}
                to={`/admin/students/${entry.userId}?assignment=${entry.assignmentId}`}
              >
                <span className="activity-dot" aria-hidden="true" />
                <span>
                  <strong>{student?.displayName ?? "Estudiante"}</strong>
                  <small>
                    {entry.lastEvent
                      ? eventLabels[entry.lastEvent]
                      : "tuvo actividad en"}{" "}
                    {assignment?.title ?? "una tarea"}
                    {entry.language
                      ? ` · ${LANGUAGE_META[entry.language].shortLabel}`
                      : ""}
                  </small>
                </span>
                <time dateTime={entry.lastActivityAt}>
                  {formatDate(entry.lastActivityAt!, true)}
                </time>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

function StudentDirectory({
  selectedStudentId,
}: {
  selectedStudentId?: string;
}) {
  const { snapshot, startStudentPreview } = useClassroom();
  const { getMissionById } = useCatalog();
  const [query, setQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  if (!snapshot) return null;

  const students = snapshot.profiles
    .filter((entry) => entry.role === "student")
    .filter((student) => {
      const normalized = query.trim().toLowerCase();
      if (
        normalized &&
        !`${student.displayName} ${student.githubLogin ?? ""}`
          .toLowerCase()
          .includes(normalized)
      ) {
        return false;
      }
      const latest = snapshot.progress
        .filter((entry) => entry.userId === student.id && entry.lastActivityAt)
        .map((entry) => new Date(entry.lastActivityAt!).getTime())
        .sort((a, b) => b - a)[0];
      if (activityFilter === "active") {
        return Boolean(latest && Date.now() - latest < 86_400_000);
      }
      if (activityFilter === "inactive") {
        return !latest || Date.now() - latest >= 7 * 86_400_000;
      }
      return true;
    });
  const selected =
    snapshot.profiles.find(
      (entry) =>
        entry.id === selectedStudentId && entry.role === "student",
    ) ?? students[0];

  if (!selected) {
    return (
      <div className="empty-state">
        <Users aria-hidden="true" />
        <h2>No hay estudiantes activos</h2>
      </div>
    );
  }

  const progress = snapshot.progress.filter(
    (entry) => entry.userId === selected.id,
  );
  const attempts = snapshot.attempts
    .filter((entry) => entry.userId === selected.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const selectedAttemptIds = new Set(attempts.map((entry) => entry.id));
  const reviews = snapshot.reviews
    .filter((entry) => selectedAttemptIds.has(entry.attemptId))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const repository = snapshot.repositories.find(
    (entry) => entry.userId === selected.id,
  );
  const repositoryHref =
    repository?.storageMode === "central" && repository.studentPath
      ? `${repository.htmlUrl}/tree/main/resoluciones/${repository.studentPath}`
      : repository?.htmlUrl;
  const latestActivity = progress
    .filter((entry) => entry.lastActivityAt)
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt!).getTime() -
        new Date(a.lastActivityAt!).getTime(),
    )[0];

  return (
    <section className="student-directory" aria-label="Seguimiento por estudiante">
      <aside className="student-directory-list">
        <div className="student-directory-controls">
          <label className="search-field">
            <Search aria-hidden="true" />
            <span className="sr-only">Buscar estudiante</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar estudiante"
            />
          </label>
          <select
            aria-label="Filtrar actividad"
            value={activityFilter}
            onChange={(event) => setActivityFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="active">Activos hoy</option>
            <option value="inactive">Inactivos 7 días</option>
          </select>
        </div>
        <div className="student-directory-rows">
          {students.map((student) => {
            const studentProgress = snapshot.progress.filter(
              (entry) => entry.userId === student.id,
            );
            const pending = studentProgress.filter(
              (entry) => entry.status === "awaiting_review",
            ).length;
            const latest = studentProgress
              .filter((entry) => entry.lastActivityAt)
              .sort(
                (a, b) =>
                  new Date(b.lastActivityAt!).getTime() -
                  new Date(a.lastActivityAt!).getTime(),
              )[0];
            return (
              <Link
                className={`student-directory-row ${
                  student.id === selected.id ? "is-active" : ""
                }`}
                key={student.id}
                to={`/admin/students/${student.id}`}
              >
                <span className="avatar">{initials(student.displayName)}</span>
                <span>
                  <strong>{student.displayName}</strong>
                  <small>
                    {latest?.lastActivityAt
                      ? formatDate(latest.lastActivityAt, true)
                      : "Sin actividad"}
                  </small>
                </span>
                {pending > 0 ? <em>{pending}</em> : null}
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="student-detail">
        <header className="student-detail-header">
          <span className="avatar large">{initials(selected.displayName)}</span>
          <div>
            <p className="eyebrow">ESTUDIANTE</p>
            <h2>{selected.displayName}</h2>
            <span>
              {selected.githubLogin
                ? `@${selected.githubLogin}`
                : selected.email}
            </span>
          </div>
          <Link
            className="button secondary"
            to="/"
            onClick={() => startStudentPreview(selected.id)}
          >
            <Eye aria-hidden="true" />
            Ver perspectiva
          </Link>
        </header>

        <section className="student-detail-summary" aria-label="Resumen del estudiante">
          <article>
            <strong>
              {progress.filter((entry) => entry.status === "approved").length}
            </strong>
            <span>aprobadas</span>
          </article>
          <article>
            <strong>
              {
                progress.filter(
                  (entry) => entry.status === "awaiting_review",
                ).length
              }
            </strong>
            <span>por revisar</span>
          </article>
          <article>
            <strong>
              {progress.reduce((total, entry) => total + entry.attempts, 0)}
            </strong>
            <span>intentos</span>
          </article>
          <article>
            <strong>
              {progress.reduce((total, entry) => total + entry.hintsUsed, 0)}
            </strong>
            <span>pistas</span>
          </article>
        </section>

        <section className="student-current-state">
          <div>
            <p className="eyebrow">ÚLTIMA ACTIVIDAD</p>
            <strong>
              {latestActivity
                ? snapshot.assignments.find(
                    (entry) => entry.id === latestActivity.assignmentId,
                  )?.title
                : "Sin actividad registrada"}
            </strong>
            {latestActivity?.lastActivityAt ? (
              <small>{formatDate(latestActivity.lastActivityAt, true)}</small>
            ) : null}
          </div>
          {repository ? (
            <a
              href={repositoryHref}
              target="_blank"
              rel="noreferrer"
              title={
                repository.studentPath
                  ? `resoluciones/${repository.studentPath}`
                  : repository.name
              }
            >
              <Link2 aria-hidden="true" />
              {repository.storageMode === "central"
                ? `resoluciones/${repository.studentPath ?? selected.githubLogin ?? "estudiante"}`
                : repository.name}
            </a>
          ) : (
            <span>Carpeta de entregas pendiente</span>
          )}
        </section>

        <section className="student-assignment-progress">
          <div className="section-header">
            <div>
              <p className="eyebrow">TAREAS</p>
              <h3>Progreso y versiones</h3>
            </div>
          </div>
          {progress.map((entry) => {
            const assignment = snapshot.assignments.find(
              (item) => item.id === entry.assignmentId,
            );
            const mission = assignment
              ? getMissionById(assignment.missionId, entry.missionVersion)
              : undefined;
            return assignment && mission ? (
              <Link
                className="student-assignment-row"
                key={entry.assignmentId}
                to={`/mission/${mission.slug}?assignment=${assignment.id}`}
              >
                <span>
                  <strong>{assignment.title}</strong>
                  <small>
                    {mission.title} · v{entry.missionVersion}
                  </small>
                </span>
                <span>
                  <StatusBadge status={entry.status} />
                  <small>
                    {entry.attempts} intentos · {entry.hintsUsed} pistas
                  </small>
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null;
          })}
        </section>

        <section className="student-code-history">
          <div className="section-header">
            <div>
              <p className="eyebrow">CÓDIGO GUARDADO</p>
              <h3>Últimas ejecuciones y entregas</h3>
            </div>
            <span className="section-note">
              Borradores privados no incluidos
            </span>
          </div>
          {attempts.slice(0, 20).map((attempt) => {
            const currentProgress = attempt.assignmentId
              ? progress.find(
                  (entry) => entry.assignmentId === attempt.assignmentId,
                )
              : undefined;
            return (
              <details className="student-attempt" key={attempt.id}>
                <summary>
                  <span>
                    <strong>
                      {attempt.kind === "submit" ? "Entrega" : "Ejecución"} ·{" "}
                      {LANGUAGE_META[attempt.language].shortLabel}
                    </strong>
                    <small>{formatDate(attempt.createdAt, true)}</small>
                  </span>
                  <span>
                    v{attempt.missionVersion}
                    {currentProgress &&
                    currentProgress.missionVersion !== attempt.missionVersion
                      ? " · versión anterior"
                      : ""}
                  </span>
                </summary>
                <pre>
                  <code>{attempt.code}</code>
                </pre>
              </details>
            );
          })}
          {attempts.length === 0 ? (
            <div className="empty-inline">
              <Code2 aria-hidden="true" />
              <span>No hay ejecuciones guardadas.</span>
            </div>
          ) : null}
        </section>

        {reviews.length > 0 ? (
          <section className="student-review-history">
            <div className="section-header">
              <div>
                <p className="eyebrow">FEEDBACK</p>
                <h3>Revisiones recientes</h3>
              </div>
            </div>
            {reviews.map((review) => (
              <article key={review.id}>
                <StatusBadge
                  status={
                    review.decision === "approved"
                      ? "approved"
                      : review.decision === "changes_requested"
                        ? "changes_requested"
                        : "in_progress"
                  }
                />
                <p>{review.comment}</p>
                {review.criteria.length > 0 ? (
                  <div className="student-review-criteria">
                    {review.criteria.map((criterion) => (
                      <span
                        className={criterion.met ? "is-met" : ""}
                        key={criterion.id}
                      >
                        {criterion.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {review.inlineComments.map((comment, index) => (
                  <blockquote key={`${comment.line}-${index}`}>
                    <strong>L{comment.line}</strong>
                    {comment.body}
                  </blockquote>
                ))}
                <time dateTime={review.createdAt}>
                  {formatDate(review.createdAt, true)}
                </time>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </section>
  );
}

function ReviewQueue() {
  const { profile, snapshot, frontendOnly, reviewAttempt } = useClassroom();
  const { getMissionById } = useCatalog();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<Language | "all">("all");
  const [inlineLine, setInlineLine] = useState(1);
  const [inlineBody, setInlineBody] = useState("");
  const [inlineComments, setInlineComments] = useState<
    Array<{ line: number; body: string }>
  >([]);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [criteria, setCriteria] = useState(() =>
    REVIEW_CRITERIA.map((entry) => ({ ...entry, met: false })),
  );
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
  const normalizedQuery = query.trim().toLowerCase();
  const visibleQueue = queue.filter((entry) => {
    if (language !== "all" && entry.attempt?.language !== language) {
      return false;
    }
    if (!normalizedQuery) return true;
    return `${entry.student?.displayName ?? ""} ${
      entry.student?.githubLogin ?? ""
    } ${entry.assignment?.title ?? ""}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const selected =
    visibleQueue.find((entry) => entry.attempt?.id === selectedId) ??
    visibleQueue[0];

  async function decide(decision: "approved" | "changes_requested") {
    if (frontendOnly) return;
    if (!selected?.attempt) return;
    const fallback =
      decision === "approved"
        ? "Buen trabajo. La entrega cumple los objetivos de la misión."
        : "Revisa los puntos marcados y envía una nueva versión.";
    setReviewBusy(true);
    setReviewMessage("");
    try {
      await reviewAttempt(
        selected.attempt.id,
        decision,
        comment.trim() || fallback,
        {
          inlineComments,
          criteria,
        },
      );
      setComment("");
      setInlineComments([]);
      setInlineBody("");
      setInlineLine(1);
      setCriteria(
        REVIEW_CRITERIA.map((entry) => ({ ...entry, met: false })),
      );
      setSelectedId(null);
    } catch (error) {
      setReviewMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la revisión.",
      );
    } finally {
      setReviewBusy(false);
    }
  }

  function selectReview(attemptId: string | null) {
    setSelectedId(attemptId);
    setComment("");
    setInlineComments([]);
    setInlineBody("");
    setInlineLine(1);
    setCriteria(REVIEW_CRITERIA.map((entry) => ({ ...entry, met: false })));
  }

  function addInlineComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = inlineBody.trim();
    if (!selected?.attempt || !body) return;
    const lineCount = selected.attempt.code.split("\n").length;
    const line = Math.min(Math.max(1, inlineLine), lineCount);
    setInlineComments((current) => [...current, { line, body }]);
    setInlineBody("");
  }

  return (
    <section className="review-workspace" aria-label="Cola de revisiones">
      <div className="review-list">
        <div className="review-list-heading">
          <div>
            <p className="eyebrow">COLA</p>
            <h2>{visibleQueue.length} entregas</h2>
          </div>
        </div>
        <div className="review-list-filters">
          <label className="search-field">
            <Search aria-hidden="true" />
            <span className="sr-only">Buscar revisión</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Estudiante o tarea"
            />
          </label>
          <select
            aria-label="Filtrar por lenguaje"
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as Language | "all")
            }
          >
            <option value="all">Todos los lenguajes</option>
            {LANGUAGES.map((entry) => (
              <option key={entry} value={entry}>
                {LANGUAGE_META[entry].label}
              </option>
            ))}
          </select>
        </div>
        {visibleQueue.map((entry) => (
          <button
            className={`review-list-item ${selected?.attempt?.id === entry.attempt?.id ? "is-active" : ""}`}
            type="button"
            key={entry.attempt?.id}
            onClick={() => selectReview(entry.attempt?.id ?? null)}
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
        {visibleQueue.length === 0 ? (
          <div className="empty-state compact-empty">
            <CheckCircle2 aria-hidden="true" />
            <h2>{queue.length === 0 ? "Cola al día" : "Sin coincidencias"}</h2>
            <p>
              {queue.length === 0
                ? "No hay entregas esperando revisión."
                : "Prueba con otro estudiante, tarea o lenguaje."}
            </p>
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
              to={`/mission/${
                getMissionById(
                  selected.assignment.missionId,
                  selected.progress.missionVersion,
                )?.slug
              }?assignment=${selected.assignment.id}`}
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
            <ol className="review-code-lines">
              {selected.attempt.code.split("\n").map((line, index) => (
                <li key={`${index + 1}-${line}`}>
                  <button
                    type="button"
                    className={inlineLine === index + 1 ? "is-selected" : ""}
                    onClick={() => setInlineLine(index + 1)}
                    aria-label={`Comentar línea ${index + 1}`}
                  >
                    <code>{line || " "}</code>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="review-feedback-form">
            <form
              className="inline-comment-form"
              onSubmit={addInlineComment}
            >
              <label htmlFor="inline-comment">
                Comentario en línea {inlineLine}
              </label>
              <div>
                <input
                  aria-label="Número de línea"
                  type="number"
                  min="1"
                  max={selected.attempt.code.split("\n").length}
                  value={inlineLine}
                  onChange={(event) =>
                    setInlineLine(Number(event.target.value) || 1)
                  }
                />
                <input
                  id="inline-comment"
                  value={inlineBody}
                  onChange={(event) => setInlineBody(event.target.value)}
                  placeholder="Observación concreta sobre esta línea"
                />
                <button
                  className="button secondary"
                  type="submit"
                  disabled={!inlineBody.trim()}
                >
                  <Plus aria-hidden="true" />
                  Agregar
                </button>
              </div>
            </form>
            {inlineComments.length > 0 ? (
              <ul className="inline-comment-list">
                {inlineComments.map((entry, index) => (
                  <li key={`${entry.line}-${index}`}>
                    <strong>L{entry.line}</strong>
                    <span>{entry.body}</span>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Eliminar comentario de línea ${entry.line}`}
                      onClick={() =>
                        setInlineComments((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <XCircle aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <fieldset className="review-criteria">
              <legend>Criterios de revisión</legend>
              {criteria.map((entry) => (
                <label key={entry.id}>
                  <input
                    type="checkbox"
                    checked={entry.met}
                    onChange={(event) =>
                      setCriteria((current) =>
                        current.map((criterion) =>
                          criterion.id === entry.id
                            ? { ...criterion, met: event.target.checked }
                            : criterion,
                        ),
                      )
                    }
                  />
                  {entry.label}
                </label>
              ))}
            </fieldset>
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
                disabled={reviewBusy || frontendOnly}
                onClick={() => void decide("changes_requested")}
              >
                <XCircle aria-hidden="true" />
                Solicitar cambios
              </button>
              <button
                className="button primary"
                type="button"
                disabled={reviewBusy || frontendOnly}
                onClick={() => void decide("approved")}
              >
                <Check aria-hidden="true" />
                Aprobar y asignar XP
              </button>
            </div>
            <p className="editor-message" role="status">
              {reviewMessage}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AssignmentsManager() {
  const {
    snapshot,
    frontendOnly,
    createAssignment,
    retryAssignmentNotification,
    updateAssignment,
    deleteAssignment,
  } = useClassroom();
  const { missions, getMissionById } = useCatalog();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const students = snapshot?.profiles.filter((entry) => entry.role === "student") ?? [];
  const [languageSelection, setLanguageSelection] = useState<Language[]>([
    ...LANGUAGES,
  ]);
  const [studentSelection, setStudentSelection] = useState<string[]>(
    students.map((entry) => entry.id),
  );
  if (!snapshot) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (frontendOnly) return;
    const form = event.currentTarget;
    const data = new FormData(form);
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
    setBusyId("create");
    setActionError("");
    try {
      await createAssignment(input);
      setCreating(false);
      form.reset();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo crear la tarea.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function retryNotification(assignmentId: string) {
    setBusyId(`notification-${assignmentId}`);
    setActionError("");
    try {
      await retryAssignmentNotification(assignmentId);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo reenviar el aviso de GitHub.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function submitEdit(
    event: FormEvent<HTMLFormElement>,
    assignmentId: string,
  ) {
    event.preventDefault();
    if (frontendOnly) return;
    const data = new FormData(event.currentTarget);
    setBusyId(assignmentId);
    setActionError("");
    try {
      await updateAssignment(assignmentId, {
        title: String(data.get("title") ?? ""),
        instructions: String(data.get("instructions") ?? ""),
        dueAt: new Date(String(data.get("dueAt"))).toISOString(),
      });
      setEditingId(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo editar la tarea.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(assignmentId: string) {
    if (frontendOnly) return;
    setBusyId(assignmentId);
    setActionError("");
    try {
      await deleteAssignment(assignmentId);
      setDeletingId(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la tarea.",
      );
    } finally {
      setBusyId(null);
    }
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
                frontendOnly ||
                busyId === "create" ||
                languageSelection.length === 0 ||
                studentSelection.length === 0
              }
              title={frontendOnly ? "Publicar requiere el backend oficial" : undefined}
            >
              {busyId === "create" ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {busyId === "create" ? "Publicando..." : "Publicar tarea"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="admin-list">
        {actionError ? (
          <p className="form-error" role="alert">{actionError}</p>
        ) : null}
        {snapshot.assignments.map((assignment) => {
          const mission = getMissionById(assignment.missionId);
          const assignmentProgress = snapshot.progress.filter(
            (entry) => entry.assignmentId === assignment.id,
          );
          const approvedCount = assignmentProgress.filter(
            (entry) => entry.status === "approved",
          ).length;
          const githubNotification = snapshot.githubNotifications.find(
            (entry) => entry.assignmentId === assignment.id,
          );
          return (
            <div className="assignment-admin-item" key={assignment.id}>
            <article className="admin-row assignment-admin-row">
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
                  {approvedCount}/
                  {assignment.studentIds.length}
                </strong>
              </div>
              <div className="admin-language-list">
                {assignment.allowedLanguages.map((language) => (
                  <span key={language}>{LANGUAGE_META[language].shortLabel}</span>
                ))}
              </div>
              <div
                className={`github-delivery ${
                  githubNotification?.status ?? "missing"
                }`}
                title={githubNotification?.lastError}
              >
                {githubNotification?.status === "sent" ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : githubNotification?.status === "partial" ? (
                  <Clock3 aria-hidden="true" />
                ) : githubNotification?.status === "pending" ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <XCircle aria-hidden="true" />
                )}
                <span>
                  {githubNotification?.status === "sent"
                    ? "Aviso enviado"
                    : githubNotification?.status === "partial"
                      ? "Aviso parcial"
                      : githubNotification?.status === "pending"
                        ? "Enviando aviso"
                        : githubNotification?.status === "failed"
                          ? "Aviso fallido"
                          : "Sin aviso"}
                </span>
                {githubNotification?.githubCommentUrl ? (
                  <a
                    href={githubNotification.githubCommentUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Abrir aviso en GitHub"
                    title="Abrir aviso en GitHub"
                  >
                    <Link2 aria-hidden="true" />
                  </a>
                ) : null}
                {(!githubNotification || githubNotification.status === "failed") ? (
                  <button
                    type="button"
                    aria-label={`Reintentar aviso de ${assignment.title}`}
                    title="Reintentar aviso de GitHub"
                    disabled={
                      frontendOnly ||
                      busyId === `notification-${assignment.id}`
                    }
                    onClick={() => void retryNotification(assignment.id)}
                  >
                    <RotateCw
                      className={
                        busyId === `notification-${assignment.id}` ? "spin" : ""
                      }
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>
              <div className="assignment-admin-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Editar ${assignment.title}`}
                  title="Editar tarea"
                  disabled={frontendOnly || busyId === assignment.id}
                  onClick={() => {
                    setEditingId(
                      editingId === assignment.id ? null : assignment.id,
                    );
                    setDeletingId(null);
                    setActionError("");
                  }}
                >
                  <Pencil aria-hidden="true" />
                </button>
                <button
                  className="icon-button danger-button"
                  type="button"
                  aria-label={`Eliminar ${assignment.title}`}
                  title="Eliminar tarea"
                  disabled={frontendOnly || busyId === assignment.id}
                  onClick={() => {
                    setDeletingId(assignment.id);
                    setEditingId(null);
                    setActionError("");
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </button>
                <Link
                  className="icon-button"
                  to={`/mission/${mission?.slug}?assignment=${assignment.id}`}
                  aria-label={`Abrir ${assignment.title}`}
                  title="Abrir workspace"
                >
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </article>
            {editingId === assignment.id ? (
              <form
                className="assignment-edit-form"
                onSubmit={(event) => submitEdit(event, assignment.id)}
              >
                <label>
                  <span>Nombre de la tarea</span>
                  <input name="title" required defaultValue={assignment.title} />
                </label>
                <label className="form-span-2">
                  <span>Descripción e instrucciones</span>
                  <textarea
                    name="instructions"
                    rows={4}
                    defaultValue={assignment.instructions}
                  />
                </label>
                <label>
                  <span>Fecha de entrega</span>
                  <input
                    name="dueAt"
                    type="datetime-local"
                    required
                    defaultValue={toDateTimeLocal(assignment.dueAt)}
                  />
                </label>
                <div className="form-actions form-span-2">
                  <span>La misión, estudiantes, lenguajes y XP no cambian.</span>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="button primary"
                    disabled={busyId === assignment.id}
                  >
                    {busyId === assignment.id ? (
                      <LoaderCircle className="spin" aria-hidden="true" />
                    ) : (
                      <Save aria-hidden="true" />
                    )}
                    Guardar cambios
                  </button>
                </div>
              </form>
            ) : null}
            {deletingId === assignment.id ? (
              <div
                className="assignment-delete-confirmation"
                role="alertdialog"
                aria-labelledby={`delete-title-${assignment.id}`}
                aria-describedby={`delete-description-${assignment.id}`}
              >
                <Trash2 aria-hidden="true" />
                <div>
                  <strong id={`delete-title-${assignment.id}`}>
                    Eliminar “{assignment.title}”
                  </strong>
                  <p id={`delete-description-${assignment.id}`}>
                    Se eliminará para {assignment.studentIds.length} estudiantes
                    y se retirarán {approvedCount * assignment.points} XP de {approvedCount}{" "}
                    aprobaciones. Los intentos históricos se conservarán.
                  </p>
                </div>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => setDeletingId(null)}
                >
                  Cancelar
                </button>
                <button
                  className="button danger"
                  type="button"
                  disabled={busyId === assignment.id}
                  onClick={() => void remove(assignment.id)}
                >
                  {busyId === assignment.id ? (
                    <LoaderCircle className="spin" aria-hidden="true" />
                  ) : (
                    <Trash2 aria-hidden="true" />
                  )}
                  Eliminar definitivamente
                </button>
              </div>
            ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MentorRanking() {
  const { snapshot } = useClassroom();
  if (!snapshot) return null;

  return (
    <section className="mentor-section admin-ranking" aria-labelledby="admin-ranking-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">XP APROBADOS</p>
          <h2 id="admin-ranking-title">Ranking del curso</h2>
          <p>Se actualiza al aprobar, editar o eliminar tareas.</p>
        </div>
      </div>
      <RankingBoard snapshot={snapshot} />
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
  const [expectedSignature, setExpectedSignature] = useState("");
  const [examples, setExamples] = useState("[]");
  const [referenceSolution, setReferenceSolution] = useState("");
  const [publicTests, setPublicTests] = useState("[]");
  const [hiddenTests, setHiddenTests] = useState("[]");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const variant = draft.variants.find((entry) => entry.language === language);

  useEffect(() => {
    setStarterCode(variant?.starterCode ?? "");
    setExpectedSignature(variant?.expectedSignature ?? "");
    setExamples(JSON.stringify(variant?.examples ?? [], null, 2));
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
          context: String(data.get("context")),
          brief: String(data.get("brief")),
          goal: String(data.get("goal")),
          conceptIntro: String(data.get("conceptIntro")),
          steps: formLines(data.get("steps")),
          constraints: formLines(data.get("constraints")),
          successCriteria: formLines(data.get("successCriteria")),
          prerequisites: formLines(data.get("prerequisites")),
          hints: formLines(data.get("hints")),
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
      const parsedExamples = JSON.parse(examples) as MissionAdminDraft["variants"][number]["examples"];
      if (
        !Array.isArray(parsedPublic) ||
        !Array.isArray(parsedHidden) ||
        !Array.isArray(parsedExamples)
      ) {
        throw new Error("Los ejemplos y tests deben ser arreglos JSON.");
      }
      const response = await runMissionAdmin({
        action: "update-variant",
        versionId: draft.id,
        language,
        starterCode,
        expectedSignature,
        examples: parsedExamples,
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
          <span>Contexto breve</span>
          <textarea
            name="context"
            rows={2}
            required
            defaultValue={String(draft.content.context ?? "")}
          />
        </label>
        <label className="form-span-2">
          <span>Misión concreta</span>
          <textarea name="brief" rows={4} required defaultValue={String(draft.content.brief ?? "")} />
        </label>
        <label className="form-span-2">
          <span>Meta verificable</span>
          <textarea
            name="goal"
            rows={2}
            required
            defaultValue={String(draft.content.goal ?? "")}
          />
        </label>
        <label className="form-span-2">
          <span>Introducción conceptual</span>
          <textarea
            name="conceptIntro"
            rows={3}
            required
            defaultValue={String(draft.content.conceptIntro ?? "")}
          />
        </label>
        {[
          ["steps", "Pasos sugeridos", draft.content.steps],
          ["constraints", "Restricciones", draft.content.constraints],
          ["successCriteria", "Criterios de éxito", draft.content.successCriteria],
          ["prerequisites", "ID de prerrequisitos", draft.content.prerequisites],
          ["hints", "Pistas progresivas", draft.content.hints],
        ].map(([name, label, value]) => (
          <label key={String(name)}>
            <span>{String(label)} · uno por línea</span>
            <textarea
              name={String(name)}
              rows={5}
              defaultValue={
                Array.isArray(value) ? value.map(String).join("\n") : ""
              }
            />
          </label>
        ))}
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
          <span>Firma esperada</span>
          <input
            value={expectedSignature}
            onChange={(event) => setExpectedSignature(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Ejemplos explicados (JSON)</span>
          <textarea
            value={examples}
            onChange={(event) => setExamples(event.target.value)}
            rows={10}
            spellCheck={false}
          />
        </label>
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
  const { backendMode, frontendOnly } = useClassroom();
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
    if (frontendOnly) return;
    const data = new FormData(event.currentTarget);
    const sourceMissionId = String(data.get("sourceMissionId"));
    const content = {
      title: String(data.get("title")),
      summary: String(data.get("summary")),
      context: String(data.get("context")),
      brief: String(data.get("brief")),
      goal: String(data.get("goal")),
      conceptIntro: String(data.get("conceptIntro")),
      steps: formLines(data.get("steps")),
      constraints: formLines(data.get("constraints")),
      successCriteria: formLines(data.get("successCriteria")),
      prerequisites: formLines(data.get("prerequisites")),
      hints: formLines(data.get("hints")),
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
        ...content,
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
    if (frontendOnly) return;
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
        context: source.context,
        brief: source.brief,
        goal: source.goal,
        conceptIntro: source.conceptIntro,
        steps: source.steps,
        constraints: source.constraints,
        successCriteria: source.successCriteria,
        prerequisites: source.prerequisites,
        hints: source.hints,
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
    if (frontendOnly) return;
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
                  variant.expectedSignature.length > 0 &&
                  variant.examples.length > 0 &&
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
            <span>Contexto breve</span>
            <textarea name="context" rows={2} required />
          </label>
          <label className="form-span-2">
            <span>Misión concreta</span>
            <textarea name="brief" rows={4} required />
          </label>
          <label className="form-span-2">
            <span>Meta verificable</span>
            <textarea name="goal" rows={2} required />
          </label>
          <label className="form-span-2">
            <span>Introducción conceptual</span>
            <textarea name="conceptIntro" rows={3} required />
          </label>
          {[
            ["steps", "Pasos sugeridos"],
            ["constraints", "Restricciones"],
            ["successCriteria", "Criterios de éxito"],
            ["prerequisites", "ID de prerrequisitos"],
            ["hints", "Pistas progresivas"],
          ].map(([name, label]) => (
            <label key={name}>
              <span>{label} · uno por línea</span>
              <textarea name={name} rows={5} />
            </label>
          ))}
          <div className="form-actions form-span-2">
            <span>Se creará como borrador sin publicar.</span>
            <button className="button ghost" type="button" onClick={() => setCreating(false)}>Cancelar</button>
            <button
              className="button primary"
              disabled={frontendOnly || busyId === "create"}
              title={frontendOnly ? "Guardar requiere el backend oficial" : undefined}
            >
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
                    frontendOnly ||
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
                disabled={frontendOnly || busyId === mission.id}
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
  const {
    snapshot,
    frontendOnly,
    createInvitation,
    updateInvitation,
    getInvitationToken,
  } = useClassroom();
  const [copied, setCopied] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<InvitationInput>(() => ({
    label: "",
    maxUses: 1,
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    active: true,
  }));
  if (!snapshot) return null;

  function toLocalInput(value: string) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function fromLocalInput(value: string) {
    return new Date(value).toISOString();
  }

  function openNewInvitation() {
    setEditingId("new");
    setMessage("");
    setForm({
      label: `Invitación ${(snapshot?.invitations.length ?? 0) + 1}`,
      maxUses: 1,
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      active: true,
    });
  }

  function openInvitation(invitation: Invitation) {
    setEditingId(invitation.id);
    setMessage("");
    setForm({
      label: invitation.label,
      maxUses: invitation.maxUses,
      expiresAt: invitation.expiresAt,
      active: !invitation.revokedAt,
    });
  }

  async function saveInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (frontendOnly) return;
    if (!editingId) return;
    setBusyId(editingId);
    setMessage("");
    try {
      if (editingId === "new") {
        await createInvitation(form);
        setMessage("Enlace creado y listo para compartir.");
      } else {
        await updateInvitation(editingId, form);
        setMessage("Invitación actualizada.");
      }
      setEditingId(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la invitación.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function copyInvitation(invitation: Invitation) {
    setBusyId(invitation.id);
    setMessage("");
    try {
      const token = await getInvitationToken(invitation.id);
      const url = `${window.location.origin}${window.location.pathname}#/join/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(invitation.id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo copiar el enlace al portapapeles.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mentor-section" aria-labelledby="invitations-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">ACCESO AL CURSO</p>
          <h2 id="invitations-title">Invitaciones</h2>
        </div>
        <button className="button primary" type="button" onClick={openNewInvitation}>
          <MailPlus aria-hidden="true" />
          Nuevo enlace
        </button>
      </div>
      <div className="invitation-note">
        <ShieldCheck aria-hidden="true" />
        <p>
          Cada enlace admite un cupo y vencimiento propios. Los estudiantes se
          inscriben con GitHub y cada uso queda registrado de forma individual.
        </p>
      </div>
      {editingId ? (
        <form className="invitation-editor" onSubmit={saveInvitation}>
          <label className="field" htmlFor="invitation-label">
            <span>Nombre del enlace</span>
            <input
              id="invitation-label"
              required
              minLength={1}
              maxLength={80}
              value={form.label}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
          </label>
          <label className="field" htmlFor="invitation-capacity">
            <span>Cupos</span>
            <input
              id="invitation-capacity"
              type="number"
              min={
                editingId === "new"
                  ? 1
                  : snapshot.invitations.find(
                      (entry) => entry.id === editingId,
                    )?.useCount ?? 1
              }
              max={100}
              required
              value={form.maxUses}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maxUses: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="field" htmlFor="invitation-expiration">
            <span>Vence</span>
            <input
              id="invitation-expiration"
              type="datetime-local"
              required
              value={toLocalInput(form.expiresAt)}
              onChange={(event) => {
                if (!event.target.value) return;
                setForm((current) => ({
                  ...current,
                  expiresAt: fromLocalInput(event.target.value),
                }));
              }}
            />
          </label>
          {editingId !== "new" ? (
            <label className="invitation-active-toggle">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              <span>
                <strong>Enlace activo</strong>
                <small>Desactívalo para impedir nuevas inscripciones.</small>
              </span>
            </label>
          ) : (
            <div className="invitation-active-placeholder">
              El enlace quedará activo al crearlo.
            </div>
          )}
          <div className="invitation-editor-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setEditingId(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              type="submit"
              disabled={frontendOnly || busyId === editingId}
              title={frontendOnly ? "Crear invitaciones requiere el backend oficial" : undefined}
            >
              {busyId === editingId ? (
                <LoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {editingId === "new" ? "Crear enlace" : "Guardar cambios"}
            </button>
          </div>
        </form>
      ) : null}
      <p className="editor-message invitation-message" role="status">
        {message}
      </p>
      <div className="admin-list">
        {snapshot.invitations.map((invitation) => {
          const expired =
            new Date(invitation.expiresAt).getTime() <= Date.now();
          const full = invitation.useCount >= invitation.maxUses;
          const active = !invitation.revokedAt && !expired && !full;
          const status = invitation.revokedAt
            ? "REVOCADA"
            : expired
              ? "VENCIDA"
              : full
                ? "COMPLETA"
                : "ACTIVA";
          return (
            <article className="admin-row invitation-row" key={invitation.id}>
              <span className="invitation-icon"><Link2 aria-hidden="true" /></span>
              <div className="admin-row-main">
                <span className={active ? "is-active" : ""}>{status}</span>
                <strong>{invitation.label}</strong>
                <small>Vence {formatDate(invitation.expiresAt, true)}</small>
              </div>
              <div className="invitation-capacity">
                <span>Cupos usados</span>
                <strong>
                  {invitation.useCount}/{invitation.maxUses}
                </strong>
              </div>
              <code>••••{invitation.tokenPreview}</code>
              <div className="invitation-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Editar ${invitation.label}`}
                  title="Editar invitación"
                  onClick={() => openInvitation(invitation)}
                >
                  <Pencil aria-hidden="true" />
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={
                    frontendOnly || !active || busyId === invitation.id
                  }
                  onClick={() => void copyInvitation(invitation)}
                >
                  {busyId === invitation.id ? (
                    <LoaderCircle className="spin" aria-hidden="true" />
                  ) : copied === invitation.id ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Clipboard aria-hidden="true" />
                  )}
                  {copied === invitation.id ? "Copiado" : "Copiar"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function Component() {
  const { profile, snapshot, isStudentPreview } = useClassroom();
  const location = useLocation();
  const navigate = useNavigate();
  if (!profile || !snapshot) return null;
  if (profile.role !== "owner" && profile.role !== "mentor") {
    return <Navigate to="/" replace />;
  }
  if (isStudentPreview) {
    return <Navigate to="/" replace />;
  }

  const [, section, selectedStudentId] = location.pathname
    .split("/")
    .filter(Boolean);
  const tab: MentorTab =
    section === "reviews" ||
    section === "students" ||
    section === "ranking" ||
    section === "assignments" ||
    section === "missions" ||
    section === "invitations" ||
    section === "rewards"
      ? section
      : "overview";
  const tabPaths: Record<MentorTab, string> = {
    overview: "/admin",
    reviews: "/admin/reviews",
    students: "/admin/students",
    ranking: "/admin/ranking",
    assignments: "/admin/assignments",
    missions: "/admin/missions",
    invitations: "/admin/invitations",
    rewards: "/admin/rewards",
  };

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
          ["students", "Estudiantes", Users],
          ["ranking", "Ranking", Trophy],
          ["assignments", "Asignaciones", CalendarPlus],
          ["missions", "Misiones", BookCopy],
          ["invitations", "Invitaciones", MailPlus],
          ["rewards", "Premios", Gift],
        ].map(([value, label, Icon]) => (
          <button
            type="button"
            className={tab === value ? "is-active" : ""}
            aria-current={tab === value ? "page" : undefined}
            key={value as string}
            onClick={() => navigate(tabPaths[value as MentorTab])}
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
          <MentorOverview onOpenReviews={() => navigate("/admin/reviews")} />
        ) : null}
        {tab === "reviews" ? <ReviewQueue /> : null}
        {tab === "students" ? (
          <StudentDirectory selectedStudentId={selectedStudentId} />
        ) : null}
        {tab === "ranking" ? <MentorRanking /> : null}
        {tab === "assignments" ? <AssignmentsManager /> : null}
        {tab === "missions" ? <MissionManager /> : null}
        {tab === "invitations" ? <InvitationsManager /> : null}
        {tab === "rewards" ? <RewardsManager /> : null}
      </div>
    </main>
  );
}
