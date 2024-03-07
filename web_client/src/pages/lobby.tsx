import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BoardSvg } from "@/components/board/board-svg";
import { Button } from "@/components/ui/button";

export function LobbyPage() {
  return (
    <main className="min-h-screen flex flex-col ">
      <div className="flex overflow-y-auto gap-3 bg-neutral-300 p-2">
        <div>
          <Avatar className="">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="-mt-3 z-10 w-full flex justify-center relative">
            <span className="bg-slate-400">500</span>
          </div>
        </div>
        <div>
          <Avatar className="">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="-mt-3 z-10 w-full flex justify-center relative">
            <span className="bg-slate-400">500</span>
          </div>
        </div>
        <div>
          <Avatar className="">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="-mt-3 z-10 w-full flex justify-center relative">
            <span className="bg-slate-400">500</span>
          </div>
        </div>
        <div>
          <Avatar className="">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="-mt-3 z-10 w-full flex justify-center relative">
            <span className="bg-slate-400">500</span>
          </div>
        </div>
        <div>
          <Avatar className="">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="-mt-3 z-10 w-full flex justify-center relative">
            <span className="bg-slate-400">500</span>
          </div>
        </div>
        <div>
          <Avatar className="">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="-mt-3 z-10 w-full flex justify-center relative">
            <span className="bg-slate-400">500</span>
          </div>
        </div>
        <div>
          <Avatar className="">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="-mt-3 z-10 w-full flex justify-center relative">
            <span className="bg-slate-400">500</span>
          </div>
        </div>
      </div>
      <div>
        <p>Código: askjdghkewq</p>
        <div className="flex justify-center">
          <BoardSvg />
        </div>
        <div className="flex justify-evenly mt-4">
          <Button>Jogo Colaborativo</Button>
          <Button>Jogo Competitivo</Button>
        </div>
      </div>
    </main>
  );
}
