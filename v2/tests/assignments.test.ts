import { describe, expect, it } from "vitest";
import { createDemoSnapshot } from "@/data/demo-classroom";
import { groupStudentAssignments } from "@/models/assignments";

describe("student assignment priority", () => {
  it("separates approved work and sorts pending work by due date", () => {
    const snapshot = createDemoSnapshot();
    const grouped = groupStudentAssignments(
      snapshot.assignments,
      snapshot.progress,
      "student-01",
    );

    expect(grouped.pending.length).toBeGreaterThan(0);
    expect(
      grouped.pending.every((entry) => entry.progress?.status !== "approved"),
    ).toBe(true);
    expect(
      grouped.approved.every((entry) => entry.progress?.status === "approved"),
    ).toBe(true);
    expect(
      grouped.pending.map((entry) => new Date(entry.assignment.dueAt).getTime()),
    ).toEqual(
      [...grouped.pending]
        .map((entry) => new Date(entry.assignment.dueAt).getTime())
        .sort((a, b) => a - b),
    );
  });

  it("reports no pending work when every assigned task is approved", () => {
    const snapshot = createDemoSnapshot();
    const progress = snapshot.progress.map((entry) =>
      entry.userId === "student-01"
        ? { ...entry, status: "approved" as const }
        : entry,
    );
    const grouped = groupStudentAssignments(
      snapshot.assignments,
      progress,
      "student-01",
    );

    expect(grouped.pending).toEqual([]);
    expect(grouped.approved).toHaveLength(4);
  });
});
