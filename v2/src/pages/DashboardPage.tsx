import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Code2,
  ExternalLink,
  Github,
  MessageSquareText,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, isOverdue, relativeDueDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { useCatalog } from "@/state/catalog";
import { useClassroom } from "@/state/classroom-context";

export function Component() {
  const {
    profile,
    viewProfile,
    isStudentPreview,
    snapshot,
    backendMode,
  } = useClassroom();
  const { getMissionById } = useCatalog();
  if (!profile || !viewProfile || !snapshot) return null;

  const isMentor =
    !isStudentPreview &&
    (profile.role === "owner" || profile.role === "mentor");
  const subjectProfile = isStudentPreview ? viewProfile : profile;
  const assignments = snapshot.assignments.filter(
    (assignment) =>
      assignment.status === "published" &&
      (isMentor || assignment.studentIds.includes(subjectProfile.id)),
  );
  const progress = snapshot.progress.filter((entry) =>
    isMentor ? true : entry.userId === subjectProfile.id,
  );
  const ownProgress = new Map(
    progress
      .filter((entry) => entry.userId === subjectProfile.id)
      .map((entry) => [entry.assignmentId, entry]),
  );
  const approved = isMentor
    ? progress.filter((entry) => entry.status === "approved").length
    : [...ownProgress.values()].filter((entry) => entry.status === "approved")
        .length;
  const xp = isMentor
    ? snapshot.assignments.reduce((total, assignment) => {
        const count = progress.filter(
          (entry) =>
            entry.assignmentId === assignment.id && entry.status === "approved",
        ).length;
        return total + assignment.points * count;
      }, 0)
    : assignments.reduce(
        (total, assignment) =>
          total +
          (ownProgress.get(assignment.id)?.status === "approved"
            ? assignment.points
            : 0),
        0,
      );
  const reviewCount = progress.filter(
    (entry) => entry.status === "awaiting_review",
  ).length;
  const nextAssignment = assignments
    .filter(
      (assignment) =>
        isMentor ||
        ownProgress.get(assignment.id)?.status !== "approved",
    )
    .sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    )[0];
  const nextMission = nextAssignment
    ? getMissionById(
        nextAssignment.missionId,
        ownProgress.get(nextAssignment.id)?.missionVersion ??
          nextAssignment.missionVersion,
      )
    : undefined;
  const unread = snapshot.notifications.filter(
    (entry) => entry.userId === subjectProfile.id && !entry.readAt,
  );
  const repository = snapshot.repositories?.find(
    (entry) => entry.userId === subjectProfile.id,
  );

  return (
    <main className="page dashboard-page">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">
            {isMentor ? "PULSO DEL CURSO" : "TU SEMANA"}
          </p>
          <h1>
            {isMentor
              ? snapshot.classroom.name
              : `Hola, ${subjectProfile.displayName.split(" ")[0]}`}
          </h1>
          <p>
            {isMentor
              ? "Revisa entregas, atrasos y actividad desde un solo lugar."
              : "Tareas asignadas primero; el resto del catálogo queda disponible para practicar."}
          </p>
        </div>
        {isMentor ? (
          <Link className="button primary" to="/mentor">
            <ShieldCheck aria-hidden="true" />
            Abrir panel mentor
          </Link>
        ) : nextMission ? (
          <Link
            className="button primary"
            to={`/mission/${nextMission.slug}?assignment=${nextAssignment?.id}`}
          >
            <Code2 aria-hidden="true" />
            Continuar
          </Link>
        ) : null}
      </header>

      <section className="metrics-strip" aria-label="Resumen">
        <article>
          <span className="metric-icon success">
            <CheckCircle2 aria-hidden="true" />
          </span>
          <div>
            <strong>{approved}</strong>
            <span>{isMentor ? "aprobaciones" : "tareas aprobadas"}</span>
          </div>
        </article>
        <article>
          <span className="metric-icon warning">
            <Clock3 aria-hidden="true" />
          </span>
          <div>
            <strong>{reviewCount}</strong>
            <span>en revisión</span>
          </div>
        </article>
        <article>
          <span className="metric-icon info">
            <Trophy aria-hidden="true" />
          </span>
          <div>
            <strong>{xp}</strong>
            <span>XP aprobados</span>
          </div>
        </article>
        <article>
          <span className="metric-icon neutral">
            <MessageSquareText aria-hidden="true" />
          </span>
          <div>
            <strong>{unread.length}</strong>
            <span>feedback nuevo</span>
          </div>
        </article>
      </section>

      <div className="dashboard-layout">
        <section className="dashboard-section assignments-section" aria-labelledby="assignments-title">
          <div className="section-header">
            <div>
              <p className="eyebrow">PRIORIDAD</p>
              <h2 id="assignments-title">
                {isMentor ? "Próximas entregas" : "Tus tareas"}
              </h2>
            </div>
            <Link className="text-link" to={isMentor ? "/mentor" : "/missions"}>
              Ver todas <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="assignment-list">
            {assignments.slice(0, 5).map((assignment) => {
              const state = ownProgress.get(assignment.id);
              const mission = getMissionById(
                assignment.missionId,
                state?.missionVersion ?? assignment.missionVersion,
              );
              const status = state?.status ?? "not_started";
              const overdue = isOverdue(assignment.dueAt, status);
              return (
                <article className="assignment-row" key={assignment.id}>
                  <div className="assignment-order">
                    {String(mission?.order ?? 0).padStart(2, "0")}
                  </div>
                  <div className="assignment-main">
                    <span>{mission?.courseLabel}</span>
                    <strong>{assignment.title}</strong>
                    <small>{mission?.title}</small>
                  </div>
                  <div className="assignment-due">
                    <CalendarClock aria-hidden="true" />
                    <span>{relativeDueDate(assignment.dueAt)}</span>
                    <small>{formatDate(assignment.dueAt)}</small>
                  </div>
                  {!isMentor ? (
                    <StatusBadge status={status} overdue={overdue} />
                  ) : (
                    <span className="submission-count">
                      {
                        progress.filter(
                          (entry) =>
                            entry.assignmentId === assignment.id &&
                            entry.status === "awaiting_review",
                        ).length
                      }{" "}
                      por revisar
                    </span>
                  )}
                  {mission ? (
                    <Link
                      className="icon-button"
                      to={`/mission/${mission.slug}?assignment=${assignment.id}`}
                      aria-label={`Abrir ${assignment.title}`}
                    >
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="dashboard-side">
          {!isMentor && backendMode === "supabase" ? (
            <section
              className="student-repository"
              aria-labelledby="student-repository-title"
            >
              <div className="repository-heading">
                <Github aria-hidden="true" />
                <div>
                  <p className="eyebrow">GITHUB</p>
                  <h2 id="student-repository-title">Tus entregas</h2>
                </div>
              </div>
              {repository ? (
                <>
                  <a
                    className="repository-link"
                    href={repository.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      <strong>{repository.name}</strong>
                      <small>Repositorio privado</small>
                    </span>
                    <ExternalLink aria-hidden="true" />
                  </a>
                  <span
                    className={`repository-state repository-${repository.status}`}
                  >
                    <span aria-hidden="true" />
                    {repository.lastSyncedAt
                      ? `Actualizado ${formatDate(repository.lastSyncedAt, true)}`
                      : repository.collaboratorStatus === "invited"
                        ? "Invitación enviada"
                        : "Repositorio listo"}
                  </span>
                </>
              ) : (
                <div className="repository-pending" role="status">
                  <span className="system-dot supabase" aria-hidden="true" />
                  <span>
                    <strong>Preparando repositorio</strong>
                    <small>@{subjectProfile.githubLogin}</small>
                  </span>
                </div>
              )}
            </section>
          ) : null}

          {nextMission && nextAssignment ? (
            <section className="next-task" aria-labelledby="next-task-title">
              <div className="next-task-top">
                <CircleDot aria-hidden="true" />
                <span>PRÓXIMA</span>
              </div>
              <h2 id="next-task-title">{nextMission.title}</h2>
              <p>{nextMission.summary}</p>
              <div className="next-task-meta">
                <span>{nextMission.duration} min</span>
                <span>{nextAssignment.points} XP</span>
                <span>{nextMission.difficulty}</span>
              </div>
              <Link
                className="button secondary wide"
                to={`/mission/${nextMission.slug}?assignment=${nextAssignment.id}`}
              >
                Abrir workspace <ArrowRight aria-hidden="true" />
              </Link>
            </section>
          ) : null}

          <section className="activity-feed" aria-labelledby="activity-title">
            <div className="section-header">
              <div>
                <p className="eyebrow">ACTIVIDAD</p>
                <h2 id="activity-title">Últimos cambios</h2>
              </div>
            </div>
            {unread.slice(0, 3).map((entry) => (
              <Link className="activity-item" to="/feedback" key={entry.id}>
                <span className="activity-dot" aria-hidden="true" />
                <span>
                  <strong>{entry.title}</strong>
                  <small>{entry.body}</small>
                </span>
              </Link>
            ))}
            {unread.length === 0 ? (
              <div className="empty-inline">
                <CircleDot aria-hidden="true" />
                <span>No hay feedback pendiente.</span>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
