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
  Decision,
  EconomyTransaction,
  GroupVote,
  MarketingPlan,
  PilotSimulation,
  Player,
  PrototypeArtifact,
  PrototypeDrawingStroke,
  ProjectPrototype,
  Room,
  RoomEconomy,
  SalesResult,
  StageCost,
  VisibleContribution,
} from "./module_bindings/types";
import { BrandLogo } from "./experience";
import { JourneySummary } from "./JourneySummary";
import { formatCredits } from "./runway-format";
import {
  CARD_REDRAW_COST,
  MARKETING_LAUNCH_OPTIONS,
  PROTOTYPE_EXTENSION_COST,
  PROTOTYPE_CREATIVE_BONUS,
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
  PROTOTYPE: "Vamos criar o protótipo",
  PILOT: "Vamos testar no piloto",
  MARKETING: "Vamos planejar o marketing",
  SALES: "Vamos iniciar as vendas",
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
  transactions,
}: {
  economy: RoomEconomy;
  stageCost?: StageCost;
  transactions: readonly EconomyTransaction[];
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
        <span className="runway-rules-chip">Caixa compartilhado</span>
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
            {stageCost.label} <b>−{formatCredits(stageCost.amount)}</b>{" "}
            <em>{stageCost.applied ? "Pago" : "ao concluir"}</em>
          </span>
        )}
      </div>
      <TransactionLedger transactions={transactions} />
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
  const [seenSequence, setSeenSequence] = useState<number | undefined>();
  const timeoutRef = useRef<number>();
  const storageKey = `idea-hero:economy:${roomId.toString()}`;

  useEffect(() => {
    setVisible(undefined);
    setPending([]);
    setSeenSequence(Number(window.sessionStorage.getItem(storageKey) ?? "-1"));
  }, [storageKey]);

  useEffect(() => {
    if (seenSequence === undefined) return;
    setPending((current) => {
      const queued = new Set(current.map((item) => item.sequence));
      if (visible) queued.add(visible.sequence);
      const additions = ordered.filter(
        (item) => item.sequence > seenSequence && !queued.has(item.sequence),
      );
      return additions.length === 0 ? current : [...current, ...additions];
    });
  }, [ordered, seenSequence, visible]);

  useEffect(() => {
    if (visible || pending.length === 0) return;
    const [next, ...rest] = pending;
    setVisible(next);
    setPending(rest);
    window.sessionStorage.setItem(storageKey, String(next.sequence));
    setSeenSequence(next.sequence);
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
    if (latest) setSeenSequence(latest.sequence);
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
  label = "na mesma opção",
  hideInstruction = false,
}: {
  votes: readonly GroupVote[];
  required: number;
  players: readonly Player[];
  label?: string;
  hideInstruction?: boolean;
}) {
  const onlinePlayers = players.filter((player) => player.online);
  const votesByChoice = new Map<string, GroupVote[]>();
  for (const vote of votes) {
    const choiceVotes = votesByChoice.get(vote.choice) ?? [];
    choiceVotes.push(vote);
    votesByChoice.set(vote.choice, choiceVotes);
  }
  const matchingVotes = Array.from(votesByChoice.values()).reduce<
    readonly GroupVote[]
  >(
    (largest, choiceVotes) =>
      choiceVotes.length > largest.length ? choiceVotes : largest,
    [],
  );
  const majorityInstruction =
    onlinePlayers.length === 2
      ? "Há 2 pessoas online: as 2 precisam escolher a mesma opção."
      : onlinePlayers.length === 3
        ? "Há 3 pessoas online: 2 precisam escolher a mesma opção."
        : `Há ${onlinePlayers.length} pessoas online: ${required} precisam escolher a mesma opção.`;

  return (
    <div className="group-vote-progress" aria-live="polite">
      <div className="vote-avatar-stack" aria-hidden="true">
        {matchingVotes.map((vote) => {
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
        {matchingVotes.length}/{required} {label}
      </strong>
      {!hideInstruction && <p>{majorityInstruction}</p>}
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
    room.stageIndex > 5 ||
    economy.balance < CARD_REDRAW_COST;

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
        {ownVote ? "Retirar voto de troca" : "Votar para trocar · −500"}
      </button>
      {!unavailable && (
        <VoteProgress
          votes={votes}
          required={required}
          players={players}
          label="votos para trocar"
          hideInstruction
        />
      )}
      {locked && (
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
  economy: RoomEconomy;
  stageCosts: readonly StageCost[];
  transactions: readonly EconomyTransaction[];
  prototype?: ProjectPrototype;
  prototypeArtifacts: readonly PrototypeArtifact[];
  prototypeDrawingStrokes: readonly PrototypeDrawingStroke[];
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
    contributions,
    decisions,
    currentPlayer,
    card,
    economy,
    stageCosts,
    transactions,
    prototype,
    prototypeArtifacts,
    prototypeDrawingStrokes,
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

      <JourneySummary
        room={room}
        contributions={contributions}
        players={players}
        decisions={decisions}
      />

      <RunwayWallet
        economy={economy}
        stageCost={stageCost}
        transactions={transactions}
      />

      <section className="runway-stage-flow">
        <header className="runway-stage-heading">
          <p className="kicker">
            Etapa {room.stageIndex + 1} de 8 · {STAGE_LABELS[stage]}
          </p>
          <h1>{STAGE_TITLES[stage]}</h1>
        </header>

        <div className="runway-stage-activity">
          {stage === "PROTOTYPE" && (
            <PrototypeStage
              room={room}
              prototype={prototype}
              artifacts={prototypeArtifacts}
              drawingStrokes={prototypeDrawingStrokes}
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
        </div>
      </section>
    </main>
  );
}

async function uploadPrototypeFile(
  roomId: bigint,
  kind: "DRAWING" | "IMAGE" | "AUDIO",
  file: File,
) {
  const formData = new FormData();
  formData.set("roomId", roomId.toString());
  formData.set("kind", kind);
  formData.set("file", file);
  const response = await fetch("/api/storage", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as { error?: string; key?: string };
  if (!response.ok || !result.key) {
    throw new Error(result.error || "Não foi possível salvar o arquivo.");
  }
  return result.key;
}

function artifactSource(data: string) {
  return data.startsWith("idea-hero/prototype/")
    ? `/api/storage?key=${encodeURIComponent(data)}`
    : data;
}

type VisualConcept = {
  title: string;
  description: string;
  prompt: string;
  tags: string[];
};

type ImageStudioResult = {
  error?: string;
  extractedContent?: string;
  concepts?: VisualConcept[];
  referenceKey?: string;
  key?: string;
  caption?: string;
};

async function requestImageStudio(formData: FormData) {
  const response = await fetch("/api/image-studio", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as ImageStudioResult;
  if (!response.ok) {
    throw new Error(
      result.error || "Não foi possível usar o estúdio de imagens.",
    );
  }
  return result;
}

function IdeaImageStudio({
  room,
  defaultIdea,
  disabled,
  onChooseImage,
}: {
  room: Room;
  defaultIdea: string;
  disabled: boolean;
  onChooseImage: (
    key: string,
    caption: string,
    kind: "IMAGE" | "AI_IMAGE",
  ) => Promise<void>;
}) {
  const [idea, setIdea] = useState(defaultIdea);
  const [concepts, setConcepts] = useState<VisualConcept[]>([]);
  const [extractedContent, setExtractedContent] = useState("");
  const [referenceKey, setReferenceKey] = useState("");
  const [working, setWorking] = useState<
    "" | "directions" | "upload" | "generate"
  >("");
  const [error, setError] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");

  useEffect(() => {
    if (!idea) setIdea(defaultIdea);
  }, [defaultIdea, idea]);

  async function getDirections() {
    setWorking("directions");
    setError("");
    try {
      const formData = new FormData();
      formData.set("operation", "directions");
      formData.set("roomId", room.id.toString());
      formData.set("idea", idea);
      const result = await requestImageStudio(formData);
      setConcepts(result.concepts ?? []);
      setExtractedContent(result.extractedContent ?? "");
      setReferenceKey("");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setWorking("");
    }
  }

  async function analyzeReference(file: File) {
    setWorking("upload");
    setError("");
    try {
      const formData = new FormData();
      formData.set("operation", "analyze");
      formData.set("roomId", room.id.toString());
      formData.set("idea", idea);
      formData.set("image", file);
      const result = await requestImageStudio(formData);
      setConcepts(result.concepts ?? []);
      setExtractedContent(result.extractedContent ?? "");
      setReferenceKey(result.referenceKey ?? "");
      setGeneratedKey("");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setWorking("");
    }
  }

  async function generateConcept(concept: VisualConcept) {
    setWorking("generate");
    setError("");
    try {
      const formData = new FormData();
      formData.set("operation", "generate");
      formData.set("roomId", room.id.toString());
      formData.set("prompt", concept.prompt);
      formData.set("title", concept.title);
      const result = await requestImageStudio(formData);
      if (!result.key) throw new Error("A imagem criada não foi encontrada.");
      setGeneratedKey(result.key);
      await onChooseImage(
        result.key,
        result.caption || concept.title,
        "AI_IMAGE",
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setWorking("");
    }
  }

  return (
    <section className="idea-image-studio" aria-labelledby="image-studio-title">
      <div className="image-studio-heading">
        <div>
          <p className="kicker">Estúdio visual com IA</p>
          <h3 id="image-studio-title">
            Transformem a ideia em imagens de carta
          </h3>
        </div>
        <span>6 direções por vez</span>
      </div>
      <p>
        Escrevam o que a imagem deve fazer a pessoa sentir. A IA propõe caminhos
        visuais; escolham um para gerar e ele entra direto no protótipo da
        equipe.
      </p>
      <label className="image-studio-idea">
        Ideia para a imagem
        <textarea
          value={idea}
          maxLength={500}
          disabled={disabled || Boolean(working)}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="Ex.: Uma forma simples de pessoas do bairro trocarem ferramentas"
        />
      </label>
      <div className="image-studio-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={disabled || Boolean(working) || idea.trim().length < 2}
          onClick={() => void getDirections()}
        >
          {working === "directions"
            ? "Criando caminhos..."
            : "Criar 6 caminhos"}
        </button>
        <label className="image-reference-upload">
          <span>
            {working === "upload"
              ? "Lendo imagem..."
              : "Usar uma imagem de referência"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={disabled || Boolean(working) || idea.trim().length < 2}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void analyzeReference(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {referenceKey && (
        <div className="image-reference-result">
          <img
            src={artifactSource(referenceKey)}
            alt="Imagem de referência enviada"
          />
          <div>
            <strong>Referência salva na galeria da equipe</strong>
            <p>
              {extractedContent ||
                "A IA está usando os elementos desta imagem."}
            </p>
            <button
              type="button"
              className="secondary-button"
              disabled={disabled || Boolean(working)}
              onClick={() =>
                void onChooseImage(
                  referenceKey,
                  "Imagem de referência da equipe",
                  "IMAGE",
                )
              }
            >
              Usar esta imagem agora
            </button>
          </div>
        </div>
      )}
      {concepts.length > 0 && (
        <div className="visual-concept-grid" aria-live="polite">
          {concepts.map((concept) => (
            <article className="visual-concept" key={concept.prompt}>
              <div>
                <h4>{concept.title}</h4>
                <p>{concept.description}</p>
              </div>
              <div className="visual-concept-tags">
                {concept.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <button
                type="button"
                className="primary-button"
                disabled={disabled || Boolean(working)}
                onClick={() => void generateConcept(concept)}
              >
                {working === "generate"
                  ? "Gerando imagem..."
                  : "Gerar esta imagem"}
              </button>
            </article>
          ))}
        </div>
      )}
      {generatedKey && (
        <p className="image-studio-success">
          Imagem criada e escolhida para aparecer no protótipo da equipe.
        </p>
      )}
      {error && <p className="error-message">{error}</p>}
    </section>
  );
}

type DrawingPoint = { x: number; y: number };

const DRAWING_COLORS = [
  "#e85671",
  "#218c95",
  "#6f58c9",
  "#e39a22",
  "#438454",
  "#a94791",
];

function drawingColorFor(player: Player) {
  return DRAWING_COLORS[Number(player.id % BigInt(DRAWING_COLORS.length))];
}

function readDrawingPoints(points: string): DrawingPoint[] {
  try {
    const decoded: unknown = JSON.parse(points);
    if (!Array.isArray(decoded)) return [];
    return decoded.filter(
      (point): point is DrawingPoint =>
        typeof point?.x === "number" && typeof point?.y === "number",
    );
  } catch {
    return [];
  }
}

function paintStroke(
  context: CanvasRenderingContext2D,
  points: readonly DrawingPoint[],
  color: string,
) {
  if (points.length === 0) return;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 7;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (points.length === 1) {
    context.beginPath();
    context.arc(points[0].x, points[0].y, 3.5, 0, Math.PI * 2);
    context.fill();
    return;
  }
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.stroke();
}

function DrawingBoard({
  strokes,
  players,
  currentPlayer,
  editable,
  onSubmitStroke,
  onClearOwnStrokes,
  onSaveSnapshot,
  hasStoredSnapshot = false,
}: {
  strokes: readonly PrototypeDrawingStroke[];
  players: readonly Player[];
  currentPlayer: Player;
  editable: boolean;
  onSubmitStroke: (points: DrawingPoint[]) => void;
  onClearOwnStrokes: () => void;
  onSaveSnapshot?: (snapshot: Blob) => void;
  hasStoredSnapshot?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<DrawingPoint[]>([]);
  const snapshotRequestedRef = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    [...strokes]
      .sort((left, right) => Number(left.id - right.id))
      .forEach((stroke) =>
        paintStroke(context, readDrawingPoints(stroke.points), stroke.color),
      );
  }, [strokes]);

  useEffect(() => {
    if (
      editable ||
      !onSaveSnapshot ||
      hasStoredSnapshot ||
      strokes.length === 0 ||
      snapshotRequestedRef.current
    ) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const timer = window.setTimeout(() => {
      snapshotRequestedRef.current = true;
      canvas.toBlob(
        (snapshot) => {
          if (snapshot) onSaveSnapshot(snapshot);
        },
        "image/webp",
        0.88,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editable, hasStoredSnapshot, onSaveSnapshot, strokes.length]);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function begin(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!editable) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const current = point(event);
    drawingRef.current = true;
    pointsRef.current = [current];
    event.currentTarget.setPointerCapture(event.pointerId);
    paintStroke(context, [current], drawingColorFor(currentPlayer));
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const current = point(event);
    const previous = pointsRef.current.at(-1);
    if (!previous) return;
    pointsRef.current.push(current);
    paintStroke(context, [previous, current], drawingColorFor(currentPlayer));
    onSubmitStroke([previous, current]);
  }

  function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (pointsRef.current.length === 1) onSubmitStroke(pointsRef.current);
    pointsRef.current = [];
  }

  return (
    <div className={`prototype-drawing ${fullscreen ? "is-fullscreen" : ""}`}>
      <div className="drawing-board-heading">
        <div>
          <strong>Quadro de desenho ao vivo</strong>
          <small>Cada pessoa desenha com sua própria cor.</small>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => setFullscreen((value) => !value)}
        >
          {fullscreen ? "Sair da tela cheia" : "Desenhar em tela cheia"}
        </button>
      </div>
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
      <div className="drawing-color-key" aria-label="Cores dos participantes">
        {players.map((player) => (
          <span key={player.id.toString()}>
            <i style={{ background: drawingColorFor(player) }} />
            {player.displayName}
          </span>
        ))}
      </div>
      {editable && (
        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={onClearOwnStrokes}
          >
            Apagar meus traços
          </button>
        </div>
      )}
    </div>
  );
}

function PrototypeStage({
  room,
  prototype,
  artifacts,
  drawingStrokes,
  groupVotes,
  currentPlayer,
  players,
  economy,
}: {
  room: Room;
  prototype?: ProjectPrototype;
  artifacts: readonly PrototypeArtifact[];
  drawingStrokes: readonly PrototypeDrawingStroke[];
  groupVotes: readonly GroupVote[];
  currentPlayer: Player;
  players: readonly Player[];
  economy: RoomEconomy;
}) {
  const startActivity = useReducer(reducers.startPrototypeActivity);
  const submitArtifact = useReducer(reducers.submitPrototypeArtifact);
  const submitDrawingStroke = useReducer(reducers.submitPrototypeDrawingStroke);
  const clearOwnDrawing = useReducer(reducers.clearOwnPrototypeDrawing);
  const voteReady = useReducer(reducers.votePrototypeReady);
  const voteExtension = useReducer(reducers.votePrototypeExtension);
  const finishActivity = useReducer(reducers.finishPrototypeActivity);
  const [mode, setMode] = useState<"DRAWING" | "IMAGE" | "AUDIO" | "AI">(
    "DRAWING",
  );
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
  const canEdit = !prototype?.committed && secondsLeft > 0;
  const hasArtifact = artifacts.length > 0 || Boolean(prototype?.artifactData);
  const usedKinds = new Set(artifacts.map((artifact) => artifact.artifactKind));
  const mediaArtifacts = artifacts.filter(
    (artifact) =>
      artifact.artifactKind === "IMAGE" ||
      artifact.artifactKind === "AI_IMAGE" ||
      artifact.artifactKind === "AUDIO",
  );
  const drawingSnapshot = artifacts.find(
    (artifact) => artifact.artifactKind === "DRAWING" && artifact.artifactData,
  );

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

  async function saveArtifact(kind: string, data: string, label = caption) {
    await run(() =>
      submitArtifact({
        roomId: room.id,
        artifactKind: kind,
        artifactData: data,
        caption: label,
      }),
    );
  }

  async function saveDrawingSnapshot(snapshot: Blob) {
    try {
      const image = new File([snapshot], "desenho-da-equipe.webp", {
        type: "image/webp",
      });
      const key = await uploadPrototypeFile(room.id, "DRAWING", image);
      await saveArtifact("DRAWING", key, "Desenho colaborativo");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  function saveDrawingStroke(points: DrawingPoint[]) {
    void submitDrawingStroke({
      roomId: room.id,
      points: JSON.stringify(points),
    }).catch((caught) => setError(errorMessage(caught)));
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

      {prototype.artifactData && artifacts.length === 0 ? (
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
            <audio controls src={artifactSource(prototype.artifactData)}>
              Seu navegador não reproduz este áudio.
            </audio>
          ) : (
            <img
              src={artifactSource(prototype.artifactData)}
              alt={prototype.caption || "Protótipo compartilhado"}
            />
          )}
        </section>
      ) : (
        <p className="empty-artifact" hidden={artifacts.length > 0}>
          Ainda não há artefato. Criem o primeiro.
        </p>
      )}

      {artifacts.length > 0 && (
        <section className="shared-artifact" aria-live="polite">
          <div className="shared-artifact-heading">
            <div>
              <p className="kicker">Protótipo da equipe</p>
              <h3>Três formas de tornar a ideia real</h3>
            </div>
            <span>{usedKinds.size}/4 linguagens criativas</span>
          </div>
          <div
            className="creative-bonus-progress"
            aria-label="Bônus por linguagens criativas"
          >
            {(["DRAWING", "IMAGE", "AI_IMAGE", "AUDIO"] as const).map(
              (kind) => (
                <span
                  className={usedKinds.has(kind) ? "is-earned" : ""}
                  key={kind}
                >
                  {kind === "DRAWING"
                    ? "Desenho"
                    : kind === "IMAGE"
                      ? "Foto"
                      : kind === "AI_IMAGE"
                        ? "Imagem com IA"
                        : "Som"}
                  <b>+{PROTOTYPE_CREATIVE_BONUS}</b>
                </span>
              ),
            )}
          </div>
          {drawingStrokes.length > 0 && !canEdit && (
            <DrawingBoard
              strokes={drawingStrokes}
              players={players}
              currentPlayer={currentPlayer}
              editable={false}
              onSubmitStroke={() => undefined}
              onClearOwnStrokes={() => undefined}
              onSaveSnapshot={saveDrawingSnapshot}
              hasStoredSnapshot={Boolean(drawingSnapshot)}
            />
          )}
          {mediaArtifacts.map((artifact) => (
            <figure
              className="prototype-media-artifact"
              key={artifact.id.toString()}
            >
              <figcaption>
                {artifact.caption ||
                  (artifact.artifactKind === "AUDIO"
                    ? "Registro em áudio"
                    : "Registro em imagem")}
              </figcaption>
              {artifact.artifactKind === "AUDIO" ? (
                <audio controls src={artifactSource(artifact.artifactData)}>
                  Seu navegador não reproduz este áudio.
                </audio>
              ) : (
                <img
                  src={artifactSource(artifact.artifactData)}
                  alt={artifact.caption || "Protótipo em imagem"}
                />
              )}
            </figure>
          ))}
        </section>
      )}

      {canEdit && (
        <>
          <div
            className="artifact-mode-tabs"
            role="tablist"
            aria-label="Forma de criar o protótipo"
          >
            {(["DRAWING", "IMAGE", "AUDIO", "AI"] as const).map((value) => (
              <button
                type="button"
                role="tab"
                aria-selected={mode === value}
                aria-controls={`prototype-tool-${value.toLowerCase()}`}
                key={value}
                onClick={() => setMode(value)}
              >
                {value === "DRAWING"
                  ? "Desenhar"
                  : value === "IMAGE"
                    ? "Foto"
                    : value === "AUDIO"
                      ? "Som"
                      : "Criar com IA"}
              </button>
            ))}
          </div>
          {mode !== "AI" && (
            <label className="artifact-caption">
              Uma legenda curta, se ajudar
              <input
                value={caption}
                maxLength={120}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="O que estamos mostrando?"
              />
            </label>
          )}
          {mode === "AI" && (
            <div id="prototype-tool-ai" role="tabpanel">
              <IdeaImageStudio
                room={room}
                defaultIdea={caption || prototype.challengeDescription}
                disabled={!canEdit || pending}
                onChooseImage={(key, imageCaption, kind) =>
                  saveArtifact(kind, key, imageCaption)
                }
              />
            </div>
          )}
          {mode === "DRAWING" ? (
            <div id="prototype-tool-drawing" role="tabpanel">
              <DrawingBoard
                strokes={drawingStrokes}
                players={players}
                currentPlayer={currentPlayer}
                editable={canEdit}
                onSubmitStroke={saveDrawingStroke}
                onClearOwnStrokes={() =>
                  void run(() => clearOwnDrawing({ roomId: room.id }))
                }
              />
            </div>
          ) : mode !== "AI" ? (
            <div id={`prototype-tool-${mode.toLowerCase()}`} role="tabpanel">
              <label className="artifact-upload-card">
                <span aria-hidden="true">{mode === "IMAGE" ? "▣" : "♪"}</span>
                <strong>
                  {mode === "IMAGE"
                    ? "Tirar ou escolher uma foto"
                    : "Gravar ou escolher um áudio"}
                </strong>
                <small>Até 25 MB · aparece para toda a sala</small>
                <input
                  type="file"
                  accept={mode === "IMAGE" ? "image/*" : "audio/*"}
                  capture={mode === "IMAGE" ? "environment" : true}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void uploadPrototypeFile(room.id, mode, file)
                      .then((key) => saveArtifact(mode, key))
                      .catch((caught) => setError(errorMessage(caught)));
                  }}
                />
              </label>
            </div>
          ) : null}

          {hasArtifact && (
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
                label="prontos"
                hideInstruction
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
        </>
      )}

      {!prototype.committed &&
        prototype.investment === 0 &&
        economy.balance >= PROTOTYPE_EXTENSION_COST && (
          <div className="prototype-extension-vote">
            {!canEdit && (
              <p>
                A maioria pode comprar mais 30 segundos e reabrir o protótipo.
              </p>
            )}
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
              label="para estender"
              hideInstruction
            />
          </div>
        )}

      {!canEdit && !prototype.committed && (
        <>
          <p className="completion-callout">
            O tempo acabou. O protótipo foi bloqueado exatamente como está.
          </p>
          {hasArtifact && (
            <button
              type="button"
              className="secondary-button"
              disabled={pending}
              onClick={() =>
                void run(() => finishActivity({ roomId: room.id }))
              }
            >
              Confirmar protótipo encerrado
            </button>
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
