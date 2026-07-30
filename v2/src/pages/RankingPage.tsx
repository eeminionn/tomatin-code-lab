import { Award, Medal, Trophy } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useClassroom } from "@/state/classroom-context";

export function Component() {
  const { viewProfile, snapshot } = useClassroom();
  if (!viewProfile || !snapshot) return null;

  const students = snapshot.profiles.filter((entry) => entry.role === "student");
  const rows = students
    .map((student) => {
      const approved = snapshot.progress.filter(
        (entry) => entry.userId === student.id && entry.status === "approved",
      );
      const xp = approved.reduce((total, entry) => {
        const assignment = snapshot.assignments.find(
          (item) => item.id === entry.assignmentId,
        );
        return total + (assignment?.points ?? 0);
      }, 0);
      return {
        student,
        xp,
        approved: approved.length,
        inReview: snapshot.progress.filter(
          (entry) =>
            entry.userId === student.id && entry.status === "awaiting_review",
        ).length,
      };
    })
    .sort(
      (a, b) =>
        b.xp - a.xp ||
        b.approved - a.approved ||
        a.student.displayName.localeCompare(b.student.displayName),
    );

  return (
    <main className="page ranking-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">CURSO // XP APROBADOS</p>
          <h1>Ranking</h1>
          <p>
            La tabla considera únicamente tareas aprobadas por el mentor. La
            práctica libre queda fuera del cálculo.
          </p>
        </div>
        <div className="ranking-mark">
          <Trophy aria-hidden="true" />
        </div>
      </header>

      <section className="podium" aria-label="Primeros lugares">
        {rows.slice(0, 3).map((row, index) => (
          <article
            className={`podium-entry place-${index + 1}`}
            key={row.student.id}
          >
            <div className="podium-place">
              {index === 0 ? <Trophy /> : index === 1 ? <Medal /> : <Award />}
              <span>{index + 1}</span>
            </div>
            <ProfileAvatar
              profile={row.student}
              size={index === 0 ? "large" : "medium"}
            />
            <strong>{row.student.displayName}</strong>
            <span>{row.xp} XP</span>
          </article>
        ))}
      </section>

      <section className="ranking-table" aria-label="Ranking completo">
        <div className="ranking-table-head">
          <span>Posición</span>
          <span>Estudiante</span>
          <span>Aprobadas</span>
          <span>En revisión</span>
          <span>XP</span>
        </div>
        {rows.map((row, index) => (
          <div
            className={`ranking-row ${row.student.id === viewProfile.id ? "is-current" : ""}`}
            key={row.student.id}
          >
            <strong className="ranking-position">
              {String(index + 1).padStart(2, "0")}
            </strong>
            <div className="ranking-student">
              <ProfileAvatar profile={row.student} size="small" />
              <span>
                <strong>{row.student.displayName}</strong>
                <small>{row.student.githubLogin ? `@${row.student.githubLogin}` : "estudiante"}</small>
              </span>
            </div>
            <span>{row.approved}</span>
            <span>{row.inReview}</span>
            <strong className="ranking-xp">{row.xp}</strong>
          </div>
        ))}
      </section>
    </main>
  );
}
