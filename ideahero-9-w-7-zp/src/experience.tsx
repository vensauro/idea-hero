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
  stage,
}: {
  card?: Card;
  stageLabel: string;
  stage?: StageName;
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
      {stage && <StageMission stage={stage} />}
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

export function StageMission({ stage }: { stage: StageName }) {
  const guidance = STAGE_GUIDANCE[stage];
  return (
    <section className="stage-mission" aria-labelledby="mission-title">
      <div>
        <span className="mission-label">Como jogar agora</span>
        <h2 id="mission-title">Da imagem para a sua ideia</h2>
      </div>
      <ol>
        {guidance.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
