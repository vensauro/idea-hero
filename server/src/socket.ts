import { Server, Socket } from "socket.io";
import {
  Game,
  GameUser,
  InsightGA,
  ProblemsEndGA,
  ProblemsGA,
  ProblemsInvestmentGA,
  ScenarioGA,
  db,
} from "./db";
import { random, replace, shift, uid } from "radash";
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

  function changeUserPoints(gameUpdate: Game, value: number, user: GameUser) {
    // const user = gameUpdate.users.find((e) => e.name === socket.data.name)!;

    return replace(
      gameUpdate.users,
      {
        ...user,
        points: user.points + value,
      },
      (e) => e.id === user?.id
    );
  }

  socket.on("create_game", ({ name, avatar, cardQuantity }, callback) => {
    const code = getRandomWord();
    const user: GameUser = {
      avatar,
      name,
      id: uid(10),
      connected: true,
      socketId: socket.id,
      points: 30_000,
    };

    const newGame: Game = {
      code,
      actions: [],
      owner: user,
      users: [user],
      actualAction: { activeUser: user, state: "SCENARIO", scenario: null },
      actionIndex: 0,
      state: "LOBBY",
      cardQuantity,
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
    const id = hasUser ? hasUser.id : uid(10);
    const user: GameUser = {
      avatar,
      name: nameToSet,
      id,
      connected: true,
      socketId: socket.id,
      points: 30_000,
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

    const rngCard = () => random(0, dbGame.cardQuantity - 1);

    const scenarioAction = {
      activeUser: dbGame.owner,
      state: "SCENARIO",
      scenario: null,
    } as ScenarioGA;

    const users = shift(dbGame.users, -1);
    const problems = users.map(
      (u) =>
        ({
          activeUser: u,
          state: "PROBLEM",
          randomCard: rngCard(),
        } as ProblemsGA)
    );

    const problemsInvestments = users.map(
      (u) =>
        ({
          state: "PROBLEM_INVESTMENT",
          activeUser: u,
        } as ProblemsInvestmentGA)
    );

    const insights = [users, users].flat().map(
      (u) =>
        ({
          activeUser: u,
          state: "INSIGHT",
          randomCard: rngCard(),
        } as InsightGA)
    );

    const endProblems = {
      state: "PROBLEM_END",
      activeUser: dbGame.owner,
    } as ProblemsEndGA;

    dbGame.actions = [
      scenarioAction,
      problems,
      problemsInvestments,
      endProblems,
      insights,
    ].flat();

    updateAndEmit(dbGame);
  });

  socket.on("get_scenario", (scenario) => {
    const dbGame = db.get(socket.data.room);
    if (!dbGame) {
      return;
    }
    dbGame.actualAction = {
      activeUser: dbGame.actualAction.activeUser,
      state: "SCENARIO",
      scenario,
    };

    updateAndEmit(dbGame);
  });

  socket.on("select_scenario", () => {
    const dbGame = db.get(socket.data.room);
    if (!dbGame) {
      return;
    }

    dbGame.state = "PROBLEM";

    dbGame.actions[dbGame.actionIndex] = dbGame.actualAction;
    dbGame.actionIndex = dbGame.actionIndex + 1;
    dbGame.actualAction = dbGame.actions[dbGame.actionIndex];

    updateAndEmit(dbGame);
  });

  socket.on("run_problem", () => {
    const game = db.get(socket.data.room);
    if (
      !game ||
      (game.actualAction.state !== "PROBLEM" &&
        game.actualAction.state !== "INSIGHT" &&
        game.actualAction.state !== "PROBLEM_END")
    ) {
      return;
    }

    if (game.actualAction.state !== "PROBLEM_END") {
      const user = game.users.find((e) => e.name === socket.data.name);
      game.users = changeUserPoints(game, -1000, user!);
    }

    game.actions[game.actionIndex] = game.actualAction;
    game.actionIndex = game.actionIndex + 1;
    game.actualAction = game.actions[game.actionIndex];

    updateAndEmit(game);
  });

  socket.on("problem_investment", ({ userId, value }) => {
    const game = db.get(socket.data.room);
    if (!game) {
      return;
    }

    const user = game.users.find((e) => e.name === socket.data.name);
    game.users = changeUserPoints(game, -value, user!);

    const toUser = game.users.find((e) => e.id === userId);
    game.users = changeUserPoints(game, +value, toUser!);

    game.actualAction = {
      state: "PROBLEM_INVESTMENT",
      activeUser: game.actualAction.activeUser,
      investment: value,
      toUser,
    } as ProblemsInvestmentGA;

    game.actions[game.actionIndex] = game.actualAction;
    game.actionIndex = game.actionIndex + 1;
    game.actualAction = game.actions[game.actionIndex];

    updateAndEmit(game);
  });

  socket.on("new_problem_round", () => {
    const game = db.get(socket.data.room);
    if (!game) {
      return;
    }

    const activeUser = game.users.find((e) => e.name === socket.data.name);
    const newAction = {
      state: "PROBLEM",
      activeUser,
      randomCard: random(0, game.cardQuantity - 1),
    } as ProblemsGA;

    const lastProblemActionIndex = game.actions.findLastIndex(
      (e) => e.state === "PROBLEM"
    );
    const lastInvestmentActionIndex = game.actions.findLastIndex(
      (e) => e.state === "PROBLEM_INVESTMENT"
    );
    const lastEndActionIndex = game.actions.findLastIndex(
      (e) => e.state === "PROBLEM_END"
    );

    const indexToChange =
      game.actionIndex > lastProblemActionIndex
        ? lastInvestmentActionIndex - 1
        : lastProblemActionIndex + 1;

    game.actions.splice(indexToChange, 0, newAction);

    game.actions[game.actionIndex] = game.actualAction;
    game.actionIndex = game.actionIndex + 1;
    game.actualAction = game.actions[game.actionIndex];

    updateAndEmit(game);
  });
}
