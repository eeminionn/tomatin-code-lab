import type { ClassroomSnapshot, Profile } from "@/types";

export interface RankingRow {
  student: Profile;
  xp: number;
  approved: number;
  inReview: number;
}

export function buildRanking(snapshot: ClassroomSnapshot): RankingRow[] {
  return snapshot.profiles
    .filter((entry) => entry.role === "student")
    .map((student) => {
      const progress = snapshot.progress.filter(
        (entry) => entry.userId === student.id,
      );
      const approved = progress.filter((entry) => entry.status === "approved");
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
        inReview: progress.filter(
          (entry) => entry.status === "awaiting_review",
        ).length,
      };
    })
    .sort(
      (a, b) =>
        b.xp - a.xp ||
        b.approved - a.approved ||
        a.student.displayName.localeCompare(b.student.displayName),
    );
}
