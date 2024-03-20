import { Server, Socket } from "socket.io";
import { Game, GameUser, ScenarioGameAction, db } from "./db";
import { uid } from "radash";
import { EventEmitter } from "node:stream";
import { getRandomWord } from "./words";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../../shared/socket";
export type * from "../../shared/socket";

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
      gameActions: [],
      owner: user,
      users: [user],
      actualAction: { activeUser: user, state: "SCENARIO", scenario: null },
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
    if (!dbGame || dbGame.state !== "LOBBY") {
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

    dbGame.state = "SCENARIO";

    updateAndEmit(dbGame);
  });

  socket.on("get_scenario", (scenario) => {
    const dbGame = db.get(socket.data.room);
    if (!dbGame) {
      return;
    }
    dbGame.actualAction = {
      activeUser: dbGame.actualAction.activeUser,
      state: dbGame.actualAction.state,
      scenario,
    };

    updateAndEmit(dbGame);
  });

  socket.on("start_problems", () => {
    const dbGame = db.get(socket.data.room);
    if (!dbGame) {
      return;
    }

    dbGame.gameActions.push(dbGame.actualAction);

    dbGame.state = "PROBLEM";
    dbGame.actualAction = {
      state: "PROBLEM",
      activeUser: dbGame.users[0],
    };

    console.log(dbGame);
    updateAndEmit(dbGame);
  });
}
