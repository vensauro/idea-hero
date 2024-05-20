type GameState =
  | "LOBBY"
  | "SCENARIO"
  | "PROBLEM"
  | "PROBLEM_END"
  | "PROBLEM_INVESTMENT"
  | "INSIGHT"
  | "INSIGHT_END"
  | "SOLUTION"
  | "SOLUTION_SELECTION"
  | "SOLUTION_ADVOCATE"
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
  teamPoints: number;
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

export interface SolutionGA extends GameAction {
  state: "SOLUTION";
  activeUser: GameUser;
  randomCard: number;
}

export interface SolutionSelectionGA extends GameAction {
  state: "SOLUTION_SELECTION";
  activeUser: GameUser;
  randomCard: number;
}

export interface SolutionAdvocateGA extends GameAction {
  state: "SOLUTION_ADVOCATE";
  activeUser: GameUser;
}

export interface PrototypeGA extends GameAction {
  state: "PROTOTYPE";
  started: boolean;
  step: number;
  investment: number;
  // activeUser: GameUser;
}

export interface PilotGA extends GameAction {
  state: "PILOT";
  value: number;
  passed: boolean;
  started: "dice" | "passed" | "idle";
}

export interface MarketingProduct {
  value: number;
  from: GameUser;
}

export interface MarketingInvestment {
  multiplier: number;
  value: number;
}
export interface MarketingGA extends GameAction {
  state: "MARKETING";
  productValues: MarketingProduct[];
  investment: MarketingInvestment[];
}

export interface SalesGA extends GameAction {
  state: "SALES";
  investedValue: number;
  marketingResult: number;
  winned: boolean;
}

type GameActions =
  | ScenarioGA
  | ProblemsGA
  | ProblemsInvestmentGA
  | ProblemsEndGA
  | InsightGA
  | InsightEndGA
  | SolutionGA
  | SolutionSelectionGA
  | SolutionAdvocateGA
  | PrototypeGA
  | PilotGA
  | MarketingGA
  | SalesGA;
