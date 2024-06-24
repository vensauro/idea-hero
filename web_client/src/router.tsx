import { createBrowserRouter } from "react-router-dom";
import { ErrorPage } from "./error-page";
import { AvatarsPage } from "./pages/avatars";
import { BoardPage } from "./pages/board";
import { BoardDetailPage } from "./pages/board-detail";
import { BoardIndex } from "./pages/board-index";
import { EnterGamePage } from "./pages/enter-game";
import { RunningGamePage } from "./pages/game-running";
import { HomePage } from "./pages/home";
import { Root } from "./pages/root";
import { StartGamePage } from "./pages/start-game";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/start", element: <StartGamePage /> },
      { path: "/enter", element: <EnterGamePage /> },
      { path: "/avatars", element: <AvatarsPage /> },
      // { path: "/lobby", element: <LobbyPage /> },
      { path: "/game", element: <RunningGamePage /> },
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
