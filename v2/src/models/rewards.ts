import type { ClassroomSnapshot } from "@/types";

export function earnedXpForStudent(
  snapshot: ClassroomSnapshot,
  userId: string,
): number {
  return snapshot.progress
    .filter((entry) => entry.userId === userId && entry.status === "approved")
    .reduce((total, entry) => {
      const assignment = snapshot.assignments.find(
        (item) => item.id === entry.assignmentId,
      );
      return total + (assignment?.points ?? 0);
    }, 0);
}

export function spentXpForStudent(
  snapshot: ClassroomSnapshot,
  userId: string,
): number {
  return snapshot.rewardRedemptions
    .filter(
      (entry) =>
        entry.userId === userId &&
        (entry.status === "requested" || entry.status === "fulfilled"),
    )
    .reduce((total, entry) => total + entry.costXp, 0);
}

export function availableXpForStudent(
  snapshot: ClassroomSnapshot,
  userId: string,
): number {
  return Math.max(
    earnedXpForStudent(snapshot, userId) - spentXpForStudent(snapshot, userId),
    0,
  );
}
