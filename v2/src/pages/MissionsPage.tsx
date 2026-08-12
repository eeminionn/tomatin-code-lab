import { useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Clock3,
  Search,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, isOverdue, relativeDueDate } from "@/lib/format";
import { publishedAssignmentsForStudent } from "@/lib/mission-access";
import { useCatalog } from "@/state/catalog";
import { useClassroom } from "@/state/classroom-context";
import { LANGUAGE_META, LANGUAGES, type Course } from "@/types";

type CourseFilter = "all" | Course;

export function Component() {
  const { viewProfile, snapshot } = useClassroom();
  const { missions, getMissionById } = useCatalog();
  const [course, setCourse] = useState<CourseFilter>("all");
  const [query, setQuery] = useState("");
  const [onlyAssigned, setOnlyAssigned] = useState(true);

  if (!viewProfile || !snapshot) return null;

  const studentView = viewProfile.role === "student";
  const assignments = publishedAssignmentsForStudent(
    snapshot.assignments,
    viewProfile.id,
  );
  const progressByAssignment = new Map(
    snapshot.progress
      .filter((entry) => entry.userId === viewProfile.id)
      .map((entry) => [entry.assignmentId, entry]),
  );
  const assignedJourney = assignments
    .map((assignment) => {
      const progress = progressByAssignment.get(assignment.id);
      const mission = getMissionById(
        assignment.missionId,
        progress?.missionVersion ?? assignment.missionVersion,
      );
      return mission ? { assignment, progress, mission } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => {
      const aApproved = a.progress?.status === "approved";
      const bApproved = b.progress?.status === "approved";
      if (aApproved !== bApproved) return aApproved ? 1 : -1;
      const difference =
        new Date(a.assignment.dueAt).getTime() -
        new Date(b.assignment.dueAt).getTime();
      return aApproved ? -difference : difference;
    });
  const recommended = assignedJourney.find(
    (entry) => entry.progress?.status !== "approved",
  );
  const courseProgress = (["programming-1", "programming-2"] as const).map(
    (courseId) => {
      const entries = assignedJourney.filter(
        (entry) => entry.mission.course === courseId,
      );
      return {
        course: courseId,
        approved: entries.filter(
          (entry) => entry.progress?.status === "approved",
        ).length,
        total: entries.length,
      };
    },
  );

  const normalized = query.trim().toLowerCase();
  const matchesCourse = (missionCourse: Course) =>
    course === "all" || missionCourse === course;
  const matchesQuery = (values: string[]) =>
    !normalized || values.join(" ").toLowerCase().includes(normalized);
  const assignedEntries = assignedJourney
    .filter(
      ({ assignment, mission }) =>
        matchesCourse(mission.course) &&
        matchesQuery([
          assignment.title,
          assignment.instructions,
          mission.title,
          mission.summary,
          mission.module,
          ...mission.tags,
        ]),
    )
    .map((entry) => ({ kind: "assigned" as const, ...entry }));
  const assignedMissionIds = new Set(
    assignedJourney.map((entry) => entry.mission.id),
  );
  const practiceEntries = studentView
    ? []
    : missions
        .filter(
          (mission) =>
            !assignedMissionIds.has(mission.id) &&
            matchesCourse(mission.course) &&
            matchesQuery([
              mission.title,
              mission.summary,
              mission.module,
              ...mission.tags,
            ]),
        )
        .map((mission) => ({ kind: "practice" as const, mission }));
  const displayEntries =
    studentView || onlyAssigned
      ? assignedEntries
      : [...assignedEntries, ...practiceEntries];

  return (
    <main className="page missions-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {studentView
              ? `RECORRIDO // ${assignedJourney.length} MISIONES ASIGNADAS`
              : `CATÁLOGO // ${missions.length} MISIONES`}
          </p>
          <h1>Misiones</h1>
          <p>
            {studentView
              ? "Aquí aparecen únicamente las misiones que eeminionn te asignó."
              : "Las tareas asignadas aparecen primero. El equipo mentor puede revisar el catálogo completo."}
          </p>
        </div>
        <div className="language-key" aria-label="Lenguajes disponibles">
          {LANGUAGES.map((language) => (
            <span key={language}>{LANGUAGE_META[language].shortLabel}</span>
          ))}
        </div>
      </header>

      <section className="catalog-controls" aria-label="Filtros del catálogo">
        <label className="search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">Buscar misiones</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por tarea, descripción o misión"
          />
        </label>
        <div className="segmented-control" role="group" aria-label="Curso">
          {[
            ["all", "Todas"],
            ["programming-1", "Prog. I"],
            ["programming-2", "Prog. II"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={course === value ? "is-active" : ""}
              aria-pressed={course === value}
              onClick={() => setCourse(value as CourseFilter)}
            >
              {label}
            </button>
          ))}
        </div>
        {!studentView ? (
          <label className="toggle-control">
            <input
              type="checkbox"
              checked={onlyAssigned}
              onChange={(event) => setOnlyAssigned(event.target.checked)}
            />
            <span aria-hidden="true" />
            Solo asignadas
          </label>
        ) : null}
      </section>

      <div className="catalog-summary">
        <span>
          <SlidersHorizontal aria-hidden="true" />
          {displayEntries.length} resultados
        </span>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setCourse("all");
            setQuery("");
            if (!studentView) setOnlyAssigned(false);
          }}
        >
          Limpiar filtros
        </button>
      </div>

      {assignedJourney.length > 0 ? (
        <section className="learning-path" aria-label="Recorrido formativo">
          <div className="learning-progress">
            {courseProgress.map((entry) => (
              <div key={entry.course}>
                <span>
                  {entry.course === "programming-1"
                    ? "Programación I"
                    : "Programación II"}
                  <strong>
                    {entry.approved}/{entry.total}
                  </strong>
                </span>
                <progress
                  max={Math.max(entry.total, 1)}
                  value={entry.approved}
                />
              </div>
            ))}
          </div>
          {recommended ? (
            <Link
              className="recommended-mission"
              to={`/mission/${recommended.mission.slug}?assignment=${recommended.assignment.id}`}
            >
              <span>
                <small>PRÓXIMA ENTREGA</small>
                <strong>{recommended.assignment.title}</strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <span className="journey-complete">
              <BookOpenCheck aria-hidden="true" />
              Recorrido asignado completado
            </span>
          )}
        </section>
      ) : null}

      {displayEntries.length > 0 ? (
        <section className="mission-grid" aria-label="Misiones">
          {displayEntries.map((entry) => {
            const assignment =
              entry.kind === "assigned" ? entry.assignment : undefined;
            const progress =
              entry.kind === "assigned" ? entry.progress : undefined;
            const mission = entry.mission;
            const status = progress?.status ?? "not_started";
            const overdue = assignment
              ? isOverdue(assignment.dueAt, status)
              : false;
            return (
              <article
                className={`mission-card ${
                  assignment ? "is-assigned" : "is-practice"
                }`}
                key={assignment?.id ?? `practice-${mission.id}`}
              >
              <div className="mission-card-top">
                <span className="mission-number">
                  {mission.course === "programming-1" ? "P1" : "P2"}.
                  {String(mission.order).padStart(2, "0")}
                </span>
                {assignment ? (
                  <StatusBadge status={status} overdue={overdue} />
                ) : (
                  <span className="practice-label">Práctica</span>
                )}
              </div>
              {assignment ? (
                <div
                  className={`mission-card-priority ${overdue ? "is-overdue" : ""}`}
                >
                  <CalendarClock aria-hidden="true" />
                  <span>
                    <strong>{relativeDueDate(assignment.dueAt)}</strong>
                    <small>{formatDate(assignment.dueAt, true)}</small>
                  </span>
                </div>
              ) : null}
              <div className="mission-card-body">
                <span className="mission-module">{mission.module}</span>
                <h2>{assignment?.title ?? mission.title}</h2>
                <p className="mission-summary assignment-instructions">
                  {assignment?.instructions || mission.summary}
                </p>
                {assignment ? (
                  <p className="mission-base-label">
                    Misión base: <strong>{mission.title}</strong>
                  </p>
                ) : mission.prerequisites.length > 0 ? (
                  <p className="mission-prerequisite">
                    Antes:{" "}
                    {mission.prerequisites
                      .map(
                        (missionId) =>
                          getMissionById(missionId)?.title ?? missionId,
                      )
                      .join(", ")}
                  </p>
                ) : (
                  <p className="mission-prerequisite is-start">
                    Punto de inicio del curso
                  </p>
                )}
                <div className="mission-tags">
                  {mission.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="mission-card-meta">
                <span>
                  <Clock3 aria-hidden="true" /> {mission.duration} min
                </span>
                <span>
                  <Zap aria-hidden="true" /> {assignment?.points ?? mission.points} XP
                </span>
                <span>{mission.difficulty}</span>
              </div>
              <Link
                className="mission-card-link"
                to={`/mission/${mission.slug}${assignment ? `?assignment=${assignment.id}` : ""}`}
              >
                <BookOpenCheck aria-hidden="true" />
                {assignment ? "Trabajar en la tarea" : "Abrir workspace"}
                <ArrowRight aria-hidden="true" />
              </Link>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state mission-empty-state">
          <BookOpenCheck aria-hidden="true" />
          <h2>
            {assignedJourney.length === 0
              ? "Aún no tienes misiones asignadas"
              : "No encontramos misiones con esos filtros"}
          </h2>
          <p>
            {assignedJourney.length === 0
              ? "Cuando eeminionn publique una tarea, aparecerá aquí."
              : "Prueba otra búsqueda o limpia los filtros."}
          </p>
        </section>
      )}
    </main>
  );
}
