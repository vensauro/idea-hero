import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  JourneyFeedback,
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
  TestingOption,
  VisibleContribution,
  Vote,
  VoteStatus,
} from "./module_bindings/types";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { BrandLogo, InspirationCard, StageGuidanceDialog } from "./experience";
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
import {
  clearRecoverableRoom,
  recoverableRoomCode,
  saveRecoverableRoom,
} from "./room-recovery";
import { VoiceInputButton, type VoiceInputResult } from "./VoiceInputButton";
import { JourneySummary } from "./JourneySummary";
import {
  CardChangeButton,
  MarketingStage,
  PilotStage,
  PolishingStage,
  PrototypeStage,
  PrototypeShowcase,
  RunwayFinalStage,
  RunwayWallet,
  SalesStage,
  StageAudienceReaction,
  StageInsightResponse,
  TestingStage,
  TopbarMoneyChip,
  artifactSource,
} from "./runway-experience";
import { formatCredits } from "./runway-format";
import {
  buildInsightContext,
  serializeInsightContext,
} from "./ai/assemble-context";
import { PILOT_FEEDBACK } from "../spacetimedb/src/economy";

export const BOARD_STATES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "POLISHING",
  "PROTOTYPE",
  "TESTING",
  "CONQUERING",
  "FINAL",
] as const;

type BoardState = (typeof BOARD_STATES)[number];

export const COLLABORATIVE_STAGES = new Set<BoardState>([
  ...BOARD_STATES.slice(0, 5),
  "CONQUERING",
]);
export const STAGES_REQUIRING_TEAM_CONFIRMATION = new Set<BoardState>([
  "PROTOTYPE",
  "TESTING",
  "CONQUERING",
  "FINAL",
]);
export const COLLABORATIVE_PHASES = [
  "CONTRIBUTING",
  "VOTING",
  "REVIEW",
] as const;
const MIN_PLAYERS = 2;
const INTRO_VIDEO_SEEN_KEY = "idea-hero-intro-video-seen-v1";
const PRODUCT_TYPES = [
  {
    id: "physical",
    icon: "O",
    label: "Artefato",
    hint: "algo que se toca, veste ou carrega",
  },
  {
    id: "digital",
    icon: "~",
    label: "Portal",
    hint: "uma tela, mapa ou ferramenta mágica",
  },
  {
    id: "service",
    icon: "+",
    label: "Ritual",
    hint: "uma experiência feita em grupo",
  },
  {
    id: "process",
    icon: ">",
    label: "Rota",
    hint: "um novo caminho para seguir",
  },
  {
    id: "hybrid",
    icon: "*",
    label: "Mistura mágica",
    hint: "uma combinação dos formatos",
  },
] as const;

type ProductType = (typeof PRODUCT_TYPES)[number]["id"];

const CONTRIBUTION_LABELS: Record<BoardState, string> = {
  SCENARIO: "cenário",
  PROBLEM: "problema",
  INSIGHT: "insight",
  SOLUTION: "ideia",
  POLISHING: "exploração",
  PROTOTYPE: "artefato",
  TESTING: "escolha da provação",
  CONQUERING: "convite",
  FINAL: "reflexão final",
};

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
    objective: "O jogador da vez define e registra o cenário à luz da carta.",
    prompt: "Que mundo a carta convida vocês a imaginar?",
    icon: "◌",
  },
  PROBLEM: {
    title: "Vamos entender o problema",
    eyebrow: "Problema",
    objective:
      "Todos contam sua leitura; o jogador da vez sintetiza e registra o problema.",
    prompt: "Que problema aparece nas histórias do grupo?",
    icon: "△",
  },
  INSIGHT: {
    title: "Vamos encontrar insights",
    eyebrow: "Insights",
    objective:
      "Cada pessoa aponta caminhos, conexões e aberturas que podem levar a uma ideia; o grupo registra todos.",
    prompt: "Que caminho pode inspirar a próxima ideia do grupo?",
    icon: "✦",
  },
  SOLUTION: {
    title: "Vamos criar ideias",
    eyebrow: "Ideias",
    objective:
      "Cada pessoa registra uma ideia; o jogador da vez abre a votação em seguida.",
    prompt: "Que ideia responde ao problema usando os insights do grupo?",
    icon: "◇",
  },
  POLISHING: {
    title: "Vamos lapidar a ideia",
    eyebrow: "Lapidando",
    objective:
      "Uma nova carta inspira uma rodada livre de exploração da ideia votada.",
    prompt: "O que a nova carta faz vocês imaginarem sobre a ideia escolhida?",
    icon: "✧",
  },
  PROTOTYPE: {
    title: "Vamos prototipar",
    eyebrow: "Prototipando",
    objective:
      "Criem uma representação simples para mostrar como a ideia funciona.",
    prompt: "Qual é a menor versão que torna a ideia compreensível?",
    icon: "▱",
  },
  TESTING: {
    title: "Vamos testar",
    eyebrow: "Testando",
    objective:
      "Escolham entre cinco possibilidades aleatórias que usam os recursos do grupo para refinar o protótipo.",
    prompt: "Qual teste ajuda mais a refinar o protótipo?",
    icon: "↗",
  },
  CONQUERING: {
    title: "Vamos convidar o mundo",
    eyebrow: "Convidando",
    objective:
      "Cada pessoa propõe uma forma de convidar a galera a participar da ideia; o jogador da vez abre a votação.",
    prompt: "Como convidar a galera a aderir a esta ideia?",
    icon: "◎",
  },
  FINAL: {
    title: "Final da jornada",
    eyebrow: "Final",
    objective:
      "Um agente de IA cria o final a partir de toda a história construída pelo grupo.",
    prompt: "Que final esta jornada merece?",
    icon: "★",
  },
};

const STAGE_PLAN_RESOLUTIONS: Record<string, "FACILITATOR" | "UNION" | "VOTE"> =
  {
    SCENARIO: "FACILITATOR",
    PROBLEM: "FACILITATOR",
    INSIGHT: "UNION",
    SOLUTION: "VOTE",
    POLISHING: "UNION",
    CONQUERING: "VOTE",
  };

const GAME_FLOW_STEPS = [
  {
    title: "Cenário",
    description: "Imaginem o mundo em que a ideia vai existir.",
    instruction: "Conversem sobre pessoas, contexto e oportunidade.",
  },
  {
    title: "Problema",
    description: "Encontrem uma tensão que vale resolver.",
    instruction: "Juntem as leituras do grupo em um desafio claro.",
  },
  {
    title: "Insights",
    description: "Procurem novos jeitos de enxergar o desafio.",
    instruction:
      "Cada pessoa compartilha um caminho, uma conexão ou uma abertura para inspirar ideias.",
  },
  {
    title: "Ideias",
    description: "Transformem os insights em possíveis respostas.",
    instruction: "Registrem propostas e escolham uma para seguir.",
  },
  {
    title: "Lapidar",
    description: "Deem mais forma à ideia escolhida.",
    instruction: "Explorem como ela pode ficar mais útil e desejável.",
  },
  {
    title: "Protótipo",
    description: "Mostrem a ideia em uma versão simples.",
    instruction: "Criem algo que outra pessoa consiga entender.",
  },
  {
    title: "Teste",
    description: "Escolham como colocar o protótipo à prova.",
    instruction: "Usem o resultado para decidir o que melhorar.",
  },
  {
    title: "Convidar",
    description: "Planejem como convidar pessoas para a ideia.",
    instruction: "Criem e escolham uma forma de convidar pessoas a participar.",
  },
  {
    title: "Final",
    description: "Reúnam o que a jornada construiu.",
    instruction: "Vejam a história da ideia e definam o próximo passo.",
  },
] as const;

const GAME_FLOW_CHAPTERS = [
  {
    title: "1. Descobrir",
    description: "Entendam o desafio",
    steps: [0, 1, 2],
  },
  {
    title: "2. Criar",
    description: "Deem forma a uma resposta",
    steps: [3, 4, 5],
  },
  {
    title: "3. Lançar",
    description: "Testem e façam a ideia ganhar vida",
    steps: [6, 7, 8],
  },
] as const;

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

function shortIdentity(identity?: { toHexString?: () => string } | null) {
  if (!identity || typeof identity.toHexString !== "function") return "";
  return identity.toHexString().slice(0, 8);
}

function sameIdentity(
  left?: { toHexString?: () => string } | null,
  right?: { toHexString?: () => string } | null,
) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (
    typeof left.toHexString !== "function" ||
    typeof right.toHexString !== "function"
  ) {
    return false;
  }
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

function roundDuration() {
  return 300;
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
  const [testingOptions, testingOptionsReady] = useTable(
    tables.room_testing_options,
  );
  const [journeyFeedbacks, journeyFeedbacksReady] = useTable(
    tables.room_journey_feedbacks,
  );


  const currentProfile = identity
    ? profiles.find((item) => sameIdentity(item.identity, identity))
    : undefined;
  const [editingProfile, setEditingProfile] = useState(false);
  const resumeRoom = useReducer(reducers.joinRoom);
  const [resumingRoom, setResumingRoom] = useState(false);
  const attemptedRecovery = useRef<string>();

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
    saveRecoverableRoom(currentRoomCode);
    window.history.replaceState(
      null,
      "",
      buildRoomInviteUrl(currentRoomCode, window.location.href),
    );
  }, [currentRoomCode]);

  useEffect(() => {
    if (
      !profilesReady ||
      !roomsReady ||
      !playersReady ||
      !currentProfile?.displayName ||
      !currentProfile.avatarId ||
      currentRoom
    ) {
      return;
    }

    const code = recoverableRoomCode();
    if (!code || attemptedRecovery.current === code) return;

    attemptedRecovery.current = code;
    setResumingRoom(true);
    void resumeRoom({ code })
      .catch(() => clearRecoverableRoom())
      .finally(() => setResumingRoom(false));
  }, [
    currentProfile?.avatarId,
    currentProfile?.displayName,
    currentRoom,
    playersReady,
    profilesReady,
    resumeRoom,
    roomsReady,
  ]);

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
    !salesResultsReady ||
    !journeyFeedbacksReady
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
    if (resumingRoom) {
      return <LoadingScreen label="Retomando sua sala…" />;
    }
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
  const roomTestingOptions = testingOptions.filter(
    (item) => item.roomId === currentRoom.id,
  );
  const roomPublishedResult = publishedResults.find(
    (item) => item.roomId === currentRoom.id,
  );
  const roomJourneyFeedbacks = journeyFeedbacks.filter(
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
      testingOptions={roomTestingOptions}
      pilotSimulation={roomPilot}
      marketingPlan={roomMarketing}
      salesResult={roomSales}
      publishedResult={roomPublishedResult}
      journeyFeedbacks={roomJourneyFeedbacks}
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
    clearRecoverableRoom();
    window.history.replaceState(null, "", clearRoomInviteUrl(previousUrl));
    try {
      await leaveRoom({ roomId: room.id });
    } catch (caught) {
      saveRecoverableRoom(room.code);
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
  const [showIntroVideo, setShowIntroVideo] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(INTRO_VIDEO_SEEN_KEY) !== "true";
  });

  function markIntroVideoSeen() {
    window.localStorage.setItem(INTRO_VIDEO_SEEN_KEY, "true");
  }

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
        <button
          type="button"
          className="intro-video-trigger"
          onClick={() => setShowIntroVideo(true)}
        >
          Ver como funciona
        </button>
      </section>
      {showIntroVideo && (
        <IntroVideoDialog
          onClose={() => setShowIntroVideo(false)}
          onWatched={markIntroVideoSeen}
        />
      )}
    </main>
  );
}

function IntroVideoDialog({
  onClose,
  onWatched,
}: {
  onClose: () => void;
  onWatched: () => void;
}) {
  return (
    <div
      className="intro-video-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="intro-video-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-video-title"
      >
        <button
          type="button"
          className="intro-video-close"
          onClick={onClose}
          aria-label="Fechar vídeo de introdução"
        >
          ×
        </button>
        <p className="kicker">Antes de começar</p>
        <h2 id="intro-video-title">Conheça a aventura Idea Hero</h2>
        <p>
          Em pouco mais de um minuto, veja como as cartas conduzem o grupo até
          uma ideia compartilhada.
        </p>
        <video
          className="intro-video-player"
          src="/video/idea-hero-intro.mp4"
          controls
          playsInline
          preload="metadata"
          onEnded={onWatched}
        >
          Seu navegador não conseguiu carregar o vídeo de introdução.
        </video>
        <button type="button" className="primary-button" onClick={onClose}>
          Jogar
        </button>
      </section>
    </div>
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
  const [selectedFlowStep, setSelectedFlowStep] = useState(0);
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
    saveRecoverableRoom(room.code);
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

  const pizzaSlice = (index: number) => {
    const angle = 360 / GAME_FLOW_STEPS.length;
    const start = ((index * angle - 90) * Math.PI) / 180;
    const end = (((index + 1) * angle - 90) * Math.PI) / 180;
    const point = (r: number, radians: number) => [
      50 + r * Math.cos(radians),
      50 + r * Math.sin(radians),
    ];
    const [x1, y1] = point(48, start);
    const [x2, y2] = point(48, end);
    const [labelX, labelY] = point(33, start + (end - start) / 2);
    return {
      path: `M 50 50 L ${x1} ${y1} A 48 48 0 0 1 ${x2} ${y2} Z`,
      labelX,
      labelY,
    };
  };

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
        <h1>
          {enoughPlayers
            ? "O grupo está se formando"
            : "Esperando mais um herói"}
        </h1>
        {!enoughPlayers && (
          <p className="lobby-hero-sub">
            {`Convide pelo menos mais ${waitingForPlayers} ${
              waitingForPlayers === 1 ? "pessoa" : "pessoas"
            } para começar.`}
          </p>
        )}

        <button
          className="room-code-badge"
          onClick={() => void shareInvite()}
          aria-label="Compartilhar convite da sala"
        >
          <span className="code-text">{room.code}</span>
          <span className="copy-action-text">
            {copied ? "✓ Convite copiado!" : "Compartilhar convite"}
          </span>
        </button>
      </section>

      <section className="game-flow-panel" aria-label="Fluxo do jogo">
        <div className="game-flow-copy">
          <p className="kicker">Fluxo do jogo</p>
          <p>
            O grupo percorre a jornada junto, da criação do cenário ao final.
          </p>
        </div>

        <div className="game-flow-content">
          <svg
            className="game-flow-pizza"
            viewBox="0 0 100 100"
            role="img"
            aria-labelledby="game-flow-visual-title game-flow-visual-description"
          >
            <title id="game-flow-visual-title">
              Fluxo do jogo em nove etapas
            </title>
            <desc id="game-flow-visual-description">
              Uma pizza dividida em nove fatias numeradas, que representam as
              etapas da jornada.
            </desc>
            {GAME_FLOW_STEPS.map((step, index) => {
              const slice = pizzaSlice(index);
              return (
                <g
                  className={`game-flow-slice ${
                    selectedFlowStep === index ? "is-selected" : ""
                  }`}
                  key={step.title}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver instruções da etapa ${index + 1}: ${step.title}`}
                  onClick={() => setSelectedFlowStep(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedFlowStep(index);
                    }
                  }}
                >
                  <path d={slice.path} />
                  <text x={slice.labelX} y={slice.labelY} dy="0.35em">
                    {index + 1}
                  </text>
                </g>
              );
            })}
            <circle className="game-flow-center" cx="50" cy="50" r="16" />
            <text className="game-flow-center-label" x="50" y="48">
              IDEA
            </text>
            <text className="game-flow-center-label" x="50" y="55">
              HERO
            </text>
          </svg>

          <div className="game-flow-guide">
            <article className="game-flow-step-detail" aria-live="polite">
              <span>Etapa {selectedFlowStep + 1} de 9</span>
              <h3>{GAME_FLOW_STEPS[selectedFlowStep].title}</h3>
              <p>{GAME_FLOW_STEPS[selectedFlowStep].description}</p>
              <strong>Em grupo: </strong>
              {GAME_FLOW_STEPS[selectedFlowStep].instruction}
            </article>

            <div className="game-flow-chapters" aria-label="Etapas da jornada">
              {GAME_FLOW_CHAPTERS.map((chapter) => (
                <section className="game-flow-chapter" key={chapter.title}>
                  <div>
                    <strong>{chapter.title}</strong>
                    <small>{chapter.description}</small>
                  </div>
                  <div className="game-flow-step-buttons">
                    {chapter.steps.map((index) => {
                      const step = GAME_FLOW_STEPS[index];
                      return (
                        <button
                          type="button"
                          className={
                            selectedFlowStep === index ? "is-selected" : ""
                          }
                          key={step.title}
                          aria-pressed={selectedFlowStep === index}
                          onClick={() => setSelectedFlowStep(index)}
                        >
                          <span>{index + 1}</span>
                          {step.title}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="players-panel" aria-labelledby="players-title">
        <div className="section-heading">
          <h2 id="players-title">Heróis na sala</h2>
          <span
            className={`players-ready-counter ${allReady ? "is-all-ready" : ""}`}
          >
            {readyCount}/{players.length} prontos
          </span>
        </div>

        <div className="players-grid">
          {players.map((item) => (
            <article className="player-card" key={item.id.toString()}>
              <span className="player-avatar" aria-hidden="true">
                {AVATAR_GLYPHS[item.avatarId] ?? "✦"}
              </span>
              <div className="player-info">
                <strong>{item.displayName}</strong>
                <small>
                  {sameIdentity(item.identity, room.ownerIdentity)
                    ? "Anfitrião"
                    : "Participante"}
                </small>
              </div>
              <span className={`ready-chip ${item.ready ? "is-ready" : ""}`}>
                {item.ready ? "✓ Pronto" : "Preparando"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer className="lobby-sticky-footer">
        <div className="lobby-action-container">
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {!isHost ? (
            <div className="cta-wrapper">
              <button
                className={
                  currentPlayer.ready
                    ? "secondary-button cta-btn"
                    : "primary-button cta-btn cta-ready-highlight"
                }
                onClick={() =>
                  void invoke(() =>
                    setReady({ roomId: room.id, ready: !currentPlayer.ready }),
                  )
                }
              >
                {currentPlayer.ready
                  ? "Ainda não estou pronto"
                  : "Estou pronto"}
              </button>
              {currentPlayer.ready && (
                <span className="ready-indicator-text">
                  ✓ Você está pronto. Aguardando o anfitrião iniciar.
                </span>
              )}
            </div>
          ) : (
            <div className="host-actions-group">
              <button
                className={
                  currentPlayer.ready
                    ? "secondary-button cta-btn"
                    : "primary-button cta-btn cta-ready-highlight"
                }
                onClick={() =>
                  void invoke(() =>
                    setReady({ roomId: room.id, ready: !currentPlayer.ready }),
                  )
                }
              >
                {currentPlayer.ready ? "Desmarcar pronto" : "Estou pronto"}
              </button>

              <button
                className="primary-button cta-btn cta-start-highlight"
                disabled={!allReady}
                onClick={() =>
                  void invoke(() => startGame({ roomId: room.id }))
                }
              >
                {!enoughPlayers
                  ? `Falta ${waitingForPlayers} participante`
                  : allReady
                    ? "Começar a jornada 🚀"
                    : "Esperando o grupo"}
              </button>
            </div>
          )}
        </div>
      </footer>
    </main>
  );
}

function StageAdvanceConfirmationPanel({
  room,
  stage,
  stageIndex,
  players,
  currentPlayer,
  groupVotes,
  actionPending,
  runStageAction,
  voteStageAdvance,
  advanceStage,
  stagePrerequisiteMet = true,
  prerequisiteMessage = "",
}: {
  room: Room;
  stage: BoardState;
  stageIndex: number;
  players: readonly Player[];
  currentPlayer: Player;
  groupVotes: readonly GroupVote[];
  actionPending: boolean;
  runStageAction: (action: () => Promise<unknown>) => void;
  voteStageAdvance: (params: {
    roomId: bigint;
    stage: string;
    ready: boolean;
  }) => Promise<unknown>;
  advanceStage: (params: { roomId: bigint }) => Promise<unknown>;
  stagePrerequisiteMet?: boolean;
  prerequisiteMessage?: string;
}) {
  const onlinePlayers = players.filter((p) => p.active && p.online);
  const topic = `STAGE_ADVANCE_${stage}`;
  const stageAdvanceVotes = groupVotes.filter(
    (v) => v.topic === topic && v.choice === "READY",
  );

  const confirmedIdentities = new Set(
    stageAdvanceVotes.map((v) => v.playerIdentity.toHexString()),
  );

  const confirmedCount = onlinePlayers.filter((p) =>
    confirmedIdentities.has(p.identity.toHexString()),
  ).length;

  const hasConfirmed = confirmedIdentities.has(
    currentPlayer.identity.toHexString(),
  );
  const isHost = sameIdentity(currentPlayer.identity, room.ownerIdentity);
  const allConfirmed =
    onlinePlayers.length > 0 && confirmedCount >= onlinePlayers.length;

  const nextStageKey = BOARD_STATES[stageIndex + 1];
  const nextStageEyebrow = nextStageKey
    ? STAGE_CONTENT[nextStageKey]?.eyebrow
    : "";
  const isFinal = stage === "FINAL";
  const targetLabel = isFinal
    ? "Concluir jornada"
    : `Avançar para ${nextStageEyebrow || "próxima etapa"}`;

  return (
    <div className="stage-advance-minimal-container" aria-live="polite">
      {/* Overlapping Avatars Row */}
      <div className="stage-advance-avatar-stack">
        {onlinePlayers.map((player) => {
          const isConfirmed = confirmedIdentities.has(
            player.identity.toHexString(),
          );
          const isMe = sameIdentity(player.identity, currentPlayer.identity);
          return (
            <div
              key={player.id.toString()}
              className={`minimal-avatar-chip ${isConfirmed ? "is-confirmed" : "is-pending"} ${isMe ? "is-me" : ""}`}
              title={`${player.displayName} ${isConfirmed ? "(✓ Confirmou)" : "(Aguardando)"}`}
            >
              <span className="chip-glyph">
                {AVATAR_GLYPHS[player.avatarId] ?? "✦"}
              </span>
              {isConfirmed ? (
                <span className="chip-badge-check">✓</span>
              ) : (
                <span className="chip-badge-wait">•</span>
              )}
            </div>
          );
        })}
        <span className="stack-counter-text">
          {confirmedCount}/{onlinePlayers.length} confirmados
        </span>
      </div>

      {!stagePrerequisiteMet ? (
        <div className="minimal-prereq-alert">
          <span>💡 {prerequisiteMessage}</span>
        </div>
      ) : (
        <button
          type="button"
          className={`primary-button minimal-advance-btn ${hasConfirmed ? "is-confirmed" : ""}`}
          disabled={actionPending}
          onClick={() => {
            void runStageAction(() =>
              voteStageAdvance({
                roomId: room.id,
                stage,
                ready: !hasConfirmed,
              }),
            );
          }}
        >
          {hasConfirmed ? (
            <span>
              ✓ Confirmado ({confirmedCount}/{onlinePlayers.length}) — Toque
              para desfazer
            </span>
          ) : (
            <span>Confirmar e {targetLabel.toLowerCase()}</span>
          )}
        </button>
      )}

      {isHost && allConfirmed && (
        <button
          type="button"
          className="quiet-button host-force-mini-btn"
          disabled={actionPending}
          onClick={() =>
            void runStageAction(() => advanceStage({ roomId: room.id }))
          }
        >
          Avançar agora
        </button>
      )}
    </div>
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
  testingOptions = [],
  pilotSimulation,
  marketingPlan,
  salesResult,
  publishedResult,
  journeyFeedbacks = [],
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
  testingOptions?: readonly TestingOption[];
  pilotSimulation?: PilotSimulation;
  marketingPlan?: MarketingPlan;
  salesResult?: SalesResult;
  publishedResult?: PublishedResult;
  journeyFeedbacks?: readonly JourneyFeedback[];
}) {
  const submitContribution = useReducer(reducers.submitContribution);
  const advanceStage = useReducer(reducers.advanceStage);
  const openVoting = useReducer(reducers.openVoting);
  const castVote = useReducer(reducers.castVote);
  const resolveStage = useReducer(reducers.resolveStage);
  const endJourney = useReducer(reducers.endJourney);
  const voteStageAdvance = useReducer(reducers.voteStageAdvance);
  const acknowledgeStageGuidance = useReducer(
    reducers.acknowledgeStageGuidance,
  );
  const setStageInsight = useReducer(reducers.setStageInsight);
  const setTestingOptions = useReducer(reducers.setTestingOptions);
  const setStageQuestion = useReducer(reducers.setStageQuestion);
  const [stageInsights] = useTable(tables.room_stage_insights);
  const stage = room.currentStage as BoardState;
  const content = STAGE_CONTENT[stage] ?? STAGE_CONTENT.SCENARIO;
  const guidance =
    STAGE_GUIDANCE[stage as keyof typeof STAGE_GUIDANCE] ??
    STAGE_GUIDANCE.SCENARIO;
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
  const isHost = sameIdentity(currentPlayer.identity, room.ownerIdentity);
  const stageSession = stageSessions.find(
    (item) => item.roomId === room.id && item.stage === stage,
  );
  const phase = stageSession?.phase ?? "CONTRIBUTING";
  const defaultResolution = STAGE_PLAN_RESOLUTIONS[stage] ?? "VOTE";
  const resolution = stageSession?.resolution ?? defaultResolution;
  const usesUnion = resolution === "UNION";
  const usesFacilitator = resolution === "FACILITATOR";

  const currentAssignments = stageAssignments
    .filter((item) => item.stage === stage)
    .slice()
    .sort((left, right) => left.position - right.position);
  const ownAssignment = currentAssignments.find((item) =>
    sameIdentity(item.playerIdentity, currentPlayer.identity),
  );
  const stageOutcome = stageOutcomes.find((item) => item.stage === stage);
  const assignedPlaceholder =
    ownAssignment?.actionPlaceholder ?? guidance?.placeholder ?? "";
  const conqueringQuestionReady =
    stage !== "CONQUERING" ||
    !ownAssignment?.actionPrompt.includes("Como convidar pessoas a participar");
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
  const onlinePlayers = players.filter((item) => item.active && item.online);
  const presencePlayers = onlinePlayers.some((player) =>
    sameIdentity(player.identity, currentPlayer.identity),
  )
    ? onlinePlayers
    : [currentPlayer, ...onlinePlayers];
  const roomStageInsights = stageInsights.filter(
    (item) => item.roomId === room.id,
  );
  const testingInsight = roomStageInsights.find(
    (item) => item.stage === "TESTING",
  );
  const conqueringInsight = roomStageInsights.find(
    (item) => item.stage === "CONQUERING",
  );
  const finalInsight = roomStageInsights.find((item) => item.stage === "FINAL");
  const selectedTestingOption = testingOptions.find((item) => item.selected);
  const conqueringDecision = decisions.find(
    (item) => item.roomId === room.id && item.stage === "CONQUERING",
  );
  const insightForStage =
    stage === "TESTING"
      ? testingInsight
      : stage === "CONQUERING"
        ? conqueringInsight
        : undefined;
  const insightTriggered =
    stage === "TESTING"
      ? Boolean(selectedTestingOption)
      : stage === "CONQUERING"
        ? Boolean(conqueringDecision)
        : false;
  const insightAttemptedRef = useRef<Set<string>>(new Set());
  const [insightPending, setInsightPending] = useState(false);
  const [insightError, setInsightError] = useState("");
  const testingOptionsAttemptedRef = useRef<Set<string>>(new Set());
  const [testingOptionsPending, setTestingOptionsPending] = useState(false);
  const [testingOptionsError, setTestingOptionsError] = useState("");
  const conqueringQuestionAttemptedRef = useRef<Set<string>>(new Set());
  const [conqueringQuestionPending, setConqueringQuestionPending] =
    useState(false);
  const [conqueringQuestionError, setConqueringQuestionError] = useState("");
  const finalInsightAttemptedRef = useRef<Set<string>>(new Set());
  const [finalInsightPending, setFinalInsightPending] = useState(false);
  const [finalInsightError, setFinalInsightError] = useState("");

  async function generateFinalInsight() {
    setFinalInsightPending(true);
    setFinalInsightError("");
    try {
      const context = buildInsightContext({
        contributions: contributions.map((item) => ({
          stage: item.stage,
          content: item.content,
        })),
        decisions: decisions.map((item) => ({
          stage: item.stage,
          summary: item.summary,
        })),
        stageOutcomes: stageOutcomes.map((item) => ({
          stage: item.stage,
          summary: item.summary,
        })),
        stageInsights: roomStageInsights.map((item) => ({
          stage: item.stage,
          selectedLearning: item.selectedLearning,
          selectedKey: item.selectedKey,
        })),
        prototype: projectPrototype
          ? {
              challengeTitle: projectPrototype.challengeTitle,
              caption: projectPrototype.caption,
            }
          : undefined,
        testingOption: selectedTestingOption
          ? {
              title: selectedTestingOption.title,
              description: selectedTestingOption.description,
              impact: selectedTestingOption.impact,
            }
          : undefined,
      });
      const response = await fetch("/api/stage-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "FINAL",
          context: serializeInsightContext(context),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        title?: string;
        summary?: string;
      };
      if (!response.ok || !data.title || !data.summary) {
        throw new Error(data.error ?? "Falha ao criar o final da jornada.");
      }
      await setStageInsight({
        roomId: room.id,
        stage: "FINAL",
        headline: data.title,
        body: data.summary,
        optionsJson: "[]",
      });
    } catch (caught) {
      setFinalInsightError(errorMessage(caught));
    } finally {
      setFinalInsightPending(false);
    }
  }

  useEffect(() => {
    if (!isHost || stage !== "FINAL" || finalInsight || finalInsightPending)
      return;
    const key = room.id.toString();
    if (finalInsightAttemptedRef.current.has(key)) return;
    finalInsightAttemptedRef.current.add(key);
    void generateFinalInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room.id, stage, finalInsight, finalInsightPending]);

  async function generateTestingOptions() {
    setTestingOptionsPending(true);
    setTestingOptionsError("");
    try {
      const context = buildInsightContext({
        contributions: contributions.map((item) => ({
          stage: item.stage,
          content: item.content,
        })),
        decisions: decisions.map((item) => ({
          stage: item.stage,
          summary: item.summary,
        })),
        stageOutcomes: stageOutcomes.map((item) => ({
          stage: item.stage,
          summary: item.summary,
        })),
        prototype: projectPrototype
          ? {
              challengeTitle: projectPrototype.challengeTitle,
              caption: projectPrototype.caption,
            }
          : undefined,
      });
      const response = await fetch("/api/stage-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "TESTING_OPTIONS",
          context: serializeInsightContext(context),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        question?: string;
        options?: unknown[];
      };
      if (!response.ok || !data.question || !data.options) {
        throw new Error(data.error ?? "Falha ao gerar as opções de teste.");
      }
      await setTestingOptions({
        roomId: room.id,
        question: data.question,
        optionsJson: JSON.stringify(data.options),
      });
    } catch (caught) {
      setTestingOptionsError(errorMessage(caught));
    } finally {
      setTestingOptionsPending(false);
    }
  }

  useEffect(() => {
    if (
      !isHost ||
      stage !== "TESTING" ||
      testingOptions.length > 0 ||
      testingOptionsPending
    ) {
      return;
    }
    const key = room.id.toString();
    if (testingOptionsAttemptedRef.current.has(key)) return;
    testingOptionsAttemptedRef.current.add(key);
    void generateTestingOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room.id, stage, testingOptions.length, testingOptionsPending]);

  async function generateConqueringQuestion() {
    setConqueringQuestionPending(true);
    setConqueringQuestionError("");
    try {
      const context = buildInsightContext({
        contributions: contributions.map((item) => ({
          stage: item.stage,
          content: item.content,
        })),
        decisions: decisions.map((item) => ({
          stage: item.stage,
          summary: item.summary,
        })),
        stageOutcomes: stageOutcomes.map((item) => ({
          stage: item.stage,
          summary: item.summary,
        })),
        prototype: projectPrototype
          ? {
              challengeTitle: projectPrototype.challengeTitle,
              caption: projectPrototype.caption,
            }
          : undefined,
      });
      const response = await fetch("/api/stage-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "CONQUERING_QUESTION",
          context: serializeInsightContext(context),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        question?: string;
      };
      if (!response.ok || !data.question) {
        throw new Error(data.error ?? "Falha ao gerar a pergunta da etapa.");
      }
      await setStageQuestion({
        roomId: room.id,
        stage: "CONQUERING",
        question: data.question,
      });
    } catch (caught) {
      setConqueringQuestionError(errorMessage(caught));
    } finally {
      setConqueringQuestionPending(false);
    }
  }

  useEffect(() => {
    if (!isHost || stage !== "CONQUERING" || phase !== "CONTRIBUTING") return;
    const key = room.id.toString();
    if (conqueringQuestionAttemptedRef.current.has(key)) return;
    conqueringQuestionAttemptedRef.current.add(key);
    void generateConqueringQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, room.id, stage, phase]);

  async function generateStageInsight(targetStage: "TESTING" | "CONQUERING") {
    setInsightPending(true);
    setInsightError("");
    try {
      const context = buildInsightContext({
        contributions: contributions.map((item) => ({
          stage: item.stage,
          content: item.content,
        })),
        decisions: decisions.map((item) => ({
          stage: item.stage,
          summary: item.summary,
        })),
        stageOutcomes: stageOutcomes.map((item) => ({
          stage: item.stage,
          summary: item.summary,
        })),
        stageInsights: roomStageInsights.map((item) => ({
          stage: item.stage,
          selectedLearning: item.selectedLearning,
          selectedKey: item.selectedKey,
        })),
        prototype: projectPrototype
          ? {
              challengeTitle: projectPrototype.challengeTitle,
              caption: projectPrototype.caption,
            }
          : undefined,
        testingOption: selectedTestingOption
          ? {
              title: selectedTestingOption.title,
              description: selectedTestingOption.description,
              impact: selectedTestingOption.impact,
            }
          : undefined,
      });
      const response = await fetch("/api/stage-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: targetStage,
          context: serializeInsightContext(context),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Falha ao gerar a reacao da etapa.");
      }
      const result = (await response.json()) as {
        headline: string;
        body: string;
        options?: {
          key: string;
          title: string;
          description: string;
          learning: string;
        }[];
      };
      await setStageInsight({
        roomId: room.id,
        stage: targetStage,
        headline: result.headline,
        body: result.body,
        optionsJson: JSON.stringify(result.options ?? []),
      });
    } catch (caught) {
      setInsightError(errorMessage(caught));
    } finally {
      setInsightPending(false);
    }
  }

  useEffect(() => {
    if (insightPending) return;
    if (stage !== "TESTING" && stage !== "CONQUERING") return;
    if (insightForStage || !insightTriggered) return;
    if (insightAttemptedRef.current.has(stage)) return;
    insightAttemptedRef.current.add(stage);
    void generateStageInsight(stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, insightForStage, insightTriggered, insightPending]);

  const guidanceTopic = `STAGE_GUIDANCE_${stage}`;
  const guidanceAcknowledgements = groupVotes.filter(
    (item) => item.topic === guidanceTopic && item.choice === "READ",
  );
  const acknowledgedIdentities = new Set(
    guidanceAcknowledgements.map((item) => item.playerIdentity.toHexString()),
  );
  const guidancePlayerCount = presencePlayers.length;
  const guidanceConfirmedCount = presencePlayers.filter((player) =>
    acknowledgedIdentities.has(player.identity.toHexString()),
  ).length;
  const hasAcknowledgedGuidance = acknowledgedIdentities.has(
    currentPlayer.identity.toHexString(),
  );
  const showStageGuidance =
    guidancePlayerCount > 0 && guidanceConfirmedCount < guidancePlayerCount;
  const guidanceCompletedAt = showStageGuidance
    ? undefined
    : Math.max(
        ...guidanceAcknowledgements.map((item) =>
          item.updatedAt.toDate().getTime(),
        ),
      );
  const participatingPlayers =
    currentAssignments.length === 0
      ? onlinePlayers
      : onlinePlayers.filter((player) =>
          currentAssignments.some((assignment) =>
            sameIdentity(assignment.playerIdentity, player.identity),
          ),
        );
  const facilitatorPlayer = useMemo(() => {
    if (!usesFacilitator) return undefined;
    const ordered = [...participatingPlayers].sort((a, b) =>
      a.id < b.id ? -1 : 1,
    );
    if (ordered.length === 0) return undefined;
    return ordered[room.stageIndex % ordered.length];
  }, [usesFacilitator, participatingPlayers, room.stageIndex]);

  const turnPlayer = useMemo(() => {
    const ordered = [...participatingPlayers].sort((a, b) =>
      a.id < b.id ? -1 : 1,
    );
    if (ordered.length === 0) return undefined;
    return ordered[room.stageIndex % ordered.length];
  }, [participatingPlayers, room.stageIndex]);

  // Keep the UI's active player calculation identical to the server rule.
  const polishingActivePlayer = useMemo(() => {
    const ordered = players
      .filter((player) => player.active && player.online)
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    return ordered[room.stageIndex % ordered.length];
  }, [players, room.stageIndex]);

  const isFacilitator =
    usesFacilitator &&
    sameIdentity(facilitatorPlayer?.identity, currentPlayer.identity);
  const isPolishingLead =
    stage === "POLISHING" &&
    sameIdentity(polishingActivePlayer?.identity, currentPlayer.identity);
  const canAdvanceStage = usesFacilitator ? isFacilitator : isHost;
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
  const [productType, setProductType] = useState<ProductType>("digital");
  const [copilotSuggestion, setCopilotSuggestion] = useState("");
  const [voiceSuggestion, setVoiceSuggestion] = useState("");
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [room.stageIndex]);

  useEffect(() => {
    if (!guidanceCompletedAt) return;
    setRoundStartedAt(
      Math.max(
        stageSession?.updatedAt.toDate().getTime() ?? 0,
        guidanceCompletedAt,
      ),
    );
    setClock(Date.now());
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [stage, phase, stageSession?.updatedAt, guidanceCompletedAt]);

  useEffect(() => {
    if (stage === "PROTOTYPE") {
      setProductType("digital");
      setCopilotSuggestion("");
    }
  }, [stage]);
  const [suggesting, setSuggesting] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [roundStartedAt, setRoundStartedAt] = useState(() => Date.now());
  const roundSeconds = roundDuration();
  const prototypeEndingAt = projectPrototype
    ? projectPrototype.startedAt.toDate().getTime() +
      projectPrototype.durationSeconds * 1000
    : 0;
  const secondsLeft = !guidanceCompletedAt
    ? roundSeconds
    : stage === "PROTOTYPE" && projectPrototype
      ? Math.max(0, Math.ceil((prototypeEndingAt - clock) / 1000))
      : Math.max(0, roundSeconds - Math.floor((clock - roundStartedAt) / 1000));
  const timeExpired = secondsLeft === 0;

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      const openDetailsList = document.querySelectorAll<HTMLDetailsElement>(
        "details.topbar-stage-menu[open], details.topbar-chip-menu[open], details.room-sheet[open]",
      );
      openDetailsList.forEach((details) => {
        if (!details.contains(target)) {
          details.removeAttribute("open");
        }
      });
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

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
        projectPrototype={projectPrototype}
        prototypeArtifacts={prototypeArtifacts}
        prototypeDrawingStrokes={prototypeDrawingStrokes}
        pilotSimulation={pilotSimulation}
        salesResult={salesResult}
        publishedResult={publishedResult}
        journeyFeedbacks={journeyFeedbacks}
      />
    );
  }

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <div className="game-topbar-left">
          <span className="game-topbar-mark" aria-hidden="true">
            ✦
          </span>
          <div
            className={`topbar-timer-chip ${timeExpired ? "is-expired" : secondsLeft <= 15 ? "is-warning" : ""}`}
            aria-label="Tempo restante da rodada"
          >
            <span className="timer-icon" aria-hidden="true">
              ⏱
            </span>
            <strong aria-live="polite">{formatSeconds(secondsLeft)}</strong>
          </div>
          <details className="topbar-stage-menu">
            <summary className="topbar-stage-pill">
              <span className="stage-pill-badge">
                Etapa {room.stageIndex + 1}/9
              </span>
              <span>{content.eyebrow}</span>
            </summary>
            <div className="topbar-dropdown topbar-stage-dropdown">
              <div className="topbar-dropdown-header">
                <strong>Mapa da jornada</strong>
                <span className="badge-pill">
                  {room.stageIndex + 1} de 9 concluídas
                </span>
              </div>

              <div className="stage-hub-grid">
                {BOARD_STATES.map((item, index) => {
                  const isCurrent = index === room.stageIndex;
                  const isComplete = index < room.stageIndex;
                  const stageData = STAGE_CONTENT[item];
                  const draw = cardDraws.find(
                    (d) => d.roomId === room.id && d.stage === item && d.active,
                  );
                  const stageCard = draw
                    ? cards.find((c) => c.id === draw.cardId)
                    : undefined;
                  const stageDecision = decisions.find(
                    (d) => d.roomId === room.id && d.stage === item,
                  );
                  const stageOutcome = stageOutcomes.find(
                    (o) => o.roomId === room.id && o.stage === item,
                  );
                  const stageContribs = contributions.filter(
                    (c) => c.stage === item,
                  );

                  return (
                    <div
                      key={item}
                      className={`stage-hub-card ${isCurrent ? "is-current" : ""} ${isComplete ? "is-complete" : "is-upcoming"}`}
                    >
                      <div className="stage-hub-card-top">
                        <span className="stage-number-badge">
                          {isComplete ? "✓" : index + 1}
                        </span>
                        <span className="stage-status-tag">
                          {isComplete
                            ? "Concluída"
                            : isCurrent
                              ? "Atual"
                              : "Próxima"}
                        </span>
                      </div>

                      <strong>
                        {stageData.icon} {stageData.eyebrow}
                      </strong>
                      <p className="stage-hub-objective">
                        {stageData.objective}
                      </p>

                      {index < 4 && stageCard && (
                        <div className="stage-hub-card-card-box">
                          <img
                            src={stageCard.imagePath}
                            alt={stageCard.altText}
                            className="stage-hub-card-thumb"
                          />
                          <div className="stage-hub-card-info">
                            <small className="stage-hub-card-lens">
                              Lente {stageCard.lens}
                            </small>
                            <strong className="stage-hub-card-title">
                              {stageCard.title}
                            </strong>
                          </div>
                        </div>
                      )}

                      {item === "PROTOTYPE" &&
                        (projectPrototype ||
                          prototypeArtifacts.length > 0 ||
                          prototypeDrawingStrokes.length > 0) && (
                          <div className="stage-hub-prototype-box">
                            <div className="stage-hub-proto-header">
                              <span className="stage-hub-proto-tag">
                                🎨 Protótipo
                              </span>
                              {projectPrototype?.caption && (
                                <strong>“{projectPrototype.caption}”</strong>
                              )}
                            </div>
                            {prototypeDrawingStrokes.length > 0 && (
                              <div className="stage-hub-drawing-indicator">
                                <span>
                                  ✎ Desenho colaborativo (
                                  {prototypeDrawingStrokes.length} traços)
                                </span>
                              </div>
                            )}
                            {prototypeArtifacts.map((art) => (
                              <div
                                key={art.id.toString()}
                                className="stage-hub-artifact-item"
                              >
                                {art.artifactKind === "AUDIO" ? (
                                  <audio
                                    controls
                                    src={artifactSource(art.artifactData)}
                                    className="stage-hub-audio"
                                  />
                                ) : (
                                  <img
                                    src={artifactSource(art.artifactData)}
                                    alt={art.caption || "Artefato"}
                                    className="stage-hub-art-thumb"
                                  />
                                )}
                                {art.caption && <small>{art.caption}</small>}
                              </div>
                            ))}
                          </div>
                        )}

                      {(stageDecision ||
                        stageOutcome ||
                        stageContribs.length > 0) && (
                        <div className="stage-hub-memory">
                          <div className="stage-memory-label">
                            Memória da Etapa
                          </div>
                          {stageDecision && (
                            <p className="stage-decision-pill">
                              ★ {stageDecision.summary}
                            </p>
                          )}
                          {stageOutcome && !stageDecision && (
                            <p className="stage-outcome-pill">
                              ✦ {stageOutcome.summary}
                            </p>
                          )}
                          {stageContribs.length > 0 && (
                            <div className="stage-contrib-list">
                              {stageContribs.map((entry) => {
                                const author = entry.authorIdentity
                                  ? players.find((p) =>
                                      sameIdentity(
                                        p.identity,
                                        entry.authorIdentity,
                                      ),
                                    )
                                  : undefined;
                                return (
                                  <div
                                    key={entry.id.toString()}
                                    className="stage-contrib-item"
                                  >
                                    <span>"{entry.content}"</span>
                                    <small>
                                      — {author?.displayName ?? "Anônimo"}
                                    </small>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </div>
        <div className="game-topbar-right">
          <details className="topbar-chip-menu">
            <summary
              className="topbar-icon-chip topbar-avatar-chip"
              aria-label="Pessoas na sala"
            >
              <div className="chip-avatar-stack">
                {presencePlayers.slice(0, 3).map((player, index) => (
                  <span
                    className="chip-avatar-bubble"
                    key={player.id.toString()}
                    style={{ zIndex: 10 - index }}
                    title={player.displayName}
                  >
                    {AVATAR_GLYPHS[player.avatarId] ?? "✦"}
                  </span>
                ))}
              </div>
              <span className="chip-count-badge">{presencePlayers.length}</span>
            </summary>
            <div className="topbar-dropdown topbar-people-dropdown">
              <div className="topbar-dropdown-header">
                <strong>Pessoas na sala</strong>
                <span className="badge-pill">
                  {presencePlayers.length} online
                </span>
              </div>
              <div className="player-list-cards">
                {players.map((player) => {
                  const isPlayerHost = sameIdentity(
                    player.identity,
                    room.hostIdentity,
                  );
                  return (
                    <div
                      className={`player-list-row ${player.online ? "is-online" : "is-offline"}`}
                      key={player.id.toString()}
                    >
                      <div className="player-avatar-wrapper">
                        <span
                          aria-hidden="true"
                          className="player-avatar-glyph"
                        >
                          {AVATAR_GLYPHS[player.avatarId] ?? "✦"}
                        </span>
                        <span
                          className={`status-indicator-dot ${player.online ? "online" : "offline"}`}
                        />
                      </div>
                      <div className="player-info">
                        <strong>{player.displayName}</strong>
                        <div className="player-badges">
                          {isPlayerHost && (
                            <span className="host-badge">Líder</span>
                          )}
                          <small>{player.online ? "online" : "ausente"}</small>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
          <details className="topbar-chip-menu">
            <TopbarMoneyChip balance={economy.balance} />
            <div className="topbar-dropdown topbar-wallet-dropdown">
              <RunwayWallet
                economy={economy}
                stageCost={stageCosts.find((item) => item.stage === stage)}
                transactions={economyTransactions}
              />
            </div>
          </details>
          <details className="room-sheet" name="journey-controls">
            <summary aria-label="Opções da sala">•••</summary>
            <div className="room-sheet-panel">
              <header className="room-sheet-heading">
                <span>Sala {room.code}</span>
                <small>Gerenciamento da jornada</small>
              </header>
              <div className="room-sheet-quick-info">
                <span>👥 {presencePlayers.length} na sala</span>
                <span>💰 {formatCredits(economy.balance)} cr.</span>
              </div>
              <div className="room-sheet-actions">
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
            </div>
          </details>
        </div>
      </header>

      {showStageGuidance && (
        <StageGuidanceDialog
          stage={stage}
          confirmedCount={guidanceConfirmedCount}
          playerCount={guidancePlayerCount}
          hasConfirmed={hasAcknowledgedGuidance}
          isActivePlayer={
            ["INSIGHT", "PROTOTYPE", "TESTING", "FINAL"].includes(stage) ||
            isFacilitator ||
            isPolishingLead ||
            ((stage === "SOLUTION" || stage === "CONQUERING") &&
              sameIdentity(turnPlayer?.identity, currentPlayer.identity))
          }
          activePlayerName={
            facilitatorPlayer?.displayName ??
            polishingActivePlayer?.displayName ??
            turnPlayer?.displayName
          }
          pending={actionPending}
          onConfirm={() =>
            void runStageAction(() =>
              acknowledgeStageGuidance({ roomId: room.id, stage }),
            )
          }
        />
      )}

      <section className="stage-layout">
        <article className="stage-intro">
          <h1>{content.title}</h1>
          <p>{content.objective}</p>
          {stage !== "PROTOTYPE" && (
            <InspirationCard
              card={stageCard}
              stageLabel={content.eyebrow}
              actionControl={
                <CardChangeButton
                  room={room}
                  draw={stageDraw}
                  economy={economy}
                  locked={
                    stageContributions.length > 0 || phase !== "CONTRIBUTING"
                  }
                  players={players}
                  currentPlayer={currentPlayer}
                  groupVotes={groupVotes}
                />
              }
            />
          )}
        </article>

        <article className="contribution-panel">
          {collaborative && (
            <div className="phase-ribbon" aria-label="Fase da decisão coletiva">
              {(usesUnion || usesFacilitator
                ? (["CONTRIBUTING", "REVIEW"] as const)
                : COLLABORATIVE_PHASES
              ).map((item, index, phases) => {
                const phaseIndex = phases.findIndex((value) => value === phase);
                const labels = usesUnion
                  ? ["Criar", "Unir"]
                  : usesFacilitator
                    ? ["Narrar", "Revelar"]
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
                  ? usesFacilitator
                    ? isFacilitator
                      ? "Você é o narrador desta etapa"
                      : `${facilitatorPlayer?.displayName ?? "O facilitador"} está narrando`
                    : "Crie sem influência"
                  : phase === "VOTING"
                    ? "As ideias foram abertas"
                    : "A escolha agora faz parte da jornada"}
              </strong>
              <span>
                {phase === "CONTRIBUTING"
                  ? usesFacilitator
                    ? isFacilitator
                      ? "Registre a narrativa à luz da carta. O grupo aguarda."
                      : "Aguarde o facilitador registrar. Você verá em seguida."
                    : "Crie em particular. Veja apenas o progresso do grupo."
                  : phase === "VOTING"
                    ? "Escolha uma proposta sem ver a autoria."
                    : "Veja a escolha do grupo e avance quando estiverem prontos."}
              </span>
            </div>
          )}
          {collaborative &&
            ((stage === "POLISHING" &&
              phase === "CONTRIBUTING" &&
              isPolishingLead) ||
              (isHost &&
                phase === "CONTRIBUTING" &&
                groupReady &&
                !usesUnion &&
                !usesFacilitator) ||
              (isHost && phase === "VOTING" && allVoted) ||
              (phase === "REVIEW" &&
                (canAdvanceStage ||
                  STAGES_REQUIRING_TEAM_CONFIRMATION.has(stage)))) && (
              <>
                {phase === "CONTRIBUTING" &&
                  isHost &&
                  !usesUnion &&
                  !usesFacilitator && (
                    <button
                      className="primary-button host-stage-action"
                      disabled={actionPending}
                      onClick={() =>
                        void runStageAction(() =>
                          openVoting({ roomId: room.id }),
                        )
                      }
                    >
                      Abrir votação
                    </button>
                  )}
                {stage === "POLISHING" &&
                  phase === "CONTRIBUTING" &&
                  isPolishingLead && (
                    <button
                      className="primary-button host-stage-action"
                      disabled={actionPending}
                      onClick={() =>
                        void runStageAction(() =>
                          advanceStage({ roomId: room.id }),
                        )
                      }
                    >
                      Continuar para Protótipo
                    </button>
                  )}
                {phase === "VOTING" && isHost && (
                  <button
                    className="primary-button host-stage-action"
                    disabled={actionPending}
                    onClick={() =>
                      void runStageAction(() =>
                        resolveStage({ roomId: room.id }),
                      )
                    }
                  >
                    Revelar decisão coletiva
                  </button>
                )}
                {stage !== "POLISHING" &&
                  phase === "REVIEW" &&
                  (STAGES_REQUIRING_TEAM_CONFIRMATION.has(stage) ? (
                    <StageAdvanceConfirmationPanel
                      room={room}
                      stage={stage}
                      stageIndex={room.stageIndex}
                      players={players}
                      currentPlayer={currentPlayer}
                      groupVotes={groupVotes}
                      actionPending={actionPending}
                      runStageAction={runStageAction}
                      voteStageAdvance={voteStageAdvance}
                      advanceStage={advanceStage}
                    />
                  ) : (
                    canAdvanceStage && (
                      <button
                        className="primary-button host-stage-action"
                        disabled={actionPending}
                        onClick={() =>
                          void runStageAction(() =>
                            advanceStage({ roomId: room.id }),
                          )
                        }
                      >
                        {stage === "FINAL"
                          ? "Concluir a jornada"
                          : `Confirmar e avançar para ${
                              STAGE_CONTENT[BOARD_STATES[room.stageIndex + 1]]
                                ?.eyebrow ?? "próxima etapa"
                            }`}
                      </button>
                    )
                  ))}
              </>
            )}
          {stage === "POLISHING" &&
            phase === "CONTRIBUTING" &&
            !isPolishingLead && (
              <p className="waiting-note" aria-live="polite">
                {polishingActivePlayer?.displayName ?? "O jogador ativo"} pode
                continuar para Protótipo quando o grupo terminar.
              </p>
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
          {collaborative && phase === "VOTING" && (
            <div className="section-heading">
              <div>
                <p className="kicker">✦ Escolha individual</p>
                <h2>Qual proposta deve guiar esta etapa?</h2>
              </div>
              <span>
                {activeStageVotes.length}/{participatingPlayers.length} votos
              </span>
            </div>
          )}

          {collaborative &&
            phase === "CONTRIBUTING" &&
            stage !== "POLISHING" &&
            conqueringQuestionReady &&
            (!usesFacilitator || isFacilitator) && (
              <>
                <form onSubmit={saveContribution} className="contribution-form">
                  <label className="sr-only" htmlFor="contribution">
                    Sua contribuição
                  </label>
                  {ownAssignment?.actionPrompt && (
                    <p className="simulation-disclaimer">
                      {ownAssignment.actionPrompt}
                    </p>
                  )}
                  <textarea
                    id="contribution"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={assignedPlaceholder}
                    minLength={2}
                    maxLength={280}
                    required={stage !== "POLISHING"}
                  />
                  <div className="form-input-meta">
                    <div className="contribution-status" aria-live="polite">
                      <small>{draft.length}/280</small>
                      {ownContribution && <span>✓ Sua ideia está segura</span>}
                    </div>
                  </div>
                  {voiceSuggestion && (
                    <div className="voice-suggestion">
                      <p>Versão curta sugerida: {voiceSuggestion}</p>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setDraft(voiceSuggestion);
                          setVoiceSuggestion("");
                        }}
                      >
                        Usar versão curta
                      </button>
                    </div>
                  )}
                  <div className="form-footer">
                    <VoiceInputButton
                      stage={stage}
                      target="contribution"
                      disabled={saving}
                      onResult={applyContributionVoice}
                    />
                    <button
                      className="primary-button"
                      disabled={
                        saving ||
                        (stage === "POLISHING" && draft.trim().length === 0)
                      }
                    >
                      {saving
                        ? "Salvando…"
                        : ownContribution
                          ? "Atualizar contribuição"
                          : `Compartilhar ${CONTRIBUTION_LABELS[stage]}`}
                    </button>
                  </div>
                </form>
                {ownContribution && (
                  <div className="submission-waiting" aria-live="polite">
                    <span aria-hidden="true">✓</span>
                    <div>
                      <strong>
                        {CONTRIBUTION_LABELS[stage][0].toUpperCase() +
                          CONTRIBUTION_LABELS[stage].slice(1)}{" "}
                        compartilhado
                      </strong>
                    </div>
                  </div>
                )}
              </>
            )}

          {stage === "CONQUERING" &&
            phase === "CONTRIBUTING" &&
            !conqueringQuestionReady && (
              <div
                className="stage-insight-pending"
                style={{ padding: "1rem 0" }}
              >
                {conqueringQuestionPending ? (
                  <p className="empty-state">
                    Gerando a pergunta da etapa com IA…
                  </p>
                ) : isHost ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void generateConqueringQuestion()}
                  >
                    Gerar pergunta da etapa com IA
                  </button>
                ) : (
                  <p className="empty-state">
                    O anfitrião está gerando a pergunta da etapa com IA…
                  </p>
                )}
                {conqueringQuestionError && (
                  <p className="error-message">{conqueringQuestionError}</p>
                )}
              </div>
            )}

          {collaborative &&
            phase === "CONTRIBUTING" &&
            usesFacilitator &&
            !isFacilitator && (
              <div className="facilitator-waiting">
                <div className="facilitator-waiting-avatar">
                  <span aria-hidden="true">
                    {AVATAR_GLYPHS[facilitatorPlayer?.avatarId ?? ""] ?? "✦"}
                  </span>
                </div>
                <strong>
                  {facilitatorPlayer?.displayName ?? "O facilitador"}
                </strong>
                <p>
                  está narrando{" "}
                  {stage === "SCENARIO" ? "o cenário" : "o problema"} do grupo.
                </p>
                <small>Você verá o resultado assim que for registrado.</small>
              </div>
            )}

          {stage === "TESTING" && insightForStage && (
            <StageInsightResponse
              room={room}
              stage={stage}
              insight={insightForStage}
              groupVotes={groupVotes}
              currentPlayer={currentPlayer}
              players={players}
            />
          )}
          {stage === "CONQUERING" && insightForStage && (
            <StageAudienceReaction insight={insightForStage} />
          )}
          {(stage === "TESTING" || stage === "CONQUERING") &&
            !insightForStage &&
            insightTriggered && (
              <div
                className="stage-insight-pending"
                style={{ padding: "1rem 0" }}
              >
                <p className="empty-state">Preparando a reação da etapa…</p>
                {insightError && (
                  <p className="error-message">{insightError}</p>
                )}
              </div>
            )}

          {!collaborative && (
            <div className="stage-activity-workspace">
              {stage === "PROTOTYPE" && (
                <PrototypeStage
                  room={room}
                  prototype={projectPrototype}
                  artifacts={prototypeArtifacts}
                  drawingStrokes={prototypeDrawingStrokes}
                  groupVotes={groupVotes}
                  currentPlayer={currentPlayer}
                  players={players}
                  economy={economy}
                />
              )}
              {stage === "TESTING" && (
                <>
                  <TestingStage
                    room={room}
                    testOptions={testingOptions}
                    groupVotes={groupVotes}
                    currentPlayer={currentPlayer}
                    players={players}
                  />
                  {testingOptions.length === 0 && (
                    <div
                      className="stage-insight-pending"
                      style={{ padding: "1rem 0" }}
                    >
                      {testingOptionsPending ? (
                        <p className="empty-state">
                          Gerando opções de teste com IA…
                        </p>
                      ) : isHost ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void generateTestingOptions()}
                        >
                          Gerar opções de teste com IA
                        </button>
                      ) : (
                        <p className="empty-state">
                          O anfitrião está gerando as opções de teste com IA…
                        </p>
                      )}
                      {testingOptionsError && (
                        <p className="error-message">{testingOptionsError}</p>
                      )}
                    </div>
                  )}
                </>
              )}
              {stage === "FINAL" && (
                <>
                  <SalesStage
                    economy={economy}
                    sales={salesResult}
                    pilot={pilotSimulation}
                    transactions={economyTransactions}
                  />
                  {finalInsight ? (
                    <section className="pilot-learning" aria-live="polite">
                      <span aria-hidden="true">✦</span>
                      <div>
                        <small>Final criado pela IA a partir da jornada</small>
                        <h2>{finalInsight.headline}</h2>
                        <p>{finalInsight.body}</p>
                      </div>
                    </section>
                  ) : (
                    <div
                      className="stage-insight-pending"
                      style={{ padding: "1rem 0" }}
                    >
                      {finalInsightPending ? (
                        <p className="empty-state">
                          A IA está criando o final da jornada…
                        </p>
                      ) : isHost ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void generateFinalInsight()}
                        >
                          Criar final com IA
                        </button>
                      ) : (
                        <p className="empty-state">
                          A IA está criando o final da jornada…
                        </p>
                      )}
                      {finalInsightError && (
                        <p className="error-message">{finalInsightError}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="form-footer" style={{ marginTop: "1.25rem" }}>
                <StageAdvanceConfirmationPanel
                  room={room}
                  stage={stage}
                  stageIndex={room.stageIndex}
                  players={players}
                  currentPlayer={currentPlayer}
                  groupVotes={groupVotes}
                  actionPending={actionPending}
                  runStageAction={runStageAction}
                  voteStageAdvance={voteStageAdvance}
                  advanceStage={advanceStage}
                  stagePrerequisiteMet={
                    stage === "PROTOTYPE"
                      ? !!projectPrototype?.committed
                      : stage === "TESTING"
                        ? testingOptions
                          ? testingOptions.some((o) => o.selected) &&
                            (!testingInsight || testingInsight.completed)
                          : true
                        : stage === "FINAL"
                          ? Boolean(finalInsight)
                          : true
                  }
                  prerequisiteMessage={
                    stage === "PROTOTYPE"
                      ? "Conclua o protótipo compartilhado antes de avançar."
                      : stage === "TESTING"
                        ? testingInsight && !testingInsight.completed
                          ? "Respondam à reação do teste antes de avançar."
                          : "Selecione uma opção de teste antes de avançar."
                        : stage === "FINAL"
                          ? "Aguarde o agente de IA criar o final da jornada."
                          : ""
                  }
                />
              </div>
            </div>
          )}

          {collaborative &&
            phase !== "REVIEW" &&
            phase !== "RESPONDING" &&
            !usesFacilitator && (
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

          {phase === "REVIEW" && stage === "PROTOTYPE" && projectPrototype && (
            <PrototypeShowcase
              prototype={projectPrototype}
              artifacts={prototypeArtifacts}
              drawingStrokes={prototypeDrawingStrokes}
              players={players}
              currentPlayer={currentPlayer}
            />
          )}

          {phase === "REVIEW" &&
            (usesUnion || usesFacilitator) &&
            stageOutcome && (
              <section
                className="decision-reveal union-reveal"
                aria-live="polite"
              >
                <span className="decision-star" aria-hidden="true">
                  {usesFacilitator ? "★" : "✦"}
                </span>
                <p className="kicker">
                  {usesFacilitator
                    ? "Registro da Etapa"
                    : "Composicao do grupo"}
                </p>
                <div className="union-result">
                  {stageOutcome.summary.split("\n").map((entry, index) => {
                    const cleaned = entry.includes(":")
                      ? entry.slice(entry.indexOf(":") + 1).trim()
                      : entry;
                    return <p key={`${entry}-${index}`}>{cleaned}</p>;
                  })}
                </div>
                <p>
                  {usesFacilitator
                    ? "Sintetizado pelo facilitador da etapa."
                    : `${stageOutcome.sourceCount} pecas reunidas na mesma ideia.`}
                </p>
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

          {collaborative && phase === "REVIEW" && !canAdvanceStage && (
            <p className="waiting-note">
              Aguardando{" "}
              {usesFacilitator
                ? (facilitatorPlayer?.displayName ?? "o facilitador")
                : "o anfitrião"}{" "}
              confirmar e avançar a jornada.
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
  projectPrototype,
  prototypeArtifacts = [],
  prototypeDrawingStrokes = [],
  pilotSimulation,
  salesResult,
  publishedResult,
  journeyFeedbacks = [],
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
  projectPrototype?: ProjectPrototype;
  prototypeArtifacts?: readonly PrototypeArtifact[];
  prototypeDrawingStrokes?: readonly PrototypeDrawingStroke[];
  pilotSimulation?: PilotSimulation;
  salesResult?: SalesResult;
  publishedResult?: PublishedResult;
  journeyFeedbacks?: readonly JourneyFeedback[];
}) {
  const updateJourney = useReducer(reducers.updateJourney);
  const leaveRoom = useReducer(reducers.leaveRoom);
  const publishJourney = useReducer(reducers.publishJourney);
  const submitJourneyFeedback = useReducer(reducers.submitJourneyFeedback);
  const myFeedback = journeyFeedbacks.find(
    (item) =>
      item.roomId === room.id &&
      sameIdentity(item.authorIdentity, currentPlayer.identity),
  );
  const [feedbackEmail, setFeedbackEmail] = useState(myFeedback?.email ?? "");
  const [feedbackNps, setFeedbackNps] = useState<number | undefined>(
    myFeedback?.nps ?? undefined,
  );
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (myFeedback) {
      setFeedbackEmail(myFeedback.email);
      setFeedbackNps(myFeedback.nps);
    }
  }, [myFeedback?.email, myFeedback?.nps]);

  async function handleFeedbackSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedbackError("");
    setFeedbackNotice("");

    const trimmedEmail = feedbackEmail.trim();
    if (!trimmedEmail) {
      setFeedbackError("Por favor, informe seu e-mail.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFeedbackError("Informe um e-mail válido.");
      return;
    }
    if (feedbackNps === undefined || feedbackNps < 0 || feedbackNps > 10) {
      setFeedbackError("Selecione uma nota de 0 a 10 para o NPS.");
      return;
    }

    setSubmittingFeedback(true);
    try {
      await submitJourneyFeedback({
        roomId: room.id,
        email: trimmedEmail,
        nps: feedbackNps,
      });
      setFeedbackNotice("Obrigado! Seu feedback foi salvo no banco de dados.");
    } catch (caught) {
      setFeedbackError(errorMessage(caught));
    } finally {
      setSubmittingFeedback(false);
    }
  }

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

  const journeyConsolidatedRef = useRef(false);
  const [consolidating, setConsolidating] = useState(false);
  const isPlaceholderTitle =
    !!journey &&
    (journey.title.startsWith("Ideia da jornada ") ||
      journey.title.startsWith("Jornada parcial "));

  useEffect(() => {
    if (!isHost || !journey || journeyConsolidatedRef.current) return;
    if (!isPlaceholderTitle || consolidating) return;
    journeyConsolidatedRef.current = true;
    setConsolidating(true);
    setError("");
    const context = buildInsightContext({
      contributions: contributions.map((item) => ({
        stage: item.stage,
        content: item.content,
      })),
      decisions: decisions.map((item) => ({
        stage: item.stage,
        summary: item.summary,
      })),
      stageOutcomes: stageOutcomes.map((item) => ({
        stage: item.stage,
        summary: item.summary,
      })),
      prototype: projectPrototype
        ? {
            challengeTitle: projectPrototype.challengeTitle,
            caption: projectPrototype.caption,
          }
        : undefined,
    });
    fetch("/api/stage-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: "FINAL",
        context: serializeInsightContext(context),
      }),
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ title: string; summary: string }>)
          : Promise.reject(new Error("Falha ao consolidar a jornada.")),
      )
      .then((result) => {
        setTitle(result.title.slice(0, 80));
        setSummary(result.summary.slice(0, 400));
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setConsolidating(false));
  }, [
    isHost,
    journey,
    isPlaceholderTitle,
    consolidating,
    contributions,
    decisions,
    stageOutcomes,
    projectPrototype,
  ]);

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
    clearRecoverableRoom();
    window.history.replaceState(null, "", clearRoomInviteUrl(previousUrl));
    const leftRoom = await runFinalAction(
      "leave",
      () => leaveRoom({ roomId: room.id }),
      "Tudo pronto para uma nova jornada.",
    );
    if (!leftRoom) {
      saveRecoverableRoom(room.code);
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
              {consolidating
                ? "Consolidando a jornada com IA…"
                : syncingManifest
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

      <section className="feedback-editor" aria-labelledby="feedback-title">
        <div className="feedback-heading">
          <div>
            <p className="kicker">Sua opinião é fundamental</p>
            <h2 id="feedback-title">Avalie sua experiência</h2>
          </div>
          <span>{myFeedback ? "✓ Feedback salvo" : "Pesquisa NPS"}</span>
        </div>
        <form onSubmit={handleFeedbackSubmit}>
          <label htmlFor="feedback-email">
            E-mail para contato
            <input
              id="feedback-email"
              type="email"
              placeholder="seu@email.com"
              value={feedbackEmail}
              onChange={(e) => setFeedbackEmail(e.target.value)}
              disabled={submittingFeedback}
              required
            />
          </label>

          <div className="nps-container">
            <label className="nps-label">
              Numa escala de 0 a 10, o quanto você recomendaria esta experiência?
            </label>
            <div
              className="nps-selector"
              role="radiogroup"
              aria-label="Nota NPS de 0 a 10"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  type="button"
                  className={`nps-chip ${feedbackNps === score ? "is-selected" : ""}`}
                  onClick={() => setFeedbackNps(score)}
                  disabled={submittingFeedback}
                  aria-checked={feedbackNps === score}
                  role="radio"
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="nps-scale-labels">
              <small>0 = Pouco provável</small>
              <small>10 = Muito provável</small>
            </div>
          </div>

          <div className="feedback-footer">
            <small>{myFeedback ? "Feedback salvo" : ""}</small>
            <button
              type="submit"
              className="primary-button"
              disabled={submittingFeedback}
            >
              {submittingFeedback
                ? "Enviando..."
                : myFeedback
                  ? "Atualizar feedback"
                  : "Enviar feedback"}
            </button>
          </div>
          {feedbackNotice && (
            <p className="success-message">✓ {feedbackNotice}</p>
          )}
          {feedbackError && <p className="error-message">{feedbackError}</p>}
        </form>
      </section>


      <div className="document-heading">
        <div>
          <p className="kicker">A aventura completa</p>
          <h2>Como a ideia ganhou forma</h2>
        </div>
        <span>9 etapas · {players.length} heróis</span>
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
                {stage === "PROTOTYPE" && projectPrototype && (
                  <PrototypeShowcase
                    prototype={projectPrototype}
                    artifacts={prototypeArtifacts}
                    drawingStrokes={prototypeDrawingStrokes}
                    players={players}
                    currentPlayer={currentPlayer}
                  />
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
          <summary>✦ Mais opções</summary>
          <div className="result-more-body">
            {publishedUrl && (
              <button
                className="secondary-button"
                disabled={!!busyAction}
                onClick={() => void copyPublicResultLink()}
              >
                {busyAction === "copy-link"
                  ? "Copiando..."
                  : "Copiar link público"}
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
