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
  MarketingGA,
  PilotGA,
  ProblemInvestmentInvested,
  ProblemInvestmentItem,
  ProblemsEndGA,
  ProblemsGA,
  ProblemsInvestmentGA,
  PrototypeGA,
  SalesGA,
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
      teamPoints: 0,
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
          "PROTOTYPE",
          "PILOT",
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
        started: false,
        step: 1,
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
      game.teamPoints = sum(game.users, (u) => u.points);
    }

    if (
      game.actualAction.state === "PROBLEM" ||
      game.actualAction.state === "INSIGHT"
    ) {
      const user = game.users.find((e) => e.name === socket.data.name);
      game.users = changeUserPoints(game, -1000, user!);
    }

    if (game.actualAction.state === "PROTOTYPE") {
      game.actualAction.investment = game.teamPoints * 0.2;
      game.teamPoints -= game.actualAction.investment;
      game.users.map((u) => ({
        ...u,
        points: game.teamPoints / game.users.length,
      }));

      const newState = {
        activeUser: game.owner,
        passed: Boolean(random(0, 1)),
        state: "PILOT",
        value: random(1, 6),
        started: "idle",
      } as PilotGA;

      game.actions.splice(game.actionIndex + 1, 0, newState);
    }

    if (game.actualAction.state === "PILOT") {
      if (game.actualAction.passed) {
        game.actions.splice(game.actionIndex + 1, 0, {
          activeUser: game.owner,
          state: "MARKETING",
          investment: [],
          productValues: [],
        } as MarketingGA);
      } else {
        game.actions.splice(game.actionIndex + 1, 0, {
          activeUser: game.owner,
          state: "PROTOTYPE",
          started: false,
          step: 1,
        } as PrototypeGA);
      }
    }

    if (game.actualAction.state === "MARKETING") {
      game.actions.splice(game.actionIndex + 1, 0, {
        activeUser: game.owner,
        state: "SALES",
      } as SalesGA);
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
    // game.users = changeUserPoints(game, +value, toUser!);

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

  socket.on("start_prototype", (step = 1) => {
    const game = db.get(socket.data.room);
    if (!game || game.actualAction.state !== "PROTOTYPE") {
      return;
    }

    game.actualAction.started = true;
    game.actualAction.step = step;

    updateAndEmit(game);
  });

  socket.on("run_project_test", () => {
    const game = db.get(socket.data.room);
    if (!game || game.actualAction.state !== "PILOT") {
      return;
    }

    if (game.actualAction.started === "dice")
      game.actualAction.started = "passed";
    else if (game.actualAction.started === "idle")
      game.actualAction.started = "dice";

    updateAndEmit(game);
  });

  socket.on("product_value", ({ value }) => {
    const game = db.get(socket.data.room);
    if (!game || game.actualAction.state !== "MARKETING") {
      return;
    }

    const activeUser = game.users.find((e) => e.id === socket.data.id);

    if (!activeUser) {
      return;
    }

    const userOldValue = game.actualAction.productValues.find(
      (e) => e.from.id === activeUser.id
    );

    if (userOldValue) {
      replace(
        game.actualAction.productValues,
        {
          from: userOldValue.from,
          value,
        },
        (u) => u.from.id === socket.data.id
      );
    } else {
      game.actualAction.productValues.push({
        from: activeUser,
        value,
      });
    }

    updateAndEmit(game);
  });

  socket.on("marketing_investment", ({ values }, callback) => {
    const game = db.get(socket.data.room);
    if (!game || game.actualAction.state !== "MARKETING") {
      return;
    }

    const activeUser = game.users.find((e) => e.id === socket.data.id);

    if (
      !activeUser ||
      game.actualAction.productValues.length !== game.users.length
    ) {
      return;
    }

    function randomMultiplier() {
      const min = 1;
      const max = 10_000;

      const randomValue = Math.random() * (max - min + 1) + min;

      return randomValue;
    }

    const gameValue =
      sum(game.actualAction.productValues, (e) => e.value) /
      game.actualAction.productValues.length;

    const marketingResult = sum(
      values.map((e) => gameValue * e.value * e.multiplier * randomMultiplier())
    );

    const startedValue = 30_000 * game.users.length;
    const investedValue = startedValue - sum(game.users, (e) => e.points);
    callback({
      investedValue,
      marketingResult,
      win: marketingResult > investedValue,
    });
  });

  socket.onAny((eventName, ...args) => {
    console.log({ eventName, args });
    writeFile("./db-cache.json", JSON.stringify([...db]));
  });
}
