import { STATUS_META } from "@/lib/format";
import type { AssignmentStatus } from "@/types";

export function StatusBadge({
  status,
  overdue = false,
}: {
  status: AssignmentStatus;
  overdue?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <span className={`status-badge tone-${overdue ? "danger" : meta.tone}`}>
      <span className="status-indicator" aria-hidden="true" />
      {overdue ? "Atrasada" : meta.label}
    </span>
  );
}
