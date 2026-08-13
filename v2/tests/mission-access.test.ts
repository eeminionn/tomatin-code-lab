import { describe, expect, it } from "vitest";
import {
  publishedAssignmentsForStudent,
  studentCanAccessMission,
} from "@/lib/mission-access";
import type { Assignment } from "@/types";

const assignments: Assignment[] = [
  {
    id: "assigned",
    missionId: "mission-a",
    missionVersion: 1,
    title: "Asignada",
    instructions: "",
    dueAt: new Date(0).toISOString(),
    points: 100,
    allowedLanguages: ["javascript"],
    studentIds: ["student-a"],
    status: "published",
  },
  {
    id: "other-student",
    missionId: "mission-b",
    missionVersion: 1,
    title: "Ajena",
    instructions: "",
    dueAt: new Date(0).toISOString(),
    points: 100,
    allowedLanguages: ["python"],
    studentIds: ["student-b"],
    status: "published",
  },
  {
    id: "draft",
    missionId: "mission-c",
    missionVersion: 1,
    title: "Borrador",
    instructions: "",
    dueAt: new Date(0).toISOString(),
    points: 100,
    allowedLanguages: ["cpp"],
    studentIds: ["student-a"],
    status: "draft",
  },
];

describe("student mission access", () => {
  it("returns only published assignments for that student", () => {
    expect(
      publishedAssignmentsForStudent(assignments, "student-a").map(
        (assignment) => assignment.id,
      ),
    ).toEqual(["assigned"]);
  });

  it("rejects other students, drafts and mismatched assignment ids", () => {
    expect(studentCanAccessMission(assignments, "student-a", "mission-a")).toBe(true);
    expect(
      studentCanAccessMission(assignments, "student-a", "mission-a", "other-student"),
    ).toBe(false);
    expect(studentCanAccessMission(assignments, "student-a", "mission-b")).toBe(false);
    expect(studentCanAccessMission(assignments, "student-a", "mission-c")).toBe(false);
  });
});
