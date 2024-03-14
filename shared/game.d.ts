type GameState = "LOBBY" | "STARTED" | "ENDED";

export interface GameUser {
  id: string;
  name: string;
  avatar: string;
  connected: boolean;
  socketId: string;
}

export interface GameAction {
  card: number;
  user: GameUser;
}

export interface ActualGameAction extends GameAction {
  startedAt: Date;
}

export interface Game {
  code: string;
  users: GameUser[];
  owner: GameUser;
  gameAction: GameAction[];
  actualAction: ActualGameAction;
  state: GameState;
}
