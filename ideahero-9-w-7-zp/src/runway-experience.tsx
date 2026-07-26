import {
  PointerEvent as ReactPointerEvent,
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
  GroupVote,
  MarketingPlan,
  PilotSimulation,
  Player,
  ProjectPrototype,
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
  MARKETING_LAUNCH_OPTIONS,
  PROTOTYPE_EXTENSION_COST,
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
  PROTOTYPE: "Faça a ideia existir",
  PILOT: "Reaja ao primeiro teste",
  MARKETING: "Escolha como chegar ao mercado",
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
  return error instanceof Error ? error.message : String(error);
}

function majorityFor(players: readonly Player[] | undefined) {
  return (
    Math.floor((players ?? []).filter((player) => player.online).length / 2) + 1
  );
}

function topicVotes(
  votes: readonly GroupVote[] | undefined,
  topic: string,
  players: readonly Player[] | undefined,
) {
  const online = (players ?? []).filter((player) => player.online);
  return (votes ?? []).filter(
    (vote) =>
      vote.topic === topic &&
      online.some((player) =>
        sameIdentity(player.identity, vote.playerIdentity),
      ),
  );
}

function ownTopicVote(
  votes: readonly GroupVote[] | undefined,
  topic: string,
  player: Player,
) {
  return (votes ?? []).find(
    (vote) =>
      vote.topic === topic &&
      sameIdentity(vote.playerIdentity, player.identity),
  );
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

  if (!visible) return null;
  const positive = visible.delta > 0;
  const funding = visible.reason === "FUNDING_OPPORTUNITY";

  function skipAnimations() {
    const latest = ordered.at(-1);
    if (latest)
      window.sessionStorage.setItem(storageKey, String(latest.sequence));
    window.clearTimeout(timeoutRef.current);
    setPending([]);
    setVisible(undefined);
  }

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

function VoteProgress({
  votes,
  required,
  players,
}: {
  votes: readonly GroupVote[];
  required: number;
  players: readonly Player[];
}) {
  return (
    <div className="group-vote-progress" aria-live="polite">
      <div className="vote-avatar-stack" aria-hidden="true">
        {votes.map((vote) => {
          const player = players.find((item) =>
            sameIdentity(item.identity, vote.playerIdentity),
          );
          return (
            <span title={player?.displayName} key={vote.id.toString()}>
              {player?.displayName.slice(0, 1).toUpperCase() ?? "?"}
            </span>
          );
        })}
      </div>
      <strong>
        {votes.length}/{required} para decidir
      </strong>
    </div>
  );
}

export function CardChangeButton({
  room,
  draw,
  economy,
  locked,
  players,
  currentPlayer,
  groupVotes,
}: {
  room: Room;
  draw?: CardDraw;
  economy: RoomEconomy;
  locked: boolean;
  players: readonly Player[];
  currentPlayer: Player;
  groupVotes: readonly GroupVote[];
}) {
  const voteCardChange = useReducer(reducers.voteCardChange);
  const refreshRedrawnCard = useReducer(reducers.refreshRedrawnCard);
  const refreshedDrawRef = useRef<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const currentStageVotes = (groupVotes ?? []).filter(
    (vote) => vote.stage === room.currentStage,
  );
  const votes = topicVotes(currentStageVotes, "CARD_CHANGE", players);
  const ownVote = ownTopicVote(currentStageVotes, "CARD_CHANGE", currentPlayer);
  const required = majorityFor(players);
  const unavailable =
    locked ||
    !draw ||
    draw.drawIndex > 0 ||
    room.stageIndex > 5 ||
    economy.balance < CARD_REDRAW_COST;

  useEffect(() => {
    if (!draw || draw.drawIndex === 0) return;
    if (refreshedDrawRef.current === draw.cardId) return;
    refreshedDrawRef.current = draw.cardId;
    void refreshRedrawnCard({ roomId: room.id }).catch(() => undefined);
  }, [draw, refreshRedrawnCard, room.id]);

  async function toggleVote() {
    setPending(true);
    setError("");
    try {
      await voteCardChange({ roomId: room.id, support: !ownVote });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card-change-control collaborative-card-change">
      <button
        type="button"
        className="card-change-button"
        disabled={unavailable || pending}
        aria-pressed={Boolean(ownVote)}
        onClick={() => void toggleVote()}
      >
        {draw && draw.drawIndex > 0
          ? "Carta trocada pela equipe"
          : ownVote
            ? "Retirar voto de troca"
            : "Votar para trocar · −500"}
      </button>
      {!unavailable && (
        <VoteProgress votes={votes} required={required} players={players} />
      )}
      {locked && draw?.drawIndex === 0 && (
        <small>A votação fechou quando a equipe começou esta etapa.</small>
      )}
      {error && <small className="error-message">{error}</small>}
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
  groupVotes: readonly GroupVote[];
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
    groupVotes,
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
    (stage === "PILOT" &&
      topicVotes(groupVotes, "PILOT_RESPONSE", players).length > 0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [room.stageIndex]);

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
            <span aria-hidden="true">{player.displayName.slice(0, 1)}</span>
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
          {stage !== "MARKETING" && stage !== "SALES" && (
            <CardChangeButton
              room={room}
              draw={draw}
              economy={economy}
              locked={Boolean(cardLocked)}
              players={players}
              currentPlayer={currentPlayer}
              groupVotes={groupVotes}
            />
          )}
          <TransactionLedger transactions={transactions} />
        </article>

        <article className="contribution-panel runway-stage-panel">
          {stage === "PROTOTYPE" && (
            <PrototypeStage
              room={room}
              prototype={prototype}
              groupVotes={groupVotes}
              currentPlayer={currentPlayer}
              players={players}
              economy={economy}
            />
          )}
          {stage === "PILOT" && (
            <PilotStage
              room={room}
              pilot={pilot}
              groupVotes={groupVotes}
              currentPlayer={currentPlayer}
              players={players}
            />
          )}
          {stage === "MARKETING" && (
            <MarketingStage
              room={room}
              marketing={marketing}
              economy={economy}
              groupVotes={groupVotes}
              currentPlayer={currentPlayer}
              players={players}
              card={card}
            />
          )}
          {stage === "SALES" && (
            <SalesStage
              economy={economy}
              sales={sales}
              pilot={pilot}
              transactions={transactions}
            />
          )}

          {stageReady && (
            <button
              className="primary-button next-stage-button"
              disabled={pending}
              onClick={() => void run(() => advanceStage({ roomId: room.id }))}
            >
              {stage === "SALES"
                ? "Concluir e ver a jornada"
                : `Avançar para ${STAGE_LABELS[STAGES[room.stageIndex + 1]]}`}
            </button>
          )}
          {!stageReady && (
            <p className="waiting-note">
              A etapa avança quando uma escolha alcança a maioria do grupo.
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
          {error && <p className="error-message">{error}</p>}
        </article>
      </section>
    </main>
  );
}

async function fileAsDataUrl(file: File) {
  if (file.size > 650_000) {
    throw new Error("Use um arquivo de até 650 KB.");
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function DrawingBoard({ onSave }: { onSave: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [empty, setEmpty] = useState(true);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function begin(event: ReactPointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const current = point(event);
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(current.x, current.y);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineWidth = 7;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#315f65";
    context.lineTo(current.x, current.y);
    context.stroke();
    setEmpty(false);
  }

  function finish() {
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  }

  return (
    <div className="prototype-drawing">
      <canvas
        ref={canvasRef}
        width={720}
        height={420}
        aria-label="Área de desenho do protótipo"
        onPointerDown={begin}
        onPointerMove={draw}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <div>
        <button type="button" className="secondary-button" onClick={clear}>
          Limpar
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={empty}
          onClick={() => {
            const canvas = canvasRef.current;
            if (canvas) onSave(canvas.toDataURL("image/webp", 0.72));
          }}
        >
          Compartilhar desenho
        </button>
      </div>
    </div>
  );
}

function PrototypeStage({
  room,
  prototype,
  groupVotes,
  currentPlayer,
  players,
  economy,
}: {
  room: Room;
  prototype?: ProjectPrototype;
  groupVotes: readonly GroupVote[];
  currentPlayer: Player;
  players: readonly Player[];
  economy: RoomEconomy;
}) {
  const startActivity = useReducer(reducers.startPrototypeActivity);
  const submitArtifact = useReducer(reducers.submitPrototypeArtifact);
  const voteReady = useReducer(reducers.votePrototypeReady);
  const voteExtension = useReducer(reducers.votePrototypeExtension);
  const finishActivity = useReducer(reducers.finishPrototypeActivity);
  const [mode, setMode] = useState<"DRAWING" | "IMAGE" | "AUDIO">("DRAWING");
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(Date.now());
  const readyVotes = topicVotes(groupVotes, "PROTOTYPE_READY", players);
  const extensionVotes = topicVotes(groupVotes, "PROTOTYPE_EXTENSION", players);
  const ownReady = ownTopicVote(groupVotes, "PROTOTYPE_READY", currentPlayer);
  const ownExtension = ownTopicVote(
    groupVotes,
    "PROTOTYPE_EXTENSION",
    currentPlayer,
  );
  const required = majorityFor(players);
  const endingAt = prototype
    ? prototype.startedAt.toDate().getTime() + prototype.durationSeconds * 1000
    : 0;
  const secondsLeft = Math.max(0, Math.ceil((endingAt - clock) / 1000));

  useEffect(() => {
    if (!prototype || prototype.committed) return;
    const timer = window.setInterval(() => setClock(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [prototype]);

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

  async function saveArtifact(kind: string, data: string) {
    await run(() =>
      submitArtifact({
        roomId: room.id,
        artifactKind: kind,
        artifactData: data,
        caption,
      }),
    );
  }

  if (!prototype) {
    return (
      <section className="prototype-start-card">
        <span aria-hidden="true">✦</span>
        <p className="kicker">Desafio compartilhado · 2 minutos</p>
        <h2>Prontos para criar algo que todos possam ver?</h2>
        <p>
          O relógio começa quando alguém revelar o desafio. Qualquer pessoa pode
          desenhar, fotografar ou registrar um som.
        </p>
        <button
          className="primary-button"
          disabled={pending}
          onClick={() => void run(() => startActivity({ roomId: room.id }))}
        >
          Revelar desafio e iniciar
        </button>
        {error && <p className="error-message">{error}</p>}
      </section>
    );
  }

  return (
    <>
      <div className="prototype-challenge-card">
        <div>
          <p className="kicker">Carta de atividade</p>
          <h2>{prototype.challengeTitle}</h2>
          <p>{prototype.challengeDescription}</p>
        </div>
        <div
          className={`prototype-timer ${secondsLeft <= 15 ? "is-ending" : ""}`}
          role="timer"
          aria-label={`${secondsLeft} segundos restantes`}
        >
          <small>Tempo</small>
          <strong>
            {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </strong>
        </div>
      </div>

      {prototype.artifactData ? (
        <section className="shared-artifact" aria-live="polite">
          <div className="shared-artifact-heading">
            <div>
              <p className="kicker">Protótipo da equipe</p>
              <h3>
                {prototype.caption || "Sem legenda — deixem a ideia falar"}
              </h3>
            </div>
            {!prototype.committed && <span>Todos podem substituir</span>}
          </div>
          {prototype.artifactKind === "AUDIO" ? (
            <audio controls src={prototype.artifactData}>
              Seu navegador não reproduz este áudio.
            </audio>
          ) : (
            <img
              src={prototype.artifactData}
              alt={prototype.caption || "Protótipo compartilhado"}
            />
          )}
        </section>
      ) : (
        <p className="empty-artifact">
          Ainda não há artefato. Criem o primeiro.
        </p>
      )}

      {!prototype.committed && (
        <>
          <div className="artifact-mode-tabs" role="tablist">
            {(["DRAWING", "IMAGE", "AUDIO"] as const).map((value) => (
              <button
                type="button"
                role="tab"
                aria-selected={mode === value}
                key={value}
                onClick={() => setMode(value)}
              >
                {value === "DRAWING"
                  ? "Desenhar"
                  : value === "IMAGE"
                    ? "Foto"
                    : "Som"}
              </button>
            ))}
          </div>
          <label className="artifact-caption">
            Uma legenda curta, se ajudar
            <input
              value={caption}
              maxLength={120}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="O que estamos mostrando?"
            />
          </label>
          {mode === "DRAWING" ? (
            <DrawingBoard
              onSave={(data) => void saveArtifact("DRAWING", data)}
            />
          ) : (
            <label className="artifact-upload-card">
              <span aria-hidden="true">{mode === "IMAGE" ? "▣" : "♪"}</span>
              <strong>
                {mode === "IMAGE"
                  ? "Tirar ou escolher uma foto"
                  : "Gravar ou escolher um áudio"}
              </strong>
              <small>Até 650 KB · aparece para toda a sala</small>
              <input
                type="file"
                accept={mode === "IMAGE" ? "image/*" : "audio/*"}
                capture={mode === "IMAGE" ? "environment" : true}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void fileAsDataUrl(file)
                    .then((data) => saveArtifact(mode, data))
                    .catch((caught) => setError(errorMessage(caught)));
                }}
              />
            </label>
          )}

          {prototype.artifactData && (
            <div className="prototype-group-actions">
              <button
                type="button"
                className="primary-button"
                aria-pressed={Boolean(ownReady)}
                disabled={pending}
                onClick={() =>
                  void run(() =>
                    voteReady({ roomId: room.id, ready: !ownReady }),
                  )
                }
              >
                {ownReady ? "Retirar meu pronto" : "Está pronto"}
              </button>
              <VoteProgress
                votes={readyVotes}
                required={required}
                players={players}
              />
              {secondsLeft === 0 && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={pending}
                  onClick={() =>
                    void run(() => finishActivity({ roomId: room.id }))
                  }
                >
                  Encerrar pelo tempo
                </button>
              )}
            </div>
          )}

          {prototype.investment === 0 &&
            economy.balance >= PROTOTYPE_EXTENSION_COST && (
              <div className="prototype-extension-vote">
                <button
                  type="button"
                  aria-pressed={Boolean(ownExtension)}
                  disabled={pending}
                  onClick={() =>
                    void run(() =>
                      voteExtension({
                        roomId: room.id,
                        support: !ownExtension,
                      }),
                    )
                  }
                >
                  +30 segundos · −500
                </button>
                <VoteProgress
                  votes={extensionVotes}
                  required={required}
                  players={players}
                />
              </div>
            )}
        </>
      )}

      {prototype.committed && (
        <p className="completion-callout">
          ✓ A maioria aprovou este protótipo para o teste.
        </p>
      )}
      {error && <p className="error-message">{error}</p>}
    </>
  );
}

function PilotStage({
  room,
  pilot,
  groupVotes,
  currentPlayer,
  players,
}: {
  room: Room;
  pilot?: PilotSimulation;
  groupVotes: readonly GroupVote[];
  currentPlayer: Player;
  players: readonly Player[];
}) {
  const voteResponse = useReducer(reducers.votePilotResponse);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const votes = topicVotes(groupVotes, "PILOT_RESPONSE", players);
  const ownVote = ownTopicVote(groupVotes, "PILOT_RESPONSE", currentPlayer);
  const required = majorityFor(players);

  if (!pilot) {
    return <p className="empty-state">Preparando o feedback do teste…</p>;
  }

  const options = [
    {
      key: "A",
      title: pilot.optionA,
      description: pilot.optionADescription,
    },
    {
      key: "B",
      title: pilot.optionB,
      description: pilot.optionBDescription,
    },
    {
      key: "C",
      title: pilot.optionC,
      description: pilot.optionCDescription,
    },
  ];

  async function choose(choice: string) {
    setPending(true);
    setError("");
    try {
      await voteResponse({ roomId: room.id, choice });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="pilot-feedback-card">
        <div className="pilot-feedback-portrait" aria-hidden="true">
          <span>“</span>
          <b>1º teste</b>
        </div>
        <div>
          <p className="kicker">Feedback simulado de uma pessoa real</p>
          <h2>{pilot.feedbackTitle}</h2>
          <p>{pilot.feedbackDescription}</p>
        </div>
      </section>

      {pilot.completed ? (
        <section className="pilot-learning">
          <span aria-hidden="true">✓</span>
          <div>
            <small>Adaptação escolhida pela equipe</small>
            <h2>{pilot.decision}</h2>
          </div>
        </section>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <p className="kicker">Resposta rápida</p>
              <h2>O que muda antes do lançamento?</h2>
            </div>
            <span>Maioria decide</span>
          </div>
          <div className="pilot-option-grid">
            {options.map((option) => {
              const count = votes.filter(
                (vote) => vote.choice === option.key,
              ).length;
              return (
                <button
                  type="button"
                  className={
                    ownVote?.choice === option.key ? "is-selected" : ""
                  }
                  disabled={pending}
                  key={option.key}
                  onClick={() => void choose(option.key)}
                >
                  <span>{option.key}</span>
                  <strong>{option.title}</strong>
                  <p>{option.description}</p>
                  <small>
                    {count} {count === 1 ? "voto" : "votos"}
                  </small>
                </button>
              );
            })}
          </div>
          <VoteProgress votes={votes} required={required} players={players} />
        </>
      )}
      {error && <p className="error-message">{error}</p>}
    </>
  );
}

function MarketingStage({
  room,
  marketing,
  economy,
  groupVotes,
  currentPlayer,
  players,
  card,
}: {
  room: Room;
  marketing?: MarketingPlan;
  economy: RoomEconomy;
  groupVotes: readonly GroupVote[];
  currentPlayer: Player;
  players: readonly Player[];
  card?: Card;
}) {
  const voteMarketing = useReducer(reducers.voteMarketingPlan);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const votes = topicVotes(groupVotes, "MARKETING_PLAN", players);
  const ownVote = ownTopicVote(groupVotes, "MARKETING_PLAN", currentPlayer);
  const required = majorityFor(players);
  const available = Math.max(0, economy.balance - economy.reservedBalance);

  async function choose(choice: string) {
    setPending(true);
    setError("");
    try {
      await voteMarketing({ roomId: room.id, choice });
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
            <p className="kicker">Carta escolhida</p>
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
            <small>Canal</small>
            <strong>{CHANNEL_LABELS[marketing.channel]}</strong>
          </p>
          <p>
            <small>Convite</small>
            <strong>{marketing.callToAction}</strong>
          </p>
        </div>
        <figure className="market-response-card" aria-live="assertive">
          <div className="market-response-image">
            {card && <img src={card.imagePath} alt="" />}
            <span>Resposta do mercado</span>
          </div>
          <figcaption>
            <p className="kicker">Carta revelada</p>
            <h2>{marketing.responseTitle}</h2>
            <p>{marketing.responseDescription}</p>
            <div>
              <span>Base {(marketing.baseMultiplier / 100).toFixed(1)}×</span>
              {marketing.matched && <b>Combinação +0,2×</b>}
              <strong>
                {(marketing.effectiveMultiplier / 100).toFixed(1)}×
              </strong>
            </div>
          </figcaption>
        </figure>
      </>
    );
  }

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">Cartas de lançamento</p>
          <h2>Qual aposta combina com a ideia?</h2>
        </div>
        <span>Maioria decide</span>
      </div>
      <div className="sales-reserve-callout">
        <span aria-hidden="true">▣</span>
        <p>
          <strong>
            {formatCredits(economy.reservedBalance)} créditos reservados
          </strong>
          O custo de Vendas está protegido.
        </p>
      </div>
      <div className="marketing-card-grid">
        {MARKETING_LAUNCH_OPTIONS.map((option, index) => {
          const count = votes.filter(
            (vote) => vote.choice === option.key,
          ).length;
          const unavailable = option.investment > available;
          return (
            <button
              type="button"
              className={`marketing-choice-card is-${option.accent} ${
                ownVote?.choice === option.key ? "is-selected" : ""
              }`}
              disabled={pending || unavailable}
              key={option.key}
              onClick={() => void choose(option.key)}
            >
              <div className="marketing-choice-image">
                <img src={option.imagePath} alt={option.imageAlt} />
                <span>0{index + 1}</span>
              </div>
              <div>
                <small>{AUDIENCE_LABELS[option.audience]}</small>
                <h3>{option.label}</h3>
                <p>{option.valuePromise}</p>
                <b>{CHANNEL_LABELS[option.channel]}</b>
                <strong>
                  {option.investment === 0
                    ? "Orgânico"
                    : `−${formatCredits(option.investment)}`}
                </strong>
                <em>
                  {unavailable
                    ? "Reserva protegida"
                    : `${count} ${count === 1 ? "voto" : "votos"}`}
                </em>
              </div>
            </button>
          );
        })}
      </div>
      <VoteProgress votes={votes} required={required} players={players} />
      {error && <p className="error-message">{error}</p>}
    </>
  );
}

function SalesStage({
  economy,
  sales,
  pilot,
  transactions,
}: {
  economy: RoomEconomy;
  sales?: SalesResult;
  pilot?: PilotSimulation;
  transactions: readonly EconomyTransaction[];
}) {
  if (!sales) {
    return <p className="empty-state">Preparando a cerimônia de Vendas…</p>;
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
  const prototypeInvestment = transactions
    .filter((item) => item.reason === "PROTOTYPE_INVESTMENT")
    .reduce((total, item) => total + Math.abs(item.delta), 0);
  const lines = [
    ["Capital inicial", economy.initialBalance],
    ["Financiamento recebido", funding],
    ["Custos operacionais", -operatingCosts],
    ["Trocas de carta", -changeCosts],
    ["Tempo extra de protótipo", -prototypeInvestment],
    ["Investimento em Marketing", -sales.marketingInvestment],
  ] as const;

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
      {pilot?.decision && (
        <p className="pilot-carryover">
          <small>Aprendizado levado ao lançamento</small>
          <strong>{pilot.decision}</strong>
        </p>
      )}
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
      <div className="sales-formula">
        <p>Base 5.000 + Marketing {formatCredits(sales.marketingInvestment)}</p>
        <strong>× {(sales.multiplier / 100).toFixed(1)}</strong>
      </div>
      <section className="sales-reveal">
        <div>
          <small>Vendas simuladas</small>
          <strong>+{formatCredits(sales.simulatedSales)}</strong>
        </div>
        <div>
          <small>Runway final</small>
          <strong>{formatCredits(sales.finalRunway)}</strong>
        </div>
        <p>{TIER_LABELS[sales.tier]}</p>
      </section>
    </>
  );
}
