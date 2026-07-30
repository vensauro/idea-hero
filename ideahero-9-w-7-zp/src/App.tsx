import { FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";
import "./idea-hero.css";
import { reducers, tables } from "./module_bindings";
import type {
  Card,
  CardDraw,
  Contribution,
  ContributionStatus,
  Decision,
  EconomyTransaction,
  GroupVote,
  Journey,
  MarketingPlan,
  PilotSimulation,
  Player,
  PublishedResult,
  ProjectPrototype,
  PrototypeArtifact,
  PrototypeDrawingStroke,
  Room,
  RoomEconomy,
  SalesResult,
  StageCost,
  StageAssignment,
  StageOutcome,
  StageSession,
  VisibleContribution,
  Vote,
  VoteStatus,
} from "./module_bindings/types";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { BrandLogo, InspirationCard } from "./experience";
import { STAGE_GUIDANCE } from "./stage-guidance";
import {
  buildJourneyMarkdown,
  buildJourneyShareText,
  journeyFilename,
} from "./journey-artifact";
import { createJourneyShareImage } from "./journey-share-image";
import {
  buildPublicResultUrl,
  createPublicResultToken,
  publicResultTokenFromUrl,
} from "./public-result-link";
import {
  buildRoomInviteUrl,
  clearRoomInviteUrl,
  extractRoomCode,
  roomCodeFromUrl,
} from "./room-invite";
import { createRoomWithAvailableCode } from "./room-code";
import { latestOpenSession } from "./room-session";
import { VoiceInputButton, type VoiceInputResult } from "./VoiceInputButton";
import { JourneySummary } from "./JourneySummary";
import {
  CardChangeButton,
  EconomyEventOverlay,
  RunwayFinalStage,
  RunwayWallet,
} from "./runway-experience";
import { formatCredits } from "./runway-format";
import { PILOT_FEEDBACK } from "../spacetimedb/src/economy";

export const BOARD_STATES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "PILOT",
  "MARKETING",
  "SALES",
] as const;

type BoardState = (typeof BOARD_STATES)[number];

export const COLLABORATIVE_STAGES = new Set<BoardState>(
  BOARD_STATES.slice(0, 4),
);
export const COLLABORATIVE_PHASES = [
  "CONTRIBUTING",
  "VOTING",
  "REVIEW",
] as const;
const MIN_PLAYERS = 2;
const PRODUCT_TYPES = [
  {
    id: "physical",
    icon: "O",
    label: "Produto fisico",
    hint: "algo que se toca ou leva",
  },
  {
    id: "digital",
    icon: "~",
    label: "Produto digital",
    hint: "app, site ou ferramenta",
  },
  {
    id: "service",
    icon: "+",
    label: "Servico",
    hint: "uma experiencia feita com pessoas",
  },
  {
    id: "process",
    icon: ">",
    label: "Processo",
    hint: "um jeito novo de fazer",
  },
  {
    id: "hybrid",
    icon: "*",
    label: "Hibrido",
    hint: "mistura de formatos",
  },
] as const;

type ProductType = (typeof PRODUCT_TYPES)[number]["id"];

const STAGE_CONTENT: Record<
  BoardState,
  {
    title: string;
    eyebrow: string;
    objective: string;
    prompt: string;
    icon: string;
  }
> = {
  SCENARIO: {
    title: "Vamos criar o cenário",
    eyebrow: "Cenário",
    objective: "Alinhe o grupo sobre o contexto onde a ideia vai existir.",
    prompt: "O que existe neste mundo e quem vive nele?",
    icon: "◌",
  },
  PROBLEM: {
    title: "Vamos entender o problema",
    eyebrow: "Problema",
    objective: "Transforme tensões do cenário em um problema relevante.",
    prompt: "Qual necessidade merece ser resolvida primeiro?",
    icon: "△",
  },
  INSIGHT: {
    title: "Vamos descobrir o insight",
    eyebrow: "Insight",
    objective: "Olhe além da primeira explicação e encontre oportunidades.",
    prompt: "O que estamos deixando de perceber?",
    icon: "✦",
  },
  SOLUTION: {
    title: "Vamos criar a solução",
    eyebrow: "Solução",
    objective: "Crie respostas e fortaleça as ideias do grupo.",
    prompt: "Que solução inesperada conecta cenário, problema e insight?",
    icon: "◇",
  },
  PROTOTYPE: {
    title: "Vamos criar o protótipo",
    eyebrow: "Protótipo",
    objective: "Mostre rapidamente como alguém usaria a solução.",
    prompt: "Qual é a menor representação que torna a ideia compreensível?",
    icon: "▱",
  },
  PILOT: {
    title: "Vamos testar no piloto",
    eyebrow: "Piloto",
    objective: "Confronte o protótipo com uma condição de realidade.",
    prompt: "O que este teste ensina e o que precisa mudar?",
    icon: "↗",
  },
  MARKETING: {
    title: "Vamos planejar o marketing",
    eyebrow: "Marketing",
    objective: "Defina público, mensagem e caminho para alcançar pessoas.",
    prompt: "Como explicar o valor desta ideia em uma frase?",
    icon: "◎",
  },
  SALES: {
    title: "Vamos iniciar as vendas",
    eyebrow: "Vendas",
    objective: "Consolide a proposta e revele o que o grupo construiu.",
    prompt: "Qual é o próximo passo real para esta ideia?",
    icon: "★",
  },
};

const AVATARS = ["seedling", "comet", "prism", "whale", "owl", "fox"] as const;
const AVATAR_GLYPHS: Record<string, string> = {
  seedling: "🌱",
  comet: "☄️",
  prism: "🔮",
  whale: "🐋",
  owl: "🦉",
  fox: "🦊",
};

const AVATAR_LABELS: Record<string, string> = {
  seedling: "Muda",
  comet: "Cometa",
  prism: "Prisma",
  whale: "Baleia",
  owl: "Coruja",
  fox: "Raposa",
};

function shortIdentity(identity: { toHexString: () => string }) {
  return identity.toHexString().slice(0, 8);
}

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

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function roundDuration(
  stage: BoardState,
  phase: string,
  collaborative: boolean,
) {
  if (phase === "VOTING") return 35;
  if (phase === "REVIEW") return 20;
  if (stage === "PROTOTYPE") return 90;
  return collaborative ? 75 : 60;
}

function prototypeSuggestion(productType: ProductType, draft: string) {
  const focus = draft.trim()
    ? `Pegue "${draft.trim().slice(0, 96)}" como ponto de partida.`
    : "Comece com a ideia que o grupo acabou de escolher.";

  const suggestions: Record<ProductType, string> = {
    physical:
      "Mostre uma versao de papel, sucata ou embalagem e peca para alguem simular o primeiro uso.",
    digital:
      "Desenhe so a primeira tela e simule o toque que leva ao ganho principal.",
    service:
      "Encene o primeiro minuto: quem recebe a pessoa, o que acontece e como ela sai diferente.",
    process:
      "Transforme o fluxo em tres cartoes: antes, mudanca e depois. Teste se alguem entende sem explicacao extra.",
    hybrid:
      "Escolha uma parte fisica e uma digital. Mostre o momento em que elas se encontram para gerar valor.",
  };

  return `${focus} ${suggestions[productType]}`;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Não foi possível copiar o conteúdo neste navegador.");
  }
}

function App() {
  const { identity, isActive: connected } = useSpacetimeDB();
  const [profiles, profilesReady] = useTable(tables.current_profile);
  const [rooms, roomsReady] = useTable(tables.member_rooms);
  const [cards, cardsReady] = useTable(tables.card);
  const [cardDraws, cardDrawsReady] = useTable(tables.room_card_draws);
  const [players, playersReady] = useTable(tables.room_players);
  const [contributions, contributionsReady] = useTable(
    tables.visible_contributions,
  );
  const [contributionStatuses, contributionStatusesReady] = useTable(
    tables.room_contribution_status,
  );
  const [stageSessions, stageSessionsReady] = useTable(
    tables.room_stage_sessions,
  );
  const [stageAssignments, stageAssignmentsReady] = useTable(
    tables.room_stage_assignments,
  );
  const [stageOutcomes, stageOutcomesReady] = useTable(
    tables.room_stage_outcomes,
  );
  const [votes, votesReady] = useTable(tables.own_votes);
  const [voteStatuses, voteStatusesReady] = useTable(tables.room_vote_status);
  const [decisions, decisionsReady] = useTable(tables.room_decisions);
  const [journeys, journeysReady] = useTable(tables.room_journeys);
  const [publishedResults, publishedResultsReady] = useTable(
    tables.publishedResult,
  );
  const [economies, economiesReady] = useTable(tables.room_economies);
  const [stageCosts, stageCostsReady] = useTable(tables.room_stage_costs);
  const [economyTransactions, economyTransactionsReady] = useTable(
    tables.room_economy_transactions,
  );
  const [projectPrototypes, projectPrototypesReady] = useTable(
    tables.project_prototypes,
  );
  const [prototypeArtifacts, prototypeArtifactsReady] = useTable(
    tables.prototype_artifacts,
  );
  const [prototypeDrawingStrokes, prototypeDrawingStrokesReady] = useTable(
    tables.prototype_drawing_strokes,
  );
  const [groupVotes, groupVotesReady] = useTable(tables.room_group_votes);
  const [pilotSimulations, pilotSimulationsReady] = useTable(
    tables.pilot_simulations,
  );
  const [marketingPlans, marketingPlansReady] = useTable(
    tables.marketing_plans,
  );
  const [salesResults, salesResultsReady] = useTable(tables.sales_results);

  const currentProfile = identity
    ? profiles.find((item) => sameIdentity(item.identity, identity))
    : undefined;
  const [editingProfile, setEditingProfile] = useState(false);

  const currentSession = useMemo(() => {
    if (!identity) return undefined;
    const sessions: Array<{
      status: string;
      joinedAt: number;
      value: { player: Player; room: Room };
    }> = [];
    for (const player of players) {
      if (!player.active || !sameIdentity(player.identity, identity)) continue;
      const memberRoom = rooms.find((item) => item.id === player.roomId);
      if (!memberRoom) continue;
      sessions.push({
        status: memberRoom.status,
        joinedAt: player.joinedAt.toDate().getTime(),
        value: { player, room: memberRoom },
      });
    }
    return latestOpenSession(sessions)?.value;
  }, [identity, players, rooms]);
  const currentPlayer = currentSession?.player;
  const currentRoom = currentSession?.room;
  const currentRoomCode = currentRoom?.code;
  const publicResultToken = publicResultTokenFromUrl(window.location.href);
  const publicResult = publicResultToken
    ? publishedResults.find((item) => item.token === publicResultToken)
    : undefined;

  useEffect(() => {
    if (!currentRoomCode) return;
    window.history.replaceState(
      null,
      "",
      buildRoomInviteUrl(currentRoomCode, window.location.href),
    );
  }, [currentRoomCode]);

  if (!connected || !identity) {
    return <LoadingScreen label="Conectando sua identidade criativa…" />;
  }

  if (publicResultToken) {
    if (!publishedResultsReady) {
      return <LoadingScreen label="Abrindo o resultado compartilhado…" />;
    }
    return <PublicJourneyResult result={publicResult} />;
  }

  if (
    !profilesReady ||
    !roomsReady ||
    !playersReady ||
    !contributionsReady ||
    !contributionStatusesReady ||
    !cardsReady ||
    !cardDrawsReady ||
    !stageSessionsReady ||
    !stageAssignmentsReady ||
    !stageOutcomesReady ||
    !votesReady ||
    !voteStatusesReady ||
    !decisionsReady ||
    !journeysReady ||
    !economiesReady ||
    !stageCostsReady ||
    !economyTransactionsReady ||
    !projectPrototypesReady ||
    !prototypeArtifactsReady ||
    !prototypeDrawingStrokesReady ||
    !groupVotesReady ||
    !pilotSimulationsReady ||
    !marketingPlansReady ||
    !salesResultsReady
  ) {
    return <LoadingScreen label="Sincronizando a jornada…" />;
  }

  if (
    editingProfile ||
    !currentProfile?.displayName ||
    !currentProfile.avatarId
  ) {
    const hasSavedProfile = Boolean(
      currentProfile?.displayName && currentProfile.avatarId,
    );
    return (
      <ProfileSetup
        initialDisplayName={currentProfile?.displayName ?? ""}
        initialAvatarId={currentProfile?.avatarId ?? AVATARS[0]}
        onComplete={() => setEditingProfile(false)}
        onCancel={hasSavedProfile ? () => setEditingProfile(false) : undefined}
      />
    );
  }

  if (!currentRoom || !currentPlayer) {
    return (
      <RoomEntry
        displayName={currentProfile.displayName}
        avatarId={currentProfile.avatarId}
        onEditProfile={() => setEditingProfile(true)}
      />
    );
  }

  const roomPlayers = players.filter(
    (item) =>
      item.roomId === currentRoom.id &&
      (currentRoom.status === "FINISHED" || item.active),
  );
  const roomContributions = contributions.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomContributionStatuses = contributionStatuses.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomVoteStatuses = voteStatuses.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomStageAssignments = stageAssignments.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomStageOutcomes = stageOutcomes.filter(
    (item) => item.roomId === currentRoom.id,
  );

  if (currentRoom.status === "LOBBY") {
    return (
      <Lobby
        room={currentRoom}
        players={roomPlayers}
        currentPlayer={currentPlayer}
      />
    );
  }

  const roomEconomy = economies.find((item) => item.roomId === currentRoom.id);
  const roomStageCosts = stageCosts.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomTransactions = economyTransactions.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomPrototype = projectPrototypes.find(
    (item) => item.roomId === currentRoom.id,
  );
  const roomPrototypeArtifacts = prototypeArtifacts.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomPrototypeDrawingStrokes = prototypeDrawingStrokes.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomGroupVotes = groupVotes.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomPilot = pilotSimulations.find(
    (item) => item.roomId === currentRoom.id,
  );
  const roomMarketing = marketingPlans.find(
    (item) => item.roomId === currentRoom.id,
  );
  const roomSales = salesResults.find((item) => item.roomId === currentRoom.id);
  const roomPublishedResult = publishedResults.find(
    (item) => item.roomId === currentRoom.id,
  );

  if (!roomEconomy) {
    return <LoadingScreen label="Preparando a economia da jornada…" />;
  }

  return (
    <GameBoard
      room={currentRoom}
      players={roomPlayers}
      contributions={roomContributions}
      contributionStatuses={roomContributionStatuses}
      cards={cards}
      cardDraws={cardDraws}
      stageSessions={stageSessions}
      stageAssignments={roomStageAssignments}
      stageOutcomes={roomStageOutcomes}
      votes={votes}
      voteStatuses={roomVoteStatuses}
      decisions={decisions}
      journeys={journeys}
      currentPlayer={currentPlayer}
      economy={roomEconomy}
      stageCosts={roomStageCosts}
      economyTransactions={roomTransactions}
      projectPrototype={roomPrototype}
      prototypeArtifacts={roomPrototypeArtifacts}
      prototypeDrawingStrokes={roomPrototypeDrawingStrokes}
      groupVotes={roomGroupVotes}
      pilotSimulation={roomPilot}
      marketingPlan={roomMarketing}
      salesResult={roomSales}
      publishedResult={roomPublishedResult}
    />
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="loading-screen" role="status" aria-live="polite">
      <BrandLogo />
      <p>{label}</p>
    </main>
  );
}

function LeaveRoomButton({
  room,
  currentPlayer,
}: {
  room: Room;
  currentPlayer: Player;
}) {
  const leaveRoom = useReducer(reducers.leaveRoom);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  async function handleLeave() {
    const hostNote = sameIdentity(currentPlayer.identity, room.ownerIdentity)
      ? " O controle passará para a pessoa que entrou primeiro."
      : "";
    if (
      !window.confirm(
        `Sair desta jornada? Você voltará ao início e seu histórico será preservado.${hostNote}`,
      )
    ) {
      return;
    }

    setLeaving(true);
    setError("");
    const previousUrl = window.location.href;
    window.history.replaceState(null, "", clearRoomInviteUrl(previousUrl));
    try {
      await leaveRoom({ roomId: room.id });
    } catch (caught) {
      window.history.replaceState(null, "", previousUrl);
      setError(errorMessage(caught));
      setLeaving(false);
    }
  }

  return (
    <div className="leave-room-control">
      <button
        className="leave-room-button"
        disabled={leaving}
        onClick={() => void handleLeave()}
      >
        {leaving ? "Saindo…" : "Sair da jornada"}
      </button>
      {error && (
        <span className="leave-room-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function ProfileSetup({
  initialDisplayName,
  initialAvatarId,
  onComplete,
  onCancel,
}: {
  initialDisplayName: string;
  initialAvatarId: string;
  onComplete: () => void;
  onCancel?: () => void;
}) {
  const setProfile = useReducer(reducers.setProfile);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarId, setAvatarId] = useState<string>(initialAvatarId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await setProfile({ displayName: displayName.trim(), avatarId });
      onComplete();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="centered-page">
      <section className="welcome-card">
        <BrandLogo />
        <h1>Quem entra nesta aventura?</h1>
        <p className="intro">
          Escolha como o grupo vai reconhecer você durante a jornada.
        </p>

        <form onSubmit={submit} className="stack-form">
          <label>
            Seu nome
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Como podemos chamar você?"
              minLength={2}
              maxLength={24}
              required
              autoFocus
            />
          </label>

          <fieldset>
            <legend>Seu avatar</legend>
            <div className="avatar-picker">
              {AVATARS.map((avatar) => (
                <label key={avatar} className="avatar-option">
                  <input
                    type="radio"
                    name="avatar"
                    value={avatar}
                    checked={avatarId === avatar}
                    onChange={() => setAvatarId(avatar)}
                    aria-label={AVATAR_LABELS[avatar]}
                  />
                  <span>{AVATAR_GLYPHS[avatar]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button"
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Salvando…" : "Continuar"}
          </button>
          {onCancel && (
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={onCancel}
            >
              Voltar
            </button>
          )}
        </form>
      </section>
    </main>
  );
}

function RoomEntry({
  displayName,
  avatarId,
  onEditProfile,
}: {
  displayName: string;
  avatarId: string;
  onEditProfile: () => void;
}) {
  const createRoom = useReducer(reducers.createRoom);
  const joinRoom = useReducer(reducers.joinRoom);
  const invitedCode = roomCodeFromUrl(window.location.href);
  const [joinCode, setJoinCode] = useState(invitedCode ?? "");
  const hasInvite = Boolean(invitedCode);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<"create" | "join">();

  async function run(name: "create" | "join", action: () => Promise<unknown>) {
    setPendingAction(name);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPendingAction(undefined);
    }
  }

  return (
    <main className="centered-page">
      <section className="welcome-card room-entry-card">
        <div className="room-entry-header">
          <BrandLogo compact />
          <button
            type="button"
            className="profile-trigger"
            onClick={onEditProfile}
          >
            <span className="profile-trigger-avatar" aria-hidden="true">
              {AVATAR_GLYPHS[avatarId]}
            </span>
            <span className="profile-trigger-copy">
              <small>Entrando como</small>
              <strong>{displayName}</strong>
            </span>
            <span className="profile-trigger-edit">Editar</span>
          </button>
        </div>
        <p className="kicker">Sua próxima aventura</p>
        <h1>Vamos mudar o mundo?</h1>
        <p className="intro">
          {hasInvite
            ? "Seu grupo já deixou um lugar reservado para você."
            : "Crie uma nova sala ou entre pelo código compartilhado pelo grupo."}
        </p>
        {hasInvite && (
          <div className="invite-banner" role="status">
            <span aria-hidden="true">✦</span>
            <p>
              Convite encontrado para a sala <strong>{invitedCode}</strong>
            </p>
          </div>
        )}

        <div className="room-actions">
          <button
            type="button"
            className={hasInvite ? "secondary-button" : "primary-button"}
            disabled={Boolean(pendingAction)}
            aria-busy={pendingAction === "create"}
            onClick={() =>
              run("create", () =>
                createRoomWithAvailableCode((code) => createRoom({ code })),
              )
            }
          >
            {pendingAction === "create"
              ? "Criando sala…"
              : hasInvite
                ? "Criar outra sala"
                : "Criar uma sala"}
          </button>

          <div className="divider">
            <span>ou</span>
          </div>

          <form
            className="join-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run("join", () => joinRoom({ code: joinCode.trim() }));
            }}
          >
            <label>
              Código da sala
              <input
                value={joinCode}
                onChange={(event) => {
                  const raw = event.target.value;
                  const extracted = extractRoomCode(raw);
                  if (extracted) {
                    setJoinCode(extracted);
                  } else {
                    const isUrlLike =
                      /^(https?:\/\/|www\.|\/|\?|[a-z0-9-]+\.[a-z]{2,})/i.test(
                        raw.trim(),
                      ) ||
                      raw.includes("://") ||
                      raw.includes("?");
                    setJoinCode(
                      isUrlLike
                        ? raw.toLowerCase()
                        : raw.toLowerCase().slice(0, 24),
                    );
                  }
                }}
                onPaste={(event) => {
                  const pastedText = event.clipboardData.getData("text");
                  const extracted = extractRoomCode(pastedText);
                  if (extracted) {
                    event.preventDefault();
                    setJoinCode(extracted);
                  }
                }}
                placeholder="ideia-abc123"
                minLength={4}
                pattern="[a-z0-9-]{4,24}"
                title="Use de 4 a 24 letras, números ou hífens (ou cole o link da sala)"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus={hasInvite}
              />
            </label>
            <button
              className={hasInvite ? "primary-button" : "secondary-button"}
              disabled={Boolean(pendingAction)}
              aria-busy={pendingAction === "join"}
            >
              {pendingAction === "join"
                ? "Entrando…"
                : hasInvite
                  ? "Entrar nesta sala"
                  : "Entrar na sala"}
            </button>
          </form>
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <a
            href="/admin"
            className="admin-link-btn"
            style={{
              fontSize: "0.85rem",
              opacity: 0.85,
              color: "#a78bfa",
              textDecoration: "underline",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            ⚙️ Painel de Administração de Cartas
          </a>
        </div>
      </section>
    </main>
  );
}
function Lobby({
  room,
  players,
  currentPlayer,
}: {
  room: Room;
  players: Player[];
  currentPlayer: Player;
}) {
  const setReady = useReducer(reducers.setReady);
  const startGame = useReducer(reducers.startGame);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const isHost = sameIdentity(currentPlayer.identity, room.ownerIdentity);
  const enoughPlayers = players.length >= MIN_PLAYERS;
  const allReady = enoughPlayers && players.every((item) => item.ready);
  const readyCount = players.filter((item) => item.ready).length;
  const waitingForPlayers = Math.max(0, MIN_PLAYERS - players.length);
  const waitingForReady = players.filter((item) => !item.ready);

  async function invoke(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function shareInvite() {
    setError("");
    const url = buildRoomInviteUrl(room.code, window.location.href);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Convite para o Idea Hero",
          text: `Entre na sala ${room.code} e crie uma ideia com a gente.`,
          url,
        });
      } else {
        await copyText(url);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }
      setError(errorMessage(caught));
    }
  }

  return (
    <main className="app-shell lobby-page">
      <header className="topbar">
        <BrandLogo compact />
        <div className="topbar-actions">
          <span className="connection-status">● Sincronizado</span>
          <LeaveRoomButton room={room} currentPlayer={currentPlayer} />
        </div>
      </header>

      <section className="lobby-hero">
        <p className="kicker">Sala de preparação</p>
        <h1>
          {enoughPlayers
            ? "O grupo está se formando"
            : "Esperando mais um herói"}
        </h1>
        <p>
          {enoughPlayers
            ? "Quando todos estiverem prontos, o anfitrião começa a jornada."
            : `Convide pelo menos mais ${waitingForPlayers} ${
                waitingForPlayers === 1 ? "pessoa" : "pessoas"
              } para começar.`}
        </p>

        <button className="room-code" onClick={() => void shareInvite()}>
          <small className="invite-action">Toque para enviar o convite</small>
          <span>{room.code}</span>
          <small>
            {copied
              ? "✓ Convite compartilhado ou copiado"
              : "Compartilhar ou copiar link"}
          </small>
        </button>
        <small className="invite-help">
          O link abre diretamente esta sala e expira quando a jornada termina.
        </small>
      </section>

      <section className="players-panel" aria-labelledby="players-title">
        <div className="section-heading">
          <div>
            <p className="kicker">Mínimo 2 · máximo 6</p>
            <h2 id="players-title">Heróis na sala</h2>
          </div>
          <span>
            {readyCount}/{players.length} prontos
          </span>
        </div>

        <div
          className={`lobby-status ${allReady ? "is-ready" : ""}`}
          role="status"
        >
          <strong>
            {!enoughPlayers
              ? "Aguardando participantes"
              : allReady
                ? "Tudo pronto para começar"
                : "Aguardando confirmações"}
          </strong>
          <span>
            {!enoughPlayers
              ? `A jornada é colaborativa e começa com ${MIN_PLAYERS} pessoas.`
              : allReady
                ? "O anfitrião já pode abrir a primeira etapa."
                : `${waitingForReady.map((item) => item.displayName).join(", ")} ${
                    waitingForReady.length === 1
                      ? "ainda está se preparando"
                      : "ainda estão se preparando"
                  }.`}
          </span>
        </div>

        <div className="players-grid">
          {players.map((item) => (
            <article className="player-card" key={item.id.toString()}>
              <span className="player-avatar" aria-hidden="true">
                {AVATAR_GLYPHS[item.avatarId] ?? "✦"}
              </span>
              <div>
                <strong>{item.displayName}</strong>
                <small>
                  {sameIdentity(item.identity, room.ownerIdentity)
                    ? "Anfitrião"
                    : "Participante"}
                </small>
              </div>
              <span className={`ready-chip ${item.ready ? "is-ready" : ""}`}>
                {item.ready ? "Pronto" : "Preparando"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer className="lobby-footer">
        <p className="lobby-role-help">
          {isHost
            ? currentPlayer.ready
              ? "Você é o anfitrião. Quando todo o grupo estiver pronto, inicie a jornada."
              : "Você é o anfitrião: confirme que está pronto para liberar o início da jornada."
            : "Marque-se como pronto quando puder começar. O anfitrião controla o início e as transições."}
        </p>
        {!isHost ? (
          <button
            className={
              currentPlayer.ready ? "secondary-button" : "primary-button"
            }
            onClick={() =>
              void invoke(() =>
                setReady({ roomId: room.id, ready: !currentPlayer.ready }),
              )
            }
          >
            {currentPlayer.ready ? "Ainda não estou pronto" : "Estou pronto"}
          </button>
        ) : currentPlayer.ready ? (
          <span className="ready-chip is-ready">✓ Você está pronto</span>
        ) : (
          <button
            className="primary-button"
            onClick={() =>
              void invoke(() => setReady({ roomId: room.id, ready: true }))
            }
          >
            Estou pronto
          </button>
        )}
        {isHost && (
          <button
            className="primary-button"
            disabled={!allReady}
            onClick={() => void invoke(() => startGame({ roomId: room.id }))}
          >
            {!enoughPlayers
              ? `Falta ${waitingForPlayers} participante`
              : allReady
                ? "Começar a jornada"
                : "Esperando todos ficarem prontos"}
          </button>
        )}
        {error && <p className="error-message">{error}</p>}
      </footer>
    </main>
  );
}

function GameBoard({
  room,
  players,
  contributions,
  contributionStatuses,
  cards,
  cardDraws,
  stageSessions,
  stageAssignments,
  stageOutcomes,
  votes,
  voteStatuses,
  decisions,
  journeys,
  currentPlayer,
  economy,
  stageCosts,
  economyTransactions,
  projectPrototype,
  prototypeArtifacts,
  prototypeDrawingStrokes,
  groupVotes,
  pilotSimulation,
  marketingPlan,
  salesResult,
  publishedResult,
}: {
  room: Room;
  players: Player[];
  contributions: VisibleContribution[];
  contributionStatuses: ContributionStatus[];
  cards: readonly Card[];
  cardDraws: readonly CardDraw[];
  stageSessions: readonly StageSession[];
  stageAssignments: readonly StageAssignment[];
  stageOutcomes: readonly StageOutcome[];
  votes: readonly Vote[];
  voteStatuses: VoteStatus[];
  decisions: readonly Decision[];
  journeys: readonly Journey[];
  currentPlayer: Player;
  economy: RoomEconomy;
  stageCosts: readonly StageCost[];
  economyTransactions: readonly EconomyTransaction[];
  projectPrototype?: ProjectPrototype;
  prototypeArtifacts: readonly PrototypeArtifact[];
  prototypeDrawingStrokes: readonly PrototypeDrawingStroke[];
  groupVotes: readonly GroupVote[];
  pilotSimulation?: PilotSimulation;
  marketingPlan?: MarketingPlan;
  salesResult?: SalesResult;
  publishedResult?: PublishedResult;
}) {
  const submitContribution = useReducer(reducers.submitContribution);
  const advanceStage = useReducer(reducers.advanceStage);
  const openVoting = useReducer(reducers.openVoting);
  const castVote = useReducer(reducers.castVote);
  const resolveStage = useReducer(reducers.resolveStage);
  const endJourney = useReducer(reducers.endJourney);
  const stage = room.currentStage as BoardState;
  const content = STAGE_CONTENT[stage] ?? STAGE_CONTENT.SCENARIO;
  const guidance = STAGE_GUIDANCE[stage];
  const stageDraw = cardDraws.find(
    (item) => item.roomId === room.id && item.stage === stage && item.active,
  );
  const stageCard = stageDraw
    ? cards.find((item) => item.id === stageDraw.cardId)
    : undefined;
  const stageContributions = contributions.filter(
    (item) => item.stage === stage,
  );
  const stageContributionStatuses = contributionStatuses.filter(
    (item) => item.stage === stage,
  );
  const stageSession = stageSessions.find(
    (item) => item.roomId === room.id && item.stage === stage,
  );
  const phase = stageSession?.phase ?? "CONTRIBUTING";
  const usesUnion = stageSession?.resolution === "UNION";
  const currentAssignments = stageAssignments
    .filter((item) => item.stage === stage)
    .slice()
    .sort((left, right) => left.position - right.position);
  const ownAssignment = currentAssignments.find((item) =>
    sameIdentity(item.playerIdentity, currentPlayer.identity),
  );
  const stageOutcome = stageOutcomes.find((item) => item.stage === stage);
  const assignedPlaceholder =
    ownAssignment?.actionPlaceholder ?? guidance.placeholder;
  const collaborative = COLLABORATIVE_STAGES.has(stage);
  const stageVotes = votes.filter(
    (item) => item.roomId === room.id && item.stage === stage,
  );
  const stageVoteStatuses = voteStatuses.filter((item) => item.stage === stage);
  const stageDecision = decisions.find(
    (item) => item.roomId === room.id && item.stage === stage,
  );
  const ownContribution = stageContributions.find(
    (item) =>
      item.authorIdentity &&
      sameIdentity(item.authorIdentity, currentPlayer.identity) &&
      item.actionKey === (ownAssignment?.actionKey ?? "MAIN"),
  );
  const ownVote = stageVotes.find((item) =>
    sameIdentity(item.voterIdentity, currentPlayer.identity),
  );
  const selectedContribution = stageDecision
    ? stageContributions.find(
        (item) => item.id === stageDecision.selectedContributionId,
      )
    : undefined;
  const onlinePlayers = players.filter((item) => item.online);
  const presencePlayers = onlinePlayers.some((player) =>
    sameIdentity(player.identity, currentPlayer.identity),
  )
    ? onlinePlayers
    : [currentPlayer, ...onlinePlayers];
  const participatingPlayers =
    currentAssignments.length === 0
      ? onlinePlayers
      : onlinePlayers.filter((player) =>
          currentAssignments.some((assignment) =>
            sameIdentity(assignment.playerIdentity, player.identity),
          ),
        );
  const contributingPlayers = participatingPlayers.filter((player) =>
    stageContributionStatuses.some((item) =>
      sameIdentity(item.authorIdentity, player.identity),
    ),
  );
  const activeStageVotes = stageVoteStatuses.filter((vote) =>
    participatingPlayers.some((player) =>
      sameIdentity(vote.voterIdentity, player.identity),
    ),
  );
  const groupReady =
    participatingPlayers.length > 0 &&
    contributingPlayers.length === participatingPlayers.length;
  const allVoted =
    participatingPlayers.length > 0 &&
    participatingPlayers.every((player) =>
      activeStageVotes.some((item) =>
        sameIdentity(item.voterIdentity, player.identity),
      ),
    );

  const [draft, setDraft] = useState(ownContribution?.content ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const isHost = sameIdentity(currentPlayer.identity, room.ownerIdentity);
  const [productType, setProductType] = useState<ProductType>("digital");
  const [copilotSuggestion, setCopilotSuggestion] = useState("");
  const [voiceSuggestion, setVoiceSuggestion] = useState("");
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [room.stageIndex]);

  useEffect(() => {
    setRoundStartedAt(stageSession?.updatedAt.toDate().getTime() ?? Date.now());
    setClock(Date.now());
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [stage, phase, stageSession?.updatedAt]);

  useEffect(() => {
    if (stage === "PROTOTYPE") {
      setProductType("digital");
      setCopilotSuggestion("");
    }
  }, [stage]);
  const [suggesting, setSuggesting] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [roundStartedAt, setRoundStartedAt] = useState(() => Date.now());
  const roundSeconds = roundDuration(stage, phase, collaborative);
  const secondsLeft = Math.max(
    0,
    roundSeconds - Math.floor((clock - roundStartedAt) / 1000),
  );
  const timeExpired = secondsLeft === 0;

  useEffect(() => {
    setDraft(ownContribution?.content ?? "");
    setVoiceSuggestion("");
  }, [ownContribution?.content, stage]);

  function applyContributionVoice({ transcript, summary }: VoiceInputResult) {
    setError("");
    const nextDraft = [draft.trim(), transcript].filter(Boolean).join(" ");
    if (nextDraft.length <= 280) {
      setDraft(nextDraft);
    } else {
      setError(
        "A transcricao completa passou do limite. Use a versao curta ou edite o texto.",
      );
    }
    setVoiceSuggestion(summary);
  }

  function requestPrototypeSuggestion() {
    setSuggesting(true);
    window.setTimeout(() => {
      setCopilotSuggestion(prototypeSuggestion(productType, draft));
      setSuggesting(false);
    }, 450);
  }
  async function saveContribution(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await submitContribution({ roomId: room.id, content: draft });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function runStageAction(action: () => Promise<unknown>) {
    setActionPending(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setActionPending(false);
    }
  }
  function endJourneyEarly() {
    const confirmed = window.confirm(
      "Encerrar agora? A jornada parcial será salva e o convite será liberado.",
    );
    if (!confirmed) return;
    void runStageAction(() => endJourney({ roomId: room.id }));
  }

  if (room.status === "FINISHED") {
    return (
      <JourneyResult
        room={room}
        players={players}
        contributions={contributions}
        cards={cards}
        cardDraws={cardDraws}
        decisions={decisions}
        stageOutcomes={stageOutcomes}
        journey={journeys.find((item) => item.roomId === room.id)}
        currentPlayer={currentPlayer}
        economy={economy}
        transactions={economyTransactions}
        pilotSimulation={pilotSimulation}
        salesResult={salesResult}
        publishedResult={publishedResult}
      />
    );
  }

  if (room.stageIndex >= 4) {
    return (
      <RunwayFinalStage
        room={room}
        players={players}
        contributions={contributions}
        decisions={decisions}
        stageOutcomes={stageOutcomes}
        currentPlayer={currentPlayer}
        card={stageCard}
        economy={economy}
        stageCosts={stageCosts}
        transactions={economyTransactions}
        prototype={projectPrototype}
        prototypeArtifacts={prototypeArtifacts}
        prototypeDrawingStrokes={prototypeDrawingStrokes}
        groupVotes={groupVotes}
        pilot={pilotSimulation}
        marketing={marketingPlan}
        sales={salesResult}
        leaveControl={
          <LeaveRoomButton room={room} currentPlayer={currentPlayer} />
        }
      />
    );
  }

  return (
    <main className="game-shell">
      <EconomyEventOverlay
        roomId={room.id}
        transactions={economyTransactions}
      />
      <aside
        className={`persistent-round-timer ${timeExpired ? "is-expired" : ""}`}
        aria-label="Tempo da rodada"
      >
        <span>Tempo</span>
        <strong aria-live="polite">{formatSeconds(secondsLeft)}</strong>
      </aside>
      <details className="room-sheet" name="journey-controls">
        <summary aria-label="Opções da sala">•••</summary>
        <div className="room-sheet-panel">
          <header className="room-sheet-heading">
            <span>Sala {room.code}</span>
            <small>Opções e informações</small>
          </header>
          <details className="room-sheet-section">
            <summary>
              <span aria-hidden="true">♧</span>
              <span>
                Pessoas
                <small>{presencePlayers.length} online</small>
              </span>
            </summary>
            <div className="room-sheet-players">
              {players.map((player) => (
                <div
                  className={`player-list-row ${player.online ? "" : "is-offline"}`}
                  key={player.id.toString()}
                >
                  <span aria-hidden="true">
                    {AVATAR_GLYPHS[player.avatarId] ?? "✦"}
                  </span>
                  <strong>{player.displayName}</strong>
                  <small>{player.online ? "online" : "ausente"}</small>
                </div>
              ))}
            </div>
          </details>
          <details className="room-sheet-section">
            <summary>
              <span aria-hidden="true">◌</span>
              <span>
                Caixa
                <small>{formatCredits(economy.balance)} créditos</small>
              </span>
            </summary>
            <div className="room-sheet-wallet">
              <RunwayWallet
                economy={economy}
                stageCost={stageCosts.find((item) => item.stage === stage)}
                transactions={economyTransactions}
              />
            </div>
          </details>
          <LeaveRoomButton room={room} currentPlayer={currentPlayer} />
          {isHost && (
            <button
              type="button"
              className="room-sheet-end-button"
              disabled={actionPending}
              onClick={endJourneyEarly}
            >
              Encerrar jornada para todos
            </button>
          )}
        </div>
      </details>

      <section className="stage-layout">
        <article className="stage-intro">
          <p className="kicker">
            Etapa {room.stageIndex + 1} de 8 · {content.eyebrow}
          </p>
          <details className="stage-details">
            <summary className="kicker">
              Etapa {room.stageIndex + 1} de 8 · {content.eyebrow}
            </summary>
            <div className="stage-details-panel">
              <nav className="stage-progress" aria-label="Progresso da jornada">
                {BOARD_STATES.map((item, index) => (
                  <div
                    key={item}
                    className={`stage-step ${index === room.stageIndex ? "is-current" : ""} ${index < room.stageIndex ? "is-complete" : ""}`}
                    aria-current={
                      index === room.stageIndex ? "step" : undefined
                    }
                  >
                    <span>{index < room.stageIndex ? "✓" : index + 1}</span>
                    <small>{STAGE_CONTENT[item].eyebrow}</small>
                  </div>
                ))}
              </nav>
              <JourneySummary
                room={room}
                contributions={contributions}
                players={players}
                decisions={decisions}
                outcomes={stageOutcomes}
              />
            </div>
          </details>
          <div
            className="stage-presence"
            aria-label={`Pessoas na sala: ${players.map((player) => player.displayName).join(", ")}`}
          >
            <span>Na sala</span>
            <div className="stage-presence-avatars" aria-hidden="true">
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
            <small>{presencePlayers.length} online</small>
          </div>
          <h1>{content.title}</h1>
          <p>{content.objective}</p>
          <InspirationCard
            card={stageCard}
            stageLabel={content.eyebrow}
            stage={stage}
          />
          <details className="card-options">
            <summary>Outras opções da carta</summary>
            <CardChangeButton
              room={room}
              draw={stageDraw}
              economy={economy}
              locked={stageContributions.length > 0 || phase !== "CONTRIBUTING"}
              players={players}
              currentPlayer={currentPlayer}
              groupVotes={groupVotes}
            />
          </details>
        </article>

        <article className="contribution-panel">
          {collaborative && (
            <div className="phase-ribbon" aria-label="Fase da decisão coletiva">
              {(usesUnion
                ? (["CONTRIBUTING", "REVIEW"] as const)
                : COLLABORATIVE_PHASES
              ).map((item, index, phases) => {
                const phaseIndex = phases.findIndex((value) => value === phase);
                const labels = usesUnion
                  ? ["Criar", "Unir"]
                  : ["Criar", "Escolher", "Revelar"];
                return (
                  <span
                    key={item}
                    className={`${item === phase ? "is-active" : ""} ${index < phaseIndex ? "is-complete" : ""}`}
                  >
                    {index < phaseIndex ? "✓" : index + 1} {labels[index]}
                  </span>
                );
              })}
            </div>
          )}
          {collaborative && (
            <div
              className={`phase-callout phase-${phase.toLowerCase()}`}
              role="status"
            >
              <strong>
                {phase === "CONTRIBUTING"
                  ? "Crie sem influência"
                  : phase === "VOTING"
                    ? "As ideias foram abertas"
                    : "A escolha agora faz parte da jornada"}
              </strong>
              <span>
                {phase === "CONTRIBUTING"
                  ? "Crie em particular. Veja apenas o progresso do grupo."
                  : phase === "VOTING"
                    ? "Escolha uma proposta sem ver a autoria."
                    : "Veja a escolha do grupo e avance quando estiverem prontos."}
              </span>
            </div>
          )}
          {collaborative &&
            isHost &&
            ((phase === "CONTRIBUTING" && groupReady && !usesUnion) ||
              (phase === "VOTING" && allVoted) ||
              phase === "REVIEW") && (
            <section
              className="host-stage-action is-host"
              aria-label="Próxima ação do anfitrião"
            >
              <div>
                <strong>
                  {phase === "CONTRIBUTING"
                    ? "Pronto para abrir a votação"
                    : phase === "VOTING"
                      ? "Pronto para revelar a decisão"
                      : "Pronto para avançar"}
                </strong>
              </div>
              {phase === "CONTRIBUTING" && (
                <button
                  className="primary-button"
                  disabled={actionPending}
                  onClick={() =>
                    void runStageAction(() => openVoting({ roomId: room.id }))
                  }
                >
                  Abrir votação
                </button>
              )}
              {phase === "VOTING" && (
                <button
                  className="primary-button"
                  disabled={actionPending}
                  onClick={() =>
                    void runStageAction(() => resolveStage({ roomId: room.id }))
                  }
                >
                  Revelar decisão coletiva
                </button>
              )}
              {phase === "REVIEW" && (
                <button
                  className="primary-button"
                  disabled={actionPending}
                  onClick={() =>
                    void runStageAction(() => advanceStage({ roomId: room.id }))
                  }
                >
                  {stage === "SALES"
                    ? "Concluir a jornada"
                    : `Confirmar e avançar para ${
                        STAGE_CONTENT[BOARD_STATES[room.stageIndex + 1]].eyebrow
                      }`}
                </button>
              )}
            </section>
          )}
          {stage === "PROTOTYPE" && phase === "CONTRIBUTING" && (
            <section
              className="prototype-direction"
              aria-labelledby="format-title"
            >
              <div className="prototype-direction-heading">
                <div>
                  <p className="kicker">Escolha em um toque</p>
                  <h2 id="format-title">Que tipo de ideia e essa?</h2>
                </div>
                <span>Sem formulario extra</span>
              </div>
              <div className="product-type-grid">
                {PRODUCT_TYPES.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={`product-type ${productType === option.id ? "is-selected" : ""}`}
                    aria-pressed={productType === option.id}
                    onClick={() => {
                      setProductType(option.id);
                      setCopilotSuggestion("");
                    }}
                  >
                    <b aria-hidden="true">{option.icon}</b>
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </button>
                ))}
              </div>
              <div className="copilot-row">
                <div>
                  <strong>Copiloto de ideia</strong>
                  <span>
                    Uma ideia curta para fazer, testar ou encenar agora.
                  </span>
                </div>
                <button
                  type="button"
                  className="copilot-button"
                  disabled={suggesting}
                  onClick={requestPrototypeSuggestion}
                >
                  {suggesting ? "Pensando..." : "Pedir sugestao"}
                </button>
              </div>
              {copilotSuggestion && (
                <p className="copilot-suggestion" aria-live="polite">
                  {copilotSuggestion}
                </p>
              )}
              <small className="copilot-note">
                Simulacao local do copiloto; pronta para virar uma chamada com
                AI SDK.
              </small>
            </section>
          )}
          {phase !== "CONTRIBUTING" && (
            <div className="section-heading">
              <div>
                <p className="kicker">
                  {phase === "VOTING"
                    ? "✦ Escolha individual"
                    : "★ Decisão coletiva"}
                </p>
                <h2>
                  {phase === "VOTING"
                    ? "Qual proposta deve guiar esta etapa?"
                    : "O grupo escolheu um caminho"}
                </h2>
              </div>
              <span>
                {phase === "VOTING"
                  ? `${activeStageVotes.length}/${participatingPlayers.length} votos`
                  : `${contributingPlayers.length}/${participatingPlayers.length} enviadas`}
              </span>
            </div>
          )}

          {phase === "CONTRIBUTING" && (
            <>
              <form onSubmit={saveContribution} className="contribution-form">
                <label className="sr-only" htmlFor="contribution">
                  Sua contribuição
                </label>
                <textarea
                  id="contribution"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={assignedPlaceholder}
                  minLength={2}
                  maxLength={280}
                  required
                />
                <VoiceInputButton
                  stage={stage}
                  target="contribution"
                  disabled={saving}
                  onResult={applyContributionVoice}
                />
                {voiceSuggestion && (
                  <div className="voice-suggestion">
                    <p>Versao curta sugerida: {voiceSuggestion}</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setDraft(voiceSuggestion);
                        setVoiceSuggestion("");
                      }}
                    >
                      Usar versao curta
                    </button>
                  </div>
                )}
                <div className="form-footer">
                  <div className="contribution-status" aria-live="polite">
                    <small>{draft.length}/280</small>
                    {ownContribution && <span>✓ Sua ideia está segura</span>}
                  </div>
                  <button className="primary-button" disabled={saving}>
                    {saving
                      ? "Salvando…"
                      : ownContribution
                        ? "Atualizar contribuição"
                        : "Compartilhar ideia"}
                  </button>
                </div>
              </form>
              {ownContribution && (
                <div className="submission-waiting" aria-live="polite">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>Ideia enviada</strong>
                  </div>
                </div>
              )}
            </>
          )}

          {collaborative && phase !== "REVIEW" && (
            <div
              className="participant-progress"
              aria-label="Progresso do grupo"
            >
              {participatingPlayers.map((player) => {
                const complete =
                  phase === "VOTING"
                    ? activeStageVotes.some((item) =>
                        sameIdentity(item.voterIdentity, player.identity),
                      )
                    : contributingPlayers.some((item) =>
                        sameIdentity(item.identity, player.identity),
                      );
                return (
                  <span
                    className={complete ? "is-complete" : ""}
                    key={player.id.toString()}
                  >
                    <b aria-hidden="true">
                      {AVATAR_GLYPHS[player.avatarId] ?? "✦"}
                    </b>
                    {player.displayName}
                    <small>
                      {complete
                        ? phase === "VOTING"
                          ? "votou"
                          : "enviou"
                        : phase === "VOTING"
                          ? "escolhendo"
                          : "criando"}
                    </small>
                  </span>
                );
              })}
            </div>
          )}

          {phase === "VOTING" && (
            <section className="vote-panel" aria-labelledby="vote-title">
              <p id="vote-title">
                Leia sem autoria para escolher pela força da ideia. Você pode
                mudar seu voto até a revelação.
              </p>
              <div className="vote-grid">
                {stageContributions.map((item, index) => {
                  const selected = ownVote?.contributionId === item.id;
                  return (
                    <button
                      type="button"
                      className={`vote-option ${selected ? "is-selected" : ""}`}
                      aria-pressed={selected}
                      disabled={actionPending}
                      key={item.id.toString()}
                      onClick={() =>
                        void runStageAction(() =>
                          castVote({
                            roomId: room.id,
                            contributionId: item.id,
                          }),
                        )
                      }
                    >
                      <span>Proposta {index + 1}</span>
                      <p>{item.content}</p>
                      <small>{selected ? "✓ Seu voto" : "Escolher"}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {phase === "REVIEW" && usesUnion && stageOutcome && (
            <section
              className="decision-reveal union-reveal"
              aria-live="polite"
            >
              <span className="decision-star" aria-hidden="true">
                ✦
              </span>
              <p className="kicker">Composicao do grupo</p>
              <div className="union-result">
                {stageOutcome.summary.split("\n").map((entry, index) => (
                  <p key={`${entry}-${index}`}>{entry}</p>
                ))}
              </div>
              <p>{stageOutcome.sourceCount} pecas reunidas na mesma ideia.</p>
            </section>
          )}

          {phase === "REVIEW" && stageDecision && (
            <section className="decision-reveal" aria-live="polite">
              <span className="decision-star" aria-hidden="true">
                ★
              </span>
              <p className="kicker">Síntese escolhida</p>
              <blockquote>“{stageDecision.summary}”</blockquote>
              <p>
                {stageDecision.totalVotes}{" "}
                {stageDecision.totalVotes === 1 ? "voto" : "votos"}
                {selectedContribution && (
                  <>
                    {" "}
                    · criada por{" "}
                    {selectedContribution.authorIdentity
                      ? (players.find((item) =>
                          sameIdentity(
                            item.identity,
                            selectedContribution.authorIdentity!,
                          ),
                        )?.displayName ??
                        shortIdentity(selectedContribution.authorIdentity))
                      : "autoria indisponível"}
                  </>
                )}
              </p>
            </section>
          )}

          {!collaborative && (
            <div className="shared-ideas" aria-live="polite">
              {stageContributions.length === 0 ? (
                <p className="empty-state">
                  Sua contribuição fica visível apenas para você até a votação.
                </p>
              ) : (
                stageContributions.map((item) => {
                  const authorIdentity = item.authorIdentity;
                  const author = authorIdentity
                    ? players.find((player) =>
                        sameIdentity(player.identity, authorIdentity),
                      )
                    : undefined;
                  return (
                    <blockquote key={item.id.toString()}>
                      <p>{item.content}</p>
                      <footer>
                        —{" "}
                        {author?.displayName ??
                          (item.authorIdentity
                            ? shortIdentity(item.authorIdentity)
                            : "Anônimo")}
                      </footer>
                    </blockquote>
                  );
                })
              )}
            </div>
          )}

          {!collaborative && <p className="next-up">{guidance.next}</p>}

          {!isHost && phase === "REVIEW" && (
            <p className="waiting-note">
              {phase === "REVIEW"
                ? "O anfitrião confirma a escolha e avança a jornada."
                : "O anfitrião abre a próxima ação quando o grupo estiver pronto."}
            </p>
          )}
          {!isHost && phase === "VOTING" && ownVote && (
            <p className="waiting-note">
              Seu voto está seguro. Esperando o grupo.
            </p>
          )}
          {error && <p className="error-message">{error}</p>}
        </article>
      </section>
    </main>
  );
}

function JourneyResult({
  room,
  players,
  contributions,
  cards,
  cardDraws,
  decisions,
  stageOutcomes,
  journey,
  currentPlayer,
  economy,
  transactions,
  pilotSimulation,
  salesResult,
  publishedResult,
}: {
  room: Room;
  players: Player[];
  contributions: VisibleContribution[];
  cards: readonly Card[];
  cardDraws: readonly CardDraw[];
  decisions: readonly Decision[];
  stageOutcomes: readonly StageOutcome[];
  journey?: Journey;
  currentPlayer: Player;
  economy: RoomEconomy;
  transactions: readonly EconomyTransaction[];
  pilotSimulation?: PilotSimulation;
  salesResult?: SalesResult;
  publishedResult?: PublishedResult;
}) {
  const updateJourney = useReducer(reducers.updateJourney);
  const leaveRoom = useReducer(reducers.leaveRoom);
  const publishJourney = useReducer(reducers.publishJourney);
  const solutionDecision = decisions.find(
    (item) => item.roomId === room.id && item.stage === "SOLUTION",
  );
  const solutionContribution = contributions.find(
    (item) => item.stage === "SOLUTION",
  );
  const fallbackTitle = `Ideia da sala ${room.code.toUpperCase()}`;
  const fallbackSummary =
    solutionDecision?.summary ??
    solutionContribution?.content ??
    "Uma ideia construída coletivamente para transformar o mundo.";
  const [title, setTitle] = useState(journey?.title ?? fallbackTitle);
  const [summary, setSummary] = useState(journey?.summary ?? fallbackSummary);
  const [busyAction, setBusyAction] = useState<string>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [voiceSuggestion, setVoiceSuggestion] = useState("");
  const [syncingManifest, setSyncingManifest] = useState(false);
  const isHost = sameIdentity(currentPlayer.identity, room.ownerIdentity);
  const journeyIdentity = {
    title,
    summary,
    publicId: journey?.publicId || `journey-${room.id.toString(36)}`,
  };
  const publishedUrl = publishedResult
    ? buildPublicResultUrl(publishedResult.token, window.location.href)
    : undefined;
  const manifestChanged =
    title !== (journey?.title ?? fallbackTitle) ||
    summary !== (journey?.summary ?? fallbackSummary) ||
    !journey;
  const pilotFeedback = PILOT_FEEDBACK.find(
    (feedback) => feedback.title === pilotSimulation?.feedbackTitle,
  );
  const pilotChoice = pilotFeedback?.options.find(
    (option) => option.key === pilotSimulation?.decision,
  );

  useEffect(() => {
    if (isHost) return;
    setTitle(journey?.title ?? fallbackTitle);
    setSummary(journey?.summary ?? fallbackSummary);
    setVoiceSuggestion("");
  }, [
    fallbackSummary,
    fallbackTitle,
    isHost,
    journey?.summary,
    journey?.title,
  ]);

  useEffect(() => {
    if (!isHost || !manifestChanged) return;
    const timer = window.setTimeout(() => {
      setSyncingManifest(true);
      setError("");
      void updateJourney({ roomId: room.id, title, summary })
        .catch((caught) => setError(errorMessage(caught)))
        .finally(() => setSyncingManifest(false));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [isHost, manifestChanged, room.id, summary, title, updateJourney]);

  function applyManifestVoice({
    transcript,
    summary: concise,
  }: VoiceInputResult) {
    setError("");
    const nextSummary = [summary.trim(), transcript].filter(Boolean).join(" ");
    if (nextSummary.length <= 400) {
      setSummary(nextSummary);
    } else {
      setError(
        "A transcricao completa passou do limite. Use a versao curta ou edite o texto.",
      );
    }
    setVoiceSuggestion(concise);
  }

  async function runFinalAction(
    action: string,
    task: () => Promise<unknown>,
    successMessage: string,
  ) {
    setBusyAction(action);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(successMessage);
      return true;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError")
        return false;
      setError(errorMessage(caught));
      return false;
    } finally {
      setBusyAction(undefined);
    }
  }

  async function saveManifest(event: FormEvent) {
    event.preventDefault();
    await runFinalAction(
      "save",
      () => updateJourney({ roomId: room.id, title, summary }),
      "Manifesto salvo para todo o grupo.",
    );
  }

  async function copyPublicResultLink() {
    if (!publishedUrl) return;
    await runFinalAction(
      "copy-link",
      () => copyText(publishedUrl),
      "Link publico copiado.",
    );
  }

  async function shareResult() {
    const token = publishedResult?.token ?? createPublicResultToken();
    const publicUrl = buildPublicResultUrl(token, window.location.href);

    await runFinalAction(
      "share",
      async () => {
        if (!publishedResult) {
          await publishJourney({ roomId: room.id, token });
        }

        const image = await createJourneyShareImage({
          title,
          summary,
          publicId: journeyIdentity.publicId,
          peopleCount: players.length,
          finalRunway: salesResult
            ? `${formatCredits(salesResult.finalRunway)} creditos`
            : undefined,
        });
        const shareData = {
          title: title.trim() || fallbackTitle,
          text: [
            buildJourneyShareText(journeyIdentity),
            `Veja o resultado: ${publicUrl}`,
          ].join("\n\n"),
          files: [image],
        };

        if (
          navigator.share &&
          (!navigator.canShare || navigator.canShare(shareData))
        ) {
          await navigator.share(shareData);
          return;
        }

        const url = URL.createObjectURL(image);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = image.name;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      },
      "Resultado compartilhado com card e link publico.",
    );
  }

  function downloadResult() {
    setError("");
    const exportableContributions = contributions.filter(
      (item): item is Contribution => item.authorIdentity !== undefined,
    );
    const markdown = buildJourneyMarkdown({
      journey: journeyIdentity,
      room,
      players,
      contributions: exportableContributions,
      decisions,
      stageOutcomes,
      cards,
      cardDraws,
    });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = journeyFilename(title);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setNotice("Arquivo Markdown baixado.");
  }

  async function startAnotherJourney() {
    if (
      !window.confirm(
        "Começar outra jornada? Baixe ou compartilhe este resultado antes de sair.",
      )
    ) {
      return;
    }
    const previousUrl = window.location.href;
    window.history.replaceState(null, "", clearRoomInviteUrl(previousUrl));
    const leftRoom = await runFinalAction(
      "leave",
      () => leaveRoom({ roomId: room.id }),
      "Tudo pronto para uma nova jornada.",
    );
    if (!leftRoom) {
      window.history.replaceState(null, "", previousUrl);
    }
  }

  return (
    <main className="result-page">
      <header className="result-topbar">
        <BrandLogo compact />
        <span className="room-pill">Jornada {journeyIdentity.publicId}</span>
      </header>
      <section className="result-hero">
        <span className="result-star" aria-hidden="true">
          ★
        </span>
        <p className="kicker">Jornada concluída</p>
        <h1>{title || fallbackTitle}</h1>
        <p className="result-manifest-copy">{summary || fallbackSummary}</p>
        <p className="result-people">
          {players.length}{" "}
          {players.length === 1 ? "pessoa percorreu" : "pessoas percorreram"} as
          oito etapas. Identificador permanente: {journeyIdentity.publicId}.
        </p>
      </section>

      {salesResult && (
        <section
          className="final-runway-summary"
          aria-labelledby="runway-result-title"
        >
          <div>
            <p className="kicker">Resultado da simulação</p>
            <h2 id="runway-result-title">
              Runway final: {formatCredits(salesResult.finalRunway)} créditos
            </h2>
            <p>
              Vendas simuladas de {formatCredits(salesResult.simulatedSales)}{" "}
              com multiplicador {(salesResult.multiplier / 100).toFixed(1)}×.
            </p>
          </div>
          <div className="final-runway-grid">
            <span>
              <small>Capital inicial</small>
              <b>{formatCredits(economy.initialBalance)}</b>
            </span>
            <span>
              <small>Financiamento</small>
              <b>
                +
                {formatCredits(
                  transactions
                    .filter((item) => item.reason === "FUNDING_OPPORTUNITY")
                    .reduce((total, item) => total + item.delta, 0),
                )}
              </b>
            </span>
            <span>
              <small>Aprendizado do Piloto</small>
              <b>{pilotChoice?.title ?? "Registrado"}</b>
            </span>
            <span>
              <small>Marketing</small>
              <b>−{formatCredits(salesResult.marketingInvestment)}</b>
            </span>
            <span className="is-highlight">
              <small>Vendas simuladas</small>
              <b>+{formatCredits(salesResult.simulatedSales)}</b>
            </span>
            <span className="is-highlight">
              <small>Saldo final</small>
              <b>{formatCredits(salesResult.finalRunway)}</b>
            </span>
          </div>
          <p className="simulation-disclaimer">
            Este valor é uma simulação educativa do jogo, não uma previsão
            financeira.
          </p>
        </section>
      )}

      <section className="manifest-editor" aria-labelledby="manifest-title">
        <div className="manifest-heading">
          <div>
            <p className="kicker">Manifesto final</p>
            <h2 id="manifest-title">Dê um nome ao que vocês criaram</h2>
          </div>
          <span>
            {isHost ? "Você edita para o grupo" : "Editado pelo anfitrião"}
          </span>
        </div>
        <form onSubmit={saveManifest}>
          <label htmlFor="journey-title">
            Nome do projeto
            <input
              id="journey-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              disabled={!isHost || !!busyAction}
            />
          </label>
          <label htmlFor="journey-summary">
            Manifesto em uma frase
            <textarea
              id="journey-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={400}
              disabled={!isHost || !!busyAction}
            />
          </label>
          {isHost && (
            <div className="manifest-voice-control">
              <p>
                <strong>Prefere falar?</strong> O ditado adiciona sua voz ao
                manifesto; revise e salve quando terminar.
              </p>
              <VoiceInputButton
                stage="JOURNEY"
                target="journey-summary"
                disabled={!!busyAction}
                idleLabel="Ditar manifesto"
                onResult={applyManifestVoice}
              />
            </div>
          )}
          {isHost && voiceSuggestion && (
            <div className="voice-suggestion">
              <p>Versao curta sugerida: {voiceSuggestion}</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSummary(voiceSuggestion);
                  setVoiceSuggestion("");
                }}
              >
                Usar versao curta
              </button>
            </div>
          )}
          <div className="manifest-footer">
            <small>
              {syncingManifest
                ? "Sincronizando com o grupo…"
                : `${summary.length}/400 caracteres`}
            </small>
            {isHost && (
              <button
                className="primary-button"
                disabled={!manifestChanged || !!busyAction}
              >
                {busyAction === "save" ? "Salvando…" : "Salvar manifesto"}
              </button>
            )}
          </div>
        </form>
      </section>

      <div className="document-heading">
        <div>
          <p className="kicker">A aventura completa</p>
          <h2>Como a ideia ganhou forma</h2>
        </div>
        <span>8 etapas · {players.length} heróis</span>
      </div>
      <section className="journey-document">
        {BOARD_STATES.map((stage) => {
          const entries = contributions.filter((item) => item.stage === stage);
          const draw = cardDraws.find(
            (item) =>
              item.roomId === room.id && item.stage === stage && item.active,
          );
          const stageCard = draw
            ? cards.find((item) => item.id === draw.cardId)
            : undefined;
          const stageDecision = decisions.find(
            (item) => item.roomId === room.id && item.stage === stage,
          );
          return (
            <article key={stage}>
              {stageCard && (
                <img
                  className="document-card-image"
                  src={stageCard.imagePath}
                  alt={stageCard.altText}
                />
              )}
              <div className="document-stage-number">
                {BOARD_STATES.indexOf(stage) + 1}
              </div>
              <div>
                <p className="kicker">{STAGE_CONTENT[stage].eyebrow}</p>
                <h2>{STAGE_CONTENT[stage].title}</h2>
                {stageDecision && (
                  <p className="document-decision">
                    ★ “{stageDecision.summary}”{" "}
                    <small>— escolha do grupo</small>
                  </p>
                )}
                {entries
                  .filter(
                    (entry) =>
                      entry.id !== stageDecision?.selectedContributionId,
                  )
                  .map((entry) => {
                    const authorIdentity = entry.authorIdentity;
                    const author = authorIdentity
                      ? players.find((item) =>
                          sameIdentity(item.identity, authorIdentity),
                        )
                      : undefined;
                    return (
                      <p key={entry.id.toString()}>
                        “{entry.content}”{" "}
                        <small>— {author?.displayName ?? "Anônimo"}</small>
                      </p>
                    );
                  })}
              </div>
            </article>
          );
        })}
      </section>

      <footer className="result-footer" aria-labelledby="take-result-title">
        <p className="kicker">A ideia não termina aqui</p>
        <h2 id="take-result-title">Leve a jornada com o grupo</h2>
        <p>
          Compartilhe o manifesto, baixe o registro completo ou imprima para
          continuar criando fora do jogo.
        </p>
        <div
          className="share-card-note"
          aria-label="Formato do compartilhamento"
        >
          <span aria-hidden="true">✦</span>
          <p>
            <strong>Card pronto para compartilhar</strong>
            <br />
            Imagem PNG vertical com o manifesto, a jornada e o resultado.
          </p>
        </div>
        <div className="result-actions">
          <button
            className="primary-button"
            disabled={!!busyAction}
            onClick={() => void shareResult()}
          >
            {busyAction === "share"
              ? "Preparando para compartilhar…"
              : "Compartilhar resultado"}
          </button>
          {isHost && !publishedResult && (
            <button
              className="secondary-button"
              disabled={!!busyAction}
              onClick={() => void publishResult()}
            >
              {busyAction === "publish"
                ? "Publicando…"
                : "Publicar e gerar link"}
            </button>
          )}
          {publishedUrl && (
            <button
              className="secondary-button"
              disabled={!!busyAction}
              onClick={() => void copyPublicResultLink()}
            >
              {busyAction === "copy-link" ? "Copiando…" : "Copiar link publico"}
            </button>
          )}
          <button
            className="secondary-button"
            disabled={!!busyAction}
            onClick={downloadResult}
          >
            Baixar jornada (.md)
          </button>
          <button
            className="secondary-button"
            disabled={!!busyAction}
            onClick={() => window.print()}
          >
            Imprimir jornada
          </button>
          <button
            className="secondary-button start-new-journey"
            disabled={!!busyAction}
            onClick={() => void startAnotherJourney()}
          >
            {busyAction === "leave" ? "Preparando…" : "Começar nova jornada"}
          </button>
        </div>
        <details className="result-more-actions">
          <summary>Mais opcoes</summary>
          <div>
            {publishedUrl && (
              <button
                className="secondary-button"
                disabled={!!busyAction}
                onClick={() => void copyPublicResultLink()}
              >
                {busyAction === "copy-link"
                  ? "Copiando..."
                  : "Copiar link publico"}
              </button>
            )}
            <button
              className="secondary-button"
              disabled={!!busyAction}
              onClick={downloadResult}
            >
              Baixar jornada (.md)
            </button>
            <button
              className="secondary-button"
              disabled={!!busyAction}
              onClick={() => window.print()}
            >
              Imprimir jornada
            </button>
          </div>
        </details>
        <div className="result-feedback" aria-live="polite">
          {notice && <p className="success-message">✓ {notice}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
      </footer>
    </main>
  );
}

function PublicJourneyResult({ result }: { result?: PublishedResult }) {
  if (!result) {
    return (
      <main className="public-result-page public-result-missing">
        <BrandLogo />
        <p className="kicker">Link indisponivel</p>
        <h1>Este resultado nao esta mais disponivel.</h1>
        <a className="primary-button" href="/">
          Conhecer o IDEA HERO
        </a>
      </main>
    );
  }

  const publishedOn = result.publishedAt.toDate().toLocaleDateString("pt-BR");
  return (
    <main className="public-result-page">
      <header className="result-topbar">
        <BrandLogo compact />
        <span className="room-pill">Resultado publicado</span>
      </header>
      <section className="public-result-card">
        <p className="kicker">Uma ideia criada em grupo</p>
        <h1>{result.title}</h1>
        <p className="public-result-summary">{result.summary}</p>
        <div className="public-result-stats">
          <span>
            <small>Criada por</small>
            <b>
              {result.participantCount}{" "}
              {result.participantCount === 1 ? "heroi" : "herois"}
            </b>
          </span>
          <span>
            <small>Jornada</small>
            <b>{result.publicId}</b>
          </span>
          {result.hasSalesResult && (
            <span className="is-highlight">
              <small>Runway final</small>
              <b>{formatCredits(result.finalRunway)}</b>
            </span>
          )}
        </div>
        <p className="public-result-date">Publicado em {publishedOn}.</p>
      </section>
      <footer className="public-result-footer">
        <p>
          IDEA HERO transforma conversas em ideias que podem ganhar o mundo.
        </p>
        <a className="secondary-button" href="/">
          Criar uma jornada
        </a>
      </footer>
    </main>
  );
}

export default App;
