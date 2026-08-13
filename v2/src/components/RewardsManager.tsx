import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  Gift,
  ImagePlus,
  LoaderCircle,
  PackageCheck,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { getRewardImageUrl } from "@/services/supabase";
import { useClassroom } from "@/state/classroom-context";
import type { Reward } from "@/types";

function RewardEditor({
  reward,
  onClose,
}: {
  reward?: Reward;
  onClose: () => void;
}) {
  const { frontendOnly, saveReward } = useClassroom();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    getRewardImageUrl(reward?.imagePath),
  );
  const [unlimited, setUnlimited] = useState(reward?.stock === undefined);

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (frontendOnly) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const image = data.get("image");
    setBusy(true);
    setMessage("");
    try {
      await saveReward(reward?.id ?? null, {
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
        priceXp: Number(data.get("priceXp")),
        stock: unlimited ? undefined : Number(data.get("stock")),
        active: data.get("active") === "on",
        imageFile: image instanceof File && image.size > 0 ? image : undefined,
        removeImage: data.get("removeImage") === "on",
      });
      onClose();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar el premio.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="reward-editor" onSubmit={submit}>
      <div className="reward-editor-heading">
        <div>
          <p className="eyebrow">{reward ? "EDITAR PREMIO" : "NUEVO PREMIO"}</p>
          <h3>{reward?.title ?? "Configura el próximo canje"}</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Cerrar editor"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="reward-editor-grid">
        <div className="reward-image-editor">
          <div className="reward-image-preview">
            {previewUrl ? (
              <img src={previewUrl} alt="Vista previa del premio" />
            ) : (
              <Gift aria-hidden="true" />
            )}
          </div>
          <label className="button secondary reward-image-button">
            <ImagePlus aria-hidden="true" />
            Elegir imagen
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </label>
          <small>JPG, PNG o WebP · máximo 2 MB</small>
          {reward?.imagePath ? (
            <label className="checkbox-row">
              <input type="checkbox" name="removeImage" />
              Quitar imagen actual
            </label>
          ) : null}
        </div>

        <div className="reward-editor-fields">
          <label className="field">
            <span>Nombre</span>
            <input
              name="title"
              required
              maxLength={100}
              defaultValue={reward?.title}
              placeholder="Ej. Elige el mini proyecto"
            />
          </label>
          <label className="field">
            <span>Descripción</span>
            <textarea
              name="description"
              required
              maxLength={1200}
              rows={4}
              defaultValue={reward?.description}
              placeholder="Explica qué recibe el estudiante y cómo se coordina."
            />
          </label>
          <div className="reward-value-fields">
            <label className="field">
              <span>Precio en XP</span>
              <input
                name="priceXp"
                type="number"
                min={1}
                max={100000}
                step={1}
                required
                defaultValue={reward?.priceXp ?? 100}
              />
            </label>
            <label className="field">
              <span>Stock</span>
              <input
                name="stock"
                type="number"
                min={0}
                step={1}
                required={!unlimited}
                disabled={unlimited}
                defaultValue={reward?.stock ?? 1}
              />
            </label>
          </div>
          <div className="reward-toggles">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={unlimited}
                onChange={(event) => setUnlimited(event.target.checked)}
              />
              Stock ilimitado
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                name="active"
                defaultChecked={reward?.active ?? true}
              />
              Visible para estudiantes
            </label>
          </div>
        </div>
      </div>

      {message ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}
      <div className="form-actions">
        <span>La imagen y el catálogo se actualizan al guardar.</span>
        <button className="button ghost" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="button primary" disabled={busy || frontendOnly}>
          {busy ? (
            <LoaderCircle className="spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          Guardar premio
        </button>
      </div>
    </form>
  );
}

export function RewardsManager() {
  const {
    snapshot,
    frontendOnly,
    deleteReward,
    updateRedemptionStatus,
  } = useClassroom();
  const [editorRewardId, setEditorRewardId] = useState<string | "new" | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  if (!snapshot) return null;

  const rewards = [...snapshot.rewards].sort(
    (a, b) => Number(b.active) - Number(a.active) || b.priceXp - a.priceXp,
  );
  const redemptions = [...snapshot.rewardRedemptions].sort(
    (a, b) =>
      Number(a.status !== "requested") - Number(b.status !== "requested") ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const requestedCount = redemptions.filter(
    (entry) => entry.status === "requested",
  ).length;
  const selectedReward =
    editorRewardId && editorRewardId !== "new"
      ? snapshot.rewards.find((entry) => entry.id === editorRewardId)
      : undefined;

  async function removeReward(id: string) {
    setBusyId(id);
    setMessage("");
    try {
      await deleteReward(id);
      setDeletingId(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo eliminar el premio.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(
    id: string,
    status: "fulfilled" | "cancelled",
  ) {
    setBusyId(id);
    setMessage("");
    try {
      await updateRedemptionStatus(id, status);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el canje.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mentor-section rewards-manager" aria-labelledby="rewards-manager-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">CATÁLOGO Y CANJES</p>
          <h2 id="rewards-manager-title">Premios</h2>
          <p>{requestedCount} solicitudes pendientes de entrega.</p>
        </div>
        <button
          className="button primary"
          type="button"
          onClick={() => setEditorRewardId("new")}
        >
          <Plus aria-hidden="true" />
          Nuevo premio
        </button>
      </div>

      {editorRewardId ? (
        <RewardEditor
          reward={selectedReward}
          onClose={() => setEditorRewardId(null)}
        />
      ) : null}

      {message ? (
        <p className="form-error" role="alert">
          {message}
        </p>
      ) : null}

      <section className="reward-admin-catalog" aria-labelledby="reward-catalog-admin-title">
        <div className="section-heading-inline">
          <div>
            <p className="eyebrow">PUBLICACIÓN</p>
            <h3 id="reward-catalog-admin-title">Catálogo</h3>
          </div>
          <span>{rewards.filter((entry) => entry.active).length} visibles</span>
        </div>
        <div className="reward-admin-grid">
          {rewards.map((reward) => {
            const imageUrl = getRewardImageUrl(reward.imagePath);
            return (
              <article className={`reward-admin-card ${reward.active ? "" : "is-inactive"}`} key={reward.id}>
                <div className="reward-admin-media">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" />
                  ) : (
                    <Gift aria-hidden="true" />
                  )}
                  <span className={reward.active ? "is-active" : "is-inactive"}>
                    {reward.active ? "Visible" : "Oculto"}
                  </span>
                </div>
                <div className="reward-admin-body">
                  <h4>{reward.title}</h4>
                  <p>{reward.description}</p>
                  <div className="reward-admin-meta">
                    <strong>{reward.priceXp} XP</strong>
                    <span>
                      {reward.stock === undefined
                        ? "Ilimitado"
                        : `${reward.stock} en stock`}
                    </span>
                  </div>
                  <div className="reward-admin-actions">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setEditorRewardId(reward.id)}
                    >
                      <Pencil aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      className="icon-button danger-button"
                      type="button"
                      aria-label={`Eliminar ${reward.title}`}
                      title="Eliminar premio"
                      onClick={() => setDeletingId(reward.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {deletingId === reward.id ? (
                  <div className="reward-delete-confirmation" role="alertdialog">
                    <strong>¿Eliminar este premio?</strong>
                    <p>Los canjes históricos conservarán su nombre y costo.</p>
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => setDeletingId(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="button danger"
                      type="button"
                      disabled={busyId === reward.id || frontendOnly}
                      onClick={() => void removeReward(reward.id)}
                    >
                      <Trash2 aria-hidden="true" />
                      Eliminar
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
          {rewards.length === 0 ? (
            <div className="empty-state compact-empty">
              <Gift aria-hidden="true" />
              <h3>No hay premios todavía</h3>
              <p>Crea el primero para habilitar el catálogo estudiantil.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="redemption-admin-section" aria-labelledby="redemption-admin-title">
        <div className="section-heading-inline">
          <div>
            <p className="eyebrow">SOLICITUDES</p>
            <h3 id="redemption-admin-title">Canjes del curso</h3>
          </div>
          <span>{requestedCount} por resolver</span>
        </div>
        <div className="redemption-admin-list">
          {redemptions.map((entry) => {
            const student = snapshot.profiles.find(
              (profile) => profile.id === entry.userId,
            );
            return (
              <article className="redemption-admin-row" key={entry.id}>
                <span className={`redemption-status-icon ${entry.status}`}>
                  {entry.status === "fulfilled" ? (
                    <PackageCheck aria-hidden="true" />
                  ) : entry.status === "cancelled" ? (
                    <XCircle aria-hidden="true" />
                  ) : (
                    <Gift aria-hidden="true" />
                  )}
                </span>
                <div>
                  <strong>{student?.displayName ?? "Estudiante"}</strong>
                  <small>{student?.githubLogin ? `@${student.githubLogin}` : "Sin usuario GitHub"}</small>
                </div>
                <div>
                  <strong>{entry.rewardTitle}</strong>
                  <small>{formatDate(entry.createdAt, true)}</small>
                </div>
                <strong>{entry.costXp} XP</strong>
                <span className={`redemption-status ${entry.status}`}>
                  {entry.status === "fulfilled"
                    ? "Entregado"
                    : entry.status === "cancelled"
                      ? "Cancelado"
                      : "Solicitado"}
                </span>
                {entry.status === "requested" ? (
                  <div className="redemption-admin-actions">
                    <button
                      className="icon-button"
                      type="button"
                      title="Marcar como entregado"
                      aria-label={`Marcar ${entry.rewardTitle} de ${student?.displayName} como entregado`}
                      disabled={busyId === entry.id || frontendOnly}
                      onClick={() => void updateStatus(entry.id, "fulfilled")}
                    >
                      {busyId === entry.id ? (
                        <LoaderCircle className="spin" aria-hidden="true" />
                      ) : (
                        <Check aria-hidden="true" />
                      )}
                    </button>
                    <button
                      className="icon-button danger-button"
                      type="button"
                      title="Cancelar y devolver XP"
                      aria-label={`Cancelar ${entry.rewardTitle} de ${student?.displayName}`}
                      disabled={busyId === entry.id || frontendOnly}
                      onClick={() => void updateStatus(entry.id, "cancelled")}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
          {redemptions.length === 0 ? (
            <p className="redemption-empty">Todavía no hay canjes en el curso.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
