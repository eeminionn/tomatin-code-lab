import { Check, CheckCircle2, CircleDot, MessageSquareText } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useClassroom } from "@/state/classroom-context";

export function Component() {
  const { profile, snapshot, markNotificationRead } = useClassroom();
  if (!profile || !snapshot) return null;

  const notifications = snapshot.notifications
    .filter((entry) => entry.userId === profile.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const unread = notifications.filter((entry) => !entry.readAt).length;

  return (
    <main className="page feedback-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">COMENTARIOS Y ESTADOS</p>
          <h1>Feedback</h1>
          <p>
            Entregas recibidas, revisiones del mentor y cambios solicitados.
          </p>
        </div>
        <div className="feedback-count">
          <MessageSquareText aria-hidden="true" />
          <strong>{unread}</strong>
          <span>sin leer</span>
        </div>
      </header>

      <section className="feedback-list" aria-label="Notificaciones">
        {notifications.map((entry) => (
          <article
            className={`feedback-item ${entry.readAt ? "is-read" : ""}`}
            key={entry.id}
          >
            <span className="feedback-icon">
              {entry.title.toLowerCase().includes("aprob") ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <CircleDot aria-hidden="true" />
              )}
            </span>
            <div>
              <div className="feedback-item-heading">
                <strong>{entry.title}</strong>
                <time dateTime={entry.createdAt}>
                  {formatDate(entry.createdAt, true)}
                </time>
              </div>
              <p>{entry.body}</p>
            </div>
            {!entry.readAt ? (
              <button
                className="icon-button"
                type="button"
                aria-label={`Marcar ${entry.title} como leído`}
                onClick={() => markNotificationRead(entry.id)}
              >
                <Check aria-hidden="true" />
              </button>
            ) : null}
          </article>
        ))}
        {notifications.length === 0 ? (
          <div className="empty-state">
            <MessageSquareText aria-hidden="true" />
            <h2>No hay feedback todavía</h2>
            <p>Los comentarios y estados de tus entregas aparecerán aquí.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
