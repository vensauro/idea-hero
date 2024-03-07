import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function StartGamePage() {
  return (
    <main className="p-6 min-h-screen flex flex-col">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center">
        Idea Hero
      </h1>
      <div className="flex flex-col w-full gap-6 h-full flex-1 justify-center mb-10">
        <div className="flex justify-center">
          <Link
            className="h-20 w-20 rounded-md bg-slate-300"
            to="avatars"
          ></Link>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nickname">Nome</Label>
          <Input
            id="nickname"
            type="text"
            placeholder="Como gostaria de ser chamado?"
          />
        </div>
        <Button asChild>
          <Link to="/lobby">Iniciar jogo</Link>
        </Button>
        <Link className={cn(buttonVariants({ variant: "link" }))} to="/enter">
          Entrar em sala existente?
        </Link>
      </div>
    </main>
  );
}
