import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducer } from "spacetimedb/react";
import { reducers } from "./module_bindings";
import type {
  Card,
  CardDraw,
  Decision,
  EconomyTransaction,
  MarketingPlan,
  PilotSimulation,
  Player,
  ProjectPrototype,
  PrototypeReaction,
  Room,
  RoomEconomy,
  SalesResult,
  StageCost,
  VisibleContribution,
} from "./module_bindings/types";
import { BrandLogo, InspirationCard } from "./experience";
import { formatCredits } from "./runway-format";
import {
  CARD_REDRAW_COST,
  MARKETING_AUDIENCES,
  MARKETING_CHANNELS,
  PROTOTYPE_FIDELITIES,
  type MarketingAudience,
  type MarketingChannel,
  type PrototypeFidelity,
} from "../spacetimedb/src/economy";

const STAGES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "PILOT",
  "MARKETING",
  "SALES",
] as const;

const STAGE_LABELS: Record<string, string> = {
  SCENARIO: "Cenário",
  PROBLEM: "Problema",
  INSIGHT: "Insight",
  SOLUTION: "Solução",
  PROTOTYPE: "Protótipo",
  PILOT: "Piloto",
  MARKETING: "Marketing",
  SALES: "Vendas",
};

const STAGE_TITLES: Record<string, string> = {
  PROTOTYPE: "Torne a ideia visível",
  PILOT: "Teste com a realidade",
  MARKETING: "Prepare a chegada ao mercado",
  SALES: "Revele o resultado",
};

const AUDIENCE_LABELS: Record<string, string> = {
  EARLY_ADOPTERS: "Pessoas pioneiras",
  COMMUNITIES: "Comunidades",
  ORGANIZATIONS: "Organizações",
  GENERAL_PUBLIC: "Público geral",
};

const CHANNEL_LABELS: Record<string, string> = {
  SOCIAL: "Redes sociais",
  COMMUNITY: "Comunidades",
  PARTNERSHIPS: "Parcerias",
  DIRECT: "Contato direto",
};

const PILOT_LABELS: Record<string, string> = {
  PROMISING: "Promissor",
  MIXED: "Sinal misto",
  FRICTION: "Atrito encontrado",
};

const TIER_LABELS: Record<string, string> = {
  NEEDS_ITERATION: "Precisa de iteração",
  MARKET_SIGNAL: "Sinal de mercado",
  TRACTION: "Tração",
  GROWTH_OPPORTUNITY: "Oportunidade de crescimento",
};

function sameIdentity(
  left: { toHexString: () => string },
  right: { toHexString: () => string },
) {
  return left.toHexString() === right.toHexString();
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function RunwayWallet({
  economy,
  stageCost,
}: {
  economy: RoomEconomy;
  stageCost?: StageCost;
}) {
  const usableBalance = Math.max(0, economy.balance - economy.reservedBalance);
  const fill = Math.min(
    100,
    Math.round((economy.balance / economy.initialBalance) * 100),
  );

  return (
    <section className="runway-wallet" aria-label="Caixa compartilhado">
      <div className="runway-wallet-heading">
        <div>
          <span>Caixa do projeto</span>
          <strong>{formatCredits(economy.balance)} créditos</strong>
        </div>
        <span className="runway-rules-chip">Runway compartilhado</span>
      </div>
      <div
        className="runway-meter"
        role="meter"
        aria-label="Saldo em relação ao capital inicial"
        aria-valuemin={0}
        aria-valuemax={economy.initialBalance}
        aria-valuenow={economy.balance}
      >
        <span style={{ width: `${fill}%` }} />
      </div>
      <div className="runway-wallet-details">
        <span>
          Disponível <b>{formatCredits(usableBalance)}</b>
        </span>
        {economy.reservedBalance > 0 && (
          <span className="is-reserved">
            Reserva de Vendas <b>{formatCredits(economy.reservedBalance)}</b>
          </span>
        )}
        {stageCost && (
          <span>
            {stageCost.label} <b>−{formatCredits(stageCost.amount)}</b>
          </span>
        )}
      </div>
    </section>
  );
}

function AnimatedEventValue({
  transaction,
}: {
  transaction: EconomyTransaction;
}) {
  const target = Math.abs(transaction.delta);
  const shouldCount =
    transaction.delta > 0 &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [value, setValue] = useState(shouldCount ? 0 : target);

  useEffect(() => {
    if (!shouldCount) {
      setValue(target);
      return;
    }
    const startedAt = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 1_100);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [shouldCount, target, transaction.eventKey]);

  return <>{formatCredits(value)}</>;
}

export function EconomyEventOverlay({
  roomId,
  transactions,
}: {
  roomId: bigint;
  transactions: readonly EconomyTransaction[];
}) {
  const ordered = useMemo(
    () =>
      [...transactions].sort((left, right) => left.sequence - right.sequence),
    [transactions],
  );
  const [visible, setVisible] = useState<EconomyTransaction>();
  const [pending, setPending] = useState<EconomyTransaction[]>([]);
  const timeoutRef = useRef<number>();
  const storageKey = `idea-hero:economy:${roomId.toString()}`;

  useEffect(() => {
    const seen = Number(window.sessionStorage.getItem(storageKey) ?? "-1");
    setPending(ordered.filter((item) => item.sequence > seen));
  }, [ordered, storageKey]);

  useEffect(() => {
    if (visible || pending.length === 0) return;
    const [next, ...rest] = pending;
    setVisible(next);
    setPending(rest);
    window.sessionStorage.setItem(storageKey, String(next.sequence));
  }, [pending, storageKey, visible]);

  useEffect(() => {
    if (!visible) return;
    timeoutRef.current = window.setTimeout(() => setVisible(undefined), 2_650);
    return () => window.clearTimeout(timeoutRef.current);
  }, [visible]);

  function skipAnimations() {
    const latest = ordered.at(-1);
    if (latest) {
      window.sessionStorage.setItem(storageKey, String(latest.sequence));
    }
    window.clearTimeout(timeoutRef.current);
    setPending([]);
    setVisible(undefined);
  }

  if (!visible) return null;
  const positive = visible.delta > 0;
  const funding = visible.reason === "FUNDING_OPPORTUNITY";

  return (
    <aside
      className={`economy-event ${positive ? "is-positive" : "is-expense"} ${
        funding ? "is-funding" : ""
      }`}
      role="status"
      aria-live="assertive"
    >
      <span aria-hidden="true">{funding ? "✦" : positive ? "↑" : "↓"}</span>
      <div>
        <small>
          {funding ? "Oportunidade de financiamento" : visible.label}
        </small>
        <strong>
          {positive ? "+" : "−"}
          <AnimatedEventValue
            key={visible.eventKey}
            transaction={visible}
          />{" "}
          créditos
        </strong>
        <p>Saldo: {formatCredits(visible.balanceAfter)}</p>
      </div>
      <button type="button" onClick={skipAnimations}>
        Pular animação
      </button>
    </aside>
  );
}

function StageCostCard({ cost }: { cost?: StageCost }) {
  if (!cost) return null;
  return (
    <div className="stage-cost-card" aria-label="Custo desta etapa">
      <span aria-hidden="true">↘</span>
      <div>
        <small>Custo revelado · {cost.label}</small>
        <strong>−{formatCredits(cost.amount)} créditos</strong>
      </div>
      <b>{cost.applied ? "Pago" : "Aguardando"}</b>
    </div>
  );
}

function TransactionLedger({
  transactions,
}: {
  transactions: readonly EconomyTransaction[];
}) {
  const ordered = [...transactions].sort(
    (left, right) => right.sequence - left.sequence,
  );
  return (
    <details className="transaction-ledger">
      <summary>Ver movimentos do caixa ({ordered.length})</summary>
      <ol>
        {ordered.map((transaction) => (
          <li key={transaction.eventKey}>
            <span>
              <b>{transaction.label}</b>
              <small>
                {STAGE_LABELS[transaction.stage] ?? transaction.stage}
              </small>
            </span>
            <strong className={transaction.delta > 0 ? "is-positive" : ""}>
              {transaction.delta > 0 ? "+" : "−"}
              {formatCredits(Math.abs(transaction.delta))}
            </strong>
            <small>saldo {formatCredits(transaction.balanceAfter)}</small>
          </li>
        ))}
      </ol>
    </details>
  );
}

export function CardChangeButton({
  room,
  draw,
  economy,
  locked,
}: {
  room: Room;
  draw?: CardDraw;
  economy: RoomEconomy;
  locked: boolean;
}) {
  const redrawCard = useReducer(reducers.redrawCard);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const unavailable =
    locked ||
    !draw ||
    draw.drawIndex > 0 ||
    room.stageIndex > 5 ||
    economy.balance < CARD_REDRAW_COST;

  async function changeCard() {
    if (
      !window.confirm(
        "Usar 500 créditos do caixa compartilhado para trocar esta carta?",
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      await redrawCard({ roomId: room.id });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card-change-control">
      <button
        type="button"
        className="card-change-button"
        disabled={unavailable || pending}
        onClick={() => void changeCard()}
      >
        {draw && draw.drawIndex > 0
          ? "Carta já trocada"
          : pending
            ? "Trocando…"
            : "Trocar carta · −500"}
      </button>
      {locked && draw?.drawIndex === 0 && (
        <small>
          A troca fecha quando a equipe se compromete com esta etapa.
        </small>
      )}
      {error && (
        <small className="error-message" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

type RunwayFinalStageProps = {
  room: Room;
  players: Player[];
  contributions: VisibleContribution[];
  decisions: readonly Decision[];
  currentPlayer: Player;
  card?: Card;
  draw?: CardDraw;
  economy: RoomEconomy;
  stageCosts: readonly StageCost[];
  transactions: readonly EconomyTransaction[];
  prototype?: ProjectPrototype;
  reactions: readonly PrototypeReaction[];
  pilot?: PilotSimulation;
  marketing?: MarketingPlan;
  sales?: SalesResult;
  leaveControl: ReactNode;
};

export function RunwayFinalStage(props: RunwayFinalStageProps) {
  const {
    room,
    players,
    currentPlayer,
    card,
    draw,
    economy,
    stageCosts,
    transactions,
    prototype,
    reactions,
    pilot,
    marketing,
    sales,
    leaveControl,
  } = props;
  const stage = room.currentStage;
  const isHost = sameIdentity(currentPlayer.identity, room.ownerIdentity);
  const advanceStage = useReducer(reducers.advanceStage);
  const endJourney = useReducer(reducers.endJourney);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const stageCost = stageCosts.find((item) => item.stage === stage);
  const stageReady =
    (stage === "PROTOTYPE" && prototype?.committed) ||
    (stage === "PILOT" && pilot?.completed) ||
    (stage === "MARKETING" && marketing?.committed) ||
    (stage === "SALES" && Boolean(sales));
  const cardLocked =
    (stage === "PROTOTYPE" && Boolean(prototype)) ||
    (stage === "PILOT" && Boolean(pilot));

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function endEarly() {
    if (
      window.confirm(
        "Encerrar agora? A jornada parcial será salva para todo o grupo.",
      )
    ) {
      void run(() => endJourney({ roomId: room.id }));
    }
  }

  return (
    <main className="game-shell runway-game-shell">
      <EconomyEventOverlay roomId={room.id} transactions={transactions} />
      <header className="game-header">
        <BrandLogo compact />
        <div className="topbar-actions">
          <div className="room-pill">Sala {room.code}</div>
          {leaveControl}
        </div>
      </header>

      <nav className="stage-progress" aria-label="Progresso da jornada">
        {STAGES.map((item, index) => (
          <div
            key={item}
            className={`stage-step ${index === room.stageIndex ? "is-current" : ""} ${
              index < room.stageIndex ? "is-complete" : ""
            }`}
            aria-current={index === room.stageIndex ? "step" : undefined}
          >
            <span>{index < room.stageIndex ? "✓" : index + 1}</span>
            <small>{STAGE_LABELS[item]}</small>
          </div>
        ))}
      </nav>

      <section className="presence-row" aria-label="Jogadores na sala">
        {players.map((player) => (
          <div
            className={`presence-avatar ${player.online ? "" : "is-offline"}`}
            key={player.id.toString()}
          >
            <span aria-hidden="true">
              {player.avatarId === "comet" ? "☄️" : "✦"}
            </span>
            <small>{player.displayName}</small>
          </div>
        ))}
      </section>

      <RunwayWallet economy={economy} stageCost={stageCost} />

      <section className="stage-layout runway-stage-layout">
        <article className="stage-intro">
          <p className="kicker">
            Etapa {room.stageIndex + 1} de 8 · {STAGE_LABELS[stage]}
          </p>
          <h1>{STAGE_TITLES[stage]}</h1>
          <StageCostCard cost={stageCost} />
          <InspirationCard card={card} stageLabel={STAGE_LABELS[stage]} />
          {isHost && stage !== "MARKETING" && stage !== "SALES" && (
            <CardChangeButton
              room={room}
              draw={draw}
              economy={economy}
              locked={Boolean(cardLocked)}
            />
          )}
          <TransactionLedger transactions={transactions} />
        </article>

        <article className="contribution-panel runway-stage-panel">
          {stage === "PROTOTYPE" && (
            <PrototypeStage
              room={room}
              prototype={prototype}
              reactions={reactions}
              currentPlayer={currentPlayer}
              isHost={isHost}
              maxInvestment={economy.balance}
            />
          )}
          {stage === "PILOT" && (
            <PilotStage
              room={room}
              pilot={pilot}
              prototype={prototype}
              isHost={isHost}
            />
          )}
          {stage === "MARKETING" && (
            <MarketingStage
              room={room}
              marketing={marketing}
              economy={economy}
              isHost={isHost}
            />
          )}
          {stage === "SALES" && (
            <SalesStage
              economy={economy}
              sales={sales}
              marketing={marketing}
              pilot={pilot}
              transactions={transactions}
            />
          )}

          {isHost && stageReady && (
            <button
              className="primary-button next-stage-button"
              disabled={pending}
              onClick={() => void run(() => advanceStage({ roomId: room.id }))}
            >
              {stage === "SALES"
                ? "Concluir e ver a jornada"
                : `Confirmar e avançar para ${
                    STAGE_LABELS[STAGES[room.stageIndex + 1]]
                  }`}
            </button>
          )}
          {!isHost && (
            <p className="waiting-note">
              {stageReady
                ? "Tudo pronto. O anfitrião conduz a próxima revelação."
                : "Construam a decisão juntos; o anfitrião registra a escolha."}
            </p>
          )}
          {isHost && (
            <aside className="host-end-panel" aria-label="Opções do anfitrião">
              <div>
                <strong>Precisa parar a atividade?</strong>
                <span>O progresso parcial será preservado para o grupo.</span>
              </div>
              <button
                type="button"
                className="host-end-button"
                disabled={pending}
                onClick={endEarly}
              >
                Encerrar para todos
              </button>
            </aside>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </article>
      </section>
    </main>
  );
}

function PrototypeStage({
  room,
  prototype,
  reactions,
  currentPlayer,
  isHost,
  maxInvestment,
}: {
  room: Room;
  prototype?: ProjectPrototype;
  reactions: readonly PrototypeReaction[];
  currentPlayer: Player;
  isHost: boolean;
  maxInvestment: number;
}) {
  const commitPrototype = useReducer(reducers.commitProjectPrototype);
  const react = useReducer(reducers.reactToPrototype);
  const [personSituation, setPersonSituation] = useState(
    prototype?.personSituation ?? "",
  );
  const [firstAction, setFirstAction] = useState(prototype?.firstAction ?? "");
  const [keyInteraction, setKeyInteraction] = useState(
    prototype?.keyInteraction ?? "",
  );
  const [evidence, setEvidence] = useState(prototype?.evidence ?? "");
  const [fidelity, setFidelity] = useState<PrototypeFidelity>(
    (prototype?.fidelity as PrototypeFidelity) ?? "LEAN",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ownReaction = reactions.find((item) =>
    sameIdentity(item.playerIdentity, currentPlayer.identity),
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await commitPrototype({
        roomId: room.id,
        personSituation,
        firstAction,
        keyInteraction,
        evidence,
        fidelity,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function sendReaction(reaction: string) {
    setPending(true);
    setError("");
    try {
      await react({ roomId: room.id, reaction });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  const reactionCounts = ["CLEAR", "RISKY", "MISSING"].map((reaction) => ({
    reaction,
    count: reactions.filter((item) => item.reaction === reaction).length,
  }));

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">Canvas compartilhado · 2–3 minutos</p>
          <h2>Construa uma cena que possa ser testada</h2>
        </div>
        <span>O anfitrião é o escriba</span>
      </div>

      <form className="prototype-canvas" onSubmit={submit}>
        <label>
          Pessoa e situação
          <textarea
            value={personSituation}
            onChange={(event) => setPersonSituation(event.target.value)}
            placeholder="Quem está vivendo qual situação?"
            minLength={2}
            maxLength={220}
            required
            disabled={!isHost || prototype?.committed}
          />
        </label>
        <label>
          Primeira ação
          <textarea
            value={firstAction}
            onChange={(event) => setFirstAction(event.target.value)}
            placeholder="O que essa pessoa faz primeiro?"
            minLength={2}
            maxLength={220}
            required
            disabled={!isHost || prototype?.committed}
          />
        </label>
        <label>
          Interação-chave
          <textarea
            value={keyInteraction}
            onChange={(event) => setKeyInteraction(event.target.value)}
            placeholder="Onde o valor realmente acontece?"
            minLength={2}
            maxLength={220}
            required
            disabled={!isHost || prototype?.committed}
          />
        </label>
        <label>
          Prova observável de valor
          <textarea
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
            placeholder="O que alguém poderá ver, contar ou medir?"
            minLength={2}
            maxLength={220}
            required
            disabled={!isHost || prototype?.committed}
          />
        </label>

        <fieldset
          className="fidelity-fieldset"
          disabled={!isHost || prototype?.committed}
        >
          <legend>Quanto investir para reduzir a incerteza?</legend>
          <div className="fidelity-grid">
            {(
              Object.entries(PROTOTYPE_FIDELITIES) as Array<
                [
                  PrototypeFidelity,
                  (typeof PROTOTYPE_FIDELITIES)[PrototypeFidelity],
                ]
              >
            ).map(([id, option]) => (
              <label
                className={`${fidelity === id ? "is-selected" : ""} ${
                  option.cost > maxInvestment ? "is-unavailable" : ""
                }`}
                key={id}
              >
                <input
                  type="radio"
                  name="fidelity"
                  value={id}
                  checked={fidelity === id}
                  disabled={option.cost > maxInvestment}
                  onChange={() => setFidelity(id)}
                />
                <strong>{option.label}</strong>
                <b>−{formatCredits(option.cost)}</b>
                <small>
                  {option.promising}% promissor · {option.friction}% atrito
                </small>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="decision-note">
          Mais investimento reduz a chance de atrito, mas deixa menos caixa para
          o lançamento.
        </p>
        {isHost && !prototype?.committed && (
          <button className="primary-button" disabled={pending}>
            {pending
              ? "Comprometendo…"
              : "Comprometer protótipo e investimento"}
          </button>
        )}
      </form>

      {prototype?.committed && (
        <section className="prototype-reactions" aria-live="polite">
          <strong>Como o protótipo está parecendo?</strong>
          <div className="reaction-row">
            {reactionCounts.map(({ reaction, count }) => (
              <button
                key={reaction}
                type="button"
                disabled={pending}
                aria-pressed={ownReaction?.reaction === reaction}
                onClick={() => void sendReaction(reaction)}
              >
                {reaction === "CLEAR"
                  ? "Claro"
                  : reaction === "RISKY"
                    ? "Arriscado"
                    : "Faltando"}{" "}
                <b>{count}</b>
              </button>
            ))}
          </div>
        </section>
      )}
      {error && <p className="error-message">{error}</p>}
    </>
  );
}

function PilotStage({
  room,
  pilot,
  prototype,
  isHost,
}: {
  room: Room;
  pilot?: PilotSimulation;
  prototype?: ProjectPrototype;
  isHost: boolean;
}) {
  const resolvePilot = useReducer(reducers.resolvePilot);
  const commitDecision = useReducer(reducers.commitPilotDecision);
  const [successSignal, setSuccessSignal] = useState(
    pilot?.successSignal ?? "",
  );
  const [decision, setDecision] = useState(pilot?.decision || "KEEP");
  const [revision, setRevision] = useState(pilot?.revision ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">Teste comprometido · 2–3 minutos</p>
          <h2>Qual sinal provará que isso funciona?</h2>
        </div>
        <span>Fidelidade {prototype?.fidelity ?? "—"}</span>
      </div>

      {!pilot?.resolved ? (
        <form
          className="runway-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => resolvePilot({ roomId: room.id, successSignal }));
          }}
        >
          <label>
            Sinal observável de sucesso
            <textarea
              value={successSignal}
              onChange={(event) => setSuccessSignal(event.target.value)}
              placeholder="Ex.: a pessoa completa a primeira ação sem ajuda."
              minLength={2}
              maxLength={220}
              required
              disabled={!isHost}
            />
          </label>
          {isHost && (
            <button className="primary-button" disabled={pending}>
              {pending ? "Testando…" : "Comprometer teste e revelar resultado"}
            </button>
          )}
        </form>
      ) : (
        <section className={`pilot-result is-${pilot.outcome.toLowerCase()}`}>
          <span aria-hidden="true">
            {pilot.outcome === "PROMISING"
              ? "↗"
              : pilot.outcome === "MIXED"
                ? "≈"
                : "△"}
          </span>
          <div>
            <p className="kicker">Resultado do teste</p>
            <h2>{PILOT_LABELS[pilot.outcome]}</h2>
            <p>
              Sinal observado: <strong>{pilot.successSignal}</strong>
            </p>
            <b>
              +{formatCredits(pilot.readinessBonus)} de prontidão para Vendas
            </b>
            <small>
              Prontidão não entra no caixa; melhora a simulação final.
            </small>
          </div>
        </section>
      )}

      {pilot?.resolved && !pilot.completed && (
        <form
          className="pilot-decision"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              commitDecision({ roomId: room.id, decision, revision }),
            );
          }}
        >
          <fieldset disabled={!isHost}>
            <legend>O que fazemos com o aprendizado?</legend>
            <div className="decision-choice-row">
              {["KEEP", "ADAPT", "REBUILD"].map((choice) => (
                <label
                  className={decision === choice ? "is-selected" : ""}
                  key={choice}
                >
                  <input
                    type="radio"
                    name="pilot-decision"
                    value={choice}
                    checked={decision === choice}
                    onChange={() => setDecision(choice)}
                  />
                  {choice === "KEEP"
                    ? "Manter"
                    : choice === "ADAPT"
                      ? "Adaptar"
                      : "Reconstruir"}
                </label>
              ))}
            </div>
          </fieldset>
          {decision !== "KEEP" && (
            <label>
              Uma revisão curta
              <textarea
                value={revision}
                onChange={(event) => setRevision(event.target.value)}
                minLength={2}
                maxLength={220}
                required
                disabled={!isHost}
                placeholder="O que muda antes do lançamento?"
              />
            </label>
          )}
          {isHost && (
            <button className="primary-button" disabled={pending}>
              Registrar aprendizado
            </button>
          )}
        </form>
      )}
      {pilot?.completed && (
        <p className="completion-callout">
          ✓ Decisão registrada:{" "}
          {pilot.decision === "KEEP"
            ? "manter"
            : pilot.decision === "ADAPT"
              ? "adaptar"
              : "reconstruir"}
          {pilot.revision ? ` — ${pilot.revision}` : ""}
        </p>
      )}
      {error && <p className="error-message">{error}</p>}
    </>
  );
}

function MarketingStage({
  room,
  marketing,
  economy,
  isHost,
}: {
  room: Room;
  marketing?: MarketingPlan;
  economy: RoomEconomy;
  isHost: boolean;
}) {
  const commitMarketing = useReducer(reducers.commitMarketingPlan);
  const [audience, setAudience] = useState<MarketingAudience>("EARLY_ADOPTERS");
  const [valuePromise, setValuePromise] = useState("");
  const [channel, setChannel] = useState<MarketingChannel>("SOCIAL");
  const [callToAction, setCallToAction] = useState("");
  const [investment, setInvestment] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const maxInvestment =
    Math.floor(Math.max(0, economy.balance - economy.reservedBalance) / 500) *
    500;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await commitMarketing({
        roomId: room.id,
        audience,
        valuePromise,
        channel,
        callToAction,
        investment,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  if (marketing?.committed) {
    return (
      <>
        <div className="section-heading">
          <div>
            <p className="kicker">Plano bloqueado</p>
            <h2>A resposta do mercado chegou</h2>
          </div>
          <span>Investimento {formatCredits(marketing.investment)}</span>
        </div>
        <div className="marketing-plan-summary">
          <p>
            <small>Público</small>
            <strong>{AUDIENCE_LABELS[marketing.audience]}</strong>
          </p>
          <p>
            <small>Promessa</small>
            <strong>{marketing.valuePromise}</strong>
          </p>
          <p>
            <small>Canal</small>
            <strong>{CHANNEL_LABELS[marketing.channel]}</strong>
          </p>
          <p>
            <small>Chamada</small>
            <strong>{marketing.callToAction}</strong>
          </p>
        </div>
        <section className="market-response" aria-live="assertive">
          <span aria-hidden="true">◎</span>
          <p className="kicker">Carta de resposta do mercado</p>
          <h2>{marketing.responseTitle}</h2>
          <p>{marketing.responseDescription}</p>
          <div>
            <span>Base {(marketing.baseMultiplier / 100).toFixed(1)}×</span>
            {marketing.matched && <b>Combinação +0,2×</b>}
            <strong>
              Resultado {(marketing.effectiveMultiplier / 100).toFixed(1)}×
            </strong>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">Plano compacto · 2–3 minutos</p>
          <h2>Faça uma aposta clara de lançamento</h2>
        </div>
        <span>Reserva protegida</span>
      </div>
      <div className="sales-reserve-callout">
        <span aria-hidden="true">▣</span>
        <p>
          <strong>
            {formatCredits(economy.reservedBalance)} créditos reservados
          </strong>
          O custo conhecido de Vendas não pode ser usado em Marketing.
        </p>
      </div>
      <form className="runway-form marketing-form" onSubmit={submit}>
        <label>
          Público prioritário
          <select
            value={audience}
            onChange={(event) =>
              setAudience(event.target.value as MarketingAudience)
            }
            disabled={!isHost}
          >
            {MARKETING_AUDIENCES.map((value) => (
              <option value={value} key={value}>
                {AUDIENCE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Promessa de valor
          <textarea
            value={valuePromise}
            onChange={(event) => setValuePromise(event.target.value)}
            minLength={2}
            maxLength={220}
            required
            disabled={!isHost}
            placeholder="Para este público, qual mudança importa?"
          />
        </label>
        <label>
          Canal principal
          <select
            value={channel}
            onChange={(event) =>
              setChannel(event.target.value as MarketingChannel)
            }
            disabled={!isHost}
          >
            {MARKETING_CHANNELS.map((value) => (
              <option value={value} key={value}>
                {CHANNEL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chamada para ação
          <textarea
            value={callToAction}
            onChange={(event) => setCallToAction(event.target.value)}
            minLength={2}
            maxLength={220}
            required
            disabled={!isHost}
            placeholder="O que queremos que a pessoa faça agora?"
          />
        </label>
        <label className="investment-control">
          <span>
            Investimento em Marketing
            <b>{formatCredits(investment)} créditos</b>
          </span>
          <input
            type="range"
            min={0}
            max={maxInvestment}
            step={500}
            value={investment}
            onChange={(event) => setInvestment(Number(event.target.value))}
            disabled={!isHost}
          />
          <small>
            Máximo disponível: {formatCredits(maxInvestment)} · incrementos de
            500
          </small>
        </label>
        {isHost && (
          <button className="primary-button" disabled={pending}>
            {pending ? "Bloqueando plano…" : "Bloquear plano e revelar mercado"}
          </button>
        )}
      </form>
      {error && <p className="error-message">{error}</p>}
    </>
  );
}

function SalesStage({
  economy,
  sales,
  marketing,
  pilot,
  transactions,
}: {
  economy: RoomEconomy;
  sales?: SalesResult;
  marketing?: MarketingPlan;
  pilot?: PilotSimulation;
  transactions: readonly EconomyTransaction[];
}) {
  if (!sales) {
    return (
      <p className="empty-state" role="status">
        Preparando a cerimônia de Vendas…
      </p>
    );
  }
  const changeCosts = transactions
    .filter((item) => item.reason === "CARD_REDRAW")
    .reduce((total, item) => total + Math.abs(item.delta), 0);
  const operatingCosts = transactions
    .filter((item) => item.reason === "STAGE_COST")
    .reduce((total, item) => total + Math.abs(item.delta), 0);
  const funding = transactions
    .filter((item) => item.reason === "FUNDING_OPPORTUNITY")
    .reduce((total, item) => total + item.delta, 0);

  const lines = [
    ["Capital inicial", economy.initialBalance],
    ["Financiamento recebido", funding],
    ["Custos operacionais", -operatingCosts],
    ["Trocas de carta", -changeCosts],
    ["Investimento no protótipo", -(marketing ? 0 : 0)],
    ["Investimento em Marketing", -sales.marketingInvestment],
    ["Prontidão do Piloto", sales.readinessBonus],
  ] as const;
  const prototypeInvestment = transactions
    .filter((item) => item.reason === "PROTOTYPE_INVESTMENT")
    .reduce((total, item) => total + Math.abs(item.delta), 0);
  lines[4][1] = -prototypeInvestment;

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">Cerimônia final · 1–2 minutos</p>
          <h2>O mercado responde à jornada</h2>
        </div>
        <span>Simulação educativa</span>
      </div>
      <p className="simulation-disclaimer">
        Este resultado é uma simulação do jogo para aprender sobre escolhas e
        runway — não é uma previsão financeira.
      </p>
      <section className="sales-ledger" aria-live="polite">
        {lines.map(([label, value], index) => (
          <div style={{ animationDelay: `${index * 120}ms` }} key={label}>
            <span>{label}</span>
            <strong className={value > 0 ? "is-positive" : ""}>
              {value > 0 ? "+" : value < 0 ? "−" : ""}
              {formatCredits(Math.abs(value))}
            </strong>
          </div>
        ))}
      </section>
      <section className="sales-formula">
        <p>
          Base 5.000 + Marketing {formatCredits(sales.marketingInvestment)} +
          Prontidão {formatCredits(pilot?.readinessBonus ?? 0)}
        </p>
        <strong>× {(sales.multiplier / 100).toFixed(1)}</strong>
        <span>{marketing?.responseTitle}</span>
      </section>
      <section className="sales-reveal">
        <div>
          <small>Vendas simuladas</small>
          <strong>+{formatCredits(sales.simulatedSales)}</strong>
        </div>
        <div>
          <small>Runway final</small>
          <strong>{formatCredits(sales.finalRunway)} créditos</strong>
        </div>
        <p>{TIER_LABELS[sales.tier] ?? sales.tier}</p>
      </section>
    </>
  );
}
