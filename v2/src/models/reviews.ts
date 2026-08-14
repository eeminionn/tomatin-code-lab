import type {
  Assignment,
  Attempt,
  ClassroomSnapshot,
  Profile,
  StudentProgress,
} from "@/types";

export interface PendingReview {
  progress: StudentProgress;
  attempt: Attempt;
  student: Profile;
  assignment: Assignment;
}

export function getPendingReviews(
  snapshot: ClassroomSnapshot,
): PendingReview[] {
  return snapshot.progress.flatMap((progress) => {
    if (progress.status !== "awaiting_review") return [];

    const attempt = progress.submittedAttemptId
      ? snapshot.attempts.find(
          (entry) => entry.id === progress.submittedAttemptId,
        )
      : snapshot.attempts
          .filter(
            (entry) =>
              entry.userId === progress.userId &&
              entry.assignmentId === progress.assignmentId &&
              entry.kind === "submit",
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0];
    const student = snapshot.profiles.find(
      (entry) => entry.id === progress.userId,
    );
    const assignment = snapshot.assignments.find(
      (entry) => entry.id === progress.assignmentId,
    );

    return attempt && student && assignment
      ? [{ progress, attempt, student, assignment }]
      : [];
  });
}
