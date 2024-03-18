import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export function StartGamePage() {
  const store = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    socket.disconnect();
  }, []);

  function startGame() {
    socket.connect();
    socket.emit(
      "create_game",
      {
        avatar: store.avatar,
        name: store.nickname,
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
            to="avatars"
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
        <Button onClick={startGame}>Iniciar jogo</Button>
        <Link className={cn(buttonVariants({ variant: "link" }))} to="/enter">
          Entrar em sala existente?
        </Link>
      </div>
    </main>
  );
}
