import { FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";
import "./idea-hero.css";
import { reducers, tables } from "./module_bindings";
import type {
  Card,
  CardDraw,
  Contribution,
  Decision,
  Journey,
  Player,
  Room,
  StageSession,
  Vote,
} from "./module_bindings/types";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";
import { BrandLogo, InspirationCard, StageMission } from "./experience";
import { STAGE_GUIDANCE } from "./stage-guidance";
import {
  buildJourneyMarkdown,
  buildJourneyShareText,
  journeyFilename,
} from "./journey-artifact";
import {
  buildRoomInviteUrl,
  clearRoomInviteUrl,
  roomCodeFromUrl,
} from "./room-invite";
import { createRoomWithAvailableCode } from "./room-code";

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
    title: "Construa o mundo",
    eyebrow: "Cenário",
    objective: "Alinhe o grupo sobre o contexto onde a ideia vai existir.",
    prompt: "O que existe neste mundo e quem vive nele?",
    icon: "◌",
  },
  PROBLEM: {
    title: "Encontre o desafio",
    eyebrow: "Problema",
    objective: "Transforme tensões do cenário em um problema relevante.",
    prompt: "Qual necessidade merece ser resolvida primeiro?",
    icon: "△",
  },
  INSIGHT: {
    title: "Descubra o invisível",
    eyebrow: "Insight",
    objective: "Olhe além da primeira explicação e encontre oportunidades.",
    prompt: "O que estamos deixando de perceber?",
    icon: "✦",
  },
  SOLUTION: {
    title: "Combine possibilidades",
    eyebrow: "Solução",
    objective: "Crie respostas e fortaleça as ideias do grupo.",
    prompt: "Que solução inesperada conecta cenário, problema e insight?",
    icon: "◇",
  },
  PROTOTYPE: {
    title: "Torne a ideia visível",
    eyebrow: "Protótipo",
    objective: "Mostre rapidamente como alguém usaria a solução.",
    prompt: "Qual é a menor representação que torna a ideia compreensível?",
    icon: "▱",
  },
  PILOT: {
    title: "Teste e aprenda",
    eyebrow: "Piloto",
    objective: "Confronte o protótipo com uma condição de realidade.",
    prompt: "O que este teste ensina e o que precisa mudar?",
    icon: "↗",
  },
  MARKETING: {
    title: "Conte por que importa",
    eyebrow: "Marketing",
    objective: "Defina público, mensagem e caminho para alcançar pessoas.",
    prompt: "Como explicar o valor desta ideia em uma frase?",
    icon: "◎",
  },
  SALES: {
    title: "Celebre a jornada",
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
  const [profiles, profilesReady] = useTable(tables.profile);
  const [rooms, roomsReady] = useTable(tables.room);
  const [cards, cardsReady] = useTable(tables.card);
  const [cardDraws, cardDrawsReady] = useTable(tables.cardDraw);
  const [players, playersReady] = useTable(tables.player);
  const [contributions, contributionsReady] = useTable(tables.contribution);
  const [stageSessions, stageSessionsReady] = useTable(tables.stageSession);
  const [votes, votesReady] = useTable(tables.vote);
  const [decisions, decisionsReady] = useTable(tables.decision);
  const [journeys, journeysReady] = useTable(tables.journey);

  const currentProfile = identity
    ? profiles.find((item) => sameIdentity(item.identity, identity))
    : undefined;

  const memberships = useMemo(() => {
    if (!identity) return [];
    return players
      .filter((item) => sameIdentity(item.identity, identity))
      .sort(
        (a, b) => b.joinedAt.toDate().getTime() - a.joinedAt.toDate().getTime(),
      );
  }, [identity, players]);

  const currentPlayer = memberships[0];
  const currentRoom = currentPlayer
    ? rooms.find((item) => item.id === currentPlayer.roomId)
    : undefined;
  const currentRoomCode = currentRoom?.code;

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

  if (
    !profilesReady ||
    !roomsReady ||
    !playersReady ||
    !contributionsReady ||
    !cardsReady ||
    !cardDrawsReady ||
    !stageSessionsReady ||
    !votesReady ||
    !decisionsReady ||
    !journeysReady
  ) {
    return <LoadingScreen label="Sincronizando a jornada…" />;
  }

  if (!currentProfile?.displayName || !currentProfile.avatarId) {
    return <ProfileSetup />;
  }

  if (!currentRoom || !currentPlayer) {
    return <RoomEntry displayName={currentProfile.displayName} />;
  }

  const roomPlayers = players.filter((item) => item.roomId === currentRoom.id);
  const roomContributions = contributions.filter(
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

  return (
    <GameBoard
      room={currentRoom}
      players={roomPlayers}
      contributions={roomContributions}
      cards={cards}
      cardDraws={cardDraws}
      stageSessions={stageSessions}
      votes={votes}
      decisions={decisions}
      journeys={journeys}
      currentPlayer={currentPlayer}
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

function ProfileSetup() {
  const setProfile = useReducer(reducers.setProfile);
  const [displayName, setDisplayName] = useState("");
  const [avatarId, setAvatarId] = useState<string>(AVATARS[0]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await setProfile({ displayName, avatarId });
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
        <p className="kicker">Idea Hero 2.0</p>
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
        </form>
      </section>
    </main>
  );
}

function RoomEntry({ displayName }: { displayName: string }) {
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
        <div className="brand-lockup">
          <BrandLogo compact />
          <div>
            <p className="kicker">Olá, {displayName}</p>
            <h1>Vamos mudar o mundo?</h1>
          </div>
        </div>
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
                onChange={(event) =>
                  setJoinCode(event.target.value.toLowerCase())
                }
                placeholder="ideia-abc123"
                minLength={4}
                maxLength={24}
                pattern="[a-z0-9-]{4,24}"
                title="Use de 4 a 24 letras, números ou hífens"
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
  const isHost = currentPlayer.role === "HOST";
  const allReady = players.length > 0 && players.every((item) => item.ready);

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
        <span className="connection-status">● Sincronizado</span>
      </header>

      <section className="lobby-hero">
        <p className="kicker">Sala de preparação</p>
        <h1>A aventura começa com o grupo</h1>
        <p>Compartilhe o convite e espere todo mundo ficar pronto.</p>

        <button className="room-code" onClick={() => void shareInvite()}>
          <span>{room.code}</span>
          <small>
            {copied ? "Convite compartilhado!" : "Compartilhar convite"}
          </small>
        </button>
        <small className="invite-help">
          O link já leva cada pessoa para esta sala.
        </small>
      </section>

      <section className="players-panel" aria-labelledby="players-title">
        <div className="section-heading">
          <div>
            <p className="kicker">2–6 participantes</p>
            <h2 id="players-title">Heróis na sala</h2>
          </div>
          <span>
            {players.filter((item) => item.ready).length}/{players.length}{" "}
            prontos
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
                  {item.role === "HOST" ? "Anfitrião" : "Participante"}
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
        {!isHost && (
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
        )}
        {isHost && (
          <button
            className="primary-button"
            disabled={!allReady}
            onClick={() => void invoke(() => startGame({ roomId: room.id }))}
          >
            {allReady ? "Começar a jornada" : "Esperando o grupo"}
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
  cards,
  cardDraws,
  stageSessions,
  votes,
  decisions,
  journeys,
  currentPlayer,
}: {
  room: Room;
  players: Player[];
  contributions: Contribution[];
  cards: readonly Card[];
  cardDraws: readonly CardDraw[];
  stageSessions: readonly StageSession[];
  votes: readonly Vote[];
  decisions: readonly Decision[];
  journeys: readonly Journey[];
  currentPlayer: Player;
}) {
  const submitContribution = useReducer(reducers.submitContribution);
  const advanceStage = useReducer(reducers.advanceStage);
  const openVoting = useReducer(reducers.openVoting);
  const castVote = useReducer(reducers.castVote);
  const resolveStage = useReducer(reducers.resolveStage);
  const stage = room.currentStage as BoardState;
  const content = STAGE_CONTENT[stage] ?? STAGE_CONTENT.SCENARIO;
  const guidance = STAGE_GUIDANCE[stage];
  const stageDraw = cardDraws.find(
    (item) => item.roomId === room.id && item.stage === stage,
  );
  const stageCard = stageDraw
    ? cards.find((item) => item.id === stageDraw.cardId)
    : undefined;
  const stageContributions = contributions.filter(
    (item) => item.stage === stage,
  );
  const stageSession = stageSessions.find(
    (item) => item.roomId === room.id && item.stage === stage,
  );
  const phase = stageSession?.phase ?? "CONTRIBUTING";
  const collaborative = COLLABORATIVE_STAGES.has(stage);
  const stageVotes = votes.filter(
    (item) => item.roomId === room.id && item.stage === stage,
  );
  const stageDecision = decisions.find(
    (item) => item.roomId === room.id && item.stage === stage,
  );
  const ownContribution = stageContributions.find((item) =>
    sameIdentity(item.authorIdentity, currentPlayer.identity),
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
  const contributingPlayers = onlinePlayers.filter((player) =>
    stageContributions.some((item) =>
      sameIdentity(item.authorIdentity, player.identity),
    ),
  );
  const activeStageVotes = stageVotes.filter((vote) =>
    onlinePlayers.some((player) =>
      sameIdentity(vote.voterIdentity, player.identity),
    ),
  );
  const groupReady =
    onlinePlayers.length > 0 &&
    contributingPlayers.length === onlinePlayers.length;
  const allVoted =
    onlinePlayers.length > 0 &&
    onlinePlayers.every((player) =>
      activeStageVotes.some((item) =>
        sameIdentity(item.voterIdentity, player.identity),
      ),
    );

  const [draft, setDraft] = useState(ownContribution?.content ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const isHost = currentPlayer.role === "HOST";

  useEffect(() => {
    setDraft(ownContribution?.content ?? "");
  }, [ownContribution?.content, stage]);

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

  if (room.status === "FINISHED") {
    return (
      <JourneyResult
        room={room}
        players={players}
        contributions={contributions}
        cards={cards}
        cardDraws={cardDraws}
        decisions={decisions}
        journey={journeys.find((item) => item.roomId === room.id)}
        currentPlayer={currentPlayer}
      />
    );
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <BrandLogo compact />
        <div className="room-pill">Sala {room.code}</div>
        <button
          className="journey-toggle"
          onClick={() => setJourneyOpen((value) => !value)}
        >
          {journeyOpen ? "Fechar jornada" : "Ver jornada"}
        </button>
      </header>

      <nav className="stage-progress" aria-label="Progresso da jornada">
        {BOARD_STATES.map((item, index) => (
          <div
            key={item}
            className={`stage-step ${index === room.stageIndex ? "is-current" : ""} ${index < room.stageIndex ? "is-complete" : ""}`}
            aria-current={index === room.stageIndex ? "step" : undefined}
          >
            <span>{index < room.stageIndex ? "✓" : index + 1}</span>
            <small>{STAGE_CONTENT[item].eyebrow}</small>
          </div>
        ))}
      </nav>

      <section className="presence-row" aria-label="Jogadores na sala">
        {players.map((item) => (
          <div
            className={`presence-avatar ${item.online ? "" : "is-offline"}`}
            key={item.id.toString()}
          >
            <span>{AVATAR_GLYPHS[item.avatarId] ?? "✦"}</span>
            <small>{item.displayName}</small>
          </div>
        ))}
      </section>

      {journeyOpen && (
        <JourneySummary
          room={room}
          contributions={contributions}
          players={players}
          decisions={decisions}
        />
      )}

      <section className="stage-layout">
        <article className="stage-intro">
          <p className="kicker">
            Etapa {room.stageIndex + 1} de 8 · {content.eyebrow}
          </p>
          <h1>{content.title}</h1>
          <p>{content.objective}</p>
          <InspirationCard card={stageCard} stageLabel={content.eyebrow} />
        </article>

        <article className="contribution-panel">
          {collaborative && (
            <div className="phase-ribbon" aria-label="Fase da decisão coletiva">
              {COLLABORATIVE_PHASES.map((item, index) => {
                const phaseIndex = COLLABORATIVE_PHASES.indexOf(
                  phase as (typeof COLLABORATIVE_PHASES)[number],
                );
                const labels = ["Criar", "Escolher", "Revelar"];
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
          <StageMission stage={stage} />
          <div className="section-heading">
            <div>
              <p className="kicker">
                {phase === "VOTING"
                  ? "Escolha individual"
                  : phase === "REVIEW"
                    ? "Decisão coletiva"
                    : "Sua contribuição"}
              </p>
              <h2>
                {phase === "VOTING"
                  ? "Qual proposta deve guiar esta etapa?"
                  : phase === "REVIEW"
                    ? "O grupo escolheu um caminho"
                    : content.prompt}
              </h2>
            </div>
            <span>
              {phase === "VOTING"
                ? `${activeStageVotes.length}/${onlinePlayers.length} votos`
                : `${contributingPlayers.length}/${onlinePlayers.length} enviadas`}
            </span>
          </div>

          {phase === "CONTRIBUTING" && (
            <form onSubmit={saveContribution} className="contribution-form">
              <label className="sr-only" htmlFor="contribution">
                Sua contribuição
              </label>
              <textarea
                id="contribution"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={guidance.placeholder}
                minLength={2}
                maxLength={280}
                required
              />
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
                    {players.find((item) =>
                      sameIdentity(
                        item.identity,
                        selectedContribution.authorIdentity,
                      ),
                    )?.displayName ??
                      shortIdentity(selectedContribution.authorIdentity)}
                  </>
                )}
              </p>
            </section>
          )}

          {(phase === "CONTRIBUTING" || !collaborative) && (
            <div className="shared-ideas" aria-live="polite">
              {stageContributions.length === 0 ? (
                <p className="empty-state">
                  As contribuições aparecerão aqui em tempo real.
                </p>
              ) : (
                stageContributions.map((item) => {
                  const author = players.find((player) =>
                    sameIdentity(player.identity, item.authorIdentity),
                  );
                  return (
                    <blockquote key={item.id.toString()}>
                      <p>{item.content}</p>
                      <footer>
                        —{" "}
                        {author?.displayName ??
                          shortIdentity(item.authorIdentity)}
                      </footer>
                    </blockquote>
                  );
                })
              )}
            </div>
          )}

          <p className="next-up">
            <strong>
              {phase === "REVIEW" ? "Próxima etapa:" : "Em seguida:"}
            </strong>{" "}
            {phase === "VOTING"
              ? "Quando todos votarem, o anfitrião revela a escolha do grupo."
              : phase === "REVIEW"
                ? guidance.next
                : collaborative
                  ? "Depois das contribuições, cada pessoa escolherá uma proposta sem ver a autoria."
                  : guidance.next}
          </p>

          {isHost && collaborative && phase === "CONTRIBUTING" && (
            <button
              className="secondary-button next-stage-button"
              disabled={!groupReady || actionPending}
              onClick={() =>
                void runStageAction(() => openVoting({ roomId: room.id }))
              }
            >
              {groupReady ? "Abrir votação" : "Esperando contribuições"}
            </button>
          )}
          {isHost && collaborative && phase === "VOTING" && (
            <button
              className="secondary-button next-stage-button"
              disabled={!allVoted || actionPending}
              onClick={() =>
                void runStageAction(() => resolveStage({ roomId: room.id }))
              }
            >
              {allVoted ? "Revelar decisão coletiva" : "Esperando votos"}
            </button>
          )}
          {isHost && (!collaborative || phase === "REVIEW") && (
            <button
              className="secondary-button next-stage-button"
              disabled={!groupReady || actionPending}
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
          {!isHost && phase !== "VOTING" && (
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

function JourneySummary({
  room,
  contributions,
  players,
  decisions,
}: {
  room: Room;
  contributions: Contribution[];
  players: Player[];
  decisions: readonly Decision[];
}) {
  return (
    <aside className="journey-summary">
      <div className="section-heading">
        <div>
          <p className="kicker">Memória coletiva</p>
          <h2>Jornada construída até aqui</h2>
        </div>
      </div>
      <div className="journey-columns">
        {BOARD_STATES.slice(0, room.stageIndex + 1).map((stage) => {
          const entries = contributions.filter((item) => item.stage === stage);
          const stageDecision = decisions.find(
            (item) => item.roomId === room.id && item.stage === stage,
          );
          return (
            <section key={stage}>
              <strong>{STAGE_CONTENT[stage].eyebrow}</strong>
              {stageDecision ? (
                <p className="journey-decision">
                  ★ {stageDecision.summary} <em>— escolha do grupo</em>
                </p>
              ) : entries.length === 0 ? (
                <small>Em construção</small>
              ) : (
                entries.map((entry) => {
                  const author = players.find((item) =>
                    sameIdentity(item.identity, entry.authorIdentity),
                  );
                  return (
                    <p key={entry.id.toString()}>
                      {entry.content} <em>— {author?.displayName}</em>
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

function JourneyResult({
  room,
  players,
  contributions,
  cards,
  cardDraws,
  decisions,
  journey,
  currentPlayer,
}: {
  room: Room;
  players: Player[];
  contributions: Contribution[];
  cards: readonly Card[];
  cardDraws: readonly CardDraw[];
  decisions: readonly Decision[];
  journey?: Journey;
  currentPlayer: Player;
}) {
  const updateJourney = useReducer(reducers.updateJourney);
  const leaveFinishedRoom = useReducer(reducers.leaveFinishedRoom);
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
  const isHost = currentPlayer.role === "HOST";
  const manifest = { title, summary };
  const validManifest =
    title.trim().length >= 3 &&
    title.trim().length <= 80 &&
    summary.trim().length >= 10 &&
    summary.trim().length <= 400;
  const manifestChanged =
    title !== (journey?.title ?? fallbackTitle) ||
    summary !== (journey?.summary ?? fallbackSummary) ||
    !journey;

  useEffect(() => {
    setTitle(journey?.title ?? fallbackTitle);
    setSummary(journey?.summary ?? fallbackSummary);
  }, [fallbackSummary, fallbackTitle, journey?.summary, journey?.title]);

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

  async function shareResult() {
    const text = buildJourneyShareText(manifest, room.code);
    if (navigator.share) {
      await runFinalAction(
        "share",
        () => navigator.share({ title: title.trim(), text }),
        "Resultado compartilhado.",
      );
      return;
    }
    await runFinalAction(
      "share",
      () => copyText(text),
      "Resumo copiado. Agora é só colar onde quiser.",
    );
  }

  function downloadResult() {
    setError("");
    const markdown = buildJourneyMarkdown({
      journey: manifest,
      room,
      players,
      contributions,
      decisions,
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
    const leftRoom = await runFinalAction(
      "leave",
      () => leaveFinishedRoom({ roomId: room.id }),
      "Tudo pronto para uma nova jornada.",
    );
    if (leftRoom) {
      window.history.replaceState(
        null,
        "",
        clearRoomInviteUrl(window.location.href),
      );
    }
  }

  return (
    <main className="result-page">
      <header className="result-topbar">
        <BrandLogo compact />
        <span className="room-pill">Sala {room.code}</span>
      </header>
      <section className="result-hero">
        <span className="result-star" aria-hidden="true">
          ★
        </span>
        <p className="kicker">Jornada concluída</p>
        <h1>{title}</h1>
        <p className="result-manifest-copy">{summary}</p>
        <p className="result-people">
          {players.length}{" "}
          {players.length === 1 ? "pessoa percorreu" : "pessoas percorreram"} as
          oito etapas na sala {room.code}.
        </p>
      </section>

      {isHost && (
        <section className="manifest-editor" aria-labelledby="manifest-title">
          <div className="manifest-heading">
            <div>
              <p className="kicker">Manifesto final</p>
              <h2 id="manifest-title">Dê um nome ao que vocês criaram</h2>
            </div>
            <span>Somente o anfitrião edita</span>
          </div>
          <form onSubmit={saveManifest}>
            <label htmlFor="journey-title">
              Nome do projeto
              <input
                id="journey-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={80}
                required
              />
            </label>
            <label htmlFor="journey-summary">
              Manifesto em uma frase
              <textarea
                id="journey-summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                minLength={10}
                maxLength={400}
                required
              />
            </label>
            <div className="manifest-footer">
              <small>{summary.length}/400 caracteres</small>
              <button
                className="primary-button"
                disabled={!validManifest || !manifestChanged || !!busyAction}
              >
                {busyAction === "save" ? "Salvando…" : "Salvar manifesto"}
              </button>
            </div>
          </form>
        </section>
      )}

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
            (item) => item.roomId === room.id && item.stage === stage,
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
                    const author = players.find((item) =>
                      sameIdentity(item.identity, entry.authorIdentity),
                    );
                    return (
                      <p key={entry.id.toString()}>
                        “{entry.content}” <small>— {author?.displayName}</small>
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
        <div className="result-actions">
          <button
            className="primary-button"
            disabled={!validManifest || !!busyAction}
            onClick={() => void shareResult()}
          >
            {busyAction === "share"
              ? "Compartilhando…"
              : "Compartilhar resultado"}
          </button>
          <button
            className="secondary-button"
            disabled={!validManifest || !!busyAction}
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
            className="quiet-button"
            disabled={!!busyAction}
            onClick={() => void startAnotherJourney()}
          >
            {busyAction === "leave" ? "Preparando…" : "Começar nova jornada"}
          </button>
        </div>
        <div className="result-feedback" aria-live="polite">
          {notice && <p className="success-message">✓ {notice}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
      </footer>
    </main>
  );
}

export default App;
