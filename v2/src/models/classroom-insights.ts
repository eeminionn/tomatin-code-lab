import type { ClassroomSnapshot, StudentProgress } from "@/types";

const DAY = 86_400_000;

export interface ClassroomAlert {
  id: string;
  studentId: string;
  assignmentId: string;
  studentName: string;
  assignmentTitle: string;
  reason: string;
  priority: "high" | "medium";
}

export interface WeeklyTrend {
  key: string;
  label: string;
  activity: number;
  submissions: number;
  approvals: number;
}

function priorityValue(priority: ClassroomAlert["priority"]) {
  return priority === "high" ? 2 : 1;
}

export function buildClassroomAlerts(
  snapshot: ClassroomSnapshot,
  now = new Date(),
): ClassroomAlert[] {
  const alerts = new Map<string, ClassroomAlert>();
  const nowTime = now.getTime();

  function add(progress: StudentProgress, reason: string, priority: ClassroomAlert["priority"]) {
    const student = snapshot.profiles.find((entry) => entry.id === progress.userId);
    const assignment = snapshot.assignments.find(
      (entry) => entry.id === progress.assignmentId,
    );
    if (!student || !assignment || assignment.status !== "published") return;
    const alert: ClassroomAlert = {
      id: `${progress.userId}-${progress.assignmentId}`,
      studentId: progress.userId,
      assignmentId: progress.assignmentId,
      studentName: student.displayName,
      assignmentTitle: assignment.title,
      reason,
      priority,
    };
    const current = alerts.get(alert.id);
    if (!current || priorityValue(priority) > priorityValue(current.priority)) {
      alerts.set(alert.id, alert);
    }
  }

  for (const progress of snapshot.progress) {
    if (progress.status === "approved" || progress.status === "awaiting_review") continue;
    const assignment = snapshot.assignments.find(
      (entry) => entry.id === progress.assignmentId,
    );
    if (!assignment) continue;
    const dueTime = new Date(assignment.dueAt).getTime();

    if (dueTime < nowTime) {
      add(progress, "La fecha de entrega ya pasó.", "high");
      continue;
    }
    if (progress.status === "changes_requested") {
      add(progress, "Tiene cambios solicitados y aún no vuelve a entregar.", "high");
      continue;
    }
    if (progress.attempts >= 3) {
      add(progress, `Lleva ${progress.attempts} intentos sin aprobar.`, "medium");
      continue;
    }
    if (
      progress.lastActivityAt &&
      nowTime - new Date(progress.lastActivityAt).getTime() >= 7 * DAY
    ) {
      add(progress, "No registra actividad hace 7 días o más.", "medium");
      continue;
    }
    if (progress.status === "not_started" && dueTime - nowTime <= 3 * DAY) {
      add(progress, "Aún no comienza y vence dentro de 3 días.", "medium");
    }
  }

  return [...alerts.values()].sort((left, right) => {
    const priority = priorityValue(right.priority) - priorityValue(left.priority);
    return priority || left.studentName.localeCompare(right.studentName, "es");
  });
}

function mondayStart(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date;
}

export function buildWeeklyTrends(
  snapshot: ClassroomSnapshot,
  now = new Date(),
  weekCount = 6,
): WeeklyTrend[] {
  const currentWeek = mondayStart(now);
  return Array.from({ length: weekCount }, (_, index) => {
    const offset = weekCount - index - 1;
    const start = new Date(currentWeek.getTime() - offset * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    const attempts = snapshot.attempts.filter((entry) => {
      const time = new Date(entry.createdAt).getTime();
      return time >= start.getTime() && time < end.getTime();
    });
    const approvals = snapshot.progress.filter((entry) => {
      if (!entry.approvedAt) return false;
      const time = new Date(entry.approvedAt).getTime();
      return time >= start.getTime() && time < end.getTime();
    }).length;
    return {
      key: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("es-CL", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      activity: attempts.length,
      submissions: attempts.filter((entry) => entry.kind === "submit").length,
      approvals,
    };
  });
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildClassroomCsv(snapshot: ClassroomSnapshot) {
  const header = [
    "Estudiante",
    "GitHub",
    "Tarea",
    "Fecha de entrega",
    "Estado",
    "Intentos",
    "Pistas",
    "Última actividad",
  ];
  const rows = snapshot.progress.flatMap((progress) => {
    const student = snapshot.profiles.find((entry) => entry.id === progress.userId);
    const assignment = snapshot.assignments.find(
      (entry) => entry.id === progress.assignmentId,
    );
    if (!student || !assignment) return [];
    return [[
      student.displayName,
      student.githubLogin ? `@${student.githubLogin}` : "",
      assignment.title,
      assignment.dueAt,
      progress.status,
      progress.attempts,
      progress.hintsUsed,
      progress.lastActivityAt ?? "",
    ]];
  });
  return [header, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\n");
}
