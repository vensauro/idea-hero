import type { Card } from "./module_bindings/types";
import { STAGE_GUIDANCE, type StageName } from "./stage-guidance";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <img
      className={`idea-hero-logo ${compact ? "is-compact" : ""}`}
      src="/idea-hero-logo.svg"
      alt="Idea Hero"
    />
  );
}

export function InspirationCard({
  card,
  stageLabel,
  actionControl,
}: {
  card?: Card;
  stageLabel: string;
  actionControl?: React.ReactNode;
}) {
  if (!card) {
    return (
      <div className="inspiration-card is-loading" aria-live="polite">
        <div className="card-skeleton" />
        <p>Revelando a carta desta etapa…</p>
      </div>
    );
  }

  return (
    <figure className="inspiration-card">
      <div className="card-image-wrap">
        <img src={card.imagePath} alt={card.altText} decoding="async" />
        <span className="card-lens">Lente · {card.lens}</span>
      </div>

      {actionControl && (
        <div className="inspiration-card-action-box">{actionControl}</div>
      )}

      <figcaption>
        <span className="card-stage">Carta de {stageLabel}</span>
        <h2>{card.title}</h2>
        <p>{card.provocation}</p>
        <small>
          Não descreva apenas a imagem. Use o que ela desperta para criar uma
          associação que só você faria.
        </small>
      </figcaption>
    </figure>
  );
}

export function StageGuidanceDialog({
  stage,
  confirmedCount,
  playerCount,
  hasConfirmed,
  onConfirm,
  pending = false,
}: {
  stage: StageName;
  confirmedCount: number;
  playerCount: number;
  hasConfirmed: boolean;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const guidance =
    STAGE_GUIDANCE[stage as keyof typeof STAGE_GUIDANCE] ??
    STAGE_GUIDANCE.SCENARIO;
  if (!guidance?.steps) return null;

  return (
    <div className="stage-guidance-backdrop" role="presentation">
      <section
        className="stage-guidance-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guidance-title"
        aria-describedby="guidance-progress"
      >
        <span className="mission-label">Orientação da etapa</span>
        <h2 id="guidance-title">Antes de revelar a carta</h2>
        <ol>
          {guidance.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p id="guidance-progress" className="stage-guidance-progress">
          {confirmedCount}/{playerCount} pessoas leram a orientação
        </p>
        <button
          type="button"
          className="primary-button stage-guidance-confirm"
          disabled={hasConfirmed || pending}
          onClick={onConfirm}
        >
          {hasConfirmed ? "Aguardando o grupo…" : "Li e entendi"}
        </button>
      </section>
    </div>
  );
}
