import { BoardSvg } from "@/components/board/board-svg";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export function LobbyPage() {
  const store = useGameStore();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({
      behavior: "auto",
      block: "center",
      inline: "center",
    });
  }, [store.game?.users]);

  function copyToClipboard() {
    navigator.clipboard.writeText(store.game?.code ?? "");
  }

  useEffect(() => {
    if (store.game?.state === "STARTED") {
      navigate("/game");
    }
  }, [navigate, store.game?.state]);
  console.log(store);

  function startCollaborativeGame() {
    socket.emit("start_game");
  }
  return (
    <main className="min-h-screen flex flex-col ">
      <div className="flex items-center overflow-y-auto gap-3 bg-accent p-2 h-[146px]">
        {store.game?.users
          .filter((e) => e.id !== store.game?.owner.id)
          .slice(0, (store.game?.users.length - 1) / 2)
          .map((user) => (
            <div key={user.id}>
              <Avatar
                className={cn(
                  user.avatar.color,
                  user.connected ? "opacity-100" : "opacity-25"
                )}
              >
                <AvatarImage
                  src={user.avatar.image}
                  alt={`${user.name} avatar`}
                />
              </Avatar>
              <div className="-mt-2 z-10 w-full flex justify-center relative">
                <span className="bg-slate-400 p-1">{user.name}</span>
              </div>
            </div>
          ))}
        <div>
          <Avatar
            className={cn(
              store.game?.owner.avatar.color,
              store.game?.owner.connected ? "opacity-100" : "opacity-25",
              "h-24 w-24"
            )}
          >
            <AvatarImage
              src={store.game?.owner.avatar.image}
              alt={`${store.game?.owner.name} avatar`}
            />
          </Avatar>
          <div className="-mt-2 z-10 w-full flex justify-center relative">
            <span className="bg-slate-400 p-1">{store.game?.owner.name}</span>
          </div>
        </div>
        {store.game?.users
          .filter((e) => e.id !== store.game?.owner.id)
          .slice((store.game?.users.length - 1) / 2)
          .map((user) => (
            <div key={user.id}>
              <Avatar
                className={cn(
                  user.avatar.color,
                  user.connected ? "opacity-100" : "opacity-25"
                )}
              >
                <AvatarImage
                  src={user.avatar.image}
                  alt={`${user.name} avatar`}
                />
              </Avatar>
              <div className="-mt-2 z-10 w-full flex justify-center relative">
                <span className="bg-slate-400 p-1">{user.name}</span>
              </div>
            </div>
          ))}
      </div>
      <div>
        <p className="flex items-center px-4 my-6 uppercase">
          <span className="text-secondary font-bold text-nowrap">
            Sala: {store.game?.code}{" "}
          </span>
          <Button onClick={copyToClipboard} variant="ghost">
            <img src="/copy-icon.svg" className="h-4" />
          </Button>
        </p>
        <div className="flex justify-center">
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
          <p className="text-center uppercase text-secondary font-bold">
            Aguarde o líder iniciar o jogo
          </p>
        )}
      </div>
    </main>
  );
}
