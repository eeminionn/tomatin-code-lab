import { Award, Medal, Trophy } from "lucide-react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { buildRanking } from "@/models/ranking";
import type { ClassroomSnapshot } from "@/types";

export function RankingBoard({
  snapshot,
  currentUserId,
}: {
  snapshot: ClassroomSnapshot;
  currentUserId?: string;
}) {
  const rows = buildRanking(snapshot);

  return (
    <>
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
            className={`ranking-row ${row.student.id === currentUserId ? "is-current" : ""}`}
            key={row.student.id}
          >
            <strong className="ranking-position">
              {String(index + 1).padStart(2, "0")}
            </strong>
            <div className="ranking-student">
              <ProfileAvatar profile={row.student} size="small" />
              <span>
                <strong>{row.student.displayName}</strong>
                <small>
                  {row.student.githubLogin
                    ? `@${row.student.githubLogin}`
                    : "estudiante"}
                </small>
              </span>
            </div>
            <span>{row.approved}</span>
            <span>{row.inReview}</span>
            <strong className="ranking-xp">{row.xp}</strong>
          </div>
        ))}
      </section>
    </>
  );
}
