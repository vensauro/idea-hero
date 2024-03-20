type GameState =
  | "LOBBY"
  | "SCENARIO"
  | "PROBLEM"
  | "INSIGHT"
  | "SOLUTION"
  | "PROTOTYPE"
  | "PILOT"
  | "MARKETING"
  | "SALES"
  | "ENDED";

export interface Game {
  code: string;
  users: GameUser[];
  owner: GameUser;
  state: GameState;
  actions: GameActions[];
  actualAction: GameActions;
  actionIndex: number;
  cardQuantity: number;
}

export interface GameUser {
  id: string;
  name: string;
  avatar: GameUserAvatar;
  connected: boolean;
  socketId: string;
  points: number;
}
export interface GameUserAvatar {
  image: string;
  color: string;
}

export interface GameAction {
  state: GameState;
  activeUser: GameUser;
}

export interface ScenarioGA extends GameAction {
  state: "SCENARIO";
  scenario: string | null;
  activeUser: GameUser;
}

export interface ProblemsGA extends GameAction {
  state: "PROBLEM";
  activeUser: GameUser;
  randomCard: number;
}

export interface ProblemsEndGA extends GameAction {
  state: "PROBLEM_END";
}

export type ProblemsInvestmentGA =
  | {
      state: "PROBLEM_INVESTMENT";
      activeUser: GameUser;
      toUser: GameUser;
      investment: number;
    }
  | {
      state: "PROBLEM_INVESTMENT";
      activeUser: GameUser;
    };

export interface InsightGA extends GameAction {
  state: "INSIGHT";
  activeUser: GameUser;
  randomCard: number;
}

export interface SolutionGameAction extends GameAction {
  state: "SOLUTION";
  activeUser: GameUser;
  randomCard: number;
}

export interface SolutionGameAction extends GameAction {
  state: "SOLUTION";
  activeUser: GameUser;
  randomCard: number;
}

type GameActions =
  | ScenarioGA
  | ProblemsGA
  | ProblemsInvestmentGA
  | ProblemsEndGA
  | InsightGA;
