import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cardsUrls } from "@/lib/cards_urls";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export function EnterGamePage() {
  const store = useGameStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [gameCode, setGameCode] = useState(
    searchParams.get("code") || store.gameCode || ""
  );

  useEffect(() => {
    store.updateGameState(null);
    socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startGame() {
    if (store.avatar === null) {
      return toast.error("Selecione o avatar");
    }

    if (!gameCode) {
      return toast.error("Digite o código da sala!");
    }

    socket.connect();

    let response = await socket.emitWithAck("enter_game", {
      avatar: store.avatar,
      name: store.nickname,
      code: gameCode,
    });

    if (!response) {
      response = await socket.emitWithAck("create_game", {
        avatar: store.avatar,
        name: store.nickname,
        cardQuantity: cardsUrls.length,
        code: gameCode,
      });
    }

    store.updateGameState(response.game);
    store.setUser(response.user);
    store.setCode(gameCode);

    navigate("/game");
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex justify-end p-6">
        <img src="/menu-hamburguer.svg" alt="burguer menu" className="h-5" />
      </div>
      <h1 className="scroll-m-20 flex justify-center items-center">
        <img src="/idea-hero-logo.svg" alt="IDEA HERO" className="h-32" />
      </h1>
      {/* centralize window */}
      <div className="flex-1 flex items-center justify-center">
        {/* limit window width */}
        <div className="max-w-72 w-full">
          {/* window top bar */}
          <div className="h-8 border-2 rounded-t-md w-full bg-secondary border-b-0 flex justify-end items-center">
            <button
              className="text-white mx-4 h-5 w-5 bg-border flex justify-center items-center font-bold"
              onClick={() => navigate("/")}
            >
              <span className="mb-1">x</span>
            </button>
          </div>

          {/* window */}
          <form
            className="relative flex flex-col w-full bg-[#fff6e5] px-14 py-5 border-2 border-[#665e68] rounded-b-md"
            onSubmit={(e) => {
              e.preventDefault();
              startGame();
            }}
          >
            <div className="">
              <Label htmlFor="nickname" className="text-border">
                NOME
              </Label>
              <Input
                id="nickname"
                type="text"
                placeholder="Me chamem de..."
                required
                value={store.nickname}
                onChange={(e) => store.setNick(e.target.value)}
                className="bg-primary text-primary-foreground placeholder:text-primary-foreground border-2 border-border rounded-sm"
              />
            </div>
            <div className="">
              <Label htmlFor="game-code" className="text-border">
                CÓDIGO DA SALA
              </Label>
              <Input
                id="game-code"
                type="text"
                placeholder={store.gameCode || "Código secreto!"}
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                className="bg-primary text-primary-foreground placeholder:text-primary-foreground border-2 border-border rounded-sm"
              />
            </div>
            <div className="flex justify-center">
              <Button
                className="border-t-[3px] border-l-[5px] border-b-[6px] border-r-[8px] my-4"
                type="submit"
                variant="secondary"
              >
                ENTRAR
              </Button>
            </div>
            <Link
              className={cn(
                "h-20 w-20 rounded-md bg-white absolute -bottom-10 -right-10 border-2 border-primary p-2",
                "flex justify-center items-center",
                store.avatar?.color
              )}
              to="/avatars"
            >
              <img
                src={store.avatar?.image ?? "/avatar-selector.svg"}
                className="h-16"
              />
            </Link>
          </form>
          {/* end centralize window */}
        </div>
      </div>
      <img src="/home-footer-icon.svg" alt="IDEA HERO" className="h-52" />
    </main>
  );
}
