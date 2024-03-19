type GameState = "LOBBY" | "STARTED" | "ENDED";

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
  activeUser: GameUser;
}

export interface ActualGameAction extends GameAction {
  startedAt: Date;
}

export interface Game<T extends GameAction = GameAction> {
  code: string;
  users: GameUser[];
  owner: GameUser;
  state: GameState;
  gameActions: T[];
  actualAction: T;
}
