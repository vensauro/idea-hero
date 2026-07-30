import { schema, t, table, SenderError } from "spacetimedb/server";
import { Timestamp } from "spacetimedb";
import {
  CARD_CATALOG,
  cardForRoomStage,
  replacementCardForRoomStage,
} from "./cards";
import {
  CARD_REDRAW_COST,
  INITIAL_RUNWAY,
  PROTOTYPE_BASE_SECONDS,
  PROTOTYPE_CREATIVE_BONUS,
  PROTOTYPE_EXTENSION_COST,
  PROTOTYPE_EXTENSION_SECONDS,
  calculateSalesResult,
  createFundingOpportunity,
  createStageCosts,
  effectiveMarketMultiplier,
  marketingLaunchOption,
  marketResponseForSeed,
  pilotFeedbackForSeed,
  prototypeChallengeForSeed,
} from "./economy";

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
const MIN_PLAYERS = 2;
const ROOM_CODE_TTL_MICROS = 24n * 60n * 60n * 1_000_000n;
const DRAWING_COLORS = [
  "#e85671",
  "#218c95",
  "#6f58c9",
  "#e39a22",
  "#438454",
  "#a94791",
];

type CollaborativeStagePlan = {
  resolution: "VOTE" | "UNION";
  actions: readonly {
    key: string;
    title: string;
    prompt: string;
    placeholder: string;
  }[];
};

// This is the only place that decides how the early creative stages work.
// A session snapshots the resolution and player assignments when it starts, so
// changing this ruleset never changes a journey already in progress.
const COLLABORATIVE_STAGE_PLANS: Record<string, CollaborativeStagePlan> = {
  SCENARIO: {
    resolution: "UNION",
    actions: [
      {
        key: "PLACE",
        title: "O lugar",
        prompt:
          "Descreva onde essa historia acontece e o que torna esse lugar especial.",
        placeholder: "Este lugar e...",
      },
      {
        key: "PEOPLE",
        title: "As pessoas",
        prompt:
          "Apresente quem vive esse momento e o que importa para essas pessoas.",
        placeholder: "Aqui vivem pessoas que...",
      },
      {
        key: "TENSION",
        title: "A tensao",
        prompt: "Encontre uma tensao ou mudanca que mexe com esse mundo.",
        placeholder: "Algo mudou quando...",
      },
      {
        key: "ATMOSPHERE",
        title: "A atmosfera",
        prompt:
          "Diga como esse mundo parece, soa ou faz as pessoas se sentirem.",
        placeholder: "O clima desse mundo e...",
      },
      {
        key: "RESOURCE",
        title: "O recurso",
        prompt: "Aponte algo que esse mundo ja tem e que pode virar uma forca.",
        placeholder: "Ja existe aqui...",
      },
      {
        key: "FUTURE",
        title: "O futuro proximo",
        prompt:
          "Imagine uma pequena mudanca que pode acontecer em breve nesse mundo.",
        placeholder: "Nos proximos dias...",
      },
    ],
  },
  PROBLEM: {
    resolution: "VOTE",
    actions: [
      {
        key: "PROBLEM",
        title: "Sua leitura do problema",
        prompt: "Qual necessidade merece ser resolvida primeiro?",
        placeholder: "O desafio e que...",
      },
    ],
  },
  INSIGHT: {
    resolution: "UNION",
    actions: [
      {
        key: "CAUSE",
        title: "A causa escondida",
        prompt: "Investigue uma causa que ajuda a explicar esse problema.",
        placeholder: "Isso acontece porque...",
      },
      {
        key: "BEHAVIOR",
        title: "Um comportamento",
        prompt:
          "Observe um habito ou comportamento que revela algo importante.",
        placeholder: "As pessoas costumam...",
      },
      {
        key: "CONTRADICTION",
        title: "A contradicao",
        prompt:
          "Encontre algo que parece contraditorio, mas abre uma oportunidade.",
        placeholder: "Mesmo que..., as pessoas...",
      },
      {
        key: "RESOURCE",
        title: "Um recurso esquecido",
        prompt:
          "Aponte um recurso, relacao ou capacidade que ainda nao foi aproveitado.",
        placeholder: "Ja existe uma forca em...",
      },
      {
        key: "SIGNAL",
        title: "Um sinal de mudanca",
        prompt: "Descreva um sinal de que esse contexto esta mudando.",
        placeholder: "Um sinal disso e...",
      },
      {
        key: "OPENING",
        title: "A abertura",
        prompt: "Formule uma abertura que possa mudar o rumo da ideia.",
        placeholder: "Talvez possamos...",
      },
    ],
  },
  SOLUTION: {
    resolution: "VOTE",
    actions: [
      {
        key: "SOLUTION",
        title: "Sua proposta de solucao",
        prompt: "Que solucao inesperada conecta cenario, problema e insight?",
        placeholder: "E se criassemos uma forma de...",
      },
    ],
  },
};

function collaborativeStagePlan(stage: string): CollaborativeStagePlan {
  const plan = COLLABORATIVE_STAGE_PLANS[stage];
  if (!plan)
    throw new SenderError("A etapa colaborativa nao possui uma regra.");
  return plan;
}

const profile = table(
  { name: "profile" },
  {
    identity: t.identity().primaryKey(),
    displayName: t.string().optional(),
    avatarId: t.string().optional(),
    online: t.bool(),
    updatedAt: t.timestamp(),
  },
);

const room = table(
  { name: "room" },
  {
    id: t.u64().primaryKey().autoInc(),
    code: t.string(),
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

const roomCode = table(
  { name: "room_code" },
  {
    code: t.string().primaryKey(),
    roomId: t.u64().index("btree"),
    expiresAt: t.timestamp(),
  },
);

const player = table(
  { name: "player" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    identity: t.identity().index("btree"),
    displayName: t.string(),
    avatarId: t.string(),
    role: t.string(),
    ready: t.bool(),
    online: t.bool(),
    joinedAt: t.timestamp(),
    // Preserve attribution after someone leaves a room.
    active: t.bool().default(true),
  },
);

const contribution = table(
  { name: "contribution" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    authorIdentity: t.identity().index("btree"),
    kind: t.string(),
    content: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    // Existing contributions are the shared action from the original flow.
    actionKey: t.string().default("MAIN"),
  },
);

const roomEconomy = table(
  { name: "room_economy" },
  {
    roomId: t.u64().primaryKey(),
    initialBalance: t.u32(),
    balance: t.u32(),
    reservedBalance: t.u32(),
    seed: t.u32(),
    nextSequence: t.u32(),
    fundingStage: t.string(),
    fundingValue: t.u32(),
    fundingTitle: t.string(),
    fundingDescription: t.string(),
    fundingRevealed: t.bool(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const stageCost = table(
  { name: "stage_cost" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    amount: t.u32(),
    label: t.string(),
    applied: t.bool(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const economyTransaction = table(
  { name: "economy_transaction" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    delta: t.i32(),
    balanceAfter: t.u32(),
    sequence: t.u32(),
    reason: t.string(),
    eventKey: t.string().unique(),
    label: t.string(),
    createdAt: t.timestamp(),
  },
);

const projectPrototype = table(
  { name: "project_prototype" },
  {
    roomId: t.u64().primaryKey(),
    challengeKey: t.string(),
    challengeTitle: t.string(),
    challengeDescription: t.string(),
    artifactKind: t.string(),
    artifactData: t.string(),
    caption: t.string(),
    durationSeconds: t.u32(),
    investment: t.u32(),
    // Keep the new field defaulted so deployed rooms can migrate safely.
    creativePoints: t.u32().default(0),
    committed: t.bool(),
    startedAt: t.timestamp(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const prototypeArtifact = table(
  { name: "prototype_artifact" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    artifactKind: t.string().index("btree"),
    artifactData: t.string(),
    caption: t.string(),
    authorIdentity: t.identity().index("btree"),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const prototypeDrawingStroke = table(
  { name: "prototype_drawing_stroke" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    authorIdentity: t.identity().index("btree"),
    color: t.string(),
    points: t.string(),
    createdAt: t.timestamp(),
  },
);

const groupVote = table(
  { name: "group_vote" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    topic: t.string().index("btree"),
    playerIdentity: t.identity().index("btree"),
    choice: t.string(),
    updatedAt: t.timestamp(),
  },
);

const pilotSimulation = table(
  { name: "pilot_simulation" },
  {
    roomId: t.u64().primaryKey(),
    feedbackTitle: t.string(),
    feedbackDescription: t.string(),
    optionA: t.string(),
    optionADescription: t.string(),
    optionALearning: t.string(),
    optionB: t.string(),
    optionBDescription: t.string(),
    optionBLearning: t.string(),
    optionC: t.string(),
    optionCDescription: t.string(),
    optionCLearning: t.string(),
    decision: t.string(),
    learning: t.string(),
    completed: t.bool(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const marketingPlan = table(
  { name: "marketing_plan" },
  {
    roomId: t.u64().primaryKey(),
    optionKey: t.string(),
    audience: t.string(),
    valuePromise: t.string(),
    channel: t.string(),
    callToAction: t.string(),
    investment: t.u32(),
    responseTitle: t.string(),
    responseDescription: t.string(),
    baseMultiplier: t.u32(),
    matched: t.bool(),
    effectiveMultiplier: t.u32(),
    committed: t.bool(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const salesResult = table(
  { name: "sales_result" },
  {
    roomId: t.u64().primaryKey(),
    remainingCredits: t.u32(),
    marketingInvestment: t.u32(),
    multiplier: t.u32(),
    simulatedSales: t.u32(),
    finalRunway: t.u32(),
    tier: t.string(),
    createdAt: t.timestamp(),
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
  { name: "card_draw" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    cardId: t.string().index("btree"),
    drawnAt: t.timestamp(),
    drawIndex: t.u8().default(0),
    active: t.bool().default(true),
    reason: t.string().default("INITIAL"),
  },
);

const stageSession = table(
  { name: "stage_session" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    phase: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    // VOTE is the migration-safe behavior for sessions created before rulesets.
    resolution: t.string().default("VOTE"),
  },
);

const stageAssignment = table(
  { name: "stage_assignment" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    playerIdentity: t.identity().index("btree"),
    actionKey: t.string(),
    actionTitle: t.string(),
    actionPrompt: t.string(),
    actionPlaceholder: t.string(),
    position: t.u8(),
    createdAt: t.timestamp(),
  },
);

const stageOutcome = table(
  { name: "stage_outcome" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().index("btree"),
    stage: t.string().index("btree"),
    resolution: t.string(),
    summary: t.string(),
    sourceCount: t.u32(),
    resolvedAt: t.timestamp(),
  },
);

const vote = table(
  { name: "vote" },
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
  { name: "decision" },
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

const journey = table(
  { name: "journey" },
  {
    id: t.u64().primaryKey().autoInc(),
    roomId: t.u64().unique(),
    title: t.string(),
    summary: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    // Must remain last with a default so existing Maincloud rows can migrate.
    publicId: t.string().default(""),
  },
);

// This is a deliberately small public snapshot. The private journey, players,
// contributions, and decisions never become public just because a result is shared.
const publishedResult = table(
  { name: "published_result", public: true },
  {
    token: t.string().primaryKey(),
    roomId: t.u64().unique(),
    publicId: t.string(),
    title: t.string(),
    summary: t.string(),
    participantCount: t.u32(),
    hasSalesResult: t.bool(),
    finalRunway: t.u32(),
    publishedAt: t.timestamp(),
    updatedAt: t.timestamp(),
  },
);

const contributionStatus = t.object("ContributionStatus", {
  id: t.u64(),
  roomId: t.u64(),
  stage: t.string(),
  authorIdentity: t.identity(),
});

const voteStatus = t.object("VoteStatus", {
  id: t.u64(),
  roomId: t.u64(),
  stage: t.string(),
  voterIdentity: t.identity(),
});

const visibleContribution = t.object("VisibleContribution", {
  id: t.u64(),
  roomId: t.u64(),
  stage: t.string(),
  authorIdentity: t.identity().optional(),
  kind: t.string(),
  content: t.string(),
  createdAt: t.timestamp(),
  updatedAt: t.timestamp(),
  actionKey: t.string(),
});

const spacetimedb = schema({
  profile,
  room,
  roomCode,
  player,
  contribution,
  roomEconomy,
  stageCost,
  economyTransaction,
  projectPrototype,
  prototypeArtifact,
  prototypeDrawingStroke,
  groupVote,
  pilotSimulation,
  marketingPlan,
  salesResult,
  card,
  cardDraw,
  stageSession,
  stageAssignment,
  stageOutcome,
  vote,
  decision,
  journey,
  publishedResult,
});
export default spacetimedb;

export const current_profile = spacetimedb.view(
  { name: "current_profile", public: true },
  t.option(profile.rowType),
  (ctx) => ctx.db.profile.identity.find(ctx.sender) ?? undefined,
);

export const member_rooms = spacetimedb.view(
  { name: "member_rooms", public: true },
  t.array(room.rowType),
  (ctx) => {
    const rooms = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      const currentRoom = ctx.db.room.id.find(membership.roomId);
      if (currentRoom) rooms.push(currentRoom);
    }
    return rooms;
  },
);

export const room_players = spacetimedb.view(
  { name: "room_players", public: true },
  t.array(player.rowType),
  (ctx) => {
    const players = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      players.push(...ctx.db.player.roomId.filter(membership.roomId));
    }
    return players;
  },
);

export const room_economies = spacetimedb.view(
  { name: "room_economies", public: true },
  t.array(roomEconomy.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      const economy = ctx.db.roomEconomy.roomId.find(membership.roomId);
      if (economy) rows.push(economy);
    }
    return rows;
  },
);

export const room_stage_costs = spacetimedb.view(
  { name: "room_stage_costs", public: true },
  t.array(stageCost.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      rows.push(...ctx.db.stageCost.roomId.filter(membership.roomId));
    }
    return rows;
  },
);

export const room_economy_transactions = spacetimedb.view(
  { name: "room_economy_transactions", public: true },
  t.array(economyTransaction.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      rows.push(...ctx.db.economyTransaction.roomId.filter(membership.roomId));
    }
    return rows;
  },
);

export const project_prototypes = spacetimedb.view(
  { name: "project_prototypes", public: true },
  t.array(projectPrototype.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      const prototype = ctx.db.projectPrototype.roomId.find(membership.roomId);
      if (prototype) rows.push(prototype);
    }
    return rows;
  },
);

export const prototype_artifacts = spacetimedb.view(
  { name: "prototype_artifacts", public: true },
  t.array(prototypeArtifact.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      rows.push(...ctx.db.prototypeArtifact.roomId.filter(membership.roomId));
    }
    return rows;
  },
);

export const prototype_drawing_strokes = spacetimedb.view(
  { name: "prototype_drawing_strokes", public: true },
  t.array(prototypeDrawingStroke.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      rows.push(
        ...ctx.db.prototypeDrawingStroke.roomId.filter(membership.roomId),
      );
    }
    return rows;
  },
);

export const room_group_votes = spacetimedb.view(
  { name: "room_group_votes", public: true },
  t.array(groupVote.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      rows.push(...ctx.db.groupVote.roomId.filter(membership.roomId));
    }
    return rows;
  },
);

export const pilot_simulations = spacetimedb.view(
  { name: "pilot_simulations", public: true },
  t.array(pilotSimulation.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      const pilot = ctx.db.pilotSimulation.roomId.find(membership.roomId);
      if (pilot) rows.push(pilot);
    }
    return rows;
  },
);

export const marketing_plans = spacetimedb.view(
  { name: "marketing_plans", public: true },
  t.array(marketingPlan.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      const plan = ctx.db.marketingPlan.roomId.find(membership.roomId);
      if (plan) rows.push(plan);
    }
    return rows;
  },
);

export const sales_results = spacetimedb.view(
  { name: "sales_results", public: true },
  t.array(salesResult.rowType),
  (ctx) => {
    const rows = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      const result = ctx.db.salesResult.roomId.find(membership.roomId);
      if (result) rows.push(result);
    }
    return rows;
  },
);

export const room_card_draws = spacetimedb.view(
  { name: "room_card_draws", public: true },
  t.array(cardDraw.rowType),
  (ctx) => {
    const draws = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      draws.push(...ctx.db.cardDraw.roomId.filter(membership.roomId));
    }
    return draws;
  },
);

export const room_stage_sessions = spacetimedb.view(
  { name: "room_stage_sessions", public: true },
  t.array(stageSession.rowType),
  (ctx) => {
    const sessions = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      sessions.push(...ctx.db.stageSession.roomId.filter(membership.roomId));
    }
    return sessions;
  },
);

export const room_stage_assignments = spacetimedb.view(
  { name: "room_stage_assignments", public: true },
  t.array(stageAssignment.rowType),
  (ctx) => {
    const assignments = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      assignments.push(
        ...ctx.db.stageAssignment.roomId.filter(membership.roomId),
      );
    }
    return assignments;
  },
);

export const room_stage_outcomes = spacetimedb.view(
  { name: "room_stage_outcomes", public: true },
  t.array(stageOutcome.rowType),
  (ctx) => {
    const outcomes = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      outcomes.push(...ctx.db.stageOutcome.roomId.filter(membership.roomId));
    }
    return outcomes;
  },
);

export const visible_contributions = spacetimedb.view(
  { name: "visible_contributions", public: true },
  t.array(visibleContribution),
  (ctx) => {
    const visible = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      const currentRoom = ctx.db.room.id.find(membership.roomId);
      if (!currentRoom) continue;

      const activeSession = Array.from(
        ctx.db.stageSession.roomId.filter(membership.roomId),
      ).find((item) => item.stage === currentRoom.currentStage);
      const isUnionSession = activeSession?.resolution === "UNION";

      for (const item of ctx.db.contribution.roomId.filter(membership.roomId)) {
        const hiddenFromGroup =
          COLLABORATIVE_STAGES.has(item.stage) &&
          item.stage === currentRoom.currentStage &&
          activeSession?.phase === "CONTRIBUTING" &&
          !item.authorIdentity.isEqual(ctx.sender);
        if (hiddenFromGroup) continue;

        const hideAuthor =
          COLLABORATIVE_STAGES.has(item.stage) &&
          item.stage === currentRoom.currentStage &&
          activeSession?.phase === "VOTING";
        visible.push({
          ...item,
          authorIdentity:
            hideAuthor && !isUnionSession ? undefined : item.authorIdentity,
        });
      }
    }
    return visible;
  },
);

export const room_contribution_status = spacetimedb.view(
  { name: "room_contribution_status", public: true },
  t.array(contributionStatus),
  (ctx) => {
    const statuses = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      for (const item of ctx.db.contribution.roomId.filter(membership.roomId)) {
        statuses.push({
          id: item.id,
          roomId: item.roomId,
          stage: item.stage,
          authorIdentity: item.authorIdentity,
        });
      }
    }
    return statuses;
  },
);

export const own_votes = spacetimedb.view(
  { name: "own_votes", public: true },
  t.array(vote.rowType),
  (ctx) => {
    const roomIds = new Set(
      Array.from(ctx.db.player.identity.filter(ctx.sender))
        .filter((item) => item.active)
        .map((item) => item.roomId),
    );
    return Array.from(ctx.db.vote.voterIdentity.filter(ctx.sender)).filter(
      (item) => roomIds.has(item.roomId),
    );
  },
);

export const room_vote_status = spacetimedb.view(
  { name: "room_vote_status", public: true },
  t.array(voteStatus),
  (ctx) => {
    const statuses = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      for (const item of ctx.db.vote.roomId.filter(membership.roomId)) {
        statuses.push({
          id: item.id,
          roomId: item.roomId,
          stage: item.stage,
          voterIdentity: item.voterIdentity,
        });
      }
    }
    return statuses;
  },
);

export const room_decisions = spacetimedb.view(
  { name: "room_decisions", public: true },
  t.array(decision.rowType),
  (ctx) => {
    const decisions = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      decisions.push(...ctx.db.decision.roomId.filter(membership.roomId));
    }
    return decisions;
  },
);

export const room_journeys = spacetimedb.view(
  { name: "room_journeys", public: true },
  t.array(journey.rowType),
  (ctx) => {
    const journeys = [];
    for (const membership of ctx.db.player.identity.filter(ctx.sender)) {
      if (!membership.active) continue;
      const currentJourney = ctx.db.journey.roomId.find(membership.roomId);
      if (currentJourney) journeys.push(currentJourney);
    }
    return journeys;
  },
);

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

function roomCodeExpiresAt(timestamp: Timestamp) {
  return new Timestamp(timestamp.microsSinceUnixEpoch + ROOM_CODE_TTL_MICROS);
}

function roomCodeIsExpired(expiresAt: Timestamp, timestamp: Timestamp) {
  return expiresAt.microsSinceUnixEpoch <= timestamp.microsSinceUnixEpoch;
}

function journeyPublicId(roomId: bigint) {
  return "journey-" + roomId.toString(36);
}

function normalizeJourneyTitle(title: string) {
  const normalized = title.trim().replace(/\s+/g, " ");
  if (normalized.length > 80) {
    throw new SenderError("O título deve ter no máximo 80 caracteres.");
  }
  return normalized;
}

function normalizeJourneySummary(summary: string) {
  const normalized = summary.trim().replace(/\s+/g, " ");
  if (normalized.length > 400) {
    throw new SenderError("O manifesto deve ter no máximo 400 caracteres.");
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
    const reservedCode = ctx.db.roomCode.code.find(normalizedCode);
    if (reservedCode) {
      if (roomCodeIsExpired(reservedCode.expiresAt, ctx.timestamp)) {
        ctx.db.roomCode.code.delete(reservedCode.code);
      } else {
        throw new SenderError("Este código de sala já está em uso.");
      }
    }

    const inviteExpiresAt = roomCodeExpiresAt(ctx.timestamp);
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

    ctx.db.roomCode.insert({
      code: normalizedCode,
      roomId: createdRoom.id,
      expiresAt: inviteExpiresAt,
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
      joinedAt: ctx.timestamp,
      active: true,
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

    const normalizedCode = normalizeRoomCode(code);
    const reservedCode = ctx.db.roomCode.code.find(normalizedCode);
    if (
      reservedCode &&
      roomCodeIsExpired(reservedCode.expiresAt, ctx.timestamp)
    ) {
      ctx.db.roomCode.code.delete(reservedCode.code);
      throw new SenderError("Este convite expirou.");
    }
    const existingRoom = reservedCode
      ? ctx.db.room.id.find(reservedCode.roomId)
      : undefined;
    if (!existingRoom) throw new SenderError("Convite não encontrado.");

    const existingPlayer = [...ctx.db.player.iter()].find(
      (item) =>
        item.roomId === existingRoom.id && item.identity.isEqual(ctx.sender),
    );

    if (existingPlayer) {
      if (existingRoom.status !== "LOBBY" && !existingPlayer.active) {
        throw new SenderError("A partida já começou.");
      }
      ctx.db.player.id.update({
        ...existingPlayer,
        displayName: currentProfile.displayName,
        avatarId: currentProfile.avatarId,
        role: existingRoom.ownerIdentity.isEqual(ctx.sender)
          ? "HOST"
          : "PLAYER",
        online: true,
        active: true,
      });
      return;
    }

    if (existingRoom.status !== "LOBBY") {
      throw new SenderError("A partida já começou.");
    }

    const roomPlayers = [...ctx.db.player.iter()].filter(
      (item) => item.roomId === existingRoom.id && item.active,
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
      joinedAt: ctx.timestamp,
      active: true,
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
      (item) =>
        item.roomId === roomId &&
        item.active &&
        item.identity.isEqual(ctx.sender),
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
      (item) => item.roomId === roomId && item.active,
    );
    if (roomPlayers.length < MIN_PLAYERS) {
      throw new SenderError(
        `A jornada precisa de pelo menos ${MIN_PLAYERS} participantes.`,
      );
    }
    if (roomPlayers.some((item) => !item.ready)) {
      throw new SenderError("Todos os jogadores precisam estar prontos.");
    }

    const seed = ctx.random.integerInRange(1, 2_147_483_647);
    const funding = createFundingOpportunity(seed);
    const costs = createStageCosts(seed);

    ctx.db.roomEconomy.insert({
      roomId,
      initialBalance: INITIAL_RUNWAY,
      balance: INITIAL_RUNWAY,
      reservedBalance: 0,
      seed,
      nextSequence: 1,
      fundingStage: funding.stage,
      fundingValue: funding.value,
      fundingTitle: funding.title,
      fundingDescription: funding.description,
      fundingRevealed: false,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
    ctx.db.economyTransaction.insert({
      id: 0n,
      roomId,
      stage: "SCENARIO",
      delta: INITIAL_RUNWAY,
      balanceAfter: INITIAL_RUNWAY,
      sequence: 0,
      reason: "INITIAL_CAPITAL",
      eventKey: `initial:${roomId}`,
      label: "Capital inicial do projeto",
      createdAt: ctx.timestamp,
    });
    for (const cost of costs) {
      ctx.db.stageCost.insert({
        id: 0n,
        roomId,
        stage: cost.stage,
        amount: cost.amount,
        label: cost.label,
        applied: false,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });
    }

    ctx.db.room.id.update({
      ...currentRoom,
      status: "ACTIVE",
      currentStage: BOARD_STATES[0],
      stageIndex: 0,
      round: 1,
      updatedAt: ctx.timestamp,
    });

    const drawnCard = cardForRoomStage(
      currentRoom.id.toString(),
      BOARD_STATES[0],
    );
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
      drawIndex: 0,
      active: true,
      reason: "INITIAL",
    });

    const firstStagePlan = collaborativeStagePlan(BOARD_STATES[0]);
    ctx.db.stageSession.insert({
      id: 0n,
      roomId,
      stage: BOARD_STATES[0],
      phase: "CONTRIBUTING",
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      resolution: firstStagePlan.resolution,
    });
    roomPlayers
      .slice()
      .sort((left, right) => (left.id < right.id ? -1 : 1))
      .forEach((member, position) => {
        const action =
          firstStagePlan.actions[position % firstStagePlan.actions.length];
        ctx.db.stageAssignment.insert({
          id: 0n,
          roomId,
          stage: BOARD_STATES[0],
          playerIdentity: member.identity,
          actionKey: action.key,
          actionTitle: action.title,
          actionPrompt: action.prompt,
          actionPlaceholder: action.placeholder,
          position,
          createdAt: ctx.timestamp,
        });
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

    const economy = ctx.db.roomEconomy.roomId.find(roomId);
    if (!economy) {
      throw new SenderError("A economia compartilhada da sala não existe.");
    }
    if (!COLLABORATIVE_STAGES.has(currentRoom.currentStage)) {
      throw new SenderError(
        "Esta etapa usa uma experiência de projeto compartilhada.",
      );
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
      (item) =>
        item.roomId === roomId &&
        item.active &&
        item.identity.isEqual(ctx.sender),
    );
    if (!currentPlayer) throw new SenderError("Você não pertence a esta sala.");

    const assignments = Array.from(
      ctx.db.stageAssignment.roomId.filter(roomId),
    ).filter((item) => item.stage === currentRoom.currentStage);
    const ownAssignment = assignments.find((item) =>
      item.playerIdentity.isEqual(ctx.sender),
    );
    if (assignments.length > 0 && !ownAssignment) {
      throw new SenderError("Voce nao recebeu uma acao nesta etapa.");
    }
    const actionKey = ownAssignment?.actionKey ?? "MAIN";

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
        item.kind === "MAIN" &&
        item.actionKey === actionKey,
    );

    if (existing) {
      ctx.db.contribution.id.update({
        ...existing,
        content: normalized,
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.contribution.insert({
        id: 0n,
        roomId,
        stage: currentRoom.currentStage,
        authorIdentity: ctx.sender,
        kind: "MAIN",
        content: normalized,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
        actionKey,
      });
    }

    if (currentSession?.resolution !== "UNION") return;

    const eligibleAssignments = assignments.filter((assignment) =>
      Array.from(ctx.db.player.roomId.filter(roomId)).some(
        (member) =>
          member.active &&
          member.online &&
          member.identity.isEqual(assignment.playerIdentity),
      ),
    );
    const stageContributions = Array.from(
      ctx.db.contribution.roomId.filter(roomId),
    ).filter(
      (item) => item.stage === currentRoom.currentStage && item.kind === "MAIN",
    );
    const missingAssignment = eligibleAssignments.find(
      (assignment) =>
        !stageContributions.some(
          (item) =>
            item.actionKey === assignment.actionKey &&
            item.authorIdentity.isEqual(assignment.playerIdentity),
        ),
    );
    if (missingAssignment) return;

    const completedAssignments = assignments
      .slice()
      .sort((left, right) => left.position - right.position)
      .flatMap((assignment) => {
        const response = stageContributions.find(
          (item) =>
            item.actionKey === assignment.actionKey &&
            item.authorIdentity.isEqual(assignment.playerIdentity),
        );
        return response ? [{ assignment, response }] : [];
      });
    if (completedAssignments.length === 0) return;

    ctx.db.stageOutcome.insert({
      id: 0n,
      roomId,
      stage: currentRoom.currentStage,
      resolution: "UNION",
      summary: completedAssignments
        .map(
          ({ assignment, response }) =>
            `${assignment.actionTitle}: ${response.content}`,
        )
        .join("\n"),
      sourceCount: completedAssignments.length,
      resolvedAt: ctx.timestamp,
    });
    ctx.db.stageSession.id.update({
      ...currentSession,
      phase: "REVIEW",
      updatedAt: ctx.timestamp,
    });
  },
);

export const vote_card_change = spacetimedb.reducer(
  { roomId: t.u64(), support: t.bool() },
  (ctx, { roomId, support }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const economy = ctx.db.roomEconomy.roomId.find(roomId);
    if (
      !currentRoom ||
      currentRoom.status !== "ACTIVE" ||
      !economy ||
      currentRoom.stageIndex > 5
    ) {
      throw new SenderError("A carta não pode ser trocada nesta etapa.");
    }
    if (economy.balance < CARD_REDRAW_COST) {
      throw new SenderError("O projeto não possui 500 créditos disponíveis.");
    }

    const eligiblePlayers = Array.from(
      ctx.db.player.roomId.filter(roomId),
    ).filter((item) => item.active && item.online);
    if (!eligiblePlayers.some((item) => item.identity.isEqual(ctx.sender))) {
      throw new SenderError("Você precisa estar online nesta sala para votar.");
    }
    const hasContribution = Array.from(
      ctx.db.contribution.roomId.filter(roomId),
    ).some((item) => item.stage === currentRoom.currentStage);
    const prototypeStarted =
      currentRoom.currentStage === "PROTOTYPE" &&
      Boolean(ctx.db.projectPrototype.roomId.find(roomId));
    const pilotStarted =
      currentRoom.currentStage === "PILOT" &&
      Array.from(ctx.db.groupVote.roomId.filter(roomId)).some(
        (item) => item.stage === "PILOT" && item.topic === "PILOT_RESPONSE",
      );
    if (hasContribution || prototypeStarted || pilotStarted) {
      throw new SenderError(
        "A carta foi bloqueada porque a equipe já começou esta etapa.",
      );
    }

    const activeDraw = Array.from(ctx.db.cardDraw.roomId.filter(roomId)).find(
      (item) => item.stage === currentRoom.currentStage && item.active,
    );
    if (!activeDraw) {
      throw new SenderError("A carta atual não foi encontrada.");
    }

    const existingVote = Array.from(
      ctx.db.groupVote.roomId.filter(roomId),
    ).find(
      (item) =>
        item.stage === currentRoom.currentStage &&
        item.topic === "CARD_CHANGE" &&
        item.playerIdentity.isEqual(ctx.sender),
    );
    if (!support) {
      if (existingVote) ctx.db.groupVote.id.delete(existingVote.id);
      return;
    }
    if (existingVote) {
      ctx.db.groupVote.id.update({
        ...existingVote,
        choice: "YES",
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.groupVote.insert({
        id: 0n,
        roomId,
        stage: currentRoom.currentStage,
        topic: "CARD_CHANGE",
        playerIdentity: ctx.sender,
        choice: "YES",
        updatedAt: ctx.timestamp,
      });
    }
    const supportingVotes = Array.from(
      ctx.db.groupVote.roomId.filter(roomId),
    ).filter(
      (item) =>
        item.stage === currentRoom.currentStage &&
        item.topic === "CARD_CHANGE" &&
        item.choice === "YES" &&
        eligiblePlayers.some((player) =>
          player.identity.isEqual(item.playerIdentity),
        ),
    ).length;
    const requiredVotes = Math.floor(eligiblePlayers.length / 2) + 1;
    if (supportingVotes < requiredVotes) return;

    const activeCard = ctx.db.card.id.find(activeDraw.cardId);
    if (!activeCard) {
      throw new SenderError("A carta atual não foi encontrada.");
    }
    const drawIndex = activeDraw.drawIndex + 1;
    const replacement = replacementCardForRoomStage(
      roomId.toString(),
      currentRoom.currentStage,
      activeCard.imagePath,
      drawIndex,
    );
    if (!ctx.db.card.id.find(replacement.id)) {
      ctx.db.card.insert({
        id: replacement.id,
        stage: replacement.stage,
        title: replacement.title,
        lens: replacement.lens,
        imagePath: replacement.imagePath,
        altText: replacement.altText,
        provocation: replacement.provocation,
      });
    }

    ctx.db.cardDraw.id.update({ ...activeDraw, active: false });
    ctx.db.cardDraw.insert({
      id: 0n,
      roomId,
      stage: currentRoom.currentStage,
      cardId: replacement.id,
      drawnAt: ctx.timestamp,
      drawIndex,
      active: true,
      reason: "REDRAW",
    });

    for (const vote of Array.from(ctx.db.groupVote.roomId.filter(roomId))) {
      if (
        vote.stage === currentRoom.currentStage &&
        vote.topic === "CARD_CHANGE"
      ) {
        ctx.db.groupVote.id.delete(vote.id);
      }
    }

    const balanceAfter = economy.balance - CARD_REDRAW_COST;
    ctx.db.roomEconomy.roomId.update({
      ...economy,
      balance: balanceAfter,
      nextSequence: economy.nextSequence + 1,
      updatedAt: ctx.timestamp,
    });
    ctx.db.economyTransaction.insert({
      id: 0n,
      roomId,
      stage: currentRoom.currentStage,
      delta: -CARD_REDRAW_COST,
      balanceAfter,
      sequence: economy.nextSequence,
      reason: "CARD_REDRAW",
      eventKey: `redraw:${roomId}:${currentRoom.currentStage}:${drawIndex}`,
      label: "Troca de carta",
      createdAt: ctx.timestamp,
    });
  },
);

export const refresh_redrawn_card = spacetimedb.reducer(
  { roomId: t.u64() },
  () => {
    // Kept as a no-op for clients that still call this retired reducer.
    // Redraws are now finalized atomically by vote_card_change.
  },
);

export const start_prototype_activity = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const economy = ctx.db.roomEconomy.roomId.find(roomId);
    if (
      !currentRoom ||
      currentRoom.status !== "ACTIVE" ||
      currentRoom.currentStage !== "PROTOTYPE" ||
      !economy
    ) {
      throw new SenderError("A atividade de protótipo não está disponível.");
    }
    const membership = Array.from(ctx.db.player.roomId.filter(roomId)).find(
      (item) => item.active && item.identity.isEqual(ctx.sender),
    );
    if (!membership) throw new SenderError("Você não pertence a esta sala.");
    if (ctx.db.projectPrototype.roomId.find(roomId)) return;
    const challenge = prototypeChallengeForSeed(economy.seed);
    ctx.db.projectPrototype.insert({
      roomId,
      challengeKey: challenge.key,
      challengeTitle: challenge.title,
      challengeDescription: challenge.description,
      artifactKind: "",
      artifactData: "",
      caption: "",
      durationSeconds: PROTOTYPE_BASE_SECONDS,
      investment: 0,
      creativePoints: 0,
      committed: false,
      startedAt: ctx.timestamp,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
    const session = Array.from(ctx.db.stageSession.roomId.filter(roomId)).find(
      (item) => item.stage === "PROTOTYPE",
    );
    if (session)
      ctx.db.stageSession.id.update({
        ...session,
        phase: "ACTIVITY",
        updatedAt: ctx.timestamp,
      });
  },
);

function prototypeTimeHasEnded(
  startedAt: Timestamp,
  durationSeconds: number,
  now: Timestamp,
) {
  const endingAt =
    startedAt.microsSinceUnixEpoch + BigInt(durationSeconds) * 1_000_000n;
  return now.microsSinceUnixEpoch >= endingAt;
}

function isPrototypeStorageKey(roomId: bigint, artifactData: string) {
  return new RegExp(
    `^idea-hero/prototype/${roomId.toString()}/[a-z0-9-]+\\.(?:jpe?g|png|webp|gif|mp3|wav|ogg|webm|m4a)$`,
    "i",
  ).test(artifactData);
}

export const submit_prototype_artifact = spacetimedb.reducer(
  {
    roomId: t.u64(),
    artifactKind: t.string(),
    artifactData: t.string(),
    caption: t.string(),
  },
  (ctx, input) => {
    const currentRoom = ctx.db.room.id.find(input.roomId);
    const prototype = ctx.db.projectPrototype.roomId.find(input.roomId);
    if (
      !currentRoom ||
      currentRoom.status !== "ACTIVE" ||
      currentRoom.currentStage !== "PROTOTYPE" ||
      !prototype
    ) {
      throw new SenderError("O protótipo não pode mais ser alterado.");
    }
    const membership = Array.from(
      ctx.db.player.roomId.filter(input.roomId),
    ).find((item) => item.active && item.identity.isEqual(ctx.sender));
    if (!membership) throw new SenderError("Você não pertence a esta sala.");
    if (
      !["DRAWING", "IMAGE", "AUDIO", "AI_IMAGE"].includes(input.artifactKind)
    ) {
      throw new SenderError("Escolha desenho, imagem, imagem com IA ou áudio.");
    }
    const previousArtifact = Array.from(
      ctx.db.prototypeArtifact.roomId.filter(input.roomId),
    ).find((artifact) => artifact.artifactKind === input.artifactKind);
    const isStoredFile = isPrototypeStorageKey(
      input.roomId,
      input.artifactData,
    );
    const canSaveFrozenDrawing =
      input.artifactKind === "DRAWING" &&
      isStoredFile &&
      previousArtifact?.artifactData === "";
    if (
      (prototype.committed ||
        prototypeTimeHasEnded(
          prototype.startedAt,
          prototype.durationSeconds,
          ctx.timestamp,
        )) &&
      !canSaveFrozenDrawing
    ) {
      throw new SenderError("O protótipo não pode mais ser alterado.");
    }
    const validMedia =
      isStoredFile ||
      (input.artifactKind === "AUDIO" &&
        input.artifactData.startsWith("data:audio/")) ||
      (input.artifactKind !== "AUDIO" &&
        input.artifactData.startsWith("data:image/"));
    if (
      !validMedia ||
      input.artifactData.length < 32 ||
      input.artifactData.length > 900_000
    ) {
      throw new SenderError("O arquivo enviado não é válido.");
    }
    const caption = input.caption.trim().replace(/\s+/g, " ").slice(0, 120);
    if (previousArtifact) {
      ctx.db.prototypeArtifact.id.update({
        ...previousArtifact,
        artifactData: input.artifactData,
        caption,
        authorIdentity: ctx.sender,
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.prototypeArtifact.insert({
        id: 0n,
        roomId: input.roomId,
        artifactKind: input.artifactKind,
        artifactData: input.artifactData,
        caption,
        authorIdentity: ctx.sender,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });
      const economy = ctx.db.roomEconomy.roomId.find(input.roomId);
      if (!economy) {
        throw new SenderError("A economia compartilhada da sala não existe.");
      }
      const balanceAfter = economy.balance + PROTOTYPE_CREATIVE_BONUS;
      ctx.db.roomEconomy.roomId.update({
        ...economy,
        balance: balanceAfter,
        nextSequence: economy.nextSequence + 1,
        updatedAt: ctx.timestamp,
      });
      ctx.db.economyTransaction.insert({
        id: 0n,
        roomId: input.roomId,
        stage: "PROTOTYPE",
        delta: PROTOTYPE_CREATIVE_BONUS,
        balanceAfter,
        sequence: economy.nextSequence,
        reason: "PROTOTYPE_CREATIVE_BONUS",
        eventKey: `prototype-creative:${input.roomId}:${input.artifactKind}`,
        label: `Bônus criativo: ${input.artifactKind.toLowerCase()}`,
        createdAt: ctx.timestamp,
      });
    }
    ctx.db.projectPrototype.roomId.update({
      ...prototype,
      artifactKind: input.artifactKind,
      artifactData: input.artifactData,
      caption,
      creativePoints:
        prototype.creativePoints +
        (previousArtifact ? 0 : PROTOTYPE_CREATIVE_BONUS),
      updatedAt: ctx.timestamp,
    });
  },
);

export const submit_prototype_drawing_stroke = spacetimedb.reducer(
  { roomId: t.u64(), points: t.string() },
  (ctx, { roomId, points }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const prototype = ctx.db.projectPrototype.roomId.find(roomId);
    if (
      !currentRoom ||
      currentRoom.status !== "ACTIVE" ||
      currentRoom.currentStage !== "PROTOTYPE" ||
      !prototype ||
      prototype.committed ||
      prototypeTimeHasEnded(
        prototype.startedAt,
        prototype.durationSeconds,
        ctx.timestamp,
      )
    ) {
      throw new SenderError(
        "O tempo do protótipo terminou; o desenho está bloqueado.",
      );
    }
    const membership = Array.from(ctx.db.player.roomId.filter(roomId)).find(
      (item) => item.active && item.identity.isEqual(ctx.sender),
    );
    if (!membership) throw new SenderError("Você não pertence a esta sala.");
    if (points.length < 13 || points.length > 12_000) {
      throw new SenderError("O traço de desenho não é válido.");
    }
    const drawingArtifact = Array.from(
      ctx.db.prototypeArtifact.roomId.filter(roomId),
    ).find((artifact) => artifact.artifactKind === "DRAWING");
    if (!drawingArtifact) {
      ctx.db.prototypeArtifact.insert({
        id: 0n,
        roomId,
        artifactKind: "DRAWING",
        artifactData: "",
        caption: "Desenho colaborativo",
        authorIdentity: ctx.sender,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });
      const economy = ctx.db.roomEconomy.roomId.find(roomId);
      if (!economy) {
        throw new SenderError("A economia compartilhada da sala não existe.");
      }
      const balanceAfter = economy.balance + PROTOTYPE_CREATIVE_BONUS;
      ctx.db.projectPrototype.roomId.update({
        ...prototype,
        creativePoints: prototype.creativePoints + PROTOTYPE_CREATIVE_BONUS,
        updatedAt: ctx.timestamp,
      });
      ctx.db.roomEconomy.roomId.update({
        ...economy,
        balance: balanceAfter,
        nextSequence: economy.nextSequence + 1,
        updatedAt: ctx.timestamp,
      });
      ctx.db.economyTransaction.insert({
        id: 0n,
        roomId,
        stage: "PROTOTYPE",
        delta: PROTOTYPE_CREATIVE_BONUS,
        balanceAfter,
        sequence: economy.nextSequence,
        reason: "PROTOTYPE_CREATIVE_BONUS",
        eventKey: `prototype-creative:${roomId}:DRAWING`,
        label: "Bônus criativo: drawing",
        createdAt: ctx.timestamp,
      });
    }
    const color =
      DRAWING_COLORS[Number(membership.id % BigInt(DRAWING_COLORS.length))];
    ctx.db.prototypeDrawingStroke.insert({
      id: 0n,
      roomId,
      authorIdentity: ctx.sender,
      color,
      points,
      createdAt: ctx.timestamp,
    });
  },
);

export const clear_own_prototype_drawing = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const prototype = ctx.db.projectPrototype.roomId.find(roomId);
    if (
      !currentRoom ||
      currentRoom.currentStage !== "PROTOTYPE" ||
      !prototype ||
      prototype.committed ||
      prototypeTimeHasEnded(
        prototype.startedAt,
        prototype.durationSeconds,
        ctx.timestamp,
      )
    ) {
      throw new SenderError(
        "O tempo do protótipo terminou; o desenho está bloqueado.",
      );
    }
    for (const stroke of ctx.db.prototypeDrawingStroke.roomId.filter(roomId)) {
      if (stroke.authorIdentity.isEqual(ctx.sender)) {
        ctx.db.prototypeDrawingStroke.id.delete(stroke.id);
      }
    }
  },
);

export const vote_prototype_ready = spacetimedb.reducer(
  { roomId: t.u64(), ready: t.bool() },
  (ctx, { roomId, ready }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const prototype = ctx.db.projectPrototype.roomId.find(roomId);
    const hasArtifact =
      Boolean(prototype?.artifactData) ||
      Array.from(ctx.db.prototypeArtifact.roomId.filter(roomId)).length > 0;
    if (
      !currentRoom ||
      currentRoom.currentStage !== "PROTOTYPE" ||
      !prototype ||
      !hasArtifact ||
      prototype.committed
    ) {
      throw new SenderError("Registre um protótipo antes de votar.");
    }
    const eligiblePlayers = Array.from(
      ctx.db.player.roomId.filter(roomId),
    ).filter((item) => item.active && item.online);
    if (!eligiblePlayers.some((item) => item.identity.isEqual(ctx.sender))) {
      throw new SenderError("Você precisa estar online nesta sala para votar.");
    }
    const existingVote = Array.from(
      ctx.db.groupVote.roomId.filter(roomId),
    ).find(
      (item) =>
        item.topic === "PROTOTYPE_READY" &&
        item.playerIdentity.isEqual(ctx.sender),
    );
    if (!ready) {
      if (existingVote) ctx.db.groupVote.id.delete(existingVote.id);
      return;
    }
    if (existingVote) {
      ctx.db.groupVote.id.update({
        ...existingVote,
        choice: "READY",
        updatedAt: ctx.timestamp,
      });
    } else {
      ctx.db.groupVote.insert({
        id: 0n,
        roomId,
        stage: "PROTOTYPE",
        topic: "PROTOTYPE_READY",
        playerIdentity: ctx.sender,
        choice: "READY",
        updatedAt: ctx.timestamp,
      });
    }
    const readyVotes = Array.from(
      ctx.db.groupVote.roomId.filter(roomId),
    ).filter(
      (item) =>
        item.topic === "PROTOTYPE_READY" &&
        item.choice === "READY" &&
        eligiblePlayers.some((player) =>
          player.identity.isEqual(item.playerIdentity),
        ),
    ).length;
    if (readyVotes < Math.floor(eligiblePlayers.length / 2) + 1) return;
    ctx.db.projectPrototype.roomId.update({
      ...prototype,
      committed: true,
      updatedAt: ctx.timestamp,
    });
    ctx.db.contribution.insert({
      id: 0n,
      roomId,
      stage: "PROTOTYPE",
      authorIdentity: ctx.sender,
      kind: "MAIN",
      content: `${prototype.challengeTitle}: ${prototype.caption || "artefato compartilhado criado pela equipe"}.`,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      actionKey: "MAIN",
    });
    const session = Array.from(ctx.db.stageSession.roomId.filter(roomId)).find(
      (item) => item.stage === "PROTOTYPE",
    );
    if (session)
      ctx.db.stageSession.id.update({
        ...session,
        phase: "READY",
        updatedAt: ctx.timestamp,
      });
  },
);

export const finish_prototype_activity = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const prototype = ctx.db.projectPrototype.roomId.find(roomId);
    const hasArtifact =
      Boolean(prototype?.artifactData) ||
      Array.from(ctx.db.prototypeArtifact.roomId.filter(roomId)).length > 0;
    if (
      !currentRoom ||
      currentRoom.currentStage !== "PROTOTYPE" ||
      !prototype ||
      !hasArtifact
    ) {
      throw new SenderError("Registre um protótipo antes de concluir.");
    }
    if (prototype.committed) return;
    const endingAt =
      prototype.startedAt.microsSinceUnixEpoch +
      BigInt(prototype.durationSeconds) * 1_000_000n;
    if (ctx.timestamp.microsSinceUnixEpoch < endingAt) {
      throw new SenderError(
        "O tempo ainda está correndo. A equipe pode votar em pronto.",
      );
    }
    const membership = Array.from(ctx.db.player.roomId.filter(roomId)).find(
      (item) => item.active && item.identity.isEqual(ctx.sender),
    );
    if (!membership) throw new SenderError("Você não pertence a esta sala.");
    ctx.db.projectPrototype.roomId.update({
      ...prototype,
      committed: true,
      updatedAt: ctx.timestamp,
    });
    ctx.db.contribution.insert({
      id: 0n,
      roomId,
      stage: "PROTOTYPE",
      authorIdentity: ctx.sender,
      kind: "MAIN",
      content: `${prototype.challengeTitle}: ${prototype.caption || "artefato compartilhado criado pela equipe"}.`,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      actionKey: "MAIN",
    });
    const session = Array.from(ctx.db.stageSession.roomId.filter(roomId)).find(
      (item) => item.stage === "PROTOTYPE",
    );
    if (session)
      ctx.db.stageSession.id.update({
        ...session,
        phase: "READY",
        updatedAt: ctx.timestamp,
      });
  },
);

export const vote_prototype_extension = spacetimedb.reducer(
  { roomId: t.u64(), support: t.bool() },
  (ctx, { roomId, support }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const prototype = ctx.db.projectPrototype.roomId.find(roomId);
    const economy = ctx.db.roomEconomy.roomId.find(roomId);
    if (
      !currentRoom ||
      currentRoom.currentStage !== "PROTOTYPE" ||
      !prototype ||
      prototype.committed ||
      !economy
    ) {
      throw new SenderError("Não é possível aumentar o tempo agora.");
    }
    if (prototype.investment >= PROTOTYPE_EXTENSION_COST)
      throw new SenderError(
        "A equipe já comprou o tempo extra desta atividade.",
      );
    if (economy.balance < PROTOTYPE_EXTENSION_COST)
      throw new SenderError("O projeto não possui 500 créditos disponíveis.");
    const eligiblePlayers = Array.from(
      ctx.db.player.roomId.filter(roomId),
    ).filter((item) => item.active && item.online);
    if (!eligiblePlayers.some((item) => item.identity.isEqual(ctx.sender)))
      throw new SenderError("Você precisa estar online nesta sala para votar.");
    const existingVote = Array.from(
      ctx.db.groupVote.roomId.filter(roomId),
    ).find(
      (item) =>
        item.topic === "PROTOTYPE_EXTENSION" &&
        item.playerIdentity.isEqual(ctx.sender),
    );
    if (!support) {
      if (existingVote) ctx.db.groupVote.id.delete(existingVote.id);
      return;
    }
    if (existingVote)
      ctx.db.groupVote.id.update({
        ...existingVote,
        choice: "YES",
        updatedAt: ctx.timestamp,
      });
    else
      ctx.db.groupVote.insert({
        id: 0n,
        roomId,
        stage: "PROTOTYPE",
        topic: "PROTOTYPE_EXTENSION",
        playerIdentity: ctx.sender,
        choice: "YES",
        updatedAt: ctx.timestamp,
      });
    const votes = Array.from(ctx.db.groupVote.roomId.filter(roomId)).filter(
      (item) =>
        item.topic === "PROTOTYPE_EXTENSION" &&
        item.choice === "YES" &&
        eligiblePlayers.some((player) =>
          player.identity.isEqual(item.playerIdentity),
        ),
    ).length;
    if (votes < Math.floor(eligiblePlayers.length / 2) + 1) return;
    const balanceAfter = economy.balance - PROTOTYPE_EXTENSION_COST;
    const timeHasEnded = prototypeTimeHasEnded(
      prototype.startedAt,
      prototype.durationSeconds,
      ctx.timestamp,
    );
    ctx.db.projectPrototype.roomId.update({
      ...prototype,
      startedAt: timeHasEnded ? ctx.timestamp : prototype.startedAt,
      durationSeconds: timeHasEnded
        ? PROTOTYPE_EXTENSION_SECONDS
        : prototype.durationSeconds + PROTOTYPE_EXTENSION_SECONDS,
      investment: prototype.investment + PROTOTYPE_EXTENSION_COST,
      updatedAt: ctx.timestamp,
    });
    ctx.db.roomEconomy.roomId.update({
      ...economy,
      balance: balanceAfter,
      nextSequence: economy.nextSequence + 1,
      updatedAt: ctx.timestamp,
    });
    ctx.db.economyTransaction.insert({
      id: 0n,
      roomId,
      stage: "PROTOTYPE",
      delta: -PROTOTYPE_EXTENSION_COST,
      balanceAfter,
      sequence: economy.nextSequence,
      reason: "PROTOTYPE_INVESTMENT",
      eventKey: `prototype-extension:${roomId}`,
      label: "30 segundos extras de protótipo",
      createdAt: ctx.timestamp,
    });
  },
);

export const vote_pilot_response = spacetimedb.reducer(
  { roomId: t.u64(), choice: t.string() },
  (ctx, { roomId, choice }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const economy = ctx.db.roomEconomy.roomId.find(roomId);
    if (!currentRoom || currentRoom.currentStage !== "PILOT" || !economy)
      throw new SenderError("A etapa de piloto não está ativa.");
    let pilot = ctx.db.pilotSimulation.roomId.find(roomId);
    if (!pilot) {
      const feedback = pilotFeedbackForSeed(economy.seed);
      pilot = ctx.db.pilotSimulation.insert({
        roomId,
        feedbackTitle: feedback.title,
        feedbackDescription: feedback.description,
        optionA: feedback.options[0].title,
        optionADescription: feedback.options[0].description,
        optionALearning: feedback.options[0].learning,
        optionB: feedback.options[1].title,
        optionBDescription: feedback.options[1].description,
        optionBLearning: feedback.options[1].learning,
        optionC: feedback.options[2].title,
        optionCDescription: feedback.options[2].description,
        optionCLearning: feedback.options[2].learning,
        decision: "",
        learning: "",
        completed: false,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });
    }
    if (pilot.completed) return;
    const option =
      choice === "A"
        ? { title: pilot.optionA, learning: pilot.optionALearning }
        : choice === "B"
          ? { title: pilot.optionB, learning: pilot.optionBLearning }
          : choice === "C"
            ? { title: pilot.optionC, learning: pilot.optionCLearning }
            : undefined;
    if (!option) throw new SenderError("Escolha uma resposta válida.");
    const eligiblePlayers = Array.from(
      ctx.db.player.roomId.filter(roomId),
    ).filter((item) => item.active && item.online);
    if (!eligiblePlayers.some((item) => item.identity.isEqual(ctx.sender)))
      throw new SenderError("Você precisa estar online nesta sala para votar.");
    const existingVote = Array.from(
      ctx.db.groupVote.roomId.filter(roomId),
    ).find(
      (item) =>
        item.topic === "PILOT_RESPONSE" &&
        item.playerIdentity.isEqual(ctx.sender),
    );
    if (existingVote)
      ctx.db.groupVote.id.update({
        ...existingVote,
        choice,
        updatedAt: ctx.timestamp,
      });
    else
      ctx.db.groupVote.insert({
        id: 0n,
        roomId,
        stage: "PILOT",
        topic: "PILOT_RESPONSE",
        playerIdentity: ctx.sender,
        choice,
        updatedAt: ctx.timestamp,
      });
    const votes = Array.from(ctx.db.groupVote.roomId.filter(roomId)).filter(
      (item) =>
        item.topic === "PILOT_RESPONSE" &&
        item.choice === choice &&
        eligiblePlayers.some((player) =>
          player.identity.isEqual(item.playerIdentity),
        ),
    ).length;
    if (votes < Math.floor(eligiblePlayers.length / 2) + 1) return;
    ctx.db.pilotSimulation.roomId.update({
      ...pilot,
      decision: option.title,
      learning: option.learning,
      completed: true,
      updatedAt: ctx.timestamp,
    });
    ctx.db.contribution.insert({
      id: 0n,
      roomId,
      stage: "PILOT",
      authorIdentity: ctx.sender,
      kind: "MAIN",
      content: `${pilot.feedbackTitle} Resposta escolhida: ${option.title}.`,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      actionKey: "MAIN",
    });
    const session = Array.from(ctx.db.stageSession.roomId.filter(roomId)).find(
      (item) => item.stage === "PILOT",
    );
    if (session)
      ctx.db.stageSession.id.update({
        ...session,
        phase: "READY",
        updatedAt: ctx.timestamp,
      });
  },
);

export const vote_marketing_plan = spacetimedb.reducer(
  { roomId: t.u64(), choice: t.string() },
  (ctx, { roomId, choice }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    const economy = ctx.db.roomEconomy.roomId.find(roomId);
    const option = marketingLaunchOption(choice);
    if (
      !currentRoom ||
      currentRoom.currentStage !== "MARKETING" ||
      !economy ||
      !option
    )
      throw new SenderError("Escolha uma carta de lançamento válida.");
    if (ctx.db.marketingPlan.roomId.find(roomId)?.committed) return;
    const available = Math.max(0, economy.balance - economy.reservedBalance);
    if (option.investment > available)
      throw new SenderError(
        "Esta carta usaria a reserva necessária para Vendas.",
      );
    const eligiblePlayers = Array.from(
      ctx.db.player.roomId.filter(roomId),
    ).filter((item) => item.active && item.online);
    if (!eligiblePlayers.some((item) => item.identity.isEqual(ctx.sender)))
      throw new SenderError("Você precisa estar online nesta sala para votar.");
    const existingVote = Array.from(
      ctx.db.groupVote.roomId.filter(roomId),
    ).find(
      (item) =>
        item.topic === "MARKETING_PLAN" &&
        item.playerIdentity.isEqual(ctx.sender),
    );
    if (existingVote)
      ctx.db.groupVote.id.update({
        ...existingVote,
        choice,
        updatedAt: ctx.timestamp,
      });
    else
      ctx.db.groupVote.insert({
        id: 0n,
        roomId,
        stage: "MARKETING",
        topic: "MARKETING_PLAN",
        playerIdentity: ctx.sender,
        choice,
        updatedAt: ctx.timestamp,
      });
    const votes = Array.from(ctx.db.groupVote.roomId.filter(roomId)).filter(
      (item) =>
        item.topic === "MARKETING_PLAN" &&
        item.choice === choice &&
        eligiblePlayers.some((player) =>
          player.identity.isEqual(item.playerIdentity),
        ),
    ).length;
    if (votes < Math.floor(eligiblePlayers.length / 2) + 1) return;
    const response = marketResponseForSeed(economy.seed);
    const responseResult = effectiveMarketMultiplier(
      response,
      option.audience,
      option.channel,
    );
    const balanceAfter = economy.balance - option.investment;
    ctx.db.roomEconomy.roomId.update({
      ...economy,
      balance: balanceAfter,
      nextSequence: economy.nextSequence + (option.investment > 0 ? 1 : 0),
      updatedAt: ctx.timestamp,
    });
    if (option.investment > 0)
      ctx.db.economyTransaction.insert({
        id: 0n,
        roomId,
        stage: "MARKETING",
        delta: -option.investment,
        balanceAfter,
        sequence: economy.nextSequence,
        reason: "MARKETING_INVESTMENT",
        eventKey: `marketing:${roomId}`,
        label: `Carta de lançamento: ${option.label}`,
        createdAt: ctx.timestamp,
      });
    ctx.db.marketingPlan.insert({
      roomId,
      optionKey: option.key,
      audience: option.audience,
      valuePromise: option.valuePromise,
      channel: option.channel,
      callToAction: option.callToAction,
      investment: option.investment,
      responseTitle: response.title,
      responseDescription: response.description,
      baseMultiplier: response.baseMultiplier,
      matched: responseResult.matched,
      effectiveMultiplier: responseResult.multiplier,
      committed: true,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
    ctx.db.contribution.insert({
      id: 0n,
      roomId,
      stage: "MARKETING",
      authorIdentity: ctx.sender,
      kind: "MAIN",
      content: `${option.label}: ${option.valuePromise} ${option.callToAction}`,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      actionKey: "MAIN",
    });
    const session = Array.from(ctx.db.stageSession.roomId.filter(roomId)).find(
      (item) => item.stage === "MARKETING",
    );
    if (session)
      ctx.db.stageSession.id.update({
        ...session,
        phase: "READY",
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
    if (currentSession?.resolution === "UNION") {
      throw new SenderError(
        "Esta etapa une as acoes do grupo e nao usa votacao.",
      );
    }
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
      (item) => item.roomId === roomId && item.active && item.online,
    );
    const assignments = Array.from(
      ctx.db.stageAssignment.roomId.filter(roomId),
    ).filter((item) => item.stage === currentRoom.currentStage);
    const eligiblePlayers =
      assignments.length === 0
        ? onlinePlayers
        : onlinePlayers.filter((player) =>
            assignments.some((assignment) =>
              assignment.playerIdentity.isEqual(player.identity),
            ),
          );
    const waitingPlayer = eligiblePlayers.find(
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
        resolution: "VOTE",
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
      (item) =>
        item.roomId === roomId &&
        item.active &&
        item.identity.isEqual(ctx.sender),
    );
    if (!currentPlayer) throw new SenderError("Você não pertence a esta sala.");

    const currentSession = [...ctx.db.stageSession.iter()].find(
      (item) =>
        item.roomId === roomId && item.stage === currentRoom.currentStage,
    );
    if (currentSession?.resolution === "UNION") {
      throw new SenderError(
        "A uniao desta etapa ja e resolvida pelas acoes enviadas.",
      );
    }
    if (!currentSession || currentSession.phase !== "VOTING") {
      throw new SenderError("A votação ainda não está aberta.");
    }

    const assignments = Array.from(
      ctx.db.stageAssignment.roomId.filter(roomId),
    ).filter((item) => item.stage === currentRoom.currentStage);
    if (
      assignments.length > 0 &&
      !assignments.some((assignment) =>
        assignment.playerIdentity.isEqual(ctx.sender),
      )
    ) {
      throw new SenderError("Voce nao participa da votacao desta etapa.");
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
      (item) => item.roomId === roomId && item.active && item.online,
    );
    const assignments = Array.from(
      ctx.db.stageAssignment.roomId.filter(roomId),
    ).filter((item) => item.stage === currentRoom.currentStage);
    const eligiblePlayers =
      assignments.length === 0
        ? onlinePlayers
        : onlinePlayers.filter((player) =>
            assignments.some((assignment) =>
              assignment.playerIdentity.isEqual(player.identity),
            ),
          );
    const stageVotes = [...ctx.db.vote.iter()].filter(
      (item) =>
        item.roomId === roomId &&
        item.stage === currentRoom.currentStage &&
        eligiblePlayers.some((currentPlayer) =>
          item.voterIdentity.isEqual(currentPlayer.identity),
        ),
    );
    const waitingPlayer = eligiblePlayers.find(
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
    const economy = ctx.db.roomEconomy.roomId.find(roomId);
    if (!currentRoom) throw new SenderError("Sala não encontrada.");
    const membership = Array.from(ctx.db.player.roomId.filter(roomId)).find(
      (item) => item.active && item.identity.isEqual(ctx.sender),
    );
    if (!membership) throw new SenderError("Você não pertence a esta sala.");
    if (currentRoom.status !== "ACTIVE") {
      throw new SenderError("A jornada não está ativa.");
    }
    if (!economy) {
      throw new SenderError("A economia compartilhada da sala não existe.");
    }

    if (COLLABORATIVE_STAGES.has(currentRoom.currentStage)) {
      const currentSession = Array.from(
        ctx.db.stageSession.roomId.filter(roomId),
      ).find((item) => item.stage === currentRoom.currentStage);
      const currentDecision = Array.from(
        ctx.db.decision.roomId.filter(roomId),
      ).find((item) => item.stage === currentRoom.currentStage);
      const currentOutcome = Array.from(
        ctx.db.stageOutcome.roomId.filter(roomId),
      ).find((item) => item.stage === currentRoom.currentStage);
      if (
        !currentSession ||
        currentSession.phase !== "REVIEW" ||
        (currentSession.resolution === "UNION"
          ? !currentOutcome
          : !currentDecision)
      ) {
        throw new SenderError(
          "Revele e revise a decisão coletiva antes de avançar.",
        );
      }
    }

    if (currentRoom.currentStage === "PROTOTYPE") {
      if (!ctx.db.projectPrototype.roomId.find(roomId)?.committed) {
        throw new SenderError("Conclua o protótipo compartilhado.");
      }
    } else if (currentRoom.currentStage === "PILOT") {
      if (!ctx.db.pilotSimulation.roomId.find(roomId)?.completed) {
        throw new SenderError("Registre a decisão após o resultado do piloto.");
      }
    } else if (currentRoom.currentStage === "MARKETING") {
      if (!ctx.db.marketingPlan.roomId.find(roomId)?.committed) {
        throw new SenderError(
          "Confirme o plano e o investimento de marketing.",
        );
      }
    } else if (currentRoom.currentStage === "SALES") {
      if (!ctx.db.salesResult.roomId.find(roomId)) {
        throw new SenderError(
          "O resultado de vendas ainda está sendo calculado.",
        );
      }
    }

    let balance = economy.balance;
    let sequence = economy.nextSequence;
    const currentStageCost = Array.from(
      ctx.db.stageCost.roomId.filter(roomId),
    ).find((item) => item.stage === currentRoom.currentStage);
    if (!currentStageCost) {
      throw new SenderError("Custo da etapa indisponível.");
    }
    if (!currentStageCost.applied) {
      const charged = Math.min(balance, currentStageCost.amount);
      balance -= charged;
      ctx.db.stageCost.id.update({
        ...currentStageCost,
        applied: true,
        updatedAt: ctx.timestamp,
      });
      ctx.db.economyTransaction.insert({
        id: 0n,
        roomId,
        stage: currentRoom.currentStage,
        delta: -charged,
        balanceAfter: balance,
        sequence,
        reason: "STAGE_COST",
        eventKey: `stage-cost:${roomId}:${currentRoom.currentStage}`,
        label: currentStageCost.label,
        createdAt: ctx.timestamp,
      });
      sequence += 1;
    }

    const nextIndex = currentRoom.stageIndex + 1;
    if (nextIndex >= BOARD_STATES.length) {
      if (currentRoom.currentStage === "SALES") {
        const sales = ctx.db.salesResult.roomId.find(roomId);
        if (sales) {
          const tier =
            balance < 8_000
              ? "NEEDS_ITERATION"
              : balance < 12_000
                ? "MARKET_SIGNAL"
                : balance < 16_000
                  ? "TRACTION"
                  : "GROWTH_OPPORTUNITY";
          ctx.db.salesResult.roomId.update({
            ...sales,
            finalRunway: balance,
            tier,
          });
        }
      }
      if (!ctx.db.journey.roomId.find(roomId)) {
        const solutionDecision = Array.from(
          ctx.db.decision.roomId.filter(roomId),
        ).find((item) => item.roomId === roomId && item.stage === "SOLUTION");
        const solutionContribution = Array.from(
          ctx.db.contribution.roomId.filter(roomId),
        ).find((item) => item.stage === "SOLUTION" && item.kind === "MAIN");
        ctx.db.journey.insert({
          id: 0n,
          roomId,
          publicId: journeyPublicId(roomId),
          title: "Ideia da jornada " + journeyPublicId(roomId).toUpperCase(),
          summary:
            solutionDecision?.summary ??
            solutionContribution?.content ??
            "Uma ideia construída coletivamente para transformar o mundo.",
          createdAt: ctx.timestamp,
          updatedAt: ctx.timestamp,
        });
      }
      const activeInvite = ctx.db.roomCode.code.find(currentRoom.code);
      if (activeInvite?.roomId === roomId) {
        ctx.db.roomCode.code.delete(activeInvite.code);
      }
      ctx.db.roomEconomy.roomId.update({
        ...economy,
        balance,
        nextSequence: sequence,
        updatedAt: ctx.timestamp,
      });
      ctx.db.room.id.update({
        ...currentRoom,
        status: "FINISHED",
        updatedAt: ctx.timestamp,
      });
      return;
    }

    const nextStage = BOARD_STATES[nextIndex];
    const drawnCard = cardForRoomStage(roomId.toString(), nextStage);
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
      drawIndex: 0,
      active: true,
      reason: "INITIAL",
    });

    const phase =
      nextStage === "PROTOTYPE"
        ? "CHALLENGE"
        : nextStage === "PILOT"
          ? "FEEDBACK"
          : nextStage === "MARKETING"
            ? "CHOOSING"
            : nextStage === "SALES"
              ? "RESULT"
              : "CONTRIBUTING";
    const nextStagePlan = COLLABORATIVE_STAGES.has(nextStage)
      ? collaborativeStagePlan(nextStage)
      : undefined;
    ctx.db.stageSession.insert({
      id: 0n,
      roomId,
      stage: nextStage,
      phase,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      resolution: nextStagePlan?.resolution ?? "VOTE",
    });
    if (nextStagePlan) {
      Array.from(ctx.db.player.roomId.filter(roomId))
        .filter((member) => member.active)
        .sort((left, right) => (left.id < right.id ? -1 : 1))
        .forEach((member, position) => {
          const action =
            nextStagePlan.actions[position % nextStagePlan.actions.length];
          ctx.db.stageAssignment.insert({
            id: 0n,
            roomId,
            stage: nextStage,
            playerIdentity: member.identity,
            actionKey: action.key,
            actionTitle: action.title,
            actionPrompt: action.prompt,
            actionPlaceholder: action.placeholder,
            position,
            createdAt: ctx.timestamp,
          });
        });
    }

    if (nextStage === "PILOT" && !ctx.db.pilotSimulation.roomId.find(roomId)) {
      const feedback = pilotFeedbackForSeed(economy.seed);
      ctx.db.pilotSimulation.insert({
        roomId,
        feedbackTitle: feedback.title,
        feedbackDescription: feedback.description,
        optionA: feedback.options[0].title,
        optionADescription: feedback.options[0].description,
        optionALearning: feedback.options[0].learning,
        optionB: feedback.options[1].title,
        optionBDescription: feedback.options[1].description,
        optionBLearning: feedback.options[1].learning,
        optionC: feedback.options[2].title,
        optionCDescription: feedback.options[2].description,
        optionCLearning: feedback.options[2].learning,
        decision: "",
        learning: "",
        completed: false,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });
    }

    let fundingRevealed = economy.fundingRevealed;
    let reservedBalance = economy.reservedBalance;

    if (!fundingRevealed && economy.fundingStage === nextStage) {
      balance += economy.fundingValue;
      fundingRevealed = true;
      ctx.db.economyTransaction.insert({
        id: 0n,
        roomId,
        stage: nextStage,
        delta: economy.fundingValue,
        balanceAfter: balance,
        sequence,
        reason: "FUNDING_OPPORTUNITY",
        eventKey: `funding:${roomId}`,
        label: economy.fundingTitle,
        createdAt: ctx.timestamp,
      });
      sequence += 1;
    }

    if (nextStage === "MARKETING") {
      const salesCost = Array.from(ctx.db.stageCost.roomId.filter(roomId)).find(
        (item) => item.stage === "SALES",
      );
      reservedBalance = salesCost?.amount ?? 0;
    }

    if (nextStage === "SALES") {
      reservedBalance = 0;
      const marketing = ctx.db.marketingPlan.roomId.find(roomId);
      if (!marketing?.committed) {
        throw new SenderError("O plano de marketing não foi confirmado.");
      }
      const remainingCredits = balance;
      const calculation = calculateSalesResult({
        remainingCredits,
        marketingInvestment: marketing.investment,
        multiplier: marketing.effectiveMultiplier,
      });
      ctx.db.salesResult.insert({
        roomId,
        remainingCredits,
        marketingInvestment: marketing.investment,
        multiplier: marketing.effectiveMultiplier,
        simulatedSales: calculation.simulatedSales,
        finalRunway: calculation.finalRunway,
        tier: calculation.tier,
        createdAt: ctx.timestamp,
      });
      balance = calculation.finalRunway;
      ctx.db.economyTransaction.insert({
        id: 0n,
        roomId,
        stage: "SALES",
        delta: calculation.simulatedSales,
        balanceAfter: balance,
        sequence,
        reason: "SIMULATED_SALES",
        eventKey: `sales:${roomId}`,
        label: "Vendas simuladas",
        createdAt: ctx.timestamp,
      });
      sequence += 1;
      ctx.db.contribution.insert({
        id: 0n,
        roomId,
        stage: "SALES",
        authorIdentity: ctx.sender,
        kind: "MAIN",
        content: `Vendas simuladas: ${calculation.simulatedSales} créditos. Runway final: ${calculation.finalRunway} créditos.`,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
        actionKey: "MAIN",
      });
    }

    ctx.db.roomEconomy.roomId.update({
      ...economy,
      balance,
      reservedBalance,
      fundingRevealed,
      nextSequence: sequence,
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

export const end_journey = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom || currentRoom.status !== "ACTIVE") {
      throw new SenderError("A jornada não está ativa.");
    }
    if (!currentRoom.ownerIdentity.isEqual(ctx.sender)) {
      throw new SenderError("Apenas o anfitrião pode encerrar a jornada.");
    }

    if (!ctx.db.journey.roomId.find(roomId)) {
      const partialContribution = Array.from(
        ctx.db.contribution.roomId.filter(roomId),
      ).find(
        (item) =>
          item.stage === currentRoom.currentStage && item.kind === "MAIN",
      );
      ctx.db.journey.insert({
        id: 0n,
        roomId,
        publicId: journeyPublicId(roomId),
        title: "Jornada parcial " + journeyPublicId(roomId).toUpperCase(),
        summary: partialContribution
          ? "Jornada encerrada na etapa " +
            (currentRoom.stageIndex + 1) +
            ". Última contribuição: " +
            partialContribution.content
          : "Jornada encerrada na etapa " +
            (currentRoom.stageIndex + 1) +
            " antes de registrar contribuições.",
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
      });
    }

    const activeInvite = ctx.db.roomCode.code.find(currentRoom.code);
    if (activeInvite?.roomId === roomId) {
      ctx.db.roomCode.code.delete(activeInvite.code);
    }
    ctx.db.room.id.update({
      ...currentRoom,
      status: "FINISHED",
      updatedAt: ctx.timestamp,
    });
  },
);
export const update_journey = spacetimedb.reducer(
  { roomId: t.u64(), title: t.string(), summary: t.string() },
  (ctx, { roomId, title, summary }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom || currentRoom.status !== "FINISHED") {
      throw new SenderError("A jornada ainda não foi concluída.");
    }
    if (!currentRoom.ownerIdentity.isEqual(ctx.sender)) {
      throw new SenderError(
        "Apenas o anfitrião pode editar o manifesto final.",
      );
    }
    const currentPlayer = [...ctx.db.player.iter()].find(
      (item) =>
        item.roomId === roomId &&
        item.active &&
        item.identity.isEqual(ctx.sender),
    );
    if (!currentPlayer) {
      throw new SenderError("Você não pertence a esta sala.");
    }

    const normalizedTitle = normalizeJourneyTitle(title);
    const normalizedSummary = normalizeJourneySummary(summary);
    const currentJourney = ctx.db.journey.roomId.find(roomId);
    if (currentJourney) {
      ctx.db.journey.id.update({
        ...currentJourney,
        publicId: currentJourney.publicId || journeyPublicId(roomId),
        title: normalizedTitle,
        summary: normalizedSummary,
        updatedAt: ctx.timestamp,
      });
      const published = ctx.db.publishedResult.roomId.find(roomId);
      if (published) {
        ctx.db.publishedResult.token.update({
          ...published,
          publicId: currentJourney.publicId || journeyPublicId(roomId),
          title: normalizedTitle,
          summary: normalizedSummary,
          updatedAt: ctx.timestamp,
        });
      }
      return;
    }

    ctx.db.journey.insert({
      id: 0n,
      roomId,
      publicId: journeyPublicId(roomId),
      title: normalizedTitle,
      summary: normalizedSummary,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
  },
);

export const publish_journey = spacetimedb.reducer(
  { roomId: t.u64(), token: t.string() },
  (ctx, { roomId, token }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom || currentRoom.status !== "FINISHED") {
      throw new SenderError("A jornada ainda nao foi concluida.");
    }
    if (!currentRoom.ownerIdentity.isEqual(ctx.sender)) {
      throw new SenderError("Apenas o anfitriao pode publicar o resultado.");
    }
    const currentJourney = ctx.db.journey.roomId.find(roomId);
    if (!currentJourney) {
      throw new SenderError("O resultado da jornada nao foi encontrado.");
    }
    if (!/^[a-z0-9]{24,48}$/.test(token)) {
      throw new SenderError("Token de compartilhamento invalido.");
    }

    const sales = ctx.db.salesResult.roomId.find(roomId);
    const existing = ctx.db.publishedResult.roomId.find(roomId);
    const snapshot = {
      roomId,
      publicId: currentJourney.publicId || journeyPublicId(roomId),
      title: currentJourney.title,
      summary: currentJourney.summary,
      participantCount: Array.from(ctx.db.player.roomId.filter(roomId)).length,
      hasSalesResult: Boolean(sales),
      finalRunway: sales?.finalRunway ?? 0,
      updatedAt: ctx.timestamp,
    };

    if (existing) {
      ctx.db.publishedResult.token.update({ ...existing, ...snapshot });
      return;
    }

    ctx.db.publishedResult.insert({
      token,
      ...snapshot,
      publishedAt: ctx.timestamp,
    });
  },
);

export const leave_room = spacetimedb.reducer(
  { roomId: t.u64() },
  (ctx, { roomId }) => {
    const currentRoom = ctx.db.room.id.find(roomId);
    if (!currentRoom) throw new SenderError("Sala não encontrada.");
    const currentPlayer = [...ctx.db.player.iter()].find(
      (item) =>
        item.roomId === roomId &&
        item.active &&
        item.identity.isEqual(ctx.sender),
    );
    if (!currentPlayer) {
      throw new SenderError("Você não pertence a esta sala.");
    }

    const remainingPlayers = [...ctx.db.player.roomId.filter(roomId)]
      .filter((item) => item.active && item.id !== currentPlayer.id)
      .sort((left, right) =>
        left.joinedAt.microsSinceUnixEpoch < right.joinedAt.microsSinceUnixEpoch
          ? -1
          : 1,
      );

    if (
      currentRoom.ownerIdentity.isEqual(ctx.sender) &&
      remainingPlayers.length > 0
    ) {
      const nextHost = remainingPlayers[0];
      ctx.db.player.id.update({ ...nextHost, role: "HOST" });
      ctx.db.room.id.update({
        ...currentRoom,
        ownerIdentity: nextHost.identity,
        updatedAt: ctx.timestamp,
      });
    } else if (remainingPlayers.length === 0) {
      const activeInvite = ctx.db.roomCode.code.find(currentRoom.code);
      if (activeInvite?.roomId === roomId) {
        ctx.db.roomCode.code.delete(activeInvite.code);
      }
      ctx.db.room.id.update({
        ...currentRoom,
        status: "FINISHED",
        updatedAt: ctx.timestamp,
      });
    }

    ctx.db.player.id.update({
      ...currentPlayer,
      active: false,
      online: false,
      ready: false,
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
    if (currentPlayer.active && currentPlayer.identity.isEqual(ctx.sender)) {
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
    if (!currentPlayer.identity.isEqual(ctx.sender)) continue;

    const currentRoom = ctx.db.room.id.find(currentPlayer.roomId);
    // A lobby seat must be released when its connection closes. Otherwise a
    // disconnected participant still consumes one of the six places and can
    // prevent anyone (including themselves) from joining again with the code.
    // Keep active games intact so a temporary connection loss can reconnect to
    // the same journey without losing its participant attribution.
    const releaseLobbySeat =
      currentPlayer.active && currentRoom?.status === "LOBBY";
    ctx.db.player.id.update({
      ...currentPlayer,
      online: false,
      active: releaseLobbySeat ? false : currentPlayer.active,
      ready: releaseLobbySeat ? false : currentPlayer.ready,
    });

    if (!releaseLobbySeat || !currentRoom?.ownerIdentity.isEqual(ctx.sender)) {
      continue;
    }

    const nextHost = Array.from(ctx.db.player.roomId.filter(currentRoom.id))
      .filter((player) => player.active && player.id !== currentPlayer.id)
      .sort((left, right) =>
        left.joinedAt.microsSinceUnixEpoch < right.joinedAt.microsSinceUnixEpoch
          ? -1
          : 1,
      )[0];
    if (!nextHost) continue;

    ctx.db.player.id.update({ ...nextHost, role: "HOST" });
    ctx.db.room.id.update({
      ...currentRoom,
      ownerIdentity: nextHost.identity,
      updatedAt: ctx.timestamp,
    });
  }
});
