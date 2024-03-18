import { Server, Socket } from "socket.io";
import { Game, GameUser, db } from "./db";
import { uid } from "radash";
import { EventEmitter } from "node:stream";
import { getRandomWord } from "./words";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
} from "../../shared/socket";
export type * from "../../shared/socket";

export interface SocketData {
  name: string;
  avatar: string;
  room: string;
}

export function handleSocket(
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) {
  function updateAndEmit(gameUpdate: Game) {
    db.set(socket.data.room, gameUpdate);
    socket.to(socket.data.room).emit("game_state_update", gameUpdate);
    io.to(socket.id).emit("game_state_update", gameUpdate);
  }

  socket.on("create_game", ({ name, avatar }, callback) => {
    const code = getRandomWord();
    const user: GameUser = {
      avatar,
      name,
      id: uid(10),
      connected: true,
      socketId: socket.id,
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

    socket.data.name = name;
    socket.data.avatar = avatar;
    socket.data.room = code;
    socket.join(code);
    return callback(newGame);
  });

  socket.on("enter_game", ({ name, avatar, code }, callback) => {
    const dbGame = db.get(code);
    if (!dbGame) {
      return;
    }

    const hasUser = dbGame.users.find((e) => e.name === name);
    const nameToSet = hasUser?.connected ? `${name} 2` : name;
    const user: GameUser = {
      avatar,
      name: nameToSet,
      id: uid(10),
      connected: true,
      socketId: socket.id,
    };

    if (hasUser === undefined || hasUser.connected) {
      dbGame.users.push(user);
    } else {
      dbGame.users = dbGame.users.map((e) => {
        if (e.name === nameToSet) {
          return user;
        }
        return e;
      });
    }

    socket.data.name = nameToSet;
    socket.data.avatar = avatar;
    socket.data.room = code;
    socket.join(code);

    db.set(code, dbGame);
    socket.to(code).emit("game_state_update", dbGame);

    return callback(dbGame);
  });

  socket.on("disconnect", (reason) => {
    const dbGame = db.get(socket.data.room);
    if (!dbGame) {
      return;
    }

    dbGame.users = dbGame.users.map((e) => {
      if (e.name === socket.data.name) {
        return {
          ...e,
          connected: false,
        };
      }
      return e;
    });

    db.set(socket.data.room, dbGame);
    socket.to(socket.data.room).emit("game_state_update", dbGame);
  });

  socket.on("start_game", () => {
    const dbGame = db.get(socket.data.room);
    if (!dbGame) {
      return;
    }

    dbGame.state = "STARTED";

    updateAndEmit(dbGame);
  });
}
