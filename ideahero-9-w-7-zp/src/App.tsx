import { FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";
import { reducers, tables } from "./module_bindings";
import type { Contribution, Player, Room } from "./module_bindings/types";
import { useReducer, useSpacetimeDB, useTable } from "spacetimedb/react";

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

function App() {
  const { identity, isActive: connected } = useSpacetimeDB();
  const [profiles, profilesReady] = useTable(tables.profile);
  const [rooms, roomsReady] = useTable(tables.room);
  const [players, playersReady] = useTable(tables.player);
  const [contributions, contributionsReady] = useTable(tables.contribution);

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

  if (!connected || !identity) {
    return <LoadingScreen label="Conectando sua identidade criativa…" />;
  }

  if (!profilesReady || !roomsReady || !playersReady || !contributionsReady) {
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
      currentPlayer={currentPlayer}
    />
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="loading-screen">
      <div className="brand-mark" aria-hidden="true">
        ✦
      </div>
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
                  />
                  <span>{AVATAR_GLYPHS[avatar]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="error-message">{error}</p>}
          <button className="primary-button" disabled={saving}>
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
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function makeRoomCode() {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
    return `ideia-${suffix}`;
  }

  return (
    <main className="centered-page">
      <section className="welcome-card room-entry-card">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <p className="kicker">Olá, {displayName}</p>
            <h1>Vamos mudar o mundo?</h1>
          </div>
        </div>
        <p className="intro">
          Crie uma nova sala ou entre pelo código compartilhado pelo grupo.
        </p>

        <div className="room-actions">
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => run(() => createRoom({ code: makeRoomCode() }))}
          >
            Criar uma sala
          </button>

          <div className="divider">
            <span>ou</span>
          </div>

          <form
            className="join-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => joinRoom({ code: joinCode }));
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
                required
              />
            </label>
            <button className="secondary-button" disabled={busy}>
              Entrar na sala
            </button>
          </form>
        </div>

        {error && <p className="error-message">{error}</p>}
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

  async function copyCode() {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="app-shell lobby-page">
      <header className="topbar">
        <div className="mini-brand">
          <span>✦</span> Idea Hero
        </div>
        <span className="connection-status">● Sincronizado</span>
      </header>

      <section className="lobby-hero">
        <p className="kicker">Sala de preparação</p>
        <h1>A aventura começa com o grupo</h1>
        <p>Compartilhe o código e espere todo mundo ficar pronto.</p>

        <button className="room-code" onClick={() => void copyCode()}>
          <span>{room.code}</span>
          <small>{copied ? "Copiado!" : "Copiar código"}</small>
        </button>
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
  currentPlayer,
}: {
  room: Room;
  players: Player[];
  contributions: Contribution[];
  currentPlayer: Player;
}) {
  const submitContribution = useReducer(reducers.submitContribution);
  const advanceStage = useReducer(reducers.advanceStage);
  const stage = room.currentStage as BoardState;
  const content = STAGE_CONTENT[stage] ?? STAGE_CONTENT.SCENARIO;
  const stageContributions = contributions.filter(
    (item) => item.stage === stage,
  );
  const ownContribution = stageContributions.find((item) =>
    sameIdentity(item.authorIdentity, currentPlayer.identity),
  );
  const [draft, setDraft] = useState(ownContribution?.content ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
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

  async function nextStage() {
    setError("");
    try {
      await advanceStage({ roomId: room.id });
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  if (room.status === "FINISHED") {
    return (
      <JourneyResult
        room={room}
        players={players}
        contributions={contributions}
      />
    );
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="game-brand">
          <span>✦</span> Idea Hero
        </div>
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
        />
      )}

      <section className="stage-layout">
        <article className="stage-intro">
          <p className="kicker">
            Etapa {room.stageIndex + 1} de 8 · {content.eyebrow}
          </p>
          <h1>{content.title}</h1>
          <p>{content.objective}</p>
          <div
            className="stage-card"
            aria-label={`Carta da etapa ${content.eyebrow}`}
          >
            <span className="card-orbit" aria-hidden="true">
              {content.icon}
            </span>
            <strong>Imagine sem limites</strong>
            <small>
              A imagem inspiracional será conectada ao catálogo na próxima
              fatia.
            </small>
          </div>
        </article>

        <article className="contribution-panel">
          <div className="section-heading">
            <div>
              <p className="kicker">Sua contribuição</p>
              <h2>{content.prompt}</h2>
            </div>
            <span>
              {stageContributions.length}/{players.length} enviadas
            </span>
          </div>

          <form onSubmit={saveContribution} className="contribution-form">
            <label className="sr-only" htmlFor="contribution">
              Sua contribuição
            </label>
            <textarea
              id="contribution"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Registre uma frase para o grupo…"
              minLength={2}
              maxLength={280}
              required
            />
            <div className="form-footer">
              <small>{draft.length}/280</small>
              <button className="primary-button" disabled={saving}>
                {saving
                  ? "Salvando…"
                  : ownContribution
                    ? "Atualizar contribuição"
                    : "Compartilhar ideia"}
              </button>
            </div>
          </form>

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

          {isHost && (
            <button
              className="secondary-button next-stage-button"
              disabled={stageContributions.length === 0}
              onClick={() => void nextStage()}
            >
              {stage === "SALES"
                ? "Concluir a jornada"
                : "Avançar para a próxima etapa"}
            </button>
          )}
          {!isHost && (
            <p className="waiting-note">
              O anfitrião avança quando o grupo estiver pronto.
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
}: {
  room: Room;
  contributions: Contribution[];
  players: Player[];
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
          return (
            <section key={stage}>
              <strong>{STAGE_CONTENT[stage].eyebrow}</strong>
              {entries.length === 0 ? (
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
}: {
  room: Room;
  players: Player[];
  contributions: Contribution[];
}) {
  return (
    <main className="result-page">
      <section className="result-hero">
        <span className="result-star" aria-hidden="true">
          ★
        </span>
        <p className="kicker">Jornada concluída</p>
        <h1>Uma ideia agora existe onde antes havia possibilidades.</h1>
        <p>
          {players.length}{" "}
          {players.length === 1 ? "pessoa percorreu" : "pessoas percorreram"} as
          oito etapas na sala {room.code}.
        </p>
      </section>

      <section className="journey-document">
        {BOARD_STATES.map((stage) => {
          const entries = contributions.filter((item) => item.stage === stage);
          return (
            <article key={stage}>
              <div className="document-stage-number">
                {BOARD_STATES.indexOf(stage) + 1}
              </div>
              <div>
                <p className="kicker">{STAGE_CONTENT[stage].eyebrow}</p>
                <h2>{STAGE_CONTENT[stage].title}</h2>
                {entries.map((entry) => {
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

      <footer className="result-footer">
        <p>
          Este é o primeiro artefato persistente da V2. Exportação e
          compartilhamento vêm na próxima fatia.
        </p>
        <button className="primary-button" onClick={() => window.print()}>
          Imprimir jornada
        </button>
      </footer>
    </main>
  );
}

export default App;
