import { describe, expect, it } from "vitest";
import { createDemoSnapshot } from "@/data/demo-classroom";
import { getPendingReviews } from "@/models/reviews";

describe("pending reviews", () => {
  it("counts only submissions that the mentor can actually open", () => {
    const queue = getPendingReviews(createDemoSnapshot());

    expect(queue).toHaveLength(1);
    expect(queue[0].student.displayName).toBe("Camila Rojas");
    expect(queue[0].attempt.kind).toBe("submit");
  });

  it("ignores an awaiting state without a saved submission", () => {
    const snapshot = createDemoSnapshot();
    snapshot.attempts = [];

    expect(getPendingReviews(snapshot)).toEqual([]);
  });

  it("uses the explicit active submission instead of a newer duplicate", () => {
    const snapshot = createDemoSnapshot();
    const activeAttempt = snapshot.attempts[0];
    const progress = snapshot.progress.find(
      (entry) =>
        entry.userId === activeAttempt.userId &&
        entry.assignmentId === activeAttempt.assignmentId,
    );
    if (!progress) throw new Error("Demo progress is missing.");
    progress.submittedAttemptId = activeAttempt.id;
    snapshot.attempts.unshift({
      ...activeAttempt,
      id: "attempt-duplicate-newer",
      createdAt: "2099-01-01T00:00:00.000Z",
    });

    expect(getPendingReviews(snapshot)[0].attempt.id).toBe(activeAttempt.id);
  });
});
