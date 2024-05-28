import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export function Root() {
  const store = useGameStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("connect", store.connect);
    socket.on("disconnect", store.disconnect);
    socket.on("game_state_update", store.updateGameState);

    return () => {
      socket.off("connect", store.connect);
      socket.off("disconnect", store.disconnect);
      socket.off("game_state_update", store.updateGameState);
    };
  }, [store.connect, store.disconnect, store.updateGameState]);

  function reconnect() {
    if (socket.disconnected) {
      if (store.user) {
        const timeout = setTimeout(() => {
          navigate("/");
        }, 5000);
        socket.connect();
        socket.emit(
          "enter_game",
          {
            name: store.user.name,
            avatar: store.user.avatar,
            code: store.gameCode,
          },
          ({ game, user }) => {
            console.log({ game, user });
            store.updateGameState(game);
            store.setUser(user);
            clearTimeout(timeout);
          }
        );
      }
    }
  }

  return (
    <div className="bg-[#ffecd4] bg-[url(/graph-paper.svg)]">
      {!socket.connected &&
        !["/", "/start", "/enter", "/avatars"].includes(location.pathname) && (
          <Dialog open>
            <div className="relative">
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-border absolute right-0 text-red-500"
                >
                  <span>DESCONECTADO</span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.4449 0.608765C8.0183 -0.107015 6.9817 -0.107015 6.55509 0.608766L0.161178 11.3368C-0.275824 12.07 0.252503 13 1.10608 13H13.8939C14.7475 13 15.2758 12.07 14.8388 11.3368L8.4449 0.608765ZM7.4141 1.12073C7.45288 1.05566 7.54712 1.05566 7.5859 1.12073L13.9798 11.8488C14.0196 11.9154 13.9715 12 13.8939 12H1.10608C1.02849 12 0.980454 11.9154 1.02018 11.8488L7.4141 1.12073ZM6.8269 4.48611C6.81221 4.10423 7.11783 3.78663 7.5 3.78663C7.88217 3.78663 8.18778 4.10423 8.1731 4.48612L8.01921 8.48701C8.00848 8.766 7.7792 8.98664 7.5 8.98664C7.2208 8.98664 6.99151 8.766 6.98078 8.48701L6.8269 4.48611ZM8.24989 10.476C8.24989 10.8902 7.9141 11.226 7.49989 11.226C7.08567 11.226 6.74989 10.8902 6.74989 10.476C6.74989 10.0618 7.08567 9.72599 7.49989 9.72599C7.9141 9.72599 8.24989 10.0618 8.24989 10.476Z"
                      fill="currentColor"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </Button>
              </DialogTrigger>
            </div>
            <DialogContent
              className="sm:max-w-[425px]"
              title="Problema de conexão"
            >
              <DialogHeader>
                <DialogDescription className="max-w-prose">
                  <p>Você foi desconectado!</p>
                  <p>Clique no botão abaixo para tentar reconectar</p>
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="submit" onClick={reconnect}>
                    Reconectar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      <Outlet />
      <Toaster />
    </div>
  );
}
