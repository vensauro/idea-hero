import { createBrowserRouter } from "react-router-dom";
import { StartGamePage } from "./pages/start-game";
import { ErrorPage } from "./error-page";
import { EnterGamePage } from "./pages/enter-game";
import { LobbyPage } from "./pages/lobby";
import { BoardDetailPage } from "./pages/board-detail";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <StartGamePage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/enter",
    element: <EnterGamePage />,
  },
  {
    path: "/lobby",
    element: <LobbyPage />,
  },
  {
    path: "/board/problem",
    element: <BoardDetailPage />,
  },
]);
