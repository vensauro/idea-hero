type GameState =
  | "LOBBY"
  | "SCENARIO"
  | "PROBLEM"
  | "PROBLEM_END"
  | "INSIGHT"
  | "INSIGHT_END"
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
  problemWinner: {
    winner: GameUser;
    value: number;
  };
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

// ACTIONS
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

export type ProblemInvestmentInvested = {
  action: "invested";
  from: GameUser;
  to: GameUser;
  investment: number;
};
export type ProblemInvestmentNewRound = { action: "new-round"; from: GameUser };

export type ProblemInvestmentItem =
  | ProblemInvestmentInvested
  | ProblemInvestmentNewRound;

export type ProblemsInvestmentGA = {
  state: "PROBLEM_INVESTMENT";
  usersInvestment: ProblemInvestmentItem[];
};

export interface InsightGA extends GameAction {
  state: "INSIGHT";
  activeUser: GameUser;
  randomCard: number;
}

export interface InsightEndGA extends GameAction {
  state: "INSIGHT_END";
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
  | InsightGA
  | InsightEndGA
  | SolutionGameAction;
