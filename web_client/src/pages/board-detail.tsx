import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function BoardDetailPage() {
  const navigate = useNavigate();
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

        <a
          href="#"
          className="relative block overflow-hidden rounded-lg border border-gray-100 p-4 sm:p-6 lg:p-8"
        >
          <span className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-green-300 via-blue-500 to-purple-600"></span>

          <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
            Problemas
          </h3>

          <div className="mt-4">
            <p className="text-pretty text-sm text-gray-500">
              A partir do sorteio de cartas, os jogadores seguintes descrevem
              problemas ou detalhes de um problema no cenário. O problema
              principal é escolhido por investimento
            </p>
          </div>

          {/* <dl className="mt-6 flex gap-4 sm:gap-6">
            <div className="flex flex-col-reverse">
              <dt className="text-sm font-medium text-gray-600">Published</dt>
              <dd className="text-xs text-gray-500">31st June, 2021</dd>
            </div>

            <div className="flex flex-col-reverse">
              <dt className="text-sm font-medium text-gray-600">
                Reading time
              </dt>
              <dd className="text-xs text-gray-500">3 minute</dd>
            </div>
          </dl> */}
        </a>

        <div className="flex justify-evenly mt-4">
          <Button onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </div>
    </main>
  );
}
