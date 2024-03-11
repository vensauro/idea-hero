import { Socket } from "socket.io";
import { Game, GameUser, db } from "./db";
import { uid } from "radash";
import { EventEmitter } from "node:stream";
import { getRandomWord } from "./words";

export interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

export interface ClientToServerEvents {
  gameStateUpdate: (game: Game) => void;
  startGame: (
    body: { name: string; avatar: number },
    callback: (game: Game) => void
  ) => void;
  enterGame: (
    body: { name: string; avatar: number; code: string },
    callback: (game: Game) => void
  ) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  name: string;
  avatar: number;
}

const eventEmitter = new EventEmitter();

export function handleSocket(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) {
  socket.on("startGame", ({ name, avatar }, callback) => {
    const code = getRandomWord();
    const user: GameUser = {
      avatar,
      name,
      id: uid(10),
      // socketId: socket.id,
    };

    const newGame: Game = {
      code,
      gameAction: [],
      owner: user,
      users: [user],
      actualAction: { card: -1, user, startedAt: new Date() },
      state: "LOBBY",
    };
    db.set(code, newGame);

    return callback(newGame);
    // db.set(code, {});
  });

  socket.on("enterGame", ({ name, avatar, code }, callback) => {
    const dbGame = db.get(code);
    if (!dbGame) {
      return;
    }

    const hasUser = dbGame.users.find((e) => e.name === name);
    const user: GameUser = {
      avatar,
      name: hasUser ? `${name} 2` : name,
      id: uid(10),
      // socketId: socket.id,
    };
    dbGame.users.push(user);
    db.set(code, dbGame);

    return callback(dbGame);
  });
}
