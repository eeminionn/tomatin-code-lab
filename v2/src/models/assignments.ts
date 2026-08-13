import type { Assignment, StudentProgress } from "@/types";

export interface StudentAssignment {
  assignment: Assignment;
  progress?: StudentProgress;
}

export function groupStudentAssignments(
  assignments: Assignment[],
  progress: StudentProgress[],
  userId: string,
) {
  const progressByAssignment = new Map(
    progress
      .filter((entry) => entry.userId === userId)
      .map((entry) => [entry.assignmentId, entry]),
  );
  const entries = assignments
    .filter(
      (assignment) =>
        assignment.status === "published" &&
        assignment.studentIds.includes(userId),
    )
    .map((assignment) => ({
      assignment,
      progress: progressByAssignment.get(assignment.id),
    }));

  return {
    pending: entries
      .filter((entry) => entry.progress?.status !== "approved")
      .sort(
        (a, b) =>
          new Date(a.assignment.dueAt).getTime() -
          new Date(b.assignment.dueAt).getTime(),
      ),
    approved: entries
      .filter((entry) => entry.progress?.status === "approved")
      .sort(
        (a, b) =>
          new Date(b.assignment.dueAt).getTime() -
          new Date(a.assignment.dueAt).getTime(),
      ),
  };
}
