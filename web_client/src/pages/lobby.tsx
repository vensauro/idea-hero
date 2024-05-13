import { BoardSvg } from "@/components/board/board-svg";
import { Button } from "@/components/ui/button";
import { UsersBar } from "@/components/users-bar/users-bar";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function LobbyPage() {
  const store = useGameStore();
  const navigate = useNavigate();

  function copyToClipboard() {
    navigator.clipboard.writeText(store.game?.code ?? "");
  }

  useEffect(() => {
    if (store.game?.state === "SCENARIO") {
      navigate("/scenario");
    }
  }, [navigate, store.game?.state]);

  function startCollaborativeGame() {
    socket.emit("start_game");
  }
  return (
    <main className="min-h-screen flex flex-col ">
      <UsersBar activeUser={store.game?.owner} users={store.game?.users} />
      <div>
        <p className="flex justify-center items-center px-4 my-6 uppercase">
          <span className="text-secondary text-lg text-nowrap">
            Sala: {store.game?.code}{" "}
          </span>
          <Button onClick={copyToClipboard} variant="ghost">
            <img src="/copy-icon.svg" className="h-4" />
          </Button>
        </p>
        <div className="flex justify-center px-2">
          <BoardSvg />
        </div>
        {store.isOwner() ? (
          <div className="flex flex-col justify-center items-center my-6 gap-4">
            <Button
              onClick={startCollaborativeGame}
              variant="secondary"
              className="border-t-[3px] border-l-[5px] border-b-[6px] border-r-[8px]"
            >
              Jogo Colaborativo
            </Button>
            <Button className="bg-accent text-accent-foreground">
              Jogo Competitivo
            </Button>
          </div>
        ) : (
          <p className="text-center text-lg my-2 uppercase text-secondary font-bold">
            Aguarde o líder iniciar o jogo
          </p>
        )}
      </div>
    </main>
  );
}
