import type { Assignment } from "@/types";

export function publishedAssignmentsForStudent(
  assignments: Assignment[],
  studentId: string,
) {
  return assignments.filter(
    (assignment) =>
      assignment.status === "published" &&
      assignment.studentIds.includes(studentId),
  );
}

export function studentCanAccessMission(
  assignments: Assignment[],
  studentId: string,
  missionId: string,
  assignmentId?: string,
) {
  return publishedAssignmentsForStudent(assignments, studentId).some(
    (assignment) =>
      assignment.missionId === missionId &&
      (!assignmentId || assignment.id === assignmentId),
  );
}
