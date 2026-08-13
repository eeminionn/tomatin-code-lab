import { describe, expect, it } from "vitest";
import { createDemoSnapshot } from "@/data/demo-classroom";
import {
  buildClassroomAlerts,
  buildClassroomCsv,
  buildWeeklyTrends,
} from "@/models/classroom-insights";

describe("classroom insights", () => {
  it("explains why a student may need attention", () => {
    const snapshot = createDemoSnapshot();
    const now = new Date("2030-01-01T12:00:00.000Z");
    const alerts = buildClassroomAlerts(snapshot, now);

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((entry) => entry.reason.endsWith("."))).toBe(true);
    expect(alerts.every((entry) => entry.studentId && entry.assignmentId)).toBe(true);
  });

  it("returns six ordered weekly buckets", () => {
    const trends = buildWeeklyTrends(
      createDemoSnapshot(),
      new Date("2026-08-12T12:00:00.000Z"),
    );

    expect(trends).toHaveLength(6);
    expect(trends.map((entry) => entry.key)).toEqual(
      [...trends].map((entry) => entry.key).sort(),
    );
  });

  it("exports progress without drafts or source code", () => {
    const snapshot = createDemoSnapshot();
    const csv = buildClassroomCsv(snapshot);

    expect(csv).toContain('"Estudiante","GitHub","Tarea"');
    expect(csv).toContain('"Camila Rojas"');
    expect(csv).not.toContain("function totalOnce");
    expect(csv.split("\n")).toHaveLength(snapshot.progress.length + 1);
  });
});
