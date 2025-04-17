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
  | "SOLUTION_INVESTMENT"
  | "PROTOTYPE"
  | "PILOT"
  | "MARKETING"
  | "SALES"
  | "COMPETITIVE_SALES"
  | "ENDED"
  | "RANDOM_PREMIUM";

export type GameMode = "collaborative" | "competitive";
export interface Game {
  code: string;
  users: GameUser[];
  owner: GameUser;
  mode: GameMode;
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
  cardsQueue: number[];
  cardsCache: number[];
  expiresAt: number;
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
export interface LobbyGA extends GameAction {
  state: "LOBBY";
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

export type GameInvestment = {
  action: "invested";
  from: GameUser;
  to: GameUser;
  investment: number;
};
export type GameNewRound = { action: "new-round"; from: GameUser };

export type GameInvestmentItem = GameInvestment | GameNewRound;

export interface ProblemsInvestmentGA extends GameAction {
  state: "PROBLEM_INVESTMENT";
  usersInvestment: GameInvestmentItem[];
}

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
  to: GameUser;
}

export interface SolutionInvestmentGa extends GameAction {
  state: "SOLUTION_INVESTMENT";
  usersInvestment: GameInvestmentItem[];
}

export interface PrototypeGA extends GameAction {
  state: "PROTOTYPE";
  started: boolean;
  step: number;
  investment: number;
  to?: GameUser;
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
  name: string;
  value: number;
}
export interface MarketingGA extends GameAction {
  state: "MARKETING";
  productValues: MarketingProduct[];
  investment: MarketingInvestment[];
  loan: { type: "angel" | "bank"; value: number } | null;
}

export interface SalesGA extends GameAction {
  state: "SALES";
  investedValue: number;
  marketingResult: number;
  winned: boolean;
  productPrice: number;
  cards: number[]
}

interface Sale {
  productPrice: number;
  investedValue: number;
  marketingResult: number;
  from: GameUser;
}
export interface CompetitiveSalesGA extends GameAction {
  state: "COMPETITIVE_SALES";
  sales: Sale[];
  winner: Sale;
}

export interface RandomPremiumGA extends GameAction {
  state: "RANDOM_PREMIUM";
  earnedValue: number;
  textIndex: number;
}

type GameActions =
  | LobbyGA
  | ScenarioGA
  | ProblemsGA
  | ProblemsInvestmentGA
  | ProblemsEndGA
  | InsightGA
  | InsightEndGA
  | SolutionGA
  | SolutionSelectionGA
  | SolutionAdvocateGA
  | SolutionInvestmentGa
  | PrototypeGA
  | PilotGA
  | MarketingGA
  | SalesGA
  | CompetitiveSalesGA
  | RandomPremiumGA;
