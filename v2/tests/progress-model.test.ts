import { describe, expect, it } from "vitest";
import {
  progressAfterAttempt,
  progressAfterReview,
} from "@/models/progress";
import type { Attempt, StudentProgress } from "@/types";

const initial: StudentProgress = {
  userId: "student-1",
  assignmentId: "assignment-1",
  missionVersion: 1,
  status: "not_started",
  attempts: 0,
  hintsUsed: 0,
};

function attempt(passed: boolean, kind: Attempt["kind"] = "submit"): Attempt {
  return {
    id: "attempt-1",
    userId: "student-1",
    assignmentId: "assignment-1",
    missionId: "mission-1",
    missionVersion: 1,
    language: "python",
    kind,
    code: "answer = 42",
    result: {
      id: "result-1",
      status: passed ? "passed" : "failed",
      stdout: "",
      stderr: "",
      diagnostics: [],
      tests: [{ id: "test-1", label: "test", passed, expected: "42" }],
      createdAt: "2026-07-25T12:00:00.000Z",
    },
    createdAt: "2026-07-25T12:00:00.000Z",
  };
}

describe("assignment progress", () => {
  it("moves a passing submission into mentor review", () => {
    expect(progressAfterAttempt(initial, attempt(true))).toMatchObject({
      status: "awaiting_review",
      language: "python",
      lastEvent: "submitted",
      attempts: 1,
      submittedAt: "2026-07-25T12:00:00.000Z",
    });
  });

  it("keeps a failing submission in progress", () => {
    expect(progressAfterAttempt(initial, attempt(false))).toMatchObject({
      status: "in_progress",
      lastEvent: "ran",
      attempts: 1,
      submittedAt: undefined,
    });
  });

  it("preserves the first approval timestamp", () => {
    const approved = progressAfterReview(
      { ...initial, status: "awaiting_review" },
      { decision: "approved", createdAt: "2026-07-25T13:00:00.000Z" },
    );
    const reviewedAgain = progressAfterReview(approved, {
      decision: "approved",
      createdAt: "2026-07-25T14:00:00.000Z",
    });
    expect(reviewedAgain.approvedAt).toBe("2026-07-25T13:00:00.000Z");
  });
});
