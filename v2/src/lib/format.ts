import type { AssignmentStatus } from "@/types";

export const STATUS_META: Record<
  AssignmentStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }
> = {
  not_started: { label: "Pendiente", tone: "neutral" },
  in_progress: { label: "En progreso", tone: "info" },
  awaiting_review: { label: "En revisión", tone: "warning" },
  changes_requested: { label: "Requiere cambios", tone: "danger" },
  approved: { label: "Aprobada", tone: "success" },
};

export function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit" }
      : { year: "numeric" }),
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

export function relativeDueDate(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  const days = Math.ceil(difference / 86_400_000);
  if (days < 0) return `Atrasada ${Math.abs(days)} d`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} d`;
}

export function isOverdue(dueAt: string, status: AssignmentStatus) {
  return status !== "approved" && new Date(dueAt).getTime() < Date.now();
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
