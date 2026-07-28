import type {
  Decision,
  Player,
  Room,
  StageOutcome,
  VisibleContribution,
} from "./module_bindings/types";

const JOURNEY_STAGES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "PILOT",
  "MARKETING",
  "SALES",
] as const;

const STAGE_LABELS: Record<(typeof JOURNEY_STAGES)[number], string> = {
  SCENARIO: "Cenário",
  PROBLEM: "Problema",
  INSIGHT: "Insight",
  SOLUTION: "Solução",
  PROTOTYPE: "Protótipo",
  PILOT: "Piloto",
  MARKETING: "Marketing",
  SALES: "Vendas",
};

const AVATAR_GLYPHS: Record<string, string> = {
  seedling: "🌱",
  comet: "☄️",
  prism: "🔮",
  whale: "🐋",
  owl: "🦉",
  fox: "🦊",
};

function sameIdentity(
  left: { toHexString: () => string },
  right: { toHexString: () => string },
) {
  return left.toHexString() === right.toHexString();
}

export function JourneySummary({
  room,
  contributions,
  players,
  decisions,
  outcomes = [],
}: {
  room: Room;
  contributions: readonly VisibleContribution[];
  players: readonly Player[];
  decisions: readonly Decision[];
  outcomes?: readonly StageOutcome[];
}) {
  return (
    <aside className="journey-summary" aria-labelledby="journey-summary-title">
      <div className="section-heading">
        <div>
          <p className="kicker">Memória coletiva</p>
          <h2 id="journey-summary-title">Jornada construída até aqui</h2>
        </div>
        <div className="journey-summary-meta">
          <span>{room.stageIndex + 1} de 8 etapas</span>
          <div className="journey-summary-players" aria-label="Participantes">
            {players.map((player) => (
              <span
                className={player.online ? "" : "is-offline"}
                key={player.id.toString()}
                title={player.displayName}
              >
                {AVATAR_GLYPHS[player.avatarId] ?? "✦"}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="journey-columns" role="list">
        {JOURNEY_STAGES.slice(0, room.stageIndex + 1).map((stage, index) => {
          const entries = contributions.filter((item) => item.stage === stage);
          const stageDecision = decisions.find(
            (item) => item.roomId === room.id && item.stage === stage,
          );
          const stageOutcome = outcomes.find(
            (item) => item.roomId === room.id && item.stage === stage,
          );
          const isCurrent = stage === room.currentStage;
          return (
            <section
              className={`journey-memory-card ${isCurrent ? "is-current" : ""}`}
              key={stage}
              role="listitem"
            >
              <div className="journey-memory-stage">
                <span>{index + 1}</span>
                <strong>{STAGE_LABELS[stage]}</strong>
              </div>
              {stageDecision ? (
                <p className="journey-decision">
                  ★ {stageDecision.summary} <em>— escolha do grupo</em>
                </p>
              ) : stageOutcome ? (
                <p className="journey-decision">
                  ✦ {stageOutcome.summary.replace(/\n/g, " · ")}{" "}
                  <em>— composicao do grupo</em>
                </p>
              ) : entries.length === 0 ? (
                <p className="journey-memory-empty">
                  {isCurrent ? "Estamos construindo agora" : "Em construção"}
                </p>
              ) : (
                entries.map((entry) => {
                  const author = entry.authorIdentity
                    ? players.find((player) =>
                        sameIdentity(player.identity, entry.authorIdentity!),
                      )
                    : undefined;
                  return (
                    <p key={entry.id.toString()}>
                      {entry.content}{" "}
                      <em>— {author?.displayName ?? "Anônimo"}</em>
                    </p>
                  );
                })
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
