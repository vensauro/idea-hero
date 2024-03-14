import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

export function EnterGamePage() {
  const store = useGameStore();
  const navigate = useNavigate();
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    socket.disconnect();
  }, []);
  function startGame() {
    socket.connect();
    socket.emit(
      "enter_game",
      {
        avatar: store.avatar,
        name: store.nickname,
        code: codeRef.current?.value ?? "",
      },
      store.updateGameState
    );
    navigate("/lobby");
  }

  return (
    <main className="p-6 min-h-screen flex flex-col">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center">
        Idea Hero
      </h1>
      <div className="flex flex-col w-full gap-6 h-full flex-1 justify-center mb-10">
        <div className="flex justify-center">
          <Link
            className={cn("h-20 w-20 rounded-md bg-slate-300", store.avatar)}
            to="/avatars"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nickname">Nome</Label>
          <Input
            id="nickname"
            type="text"
            placeholder="Como gostaria de ser chamado?"
            required
            value={store.nickname}
            onChange={(e) => store.setNick(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="game-code">Código da sala</Label>
          <Input
            id="game-code"
            type="text"
            placeholder="Peça o código ao seu amigo!"
            ref={codeRef}
          />
        </div>
        <Button onClick={startGame}>Entrar em jogo</Button>
        <Link className={cn(buttonVariants({ variant: "link" }))} to="/">
          Deseja criar uma sala?
        </Link>
      </div>
    </main>
  );
}
