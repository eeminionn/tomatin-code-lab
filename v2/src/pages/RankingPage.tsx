import { Trophy } from "lucide-react";
import { RankingBoard } from "@/components/RankingBoard";
import { useClassroom } from "@/state/classroom-context";

export function Component() {
  const { viewProfile, snapshot } = useClassroom();
  if (!viewProfile || !snapshot) return null;

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

      <RankingBoard snapshot={snapshot} currentUserId={viewProfile.id} />
    </main>
  );
}
