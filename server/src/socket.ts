import {
  draw,
  group,
  max,
  min,
  random,
  replace,
  shift,
  sum,
  uid,
} from "radash";
import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../shared/socket";
import {
  Game,
  GameState,
  GameUser,
  InsightEndGA,
  InsightGA,
  ProblemInvestmentInvested,
  ProblemInvestmentItem,
  ProblemsEndGA,
  ProblemsGA,
  ProblemsInvestmentGA,
  PrototypeGA,
  ScenarioGA,
  SolutionAdvocateGA,
  SolutionGA,
  SolutionSelectionGA,
  db,
} from "./db";
import { getRandomWord } from "./words";
export type * from "../../shared/socket";
import { writeFile } from "fs/promises";

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
      problemWinner: { winner: user, value: 0 },
    };
    db.set(code, newGame);

    socket.data.id = user.id;
    socket.data.name = user.name;
    socket.data.avatar = user.avatar;
    socket.data.room = code;
    socket.join(code);
    return callback({ game: newGame, user });
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

    socket.data.id = id;
    socket.data.name = nameToSet;
    socket.data.avatar = avatar;
    socket.data.room = code;
    socket.join(code);

    db.set(code, dbGame);
    socket.to(code).emit("game_state_update", dbGame);

    return callback({ game: dbGame, user });
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

    const problemsInvestments = {
      state: "PROBLEM_INVESTMENT",
      usersInvestment: [],
    } as ProblemsInvestmentGA;

    const insights = users.map(
      (u) =>
        ({
          activeUser: u,
          state: "INSIGHT",
          randomCard: rngCard(),
        } as InsightGA)
    );

    const endInsight = {
      activeUser: dbGame.owner,
      state: "INSIGHT_END",
    } as InsightEndGA;

    const solutions = users.map(
      (u) =>
        ({
          activeUser: u,
          state: "SOLUTION",
          randomCard: rngCard(),
        } as SolutionGA)
    );

    dbGame.actions = [
      scenarioAction,
      problems,
      problemsInvestments,
      // endProblems,
      insights,
      endInsight,
      solutions,
    ].flat();

    updateAndEmit(dbGame);
  });

  socket.on("get_scenario", (scenario) => {
    const dbGame = db.get(socket.data.room);
    if (!dbGame) {
      return;
    }

    if (dbGame.actualAction.state !== "SCENARIO") {
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
      (
        [
          "PROBLEM",
          "PROBLEM_END",
          "INSIGHT",
          "INSIGHT_END",
          "SOLUTION",
          "SOLUTION_SELECTION",
          "SOLUTION_ADVOCATE",
        ] as GameState[]
      ).every((e) => game.actualAction.state !== e)
    ) {
      return;
    }

    if (game.actualAction.state === "INSIGHT_END") {
      const userWithLessPoints = min(game.users, (e) => e.points);
      const userWithMorePoints = max(game.users, (e) => e.points);

      const solutionSelection = {
        activeUser: userWithLessPoints,
        state: "SOLUTION_SELECTION",
        randomCard: 0,
      } as SolutionSelectionGA;

      const usersThatCanAdvocate = game.users.filter(
        (e) => e.id !== userWithLessPoints?.id
      );
      const advocate = draw(usersThatCanAdvocate);
      const solutionAdvocate = {
        activeUser: advocate,
        state: "SOLUTION_ADVOCATE",
      } as SolutionAdvocateGA;

      const prototype = {
        state: "PROTOTYPE",
        activeUser: userWithMorePoints,
      } as PrototypeGA;

      const lastSolutionIndex = game.actions.findLastIndex(
        (e) => e.state === "SOLUTION"
      );
      game.actions.splice(
        lastSolutionIndex + 1,
        0,
        solutionSelection,
        solutionAdvocate,
        prototype
      );
    }

    if (game.actualAction.state === "SOLUTION_ADVOCATE") {
    }

    if (
      game.actualAction.state === "PROBLEM" ||
      game.actualAction.state === "INSIGHT"
    ) {
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
    if (!game || game.actualAction.state !== "PROBLEM_INVESTMENT") {
      return;
    }

    const userOldInvestment = game.actualAction.usersInvestment.find(
      (e) => e.from.id === socket.data.id
    );

    if (userOldInvestment) {
      return;
    }

    const user = game.users.find((e) => e.id === socket.data.id);
    const toUser = game.users.find((e) => e.id === userId);

    if (!user || !toUser) {
      return;
    }

    game.users = changeUserPoints(game, -value, user!);
    game.users = changeUserPoints(game, +value, toUser!);

    const investment: ProblemInvestmentItem = {
      action: "invested",
      from: user,
      to: toUser,
      investment: value,
    };
    game.actualAction.usersInvestment.push(investment);

    const isLastInvestment =
      game.actualAction.usersInvestment.length === game.users.length;

    if (isLastInvestment) {
      const everyoneInvested = game.actualAction.usersInvestment.every(
        (e): e is ProblemInvestmentInvested => e.action === "invested"
      );

      if (everyoneInvested) {
        const allInvestments = game.actions
          .filter(
            (e): e is ProblemsInvestmentGA => e.state === "PROBLEM_INVESTMENT"
          )
          .flatMap((e) => e.usersInvestment)
          .filter(
            (e): e is ProblemInvestmentInvested => e.action === "invested"
          );

        const problemWinner = max(
          Object.entries(group(allInvestments, (e) => e.to.id)).map(
            ([k, v]) => ({
              winner: v?.[0].to!,
              value: sum(v!.map((i) => i.investment)),
            })
          ),
          (e) => e.value
        );

        if (!problemWinner) return;

        game.problemWinner = problemWinner;

        function putUserInLast(u: GameUser, users: GameUser[]) {
          const usersWithoutU = users.filter((e) => e.id !== u.id);
          return [...usersWithoutU, u];
        }

        const problemEndActions = putUserInLast(
          problemWinner.winner,
          game.users
        ).map((u) => {
          return {
            activeUser: u,
            state: "PROBLEM_END",
          } as ProblemsEndGA;
        });
        game.actions.splice(game.actionIndex + 1, 0, ...problemEndActions);
      }

      game.actions[game.actionIndex] = game.actualAction;
      game.actionIndex = game.actionIndex + 1;
      game.actualAction = game.actions[game.actionIndex];
    }

    updateAndEmit(game);
  });

  socket.on("new_problem_round", () => {
    const game = db.get(socket.data.room);
    if (!game || game.actualAction.state !== "PROBLEM_INVESTMENT") {
      return;
    }

    const userOldInvestment = game.actualAction.usersInvestment.find(
      (e) => e.from.id === socket.data.id
    );
    const activeUser = game.users.find((e) => e.id === socket.data.id);
    if (userOldInvestment || !activeUser) {
      return;
    }

    const investment: ProblemInvestmentItem = {
      action: "new-round",
      from: activeUser,
    };
    game.actualAction.usersInvestment.push(investment);

    const newAction = {
      state: "PROBLEM",
      activeUser,
      randomCard: random(0, game.cardQuantity - 1),
    } as ProblemsGA;

    const nextInvestment = {
      state: "PROBLEM_INVESTMENT",
      usersInvestment: [],
    } as ProblemsInvestmentGA;

    const indexToChange = game.actionIndex + 1;
    const hasInvestment = game.actions
      .slice(indexToChange)
      .find((e) => e.state === "PROBLEM_INVESTMENT");

    if (!hasInvestment) {
      game.actions.splice(indexToChange, 0, newAction, nextInvestment);
    } else {
      game.actions.splice(indexToChange, 0, newAction);
    }

    if (game.actualAction.usersInvestment.length === game.users.length) {
      game.actions[game.actionIndex] = game.actualAction;
      game.actionIndex = game.actionIndex + 1;
      game.actualAction = game.actions[game.actionIndex];
    }

    updateAndEmit(game);
  });

  socket.on("new_insight_round", () => {
    const game = db.get(socket.data.room);
    if (!game || game.actualAction.state !== "INSIGHT_END") {
      return;
    }

    const user = game.users.find((e) => e.id === socket.data.id);
    game.users = changeUserPoints(game, -1000, user!);

    const users = shift(game.users, -1);

    const insights = users.map(
      (u) =>
        ({
          activeUser: u,
          state: "INSIGHT",
          randomCard: random(0, game.cardQuantity - 1),
        } as InsightGA)
    );

    const endInsight = {
      activeUser: game.owner,
      state: "INSIGHT_END",
    } as InsightEndGA;

    game.actions.splice(game.actionIndex + 1, 0, ...insights, endInsight);

    game.actions[game.actionIndex] = game.actualAction;
    game.actionIndex = game.actionIndex + 1;
    game.actualAction = game.actions[game.actionIndex];

    updateAndEmit(game);
  });

  // socket.on("run_problem", () => {
  //   const game = db.get(socket.data.room);
  //   if (
  //     !game ||
  //     (game.actualAction.state !== "PROBLEM" &&
  //       game.actualAction.state !== "INSIGHT" &&
  //       game.actualAction.state !== "PROBLEM_END" &&
  //       game.actualAction.state !== "INSIGHT_END")
  //   ) {
  //     return;
  //   }

  //   if (
  //     game.actualAction.state === "PROBLEM" ||
  //     game.actualAction.state === "INSIGHT"
  //   ) {
  //     const user = game.users.find((e) => e.name === socket.data.name);
  //     game.users = changeUserPoints(game, -1000, user!);
  //   }

  //   game.actions[game.actionIndex] = game.actualAction;
  //   game.actionIndex = game.actionIndex + 1;
  //   game.actualAction = game.actions[game.actionIndex];

  //   updateAndEmit(game);
  // });

  socket.onAny((eventName, ...args) => {
    console.log({ eventName, args });
    writeFile("./db-cache.json", JSON.stringify([...db]));
  });
}
