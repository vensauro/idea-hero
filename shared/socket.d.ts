import { Game } from "./game";

export interface ServerToClientEvents {
  // noArg: () => void;
  // basicEmit: (a: number, b: string, c: Buffer) => void;
  // withAck: (d: string, callback: (e: number) => void) => void;
  game_state_update: (game: Game) => void;
}

export interface ClientToServerEvents {
  start_game: (
    body: { name: string; avatar: string },
    callback: (game: Game) => void
  ) => void;
  enter_game: (
    body: { name: string; avatar: string; code: string },
    callback: (game: Game) => void
  ) => void;
}

export interface InterServerEvents {
  ping: () => void;
}
