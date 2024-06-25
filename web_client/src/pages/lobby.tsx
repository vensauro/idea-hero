import { BoardSvg } from "@/components/board/board-svg";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { RWebShare } from "react-web-share";

export function LobbyPage() {
  const store = useGameStore();

  function copyToClipboard() {
    navigator.clipboard.writeText(store.game?.code ?? "");
  }

  return (
    <>
      <div>
        <p className="flex justify-center items-center px-4 my-6 uppercase">
          <span className="text-secondary text-lg text-nowrap">
            Sala: {store.game?.code}{" "}
          </span>
          <Button onClick={copyToClipboard} variant="ghost">
            <img src="/copy-icon.svg" className="h-4" />
          </Button>
          <RWebShare
            data={{
              text: "Venha jogar o Idea Hero comigo!",
              url: `${window.location.origin}/enter?code=${
                store.game?.code ?? ""
              }`,
              title: "Idea Hero",
            }}
          >
            <Button variant="ghost">
              <img src="/share-icon.svg" className="h-4" />
            </Button>
          </RWebShare>
        </p>
        <div className="flex justify-center px-2">
          <BoardSvg />
        </div>
        {store.isOwner() ? (
          <div className="flex flex-col justify-center items-center my-6 gap-4">
            <Button
              onClick={() => socket.emit("start_game", "collaborative")}
              variant="secondary"
              className="border-t-[3px] border-l-[5px] border-b-[6px] border-r-[8px]"
            >
              Jogo Colaborativo
            </Button>
            <Button
              onClick={() => socket.emit("start_game", "competitive")}
              className="bg-accent text-accent-foreground"
            >
              Jogo Competitivo
            </Button>
          </div>
        ) : (
          <p className="text-center text-lg my-2 uppercase text-secondary font-bold">
            Aguarde o líder iniciar o jogo
          </p>
        )}
      </div>
    </>
  );
}
