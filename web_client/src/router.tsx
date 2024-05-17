import { createBrowserRouter } from "react-router-dom";
import { ErrorPage } from "./error-page";
import { AvatarsPage } from "./pages/avatars";
import { BoardPage } from "./pages/board";
import { BoardDetailPage } from "./pages/board-detail";
import { BoardIndex } from "./pages/board-index";
import { EnterGamePage } from "./pages/enter-game";
import { HomePage } from "./pages/home";
import { InsightsPage } from "./pages/insights";
import { LobbyPage } from "./pages/lobby";
import { ProblemFinishPage } from "./pages/problem-end";
import { ProblemInvestment } from "./pages/problem-investment";
import { ProblemsPage } from "./pages/problems";
import { PrototypePage } from "./pages/prototype";
import { Root } from "./pages/root";
import { ScenarioPage } from "./pages/scenario";
import { SolutionsPage } from "./pages/solutions";
import { StartGamePage } from "./pages/start-game";
import { PilotPage } from "./pages/pilot";
import { MarketingPage } from "./pages/marketing";

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
        path: "/pilot",
        element: <PilotPage />,
      },
      {
        path: "/marketing",
        element: <MarketingPage />,
      },
      {
        path: "/board",
        element: <BoardPage />,
        children: [
          {
            index: true,
            element: <BoardIndex />,
          },
          {
            path: ":state",
            element: <BoardDetailPage />,
          },
        ],
      },
    ],
  },
]);
