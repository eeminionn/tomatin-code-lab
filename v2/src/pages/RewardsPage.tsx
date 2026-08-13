import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Gift,
  LoaderCircle,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  TicketCheck,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  availableXpForStudent,
  earnedXpForStudent,
  spentXpForStudent,
} from "@/models/rewards";
import { getRewardImageUrl } from "@/services/supabase";
import { useClassroom } from "@/state/classroom-context";
import type { Reward } from "@/types";

function RewardMedia({ reward }: { reward: Reward }) {
  const imageUrl = getRewardImageUrl(reward.imagePath);
  return (
    <div className="reward-media">
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : (
        <span className="reward-media-placeholder" aria-hidden="true">
          <Gift />
        </span>
      )}
    </div>
  );
}

export function Component() {
  const {
    viewProfile,
    snapshot,
    frontendOnly,
    isStudentPreview,
    redeemReward,
  } = useClassroom();
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!viewProfile || !snapshot) return null;

  const rewards = snapshot.rewards
    .filter((entry) => entry.active)
    .sort(
      (a, b) =>
        b.priceXp - a.priceXp || a.title.localeCompare(b.title, "es"),
    );
  const featured = rewards.slice(0, 3);
  const catalog = rewards.slice(3);
  const earnedXp = earnedXpForStudent(snapshot, viewProfile.id);
  const spentXp = spentXpForStudent(snapshot, viewProfile.id);
  const balance = availableXpForStudent(snapshot, viewProfile.id);
  const history = snapshot.rewardRedemptions
    .filter((entry) => entry.userId === viewProfile.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  async function confirmRedemption() {
    if (!selectedReward || frontendOnly || isStudentPreview) return;
    setBusy(true);
    setMessage("");
    try {
      await redeemReward(selectedReward.id);
      setMessage(`Canje solicitado: ${selectedReward.title}.`);
      setSelectedReward(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo completar el canje.",
      );
    } finally {
      setBusy(false);
    }
  }

  function rewardCard(reward: Reward, featuredIndex?: number) {
    const outOfStock = reward.stock !== undefined && reward.stock <= 0;
    const affordable = balance >= reward.priceXp;
    return (
      <article
        className={`reward-card ${
          featuredIndex !== undefined ? `is-featured featured-${featuredIndex}` : ""
        }`}
        key={reward.id}
      >
        <RewardMedia reward={reward} />
        <div className="reward-card-body">
          {featuredIndex !== undefined ? (
            <span className="reward-featured-label">
              <Sparkles aria-hidden="true" />
              Destacado
            </span>
          ) : null}
          <h2>{reward.title}</h2>
          <p>{reward.description}</p>
          <div className="reward-card-meta">
            <strong>{reward.priceXp} XP</strong>
            <span>
              {reward.stock === undefined
                ? "Disponible"
                : outOfStock
                  ? "Agotado"
                  : `${reward.stock} disponibles`}
            </span>
          </div>
          <button
            className="button primary wide"
            type="button"
            disabled={
              frontendOnly || isStudentPreview || outOfStock || !affordable
            }
            onClick={() => setSelectedReward(reward)}
          >
            <ShoppingBag aria-hidden="true" />
            {outOfStock
              ? "Agotado"
              : affordable
                ? "Canjear"
                : `Faltan ${reward.priceXp - balance} XP`}
          </button>
        </div>
      </article>
    );
  }

  return (
    <main className="page rewards-page">
      <header className="page-header rewards-header">
        <div>
          <p className="eyebrow">TIENDA DEL CURSO</p>
          <h1>Premios</h1>
          <p>Canjea el XP de tareas aprobadas. Tu lugar en el ranking no cambia.</p>
        </div>
        <div className="xp-wallet" aria-label={`${balance} XP disponibles`}>
          <TicketCheck aria-hidden="true" />
          <span>
            <small>Saldo disponible</small>
            <strong>{balance} XP</strong>
          </span>
          <span className="xp-wallet-detail">
            {earnedXp} ganados · {spentXp} canjeados
          </span>
        </div>
      </header>

      {message ? (
        <p className="rewards-message" role="status">
          {message}
        </p>
      ) : null}

      {featured.length > 0 ? (
        <section className="rewards-featured" aria-labelledby="featured-title">
          <div className="section-heading-inline">
            <div>
              <p className="eyebrow">SELECCIÓN ACTUAL</p>
              <h2 id="featured-title">Premios destacados</h2>
            </div>
          </div>
          <div className={`reward-podium count-${featured.length}`}>
            {featured.map((reward, index) => rewardCard(reward, index))}
          </div>
        </section>
      ) : null}

      {catalog.length > 0 ? (
        <section className="rewards-catalog" aria-labelledby="catalog-title">
          <div className="section-heading-inline">
            <div>
              <p className="eyebrow">MÁS OPCIONES</p>
              <h2 id="catalog-title">Catálogo</h2>
            </div>
          </div>
          <div className="reward-grid">
            {catalog.map((reward) => rewardCard(reward))}
          </div>
        </section>
      ) : null}

      {rewards.length === 0 ? (
        <section className="empty-state">
          <Gift aria-hidden="true" />
          <h2>Aún no hay premios disponibles</h2>
          <p>El mentor publicará aquí las próximas opciones de canje.</p>
        </section>
      ) : null}

      <section className="redemption-history" aria-labelledby="history-title">
        <div className="section-heading-inline">
          <div>
            <p className="eyebrow">MOVIMIENTOS</p>
            <h2 id="history-title">Mis canjes</h2>
          </div>
        </div>
        {history.length > 0 ? (
          <div className="redemption-list">
            {history.map((entry) => (
              <article className="redemption-row" key={entry.id}>
                <span className={`redemption-status-icon ${entry.status}`}>
                  {entry.status === "fulfilled" ? (
                    <PackageCheck aria-hidden="true" />
                  ) : entry.status === "cancelled" ? (
                    <X aria-hidden="true" />
                  ) : (
                    <Clock3 aria-hidden="true" />
                  )}
                </span>
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
              </article>
            ))}
          </div>
        ) : (
          <p className="redemption-empty">Todavía no has canjeado premios.</p>
        )}
      </section>

      {selectedReward ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="confirmation-dialog reward-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reward-confirm-title"
            aria-describedby="reward-confirm-description"
          >
            <span className="confirmation-dialog-icon">
              <ShoppingBag aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">CONFIRMAR CANJE</p>
              <h2 id="reward-confirm-title">{selectedReward.title}</h2>
              <p id="reward-confirm-description">
                Se descontarán <strong>{selectedReward.priceXp} XP</strong>. Tu
                saldo quedará en <strong>{balance - selectedReward.priceXp} XP</strong>.
              </p>
            </div>
            <div className="confirmation-dialog-actions">
              <button
                className="button ghost"
                type="button"
                disabled={busy}
                onClick={() => setSelectedReward(null)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() => void confirmRedemption()}
              >
                {busy ? (
                  <LoaderCircle className="spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 aria-hidden="true" />
                )}
                Confirmar canje
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
