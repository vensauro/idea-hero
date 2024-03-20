type GameState = "LOBBY" | "SCENARIO" | "PROBLEM" | "ENDED";

export interface Game {
  code: string;
  users: GameUser[];
  owner: GameUser;
  state: GameState;
  gameActions: GameActions[];
  actualAction: GameActions;
}

export interface GameUser {
  id: string;
  name: string;
  avatar: GameUserAvatar;
  connected: boolean;
  socketId: string;
}
export interface GameUserAvatar {
  image: string;
  color: string;
}

export interface GameAction {
  state: GameState;
  activeUser: GameUser;
}

export interface ScenarioGameAction extends GameAction {
  state: "SCENARIO";
  scenario: string | null;
  activeUser: GameUser;
}

export interface ProblemsGameAction extends GameAction {
  state: "PROBLEM";
  activeUser: GameUser;
}

type GameActions = ScenarioGameAction | ProblemsGameAction;
