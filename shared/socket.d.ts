import {
  Game,
  GameMode,
  GameUser,
  GameUserAvatar,
  MarketingInvestment,
} from "./game";

export interface SocketData {
  name: string;
  id: string;
  avatar: GameUserAvatar;
  room: string;
}

export interface ServerToClientEvents {
  // noArg: () => void;
  // basicEmit: (a: number, b: string, c: Buffer) => void;
  // withAck: (d: string, callback: (e: number) => void) => void;
  game_state_update: (game: Game) => void;
}

export interface ClientToServerEvents {
  create_game: (
    body: { name: string; avatar: GameUserAvatar; cardQuantity: number },
    callback: ({ game: Game, user: GameUser }) => void
  ) => void;
  enter_game: (
    body: {
      name: string;
      avatar: GameUserAvatar;
      code: string;
    },
    callback: ({ game: Game, user: GameUser }) => void
  ) => void;
  start_game: (mode: GameMode) => void;
  get_scenario: (scenario: string | null) => void;
  select_scenario: () => void;
  run_problem: () => void;
  new_problem_round: () => void;
  problem_investment: (body: { userId: string; value: number }) => void;
  new_insight_round: () => void;
  run_solution: () => void;
  start_prototype: (step: number) => void;
  run_project_test: () => void;
  product_value: (body: { value: number }) => void;
  update_marketing_investment: (body: {
    values: MarketingInvestment[];
  }) => void;
  make_marketing_loan: (
    body: { type: "angel" | "bank"; value: number } | null
  ) => void;
  finish_marketing_investment: () => void;
  reset_game: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}
