import { BoardSvg } from "@/components/board/board-svg";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function LobbyPage() {
  const store = useGameStore();
  const navigate = useNavigate();
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
      <div className="flex overflow-y-auto gap-3 bg-neutral-300 p-2">
        {store.game?.users.map((user) => (
          <div key={user.id}>
            <Avatar
              className={cn(
                user.avatar,
                user.connected ? "opacity-100" : "opacity-25"
              )}
            >
              {/* <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" /> */}
            </Avatar>
            <div className="-mt-2 z-10 w-full flex justify-center relative">
              <span className="bg-slate-400 p-1">{user.name}</span>
            </div>
          </div>
        ))}
      </div>
      <div>
        <p className="flex justify-between px-4">
          <span>Código: {store.game?.code} </span>
          <svg
            onClick={copyToClipboard}
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 2V1H10V2H5ZM4.75 0C4.33579 0 4 0.335786 4 0.75V1H3.5C2.67157 1 2 1.67157 2 2.5V12.5C2 13.3284 2.67157 14 3.5 14H7V13H3.5C3.22386 13 3 12.7761 3 12.5V2.5C3 2.22386 3.22386 2 3.5 2H4V2.25C4 2.66421 4.33579 3 4.75 3H10.25C10.6642 3 11 2.66421 11 2.25V2H11.5C11.7761 2 12 2.22386 12 2.5V7H13V2.5C13 1.67157 12.3284 1 11.5 1H11V0.75C11 0.335786 10.6642 0 10.25 0H4.75ZM9 8.5C9 8.77614 8.77614 9 8.5 9C8.22386 9 8 8.77614 8 8.5C8 8.22386 8.22386 8 8.5 8C8.77614 8 9 8.22386 9 8.5ZM10.5 9C10.7761 9 11 8.77614 11 8.5C11 8.22386 10.7761 8 10.5 8C10.2239 8 10 8.22386 10 8.5C10 8.77614 10.2239 9 10.5 9ZM13 8.5C13 8.77614 12.7761 9 12.5 9C12.2239 9 12 8.77614 12 8.5C12 8.22386 12.2239 8 12.5 8C12.7761 8 13 8.22386 13 8.5ZM14.5 9C14.7761 9 15 8.77614 15 8.5C15 8.22386 14.7761 8 14.5 8C14.2239 8 14 8.22386 14 8.5C14 8.77614 14.2239 9 14.5 9ZM15 10.5C15 10.7761 14.7761 11 14.5 11C14.2239 11 14 10.7761 14 10.5C14 10.2239 14.2239 10 14.5 10C14.7761 10 15 10.2239 15 10.5ZM14.5 13C14.7761 13 15 12.7761 15 12.5C15 12.2239 14.7761 12 14.5 12C14.2239 12 14 12.2239 14 12.5C14 12.7761 14.2239 13 14.5 13ZM14.5 15C14.7761 15 15 14.7761 15 14.5C15 14.2239 14.7761 14 14.5 14C14.2239 14 14 14.2239 14 14.5C14 14.7761 14.2239 15 14.5 15ZM8.5 11C8.77614 11 9 10.7761 9 10.5C9 10.2239 8.77614 10 8.5 10C8.22386 10 8 10.2239 8 10.5C8 10.7761 8.22386 11 8.5 11ZM9 12.5C9 12.7761 8.77614 13 8.5 13C8.22386 13 8 12.7761 8 12.5C8 12.2239 8.22386 12 8.5 12C8.77614 12 9 12.2239 9 12.5ZM8.5 15C8.77614 15 9 14.7761 9 14.5C9 14.2239 8.77614 14 8.5 14C8.22386 14 8 14.2239 8 14.5C8 14.7761 8.22386 15 8.5 15ZM11 14.5C11 14.7761 10.7761 15 10.5 15C10.2239 15 10 14.7761 10 14.5C10 14.2239 10.2239 14 10.5 14C10.7761 14 11 14.2239 11 14.5ZM12.5 15C12.7761 15 13 14.7761 13 14.5C13 14.2239 12.7761 14 12.5 14C12.2239 14 12 14.2239 12 14.5C12 14.7761 12.2239 15 12.5 15Z"
              fill="currentColor"
              fill-rule="evenodd"
              clip-rule="evenodd"
            ></path>
          </svg>
        </p>
        <div className="flex justify-center">
          <BoardSvg />
        </div>
        <div className="flex justify-evenly mt-4">
          {store.isOwner() ? (
            <>
              <Button onClick={startCollaborativeGame}>
                Jogo Colaborativo
              </Button>
              <Button>Jogo Competitivo</Button>
            </>
          ) : (
            <p>Aguarde o líder iniciar o jogo</p>
          )}
        </div>
      </div>
    </main>
  );
}
