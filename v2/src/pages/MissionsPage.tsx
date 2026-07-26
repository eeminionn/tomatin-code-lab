import { useMemo, useState } from "react";
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
  const { profile, snapshot } = useClassroom();
  const { missions } = useCatalog();
  const [course, setCourse] = useState<CourseFilter>("all");
  const [query, setQuery] = useState("");
  const [onlyAssigned, setOnlyAssigned] = useState(true);

  if (!profile || !snapshot) return null;
  const assignments = snapshot.assignments.filter((assignment) =>
    assignment.studentIds.includes(profile.id),
  );
  const assignmentByMission = new Map(
    assignments.map((assignment) => [assignment.missionId, assignment]),
  );
  const progressByAssignment = new Map(
    snapshot.progress
      .filter((entry) => entry.userId === profile.id)
      .map((entry) => [entry.assignmentId, entry]),
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return missions.filter((mission) => {
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
  }, [assignmentByMission, course, missions, onlyAssigned, query]);

  return (
    <main className="page missions-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">CATÁLOGO // 20 MISIONES</p>
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

      <section className="mission-grid" aria-label="Misiones">
        {filtered.map((mission) => {
          const assignment = assignmentByMission.get(mission.id);
          const progress = assignment
            ? progressByAssignment.get(assignment.id)
            : undefined;
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
                <span className="mission-module">{mission.module}</span>
                <h2>{mission.title}</h2>
                <p>{mission.summary}</p>
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
                {assignment ? (
                  <span>{formatDate(assignment.dueAt)}</span>
                ) : (
                  <span>{mission.difficulty}</span>
                )}
              </div>
              <Link
                className="mission-card-link"
                to={`/mission/${mission.slug}${assignment ? `?assignment=${assignment.id}` : ""}`}
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
