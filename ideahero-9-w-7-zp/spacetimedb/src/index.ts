import { schema, t, table, SenderError } from "spacetimedb/server";
import { CARD_CATALOG, cardForRoomStage } from "./cards";

const BOARD_STATES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "PILOT",
  "MARKETING",
  "SALES",
] as const;

const COLLABORATIVE_STAGES = new Set<string>(BOARD_STATES.slice(0, 4));

const profile = table(
  { name: "profile", public: true },
  {
    identity: t.identity().primaryKey(),
    displayName: t.string().optional(),
    avatarId: t.string().optional(),
    online: t.bool(),
    updatedAt: t.timestamp(),
  },
);

const room = table(
  { name: "room", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    code: t.string().unique(),
    ownerIdentity: t.identity(),
    status: t.string(),
    mode: t.string(),
    currentStage: t.string(),
    stageIndex: t.u8(),
    round: t.u32(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const player = table(
  { name: "player", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    identity: t.identity().index("btree"),
    displayName: t.string(),
    avatarId: t.string(),
    role: t.string(),
    ready: t.bool(),
    online: t.bool(),
    points: t.u32(),
    joinedAt: t.timestamp(),
  },
);

const contribution = table(
  { name: "contribution", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    authorIdentity: t.identity().index("btree"),
    kind: t.string(),
    content: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const card = table(
  { name: "card", public: true },
  {
    id: t.string().primaryKey(),
    stage: t.string().index("btree"),
    title: t.string(),
    lens: t.string(),
    imagePath: t.string(),
    altText: t.string(),
    provocation: t.string(),
  },
);

const cardDraw = table(
  { name: "card_draw", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    cardId: t.string().index("btree"),
    drawnAt: t.timestamp(),
  },
);

const stageSession = table(
  { name: "stage_session", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    phase: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const vote = table(
  { name: "vote", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    voterIdentity: t.identity().index("btree"),
    contributionId: t.u64().index("btree"),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const decision = table(
  { name: "decision", public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    selectedContributionId: t.u64().index("btree"),
    summary: t.string(),
    totalVotes: t.u32(),
    decidedAt: t.timestamp(),
  },
);

const spacetimedb = schema({
  profile,
  room,
  player,
  contribution,
  card,
  cardDraw,
  stageSession,
  vote,
  decision,
});
export default spacetimedb;

function normalizeName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 24) {
    throw new SenderError("O nome deve ter entre 2 e 24 caracteres.");
  }
  return normalized;
}

function normalizeAvatar(avatarId: string) {
  const normalized = avatarId.trim();
  if (!normalized || normalized.length > 64) {
    throw new SenderError("Escolha um avatar válido.");
  }
  return normalized;
}

function normalizeRoomCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9-]{4,24}$/.test(normalized)) {
    throw new SenderError(
      "O código deve ter entre 4 e 24 caracteres, usando letras, números ou hífen.",
    );
  }
  return normalized;
}

export const set_profile = spacetimedb.reducer(
  { displayName: t.string(), avatarId: t.string() },
  (ctx, { displayName, avatarId }) => {
    const current = ctx.db.profile.identity.find(ctx.sender);
    if (!current) {
      throw new SenderError("Perfil ainda não foi inicializado. Reconecte.");
    }

    ctx.db.profile.identity.update({
      ...current,
      displayName: normalizeName(displayName),
      avatarId: normalizeAvatar(avatarId),
      updatedAt: ctx.timestamp,
    });
  },
);

export const create_room = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const currentProfile = ctx.db.profile.identity.find(ctx.sender);
    if (!currentProfile?.displayName || !currentProfile.avatarId) {
      throw new SenderError("Complete seu perfil antes de criar uma sala.");
    }

    const normalizedCode = normalizeRoomCode(code);
    if (ctx.db.room.code.find(normalizedCode)) {
      throw new SenderError("Este código de sala já está em uso.");
    }

    const createdRoom = ctx.db.room.insert({
      id: 0n,
      code: normalizedCode,
      ownerIdentity: ctx.sender,
      status: "LOBBY",
      mode: "COLLABORATIVE",
      currentStage: BOARD_STATES[0],
      stageIndex: 0,
      round: 1,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });

    ctx.db.player.insert({
      id: 0n,
      roomId: createdRoom.id,
      identity: ctx.sender,
      displayName: currentProfile.displayName,
      avatarId: currentProfile.avatarId,
      role: "HOST",
      ready: true,
      online: true,
      points: 30_000,
      joinedAt: ctx.timestamp,
    });
  },
);

export const join_room = spacetimedb.reducer(
  { code: t.string() },
  (ctx, { code }) => {
    const currentProfile = ctx.db.profile.identity.find(ctx.sender);
    if (!currentProfile?.displayName || !currentProfile.avatarId) {
      throw new SenderError("Complete seu perfil antes de entrar em uma sala.");
    }

    const existingRoom = ctx.db.room.code.find(normalizeRoomCode(code));
    if (!existingRoom) throw new SenderError("Sala não encontrada.");
    if (existingRoom.status === "FINISHED") {
      throw new SenderError("Esta jornada já foi encerrada.");
    }

    const existingPlayer = [...ctx.db.player.iter()].find(
      (item) =>
        item.roomId === existingRoom.id && item.identity.isEqual(ctx.sender),
    );

    if (existingPlayer) {
      ctx.db.player.id.update({
        ...existingPlayer,
        displayName: currentProfile.displayName,
        avatarId: currentProfile.avatarId,
        online: true,
      });
      return;
    }

    if (existingRoom.status !== "LOBBY") {
      throw new SenderError("A partida já começou.");
    }

    const roomPlayers = [...ctx.db.player.iter()].filter(
      (item) => item.roomId === existingRoom.id,
    );
    if (roomPlayers.length >= 6) throw new SenderError("A sala está cheia.");

    ctx.db.player.insert({
      id: 0n,
      roomId: existingRoom.id,
      identity: ctx.sender,
      displayName: currentProfile.displayName,
      avatarId: currentProfile.avatarId,
      role: "PLAYER",
      ready: false,
      online: true,
      points: 30_000,
      joinedAt: ctx.timestamp,
    });
  },
);

export const set_ready = spacetimedb.reducer(
  { roomId: t.u64(), ready: t.bool() },
  (ctx, { roomId, ready }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom || currentRoom.status !== "LOBBY") {
      throw new SenderError("A sala não está mais no lobby.");
    }

    const currentPlayer = [...ctx.db.player.iter()].find(
      (item) => item.roomId === roomId && item.identity.isEqual(ctx.sender),
    );
    if (!currentPlayer) throw new SenderError("Você não pertence a esta sala.");

    ctx.db.player.id.update({ ...currentPlayer, ready });
  },
);

export const start_game = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom) throw new SenderError("Sala não encontrada.");
    if (!currentRoom.ownerIdentity.isEqual(ctx.sender)) {
      throw new SenderError("Apenas o anfitrião pode iniciar a jornada.");
    }
    if (currentRoom.status !== "LOBBY") {
      throw new SenderError("A jornada já foi iniciada.");
    }

    const roomPlayers = [...ctx.db.player.iter()].filter(
      (item) => item.roomId === roomId,
    );
    if (roomPlayers.length === 0 || roomPlayers.some((item) => !item.ready)) {
      throw new SenderError("Todos os jogadores precisam estar prontos.");
    }

    ctx.db.room.id.update({
      ...currentRoom,
      status: "ACTIVE",
      currentStage: BOARD_STATES[0],
      stageIndex: 0,
      round: 1,
      updatedAt: ctx.timestamp,
    });

    const drawnCard = cardForRoomStage(currentRoom.code, BOARD_STATES[0]);
    if (!ctx.db.card.id.find(drawnCard.id)) {
      ctx.db.card.insert({
        id: drawnCard.id,
        stage: drawnCard.stage,
        title: drawnCard.title,
        lens: drawnCard.lens,
        imagePath: drawnCard.imagePath,
        altText: drawnCard.altText,
        provocation: drawnCard.provocation,
      });
    }
    ctx.db.cardDraw.insert({
      id: 0n,
      roomId,
      stage: BOARD_STATES[0],
      cardId: drawnCard.id,
      drawnAt: ctx.timestamp,
    });

    ctx.db.stageSession.insert({
      id: 0n,
      roomId,
      stage: BOARD_STATES[0],
      phase: "CONTRIBUTING",
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
  },
);

export const submit_contribution = spacetimedb.reducer(
  { roomId: t.u64(), content: t.string() },
  (ctx, { roomId, content }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom || currentRoom.status !== "ACTIVE") {
      throw new SenderError("Esta jornada não está ativa.");
    }

    const currentSession = [...ctx.db.stageSession.iter()].find(
      (item) =>
        item.roomId === roomId && item.stage === currentRoom.currentStage,
    );
    if (currentSession && currentSession.phase !== "CONTRIBUTING") {
      throw new SenderError(
        "As contribuições desta etapa já foram encerradas.",
      );
    }

    const currentPlayer = [...ctx.db.player.iter()].find(
      (item) => item.roomId === roomId && item.identity.isEqual(ctx.sender),
    );
    if (!currentPlayer) throw new SenderError("Você não pertence a esta sala.");

    const normalized = content.trim().replace(/\s+/g, " ");
    if (normalized.length < 2 || normalized.length > 280) {
      throw new SenderError(
        "A contribuição deve ter entre 2 e 280 caracteres.",
      );
    }

    const existing = [...ctx.db.contribution.iter()].find(
      (item) =>
        item.roomId === roomId &&
        item.stage === currentRoom.currentStage &&
        item.authorIdentity.isEqual(ctx.sender) &&
        item.kind === "MAIN",
    );

    if (existing) {
      ctx.db.contribution.id.update({
        ...existing,
        content: normalized,
        updatedAt: ctx.timestamp,
      });
      return;
    }

    ctx.db.contribution.insert({
      id: 0n,
      roomId,
      stage: currentRoom.currentStage,
      authorIdentity: ctx.sender,
      kind: "MAIN",
      content: normalized,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
  },
);

export const open_voting = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom || currentRoom.status !== "ACTIVE") {
      throw new SenderError("Esta jornada não está ativa.");
    }
    if (!currentRoom.ownerIdentity.isEqual(ctx.sender)) {
      throw new SenderError("Apenas o anfitrião pode abrir a votação.");
    }
    if (!COLLABORATIVE_STAGES.has(currentRoom.currentStage)) {
      throw new SenderError("Esta etapa não utiliza votação.");
    }

    const currentSession = [...ctx.db.stageSession.iter()].find(
      (item) =>
        item.roomId === roomId && item.stage === currentRoom.currentStage,
    );
    if (currentSession && currentSession.phase !== "CONTRIBUTING") {
      throw new SenderError("A votação desta etapa não pode ser aberta agora.");
    }

    const contributions = [...ctx.db.contribution.iter()].filter(
      (item) =>
        item.roomId === roomId &&
        item.stage === currentRoom.currentStage &&
        item.kind === "MAIN",
    );
    const onlinePlayers = [...ctx.db.player.iter()].filter(
      (item) => item.roomId === roomId && item.online,
    );
    const waitingPlayer = onlinePlayers.find(
      (currentPlayer) =>
        !contributions.some((item) =>
          item.authorIdentity.isEqual(currentPlayer.identity),
        ),
    );
    if (waitingPlayer) {
      throw new SenderError(
        `${waitingPlayer.displayName} ainda precisa contribuir.`,
      );
    }

    if (currentSession) {
      ctx.db.stageSession.id.update({
        ...currentSession,
        phase: "VOTING",
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.stageSession.insert({
        id: 0n,
        roomId,
        stage: currentRoom.currentStage,
        phase: "VOTING",
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });
    }
  },
);

export const cast_vote = spacetimedb.reducer(
  { roomId: t.u64(), contributionId: t.u64() },
  (ctx, { roomId, contributionId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom || currentRoom.status !== "ACTIVE") {
      throw new SenderError("Esta jornada não está ativa.");
    }

    const currentPlayer = [...ctx.db.player.iter()].find(
      (item) => item.roomId === roomId && item.identity.isEqual(ctx.sender),
    );
    if (!currentPlayer) throw new SenderError("Você não pertence a esta sala.");

    const currentSession = [...ctx.db.stageSession.iter()].find(
      (item) =>
        item.roomId === roomId && item.stage === currentRoom.currentStage,
    );
    if (!currentSession || currentSession.phase !== "VOTING") {
      throw new SenderError("A votação ainda não está aberta.");
    }

    const selectedContribution = ctx.db.contribution.id.find(contributionId);
    if (
      !selectedContribution ||
      selectedContribution.roomId !== roomId ||
      selectedContribution.stage !== currentRoom.currentStage ||
      selectedContribution.kind !== "MAIN"
    ) {
      throw new SenderError("Escolha uma contribuição válida desta etapa.");
    }

    const existingVote = [...ctx.db.vote.iter()].find(
      (item) =>
        item.roomId === roomId &&
        item.stage === currentRoom.currentStage &&
        item.voterIdentity.isEqual(ctx.sender),
    );
    if (existingVote) {
      ctx.db.vote.id.update({
        ...existingVote,
        contributionId,
        updatedAt: ctx.timestamp,
      });
      return;
    }

    ctx.db.vote.insert({
      id: 0n,
      roomId,
      stage: currentRoom.currentStage,
      voterIdentity: ctx.sender,
      contributionId,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
  },
);

export const resolve_stage = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom || currentRoom.status !== "ACTIVE") {
      throw new SenderError("Esta jornada não está ativa.");
    }
    if (!currentRoom.ownerIdentity.isEqual(ctx.sender)) {
      throw new SenderError("Apenas o anfitrião pode revelar a decisão.");
    }

    const currentSession = [...ctx.db.stageSession.iter()].find(
      (item) =>
        item.roomId === roomId && item.stage === currentRoom.currentStage,
    );
    if (!currentSession || currentSession.phase !== "VOTING") {
      throw new SenderError("Esta etapa não está em votação.");
    }

    const onlinePlayers = [...ctx.db.player.iter()].filter(
      (item) => item.roomId === roomId && item.online,
    );
    const stageVotes = [...ctx.db.vote.iter()].filter(
      (item) =>
        item.roomId === roomId &&
        item.stage === currentRoom.currentStage &&
        onlinePlayers.some((currentPlayer) =>
          item.voterIdentity.isEqual(currentPlayer.identity),
        ),
    );
    const waitingPlayer = onlinePlayers.find(
      (currentPlayer) =>
        !stageVotes.some((item) =>
          item.voterIdentity.isEqual(currentPlayer.identity),
        ),
    );
    if (waitingPlayer) {
      throw new SenderError(
        `${waitingPlayer.displayName} ainda precisa votar.`,
      );
    }

    const contributions = [...ctx.db.contribution.iter()].filter(
      (item) =>
        item.roomId === roomId &&
        item.stage === currentRoom.currentStage &&
        item.kind === "MAIN",
    );
    if (contributions.length === 0) {
      throw new SenderError("Nenhuma contribuição disponível para decidir.");
    }

    let selectedContribution = contributions[0];
    let winningVotes = -1;
    for (const currentContribution of contributions) {
      const total = stageVotes.filter(
        (item) => item.contributionId === currentContribution.id,
      ).length;
      if (
        total > winningVotes ||
        (total === winningVotes &&
          currentContribution.id < selectedContribution.id)
      ) {
        selectedContribution = currentContribution;
        winningVotes = total;
      }
    }

    ctx.db.decision.insert({
      id: 0n,
      roomId,
      stage: currentRoom.currentStage,
      selectedContributionId: selectedContribution.id,
      summary: selectedContribution.content,
      totalVotes: winningVotes,
      decidedAt: ctx.timestamp,
    });
    ctx.db.stageSession.id.update({
      ...currentSession,
      phase: "REVIEW",
      updatedAt: ctx.timestamp,
    });
  },
);

export const advance_stage = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom) throw new SenderError("Sala não encontrada.");
    if (!currentRoom.ownerIdentity.isEqual(ctx.sender)) {
      throw new SenderError("Apenas o anfitrião pode avançar a etapa.");
    }
    if (currentRoom.status !== "ACTIVE") {
      throw new SenderError("A jornada não está ativa.");
    }

    if (COLLABORATIVE_STAGES.has(currentRoom.currentStage)) {
      const currentSession = [...ctx.db.stageSession.iter()].find(
        (item) =>
          item.roomId === roomId && item.stage === currentRoom.currentStage,
      );
      const currentDecision = [...ctx.db.decision.iter()].find(
        (item) =>
          item.roomId === roomId && item.stage === currentRoom.currentStage,
      );
      if (
        !currentSession ||
        currentSession.phase !== "REVIEW" ||
        !currentDecision
      ) {
        throw new SenderError(
          "Revele e revise a decisão coletiva antes de avançar.",
        );
      }
    }

    const stageContributions = [...ctx.db.contribution.iter()].filter(
      (item) =>
        item.roomId === roomId && item.stage === currentRoom.currentStage,
    );
    const onlinePlayers = [...ctx.db.player.iter()].filter(
      (item) => item.roomId === roomId && item.online,
    );
    const waitingPlayer = onlinePlayers.find(
      (currentPlayer) =>
        !stageContributions.some((item) =>
          item.authorIdentity.isEqual(currentPlayer.identity),
        ),
    );
    if (waitingPlayer) {
      throw new SenderError(
        `${waitingPlayer.displayName} ainda precisa contribuir.`,
      );
    }

    const nextIndex = currentRoom.stageIndex + 1;
    if (nextIndex >= BOARD_STATES.length) {
      ctx.db.room.id.update({
        ...currentRoom,
        status: "FINISHED",
        updatedAt: ctx.timestamp,
      });
      return;
    }

    const nextStage = BOARD_STATES[nextIndex];
    const drawnCard = cardForRoomStage(currentRoom.code, nextStage);
    if (!ctx.db.card.id.find(drawnCard.id)) {
      ctx.db.card.insert({
        id: drawnCard.id,
        stage: drawnCard.stage,
        title: drawnCard.title,
        lens: drawnCard.lens,
        imagePath: drawnCard.imagePath,
        altText: drawnCard.altText,
        provocation: drawnCard.provocation,
      });
    }
    ctx.db.cardDraw.insert({
      id: 0n,
      roomId,
      stage: nextStage,
      cardId: drawnCard.id,
      drawnAt: ctx.timestamp,
    });
    ctx.db.stageSession.insert({
      id: 0n,
      roomId,
      stage: nextStage,
      phase: "CONTRIBUTING",
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });

    ctx.db.room.id.update({
      ...currentRoom,
      currentStage: nextStage,
      stageIndex: nextIndex,
      round: currentRoom.round + 1,
      updatedAt: ctx.timestamp,
    });
  },
);

export const init = spacetimedb.init((ctx) => {
  for (const catalogCard of CARD_CATALOG) {
    ctx.db.card.insert({
      id: catalogCard.id,
      stage: catalogCard.stage,
      title: catalogCard.title,
      lens: catalogCard.lens,
      imagePath: catalogCard.imagePath,
      altText: catalogCard.altText,
      provocation: catalogCard.provocation,
    });
  }

  console.info("Idea Hero V2 database initialized.");
});

export const onConnect = spacetimedb.clientConnected((ctx) => {
  const currentProfile = ctx.db.profile.identity.find(ctx.sender);
  if (currentProfile) {
    ctx.db.profile.identity.update({
      ...currentProfile,
      online: true,
      updatedAt: ctx.timestamp,
    });
  } else {
    ctx.db.profile.insert({
      identity: ctx.sender,
      displayName: undefined,
      avatarId: undefined,
      online: true,
      updatedAt: ctx.timestamp,
    });
  }

  for (const currentPlayer of ctx.db.player.iter()) {
    if (currentPlayer.identity.isEqual(ctx.sender)) {
      ctx.db.player.id.update({ ...currentPlayer, online: true });
    }
  }
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  const currentProfile = ctx.db.profile.identity.find(ctx.sender);
  if (currentProfile) {
    ctx.db.profile.identity.update({
      ...currentProfile,
      online: false,
      updatedAt: ctx.timestamp,
    });
  }

  for (const currentPlayer of ctx.db.player.iter()) {
    if (currentPlayer.identity.isEqual(ctx.sender)) {
      ctx.db.player.id.update({ ...currentPlayer, online: false });
    }
  }
});
