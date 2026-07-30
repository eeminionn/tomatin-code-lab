import type { Attempt, Review, StudentProgress } from "@/types";

export function progressAfterAttempt(
  progress: StudentProgress,
  attempt: Attempt,
): StudentProgress {
  const passed =
    attempt.result.tests.length > 0 &&
    attempt.result.tests.every((test) => test.passed);
  const submitted = attempt.kind === "submit" && passed;

  return {
    ...progress,
    status: submitted
      ? "awaiting_review"
      : progress.status === "not_started"
        ? "in_progress"
        : progress.status,
    language: attempt.language,
    lastEvent: submitted ? "submitted" : "ran",
    attempts: progress.attempts + 1,
    lastActivityAt: attempt.createdAt,
    submittedAt: submitted ? attempt.createdAt : progress.submittedAt,
  };
}

export function progressAfterReview(
  progress: StudentProgress,
  review: Pick<Review, "decision" | "createdAt">,
): StudentProgress {
  if (review.decision === "comment") return progress;
  return {
    ...progress,
    status:
      review.decision === "approved" ? "approved" : "changes_requested",
    approvedAt:
      review.decision === "approved"
        ? progress.approvedAt ?? review.createdAt
        : progress.approvedAt,
    lastActivityAt: review.createdAt,
  };
}
