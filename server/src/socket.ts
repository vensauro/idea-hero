import {
  diff,
  draw,
  group,
  max,
  min,
  random,
  replace,
  shift,
  shuffle,
  sum,
  uid,
  unique,
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
  LobbyGA,
  MarketingGA,
  PilotGA,
  ProblemInvestmentInvested,
  ProblemInvestmentItem,
  ProblemsEndGA,
  ProblemsGA,
  ProblemsInvestmentGA,
  PrototypeGA,
  RandomPremiumGA,
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

  function changeUserPoints(gameUpdate: Game, value: number, userId: string) {
    const user = gameUpdate.users.find((e) => e.id === userId);
    if (!user) return;

    gameUpdate.teamPoints += value;
    gameUpdate.users = replace(
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
      mode: "collaborative",
      actions: [],
      owner: user,
      users: [user],
      teamPoints: user.points,
      actualAction: { activeUser: user, state: "LOBBY" },
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
    const game = db.get(code);
    if (!game) {
      return;
    }

    const oldUser = game.users.find((e) => e.name === name);
    const user: GameUser = {
      avatar,
      name:
        oldUser === undefined || oldUser.connected === false
          ? name
          : `${name} 2`,
      id: oldUser === undefined || oldUser.connected ? uid(10) : oldUser.id,
      connected: true,
      socketId: socket.id,
      points: 30_000,
    };

    if (oldUser === undefined) {
      game.users.push(user);
    } else {
      game.users = replace(game.users, user, (e) => e.id === user.id);
    }

    socket.data.id = user.id;
    socket.data.name = user.name;
    socket.data.avatar = avatar;
    socket.data.room = code;

    socket.join(code);

    db.set(code, game);
    socket.to(code).emit("game_state_update", game);

    return callback({ game: game, user });
  });

  socket.on("disconnect", (reason) => {
    const game = db.get(socket.data.room);
    if (!game) {
      return;
    }

    game.users = game.users.map((e) => {
      if (e.name === socket.data.name) {
        return {
          ...e,
          connected: false,
        };
      }
      return e;
    });

    db.set(socket.data.room, game);
    socket.to(socket.data.room).emit("game_state_update", game);
  });

  socket.on("start_game", (gameMode) => {
    const game = db.get(socket.data.room);
    if (!game) {
      return;
    }

    game.teamPoints = sum(game.users.map((e) => e.points));
    game.mode = gameMode;
    game.state = "SCENARIO";
    const rngCard = () => random(0, game.cardQuantity - 1);

    if (gameMode === "collaborative") {
      const scenarioAction = {
        activeUser: game.owner,
        state: "SCENARIO",
        scenario: null,
      } as ScenarioGA;

      const users = shift(game.users, -1);
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
        activeUser: game.owner,
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
        activeUser: game.owner,
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

      game.actions = [
        scenarioAction,
        problems,
        problemsInvestments,
        // endProblems,
        insights,
        endInsight,
        solutions,
      ].flat();
      game.actualAction = game.actions[game.actionIndex];

      const rngActionNumber = Math.random();

      if (rngActionNumber <= 0.8) {
        const indexToInsert = random(1, game.actions.length - 1);

        game.actions.splice(indexToInsert, 0, {
          state: "RANDOM_PREMIUM",
          activeUser: game.owner,
          earnedValue: random(1, 10) * 1000 * draw([-1, 1])!,
          textIndex: random(0, 9),
        });
      } else if (rngActionNumber <= 0.3) {
        const indexToInsert = random(1, game.actions.length - 1);

        game.actions.splice(indexToInsert, 0, {
          state: "RANDOM_PREMIUM",
          activeUser: game.owner,
          earnedValue: random(1, 10) * 1000 * draw([-1, 1])!,
          textIndex: random(0, 9),
        });
      }
    }

    if (gameMode === "competitive") {
      const users = shuffle(game.users);

      const scenarios = users.map(
        (u) =>
          ({
            activeUser: u,
            state: "SCENARIO",
            scenario: null,
          } as ScenarioGA)
      );

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
        activeUser: game.owner,
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
        activeUser: game.owner,
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

      game.actions = [
        scenarios,
        problems,
        problemsInvestments,
        // endProblems,
        insights,
        insights,
        endInsight,
        solutions,
      ].flat();
      game.actualAction = game.actions[game.actionIndex];
    }

    updateAndEmit(game);
  });

  socket.on("reset_game", () => {
    const game = db.get(socket.data.room);
    if (!game) {
      return;
    }

    game.actions = [];
    game.state = "LOBBY";
    game.teamPoints = 0;
    game.actualAction = {
      activeUser: game.owner,
      state: "LOBBY",
    };
    game.actionIndex = 0;
    game.problemWinner = { winner: game.owner, value: 0 };

    updateAndEmit(game);
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
          "RANDOM_PREMIUM",
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
      game.actualAction.state === "INSIGHT" ||
      game.actualAction.state === "SOLUTION"
    ) {
      changeUserPoints(game, -1000, socket.data.id);
    }

    if (game.actualAction.state === "PROTOTYPE") {
      game.actualAction.investment = game.teamPoints * 0.2;
      game.teamPoints -= game.actualAction.investment;
      game.users = game.users.map((u) => ({
        ...u,
        points: game.teamPoints / game.users.length,
      }));

      const newState = {
        activeUser: game.owner,
        passed: Math.random() > 0.3,
        state: "PILOT",
        value: random(1, 6),
        started: "idle",
      } as PilotGA;

      game.actions.splice(game.actionIndex + 1, 0, newState);
    }

    if (game.actualAction.state === "PILOT") {
      const pilotInvestment =
        game.actualAction.value /
        (game.actions[game.actionIndex - 1] as PrototypeGA).investment;

      game.teamPoints -= pilotInvestment;
      game.users = game.users.map((u) => ({
        ...u,
        points: game.teamPoints / game.users.length,
      }));

      if (game.actualAction.passed) {
        game.actions.splice(game.actionIndex + 1, 0, {
          activeUser: game.owner,
          state: "MARKETING",
          investment: [],
          productValues: [],
          loan: null,
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

    if (game.actualAction.state === "RANDOM_PREMIUM") {
      game.teamPoints += game.actualAction.earnedValue;
      const valuePerUser = game.actualAction.earnedValue / game.users.length;
      game.users = game.users.map((u) => ({
        ...u,
        points: u.points + valuePerUser,
      }));
    }

    game.actions[game.actionIndex] = game.actualAction;
    game.actionIndex = game.actionIndex + 1;
    game.actualAction = game.actions[game.actionIndex];
    game.state = game.actualAction.state;

    updateAndEmit(game);
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

  socket.on("problem_investment", ({ userId, value }) => {
    const game = db.get(socket.data.room);
    if (!game || game.actualAction.state !== "PROBLEM_INVESTMENT") {
      return;
    }

    const user = game.users.find((e) => e.id === socket.data.id);
    const toUser = game.users.find((e) => e.id === userId);

    if (!user || !toUser) {
      return;
    }

    if (game.mode === "collaborative") {
      const userOldInvestment = game.actualAction.usersInvestment.find(
        (e) => e.from.id === socket.data.id
      );

      if (userOldInvestment) {
        return;
      }
      changeUserPoints(game, -value, user.id);
    }
    if (game.mode === "competitive") {
      changeUserPoints(game, -value, user.id);
      changeUserPoints(game, +value, toUser.id);
    }

    // game.users = changeUserPoints(game, +value, toUser!);

    const investment: ProblemInvestmentItem = {
      action: "invested",
      from: user,
      to: toUser,
      investment: value,
    };
    game.actualAction.usersInvestment.push(investment);

    const isLastInvestment =
      unique(game.actualAction.usersInvestment, (e) => e.from.id).length ===
      game.users.length;

    if (isLastInvestment) {
      if (game.mode === "collaborative") {
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
      }

      if (game.mode === "competitive") {
        const usersHaveInvestment = unique(
          game.actions
            .filter(
              (e): e is ProblemsInvestmentGA => e.state === "PROBLEM_INVESTMENT"
            )
            .flatMap((e) =>
              e.usersInvestment
                .filter(
                  (i): i is ProblemInvestmentInvested => i.action === "invested"
                )
                .map((i) => i.to)
            ),
          (e) => e.id
        );

        if (game.users.length !== usersHaveInvestment.length) {
          const usersWithoutInvestment = diff(game.users, usersHaveInvestment);
          const newActions = usersWithoutInvestment.map(
            (u) =>
              ({
                state: "PROBLEM",
                activeUser: u,
                randomCard: random(0, game.cardQuantity - 1),
              } as ProblemsGA)
          );

          const nextInvestment = {
            state: "PROBLEM_INVESTMENT",
            usersInvestment: [],
            activeUser: game.owner,
          } as ProblemsInvestmentGA;

          const indexToChange = game.actionIndex + 1;
          const hasInvestment = game.actions
            .slice(indexToChange)
            .find((e) => e.state === "PROBLEM_INVESTMENT");

          if (!hasInvestment) {
            game.actions.splice(
              indexToChange,
              0
              // ...newActions,
              // nextInvestment
            );
          } else {
            game.actions.splice(indexToChange, 0, ...newActions);
          }
          // const newAction = {
          // } as ProblemsGA;
        }
      }

      game.actions[game.actionIndex] = game.actualAction;
      game.actionIndex = game.actionIndex + 1;
      game.actualAction = game.actions[game.actionIndex];
      game.state = game.actualAction.state;
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
      activeUser: game.owner,
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
      game.state = game.actualAction.state;
    }

    updateAndEmit(game);
  });

  socket.on("new_insight_round", () => {
    const game = db.get(socket.data.room);
    if (!game || game.actualAction.state !== "INSIGHT_END") {
      return;
    }

    changeUserPoints(game, -1000, socket.data.id);

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
    game.state = game.actualAction.state;

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
    const activeUser = game?.users.find((e) => e.id === socket.data.id);

    if (!game || !activeUser || game.actualAction.state !== "MARKETING") {
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

  socket.on("update_marketing_investment", ({ values }) => {
    const game = db.get(socket.data.room);
    if (
      !game ||
      game.actualAction.state !== "MARKETING" ||
      game.actualAction.activeUser.id !== socket.data.id
    ) {
      return;
    }

    game.actualAction.investment = values;

    updateAndEmit(game);
  });

  socket.on("make_marketing_loan", (loan) => {
    const game = db.get(socket.data.room);
    if (
      !game ||
      game.actualAction.state !== "MARKETING" ||
      game.actualAction.activeUser.id !== socket.data.id
    ) {
      return;
    }

    const lastLoanValue = game.actualAction.loan?.value ?? 0;
    const loanValue = loan?.value ?? 0;

    game.teamPoints = game.teamPoints + lastLoanValue - loanValue;

    const userPoints = game.teamPoints / game.users.length;
    game.users = game.users.map((u) => ({
      ...u,
      points: userPoints,
    }));

    game.actualAction.loan = loan;

    updateAndEmit(game);
  });

  socket.on("finish_marketing_investment", () => {
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
      const max = 3000;

      const randomValue = Math.random() * (max - min + 1) + min;

      return randomValue;
    }

    const productPrice =
      sum(game.actualAction.productValues, (e) => e.value) /
      game.actualAction.productValues.length;

    const marketingResult = sum(
      game.actualAction.investment.map(
        (e) => productPrice * e.value * e.multiplier * randomMultiplier()
      )
    );

    const startedValue = 30_000 * game.users.length;
    const investedValue = startedValue - sum(game.users, (e) => e.points);
    const winned = marketingResult > investedValue;
    const profit = marketingResult - investedValue;
    const loanResult =
      game.actualAction.loan?.type === "angel" ? profit * 0.1 : 21_000;

    game.actions.splice(game.actionIndex + 1, 0, {
      activeUser: game.owner,
      state: "SALES",
      investedValue,
      marketingResult,
      profit,
      loanResult,
      winned,
      productPrice,
    } as SalesGA);

    if (!winned) {
      game.actions.splice(game.actionIndex + 1, 0, {
        activeUser: game.owner,
        state: "MARKETING",
        investment: [],
        productValues: [],
        loan: null,
      } as MarketingGA);
    }

    game.actions[game.actionIndex] = game.actualAction;
    game.actionIndex = game.actionIndex + 1;
    game.actualAction = game.actions[game.actionIndex];
    game.state = game.actualAction.state;

    updateAndEmit(game);
  });
}
