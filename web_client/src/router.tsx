import { createBrowserRouter } from "react-router-dom";
import { StartGamePage } from "./pages/start-game";
import { ErrorPage } from "./error-page";
import { EnterGamePage } from "./pages/enter-game";
import { LobbyPage } from "./pages/lobby";
import { BoardDetailPage } from "./pages/board-detail";
import { AvatarsPage } from "./pages/avatars";
import { Root } from "./pages/root";
import { CardPage } from "./pages/card-screen";
import { HomePage } from "./pages/home";

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
        path: "/game",
        element: <CardPage />,
      },
      {
        path: "/board/problem",
        element: <BoardDetailPage />,
      },
    ],
  },
]);
