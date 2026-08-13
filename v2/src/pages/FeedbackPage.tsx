import { useState } from "react";
import {
  Check,
  CheckCircle2,
  CircleDot,
  MessageSquareText,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "@/lib/format";
import { useCatalog } from "@/state/catalog";
import { useClassroom } from "@/state/classroom-context";

export function Component() {
  const {
    viewProfile,
    isStudentPreview,
    frontendOnly,
    snapshot,
    markNotificationRead,
    dismissNotification,
    dismissAllNotifications,
  } = useClassroom();
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const { getMissionById } = useCatalog();
  if (!viewProfile || !snapshot) return null;

  const notifications = snapshot.notifications
    .filter(
      (entry) => entry.userId === viewProfile.id && !entry.dismissedAt,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const unread = notifications.filter((entry) => !entry.readAt).length;

  async function clearAll() {
    setBusy(true);
    try {
      await dismissAllNotifications();
      setConfirmClear(false);
    } catch {
      // The classroom error banner reports the backend failure.
    } finally {
      setBusy(false);
    }
  }

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
        <div className="feedback-header-actions">
          <div className="feedback-count">
            <MessageSquareText aria-hidden="true" />
            <strong>{unread}</strong>
            <span>sin leer</span>
          </div>
          {!isStudentPreview && notifications.length > 0 ? (
            <button
              className="button secondary"
              type="button"
              disabled={frontendOnly || busy}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 aria-hidden="true" />
              Limpiar todo
            </button>
          ) : null}
        </div>
      </header>

      <section className="feedback-list" aria-label="Notificaciones">
        {notifications.map((entry) => {
          const assignment = snapshot.assignments.find(
            (item) => item.id === entry.assignmentId,
          );
          const review = snapshot.reviews.find(
            (item) => item.id === entry.reviewId,
          );
          const attempt = snapshot.attempts.find(
            (item) => item.id === (entry.attemptId ?? review?.attemptId),
          );
          const missionId = assignment?.missionId ?? attempt?.missionId;
          const mission = missionId
            ? getMissionById(
                missionId,
                attempt?.missionVersion ?? assignment?.missionVersion,
              )
            : undefined;
          const missionCode = mission
            ? `${mission.course === "programming-1" ? "P1" : "P2"}-${String(
                mission.order,
              ).padStart(2, "0")}`
            : undefined;
          const destination =
            assignment && mission
              ? `/mission/${mission.slug}?assignment=${assignment.id}${
                  attempt ? `&attempt=${attempt.id}` : ""
                }${review ? `&review=${review.id}` : ""}`
              : undefined;
          return (
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
              {destination ? (
                <Link className="feedback-item-content" to={destination}>
                  {mission && missionCode ? (
                    <span className="feedback-mission-label">
                      <code>{missionCode}</code>
                      {mission.title}
                    </span>
                  ) : null}
                  <span className="feedback-item-heading">
                    <strong>{entry.title}</strong>
                    <time dateTime={entry.createdAt}>
                      {formatDate(entry.createdAt, true)}
                    </time>
                  </span>
                  <span className="feedback-body">{entry.body}</span>
                  {review &&
                  (review.inlineComments.length > 0 ||
                    review.criteria.length > 0) ? (
                    <span className="feedback-review-details">
                      {review.criteria.length > 0 ? (
                        <span className="feedback-criteria">
                          {review.criteria.map((criterion) => (
                            <span
                              className={criterion.met ? "is-met" : ""}
                              key={criterion.id}
                            >
                              {criterion.met ? "Cumple" : "Revisar"} ·{" "}
                              {criterion.label}
                            </span>
                          ))}
                        </span>
                      ) : null}
                      {review.inlineComments.map((comment, index) => (
                        <span
                          className="feedback-inline-comment"
                          key={`${comment.line}-${index}`}
                        >
                          <strong>Línea {comment.line}</strong>
                          {comment.body}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Link>
              ) : (
                <div>
                  {mission && missionCode ? (
                    <span className="feedback-mission-label">
                      <code>{missionCode}</code>
                      {mission.title}
                    </span>
                  ) : null}
                  <div className="feedback-item-heading">
                    <strong>{entry.title}</strong>
                    <time dateTime={entry.createdAt}>
                      {formatDate(entry.createdAt, true)}
                    </time>
                  </div>
                  <p>{entry.body}</p>
                </div>
              )}
              {!isStudentPreview ? (
                <div className="feedback-actions">
                  {!entry.readAt ? (
                    <button
                      className="icon-button"
                      type="button"
                      title="Marcar como leído"
                      disabled={frontendOnly}
                      aria-label={`Marcar ${entry.title} como leído`}
                      onClick={() => markNotificationRead(entry.id)}
                    >
                      <Check aria-hidden="true" />
                    </button>
                  ) : null}
                  <button
                    className="icon-button feedback-delete"
                    type="button"
                    title="Eliminar de Feedback"
                    disabled={frontendOnly}
                    aria-label={`Eliminar feedback ${entry.title}`}
                    onClick={() => void dismissNotification(entry.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
        {notifications.length === 0 ? (
          <div className="empty-state">
            <MessageSquareText aria-hidden="true" />
            <h2>No hay feedback todavía</h2>
            <p>Los comentarios y estados de tus entregas aparecerán aquí.</p>
          </div>
        ) : null}
      </section>

      {confirmClear ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-feedback-title"
            aria-describedby="clear-feedback-description"
          >
            <span className="confirmation-dialog-icon danger">
              <Trash2 aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">LIMPIAR FEEDBACK</p>
              <h2 id="clear-feedback-title">¿Eliminar toda la bandeja?</h2>
              <p id="clear-feedback-description">
                Se ocultarán {notifications.length} mensajes de tu cuenta. Esta
                acción no elimina entregas ni comentarios del mentor.
              </p>
            </div>
            <div className="confirmation-dialog-actions">
              <button
                className="button ghost"
                type="button"
                disabled={busy}
                onClick={() => setConfirmClear(false)}
              >
                Cancelar
              </button>
              <button
                className="button danger"
                type="button"
                disabled={busy}
                onClick={() => void clearAll()}
              >
                {busy ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
                Limpiar todo
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
