import { Game, GameUserAvatar } from "./game";

export interface SocketData {
  name: string;
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
    body: { name: string; avatar: GameUserAvatar },
    callback: (game: Game) => void
  ) => void;
  enter_game: (
    body: {
      name: string;
      avatar: GameUserAvatar;
      code: string;
    },
    callback: (game: Game) => void
  ) => void;
  start_game: () => void;
  get_scenario: (scenario: string | null) => void;
  start_problems: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}
