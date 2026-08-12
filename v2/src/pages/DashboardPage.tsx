import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ChevronDown,
  Clock3,
  ExternalLink,
  Github,
  MessageSquareText,
  PartyPopper,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, isOverdue, relativeDueDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { groupStudentAssignments } from "@/models/assignments";
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
  const groupedAssignments = groupStudentAssignments(
    snapshot.assignments,
    snapshot.progress,
    subjectProfile.id,
  );
  const assignments = isMentor
    ? snapshot.assignments.filter((assignment) => assignment.status === "published")
    : [...groupedAssignments.pending, ...groupedAssignments.approved].map(
        (entry) => entry.assignment,
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
  const nextAssignment = isMentor
    ? [...assignments].sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      )[0]
    : groupedAssignments.pending[0]?.assignment;
  const nextMission = nextAssignment
    ? getMissionById(
        nextAssignment.missionId,
        ownProgress.get(nextAssignment.id)?.missionVersion ??
          nextAssignment.missionVersion,
      )
    : undefined;
  const unread = snapshot.notifications.filter(
    (entry) =>
      entry.userId === subjectProfile.id &&
      !entry.readAt &&
      !entry.dismissedAt,
  );
  const repository = snapshot.repositories?.find(
    (entry) => entry.userId === subjectProfile.id,
  );

  const renderAssignmentRows = (
    entries: typeof groupedAssignments.pending,
  ) => (
    <div className="assignment-list">
      {entries.map(({ assignment, progress: state }) => {
        const mission = getMissionById(
          assignment.missionId,
          state?.missionVersion ?? assignment.missionVersion,
        );
        const status = state?.status ?? "not_started";
        const overdue = isOverdue(assignment.dueAt, status);
        const content = (
          <>
            <div className="assignment-order">
              {String(mission?.order ?? 0).padStart(2, "0")}
            </div>
            <div className="assignment-main">
              <span>{mission?.courseLabel}</span>
              <strong>{assignment.title}</strong>
              <small>{assignment.instructions || mission?.title}</small>
            </div>
            <div className={`assignment-due ${overdue ? "is-overdue" : ""}`}>
              <CalendarClock aria-hidden="true" />
              <span>{relativeDueDate(assignment.dueAt)}</span>
              <small>{formatDate(assignment.dueAt)}</small>
            </div>
            <StatusBadge status={status} overdue={overdue} />
            {mission ? (
              <span className="icon-button" aria-hidden="true">
                <ArrowRight aria-hidden="true" />
              </span>
            ) : null}
          </>
        );
        return mission ? (
          <Link
            className="assignment-row"
            key={assignment.id}
            to={`/mission/${mission.slug}?assignment=${assignment.id}`}
            aria-label={`Abrir ${assignment.title}`}
          >
            {content}
          </Link>
        ) : (
          <article className="assignment-row" key={assignment.id}>
            {content}
          </article>
        );
      })}
    </div>
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
              : "Aquí aparecen solamente las tareas que te asignó tu profesor."}
          </p>
        </div>
        {isMentor ? (
          <Link className="button primary" to="/mentor">
            <ShieldCheck aria-hidden="true" />
            Abrir panel mentor
          </Link>
        ) : null}
      </header>

      {!isMentor ? (
        <section
          className={`student-work-alert ${
            groupedAssignments.pending.length > 0 ? "has-pending" : "all-clear"
          }`}
          role="status"
          aria-live="polite"
        >
          <span className="student-work-alert-icon">
            {groupedAssignments.pending.length > 0 ? (
              <BellRing aria-hidden="true" />
            ) : (
              <PartyPopper aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="eyebrow">
              {groupedAssignments.pending.length > 0
                ? "ATENCIÓN REQUERIDA"
                : "TODO LISTO"}
            </p>
            <h2>
              {groupedAssignments.pending.length > 0
                ? `Tienes ${groupedAssignments.pending.length} ${
                    groupedAssignments.pending.length === 1
                      ? "tarea pendiente"
                      : "tareas pendientes"
                  }`
                : "Estás al día"}
            </h2>
            <p>
              {nextAssignment
                ? `${nextAssignment.title} ${relativeDueDate(nextAssignment.dueAt).toLowerCase()}.`
                : "No tienes entregas pendientes. Buen trabajo."}
            </p>
          </div>
          {nextMission && nextAssignment ? (
            <Link
              className="button primary"
              to={`/mission/${nextMission.slug}?assignment=${nextAssignment.id}`}
            >
              Continuar <ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </section>
      ) : null}

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

          {isMentor ? null : (
            <div className="task-groups">
              <details className="task-group pending" open>
                <summary>
                  <span>
                    <strong>Pendientes</strong>
                    <small>{groupedAssignments.pending.length}</small>
                  </span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                {groupedAssignments.pending.length > 0 ? (
                  renderAssignmentRows(groupedAssignments.pending)
                ) : (
                  <p className="task-group-empty">No tienes tareas pendientes.</p>
                )}
              </details>
              <details className="task-group approved">
                <summary>
                  <span>
                    <strong>Aprobadas</strong>
                    <small>{groupedAssignments.approved.length}</small>
                  </span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                {groupedAssignments.approved.length > 0 ? (
                  renderAssignmentRows(groupedAssignments.approved)
                ) : (
                  <p className="task-group-empty">Aún no hay tareas aprobadas.</p>
                )}
              </details>
            </div>
          )}
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
                  {repository.storageMode === "central" ? (
                    <div className="repository-link repository-location">
                      <span>
                        <strong>Carpeta privada sincronizada</strong>
                        <small>
                          {repository.studentPath
                            ? `resoluciones/${repository.studentPath}`
                            : "Repositorio central del curso"}
                        </small>
                      </span>
                    </div>
                  ) : (
                    <a
                      className="repository-link"
                      href={repository.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>
                        <strong>{repository.name}</strong>
                        <small>Repositorio individual anterior</small>
                      </span>
                      <ExternalLink aria-hidden="true" />
                    </a>
                  )}
                  <span
                    className={`repository-state repository-${repository.status}`}
                  >
                    <span aria-hidden="true" />
                    {repository.lastSyncedAt
                      ? `Actualizado ${formatDate(repository.lastSyncedAt, true)}`
                      : repository.storageMode === "central"
                        ? "Carpeta lista"
                        : repository.collaboratorStatus === "invited"
                        ? "Invitación enviada"
                        : "Repositorio listo"}
                  </span>
                </>
              ) : (
                <div className="repository-pending" role="status">
                  <span className="system-dot supabase" aria-hidden="true" />
                  <span>
                    <strong>Preparando carpeta privada</strong>
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
                <span>PRÓXIMA ENTREGA</span>
              </div>
              <div className="next-task-due">
                <CalendarClock aria-hidden="true" />
                <strong>{relativeDueDate(nextAssignment.dueAt)}</strong>
              </div>
              <h2 id="next-task-title">{nextAssignment.title}</h2>
              <p>{nextAssignment.instructions || nextMission.summary}</p>
              <small className="next-task-mission">
                Misión base: {nextMission.title}
              </small>
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
