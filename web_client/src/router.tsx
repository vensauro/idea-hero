import { createBrowserRouter } from "react-router-dom";
import { StartGamePage } from "./pages/start-game";
import { ErrorPage } from "./error-page";
import { EnterGamePage } from "./pages/enter-game";
import { LobbyPage } from "./pages/lobby";
import { BoardDetailPage } from "./pages/board-detail";
import { AvatarsPage } from "./pages/avatars";
import { Root } from "./pages/root";
import { ScenarioPage } from "./pages/scenario";
import { HomePage } from "./pages/home";
import { ProblemsPage } from "./pages/problems";
import { ProblemInvestment } from "./pages/problem-investment";
import { ProblemFinishPage } from "./pages/problem-end";
import { InsightsPage } from "./pages/insights";
import { SolutionsPage } from "./pages/solutions";
import { PrototypePage } from "./pages/prototype";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/start",
        element: <StartGamePage />,
      },
      {
        path: "/enter",
        element: <EnterGamePage />,
      },
      {
        path: "/avatars",
        element: <AvatarsPage />,
      },
      {
        path: "/lobby",
        element: <LobbyPage />,
      },
      {
        path: "/scenario",
        element: <ScenarioPage />,
      },
      {
        path: "/problems",
        element: <ProblemsPage />,
      },
      {
        path: "/problems-investment",
        element: <ProblemInvestment />,
      },
      {
        path: "/problems-end",
        element: <ProblemFinishPage />,
      },
      {
        path: "/insights",
        element: <InsightsPage />,
      },
      {
        path: "/solutions",
        element: <SolutionsPage />,
      },
      {
        path: "/prototype",
        element: <PrototypePage />,
      },
      {
        path: "/board",
        element: <BoardDetailPage />,
      },
      {
        path: "/board/problem",
        element: <BoardDetailPage />,
      },
    ],
  },
]);
