import { describe, expect, it } from "vitest";
import { createDemoSnapshot } from "@/data/demo-classroom";
import { buildRanking } from "@/models/ranking";

describe("ranking", () => {
  it("removes an assignment's approved XP when the assignment disappears", () => {
    const snapshot = createDemoSnapshot();
    const assignmentId = "assignment-once";
    const before = buildRanking(snapshot).find(
      (row) => row.student.id === "student-02",
    );
    const withoutAssignment = {
      ...snapshot,
      assignments: snapshot.assignments.filter(
        (assignment) => assignment.id !== assignmentId,
      ),
      progress: snapshot.progress.filter(
        (entry) => entry.assignmentId !== assignmentId,
      ),
    };
    const after = buildRanking(withoutAssignment).find(
      (row) => row.student.id === "student-02",
    );

    expect(before?.xp).toBe(100);
    expect(after?.xp).toBe(0);
    expect(after?.approved).toBe(0);
  });
});
