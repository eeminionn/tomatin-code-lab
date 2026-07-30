import { useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Clock3,
  Search,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, isOverdue } from "@/lib/format";
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

  const assignments =
    viewProfile && snapshot
      ? snapshot.assignments.filter((assignment) =>
          assignment.studentIds.includes(viewProfile.id),
        )
      : [];
  const assignmentByMission = new Map(
    assignments.map((assignment) => [assignment.missionId, assignment]),
  );
  const progressByAssignment = new Map(
    (snapshot?.progress ?? [])
      .filter((entry) => entry.userId === viewProfile?.id)
      .map((entry) => [entry.assignmentId, entry]),
  );

  const normalized = query.trim().toLowerCase();
  const filtered = missions.filter((mission) => {
    if (course !== "all" && mission.course !== course) return false;
    if (onlyAssigned && !assignmentByMission.has(mission.id)) return false;
    if (!normalized) return true;
    return [
      mission.title,
      mission.summary,
      mission.module,
      ...mission.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
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
    .sort(
      (a, b) =>
        a.mission.course.localeCompare(b.mission.course) ||
        a.mission.order - b.mission.order,
    );
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

  if (!viewProfile || !snapshot) return null;

  return (
    <main className="page missions-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            CATÁLOGO // {missions.length} MISIONES
          </p>
          <h1>Misiones</h1>
          <p>
            Las tareas asignadas aparecen primero. Puedes practicar cualquier
            otra misión sin afectar el ranking.
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
            placeholder="Buscar por tema o misión"
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
        <label className="toggle-control">
          <input
            type="checkbox"
            checked={onlyAssigned}
            onChange={(event) => setOnlyAssigned(event.target.checked)}
          />
          <span aria-hidden="true" />
          Solo asignadas
        </label>
      </section>

      <div className="catalog-summary">
        <span>
          <SlidersHorizontal aria-hidden="true" />
          {filtered.length} resultados
        </span>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setCourse("all");
            setQuery("");
            setOnlyAssigned(false);
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
                <small>SIGUIENTE MISIÓN</small>
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

      <section className="mission-grid" aria-label="Misiones">
        {filtered.map((mission) => {
          const assignment = assignmentByMission.get(mission.id);
          const progress = assignment
            ? progressByAssignment.get(assignment.id)
            : undefined;
          const displayMission = assignment
            ? getMissionById(
                mission.id,
                progress?.missionVersion ?? assignment.missionVersion,
              )
            : mission;
          if (!displayMission) return null;
          const status = progress?.status ?? "not_started";
          const overdue = assignment
            ? isOverdue(assignment.dueAt, status)
            : false;
          return (
            <article className="mission-card" key={mission.id}>
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
              <div className="mission-card-body">
                <span className="mission-module">{displayMission.module}</span>
                <h2>{displayMission.title}</h2>
                <p className="mission-summary">{displayMission.summary}</p>
                {displayMission.prerequisites.length > 0 ? (
                  <p className="mission-prerequisite">
                    Antes:{" "}
                    {displayMission.prerequisites
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
                  {displayMission.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="mission-card-meta">
                <span>
                  <Clock3 aria-hidden="true" /> {displayMission.duration} min
                </span>
                <span>
                  <Zap aria-hidden="true" /> {assignment?.points ?? displayMission.points} XP
                </span>
                {assignment ? (
                  <span>{formatDate(assignment.dueAt)}</span>
                ) : (
                  <span>{displayMission.difficulty}</span>
                )}
              </div>
              <Link
                className="mission-card-link"
                to={`/mission/${displayMission.slug}${assignment ? `?assignment=${assignment.id}` : ""}`}
              >
                <BookOpenCheck aria-hidden="true" />
                Abrir workspace
                <ArrowRight aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}
