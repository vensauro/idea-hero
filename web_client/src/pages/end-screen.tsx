import { SalesGA } from "#/game";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cardsUrls } from "@/lib/cards_urls";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface EndPageProps {
  action: SalesGA;
}
export function EndPage({ action }: EndPageProps) {
  const store = useGameStore();
  const activeUser = store.game?.actualAction?.activeUser;
  useEffect(() => {
    confetti();
  }, []);

  const intlFormat = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  console.log(action);

  function save() {
    window.print();
  }

  return (
    <div className="h-full">
      <div className="w-screen relative">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 700 145"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0H700V130.5C700 130.5 674.5 163.125 496 130.5C317.5 97.875 0 130.5 0 130.5V0Z"
            fill="#F26489"
          />
        </svg>
        <span className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white font-bold text-xl">
          {today}
        </span>
        <img
          src="/idea-hero-logo.svg"
          alt="IDEA HERO"
          className="h-10 absolute right-5 top-1/2 transform -translate-y-1/2"
        />
      </div>

      <div className="p-2">
        {/* Title Section */}
        <h1 className="text-2xl font-bold text-center">{activeUser?.name}</h1>
        <div className="flex justify-center">
          {activeUser && (
            <Avatar
              className={cn(
                activeUser.avatar.color,
                activeUser.connected ? "opacity-100" : "opacity-25",
                "size-32"
              )}
            >
              <AvatarImage
                src={activeUser.avatar.image}
                alt={`${activeUser.name} avatar`}
              />
            </Avatar>
          )}
        </div>
        {action.winned ? (
          <h2 className="text-2xl font-extrabold text-center">
            PARABÉNS! <br /> SUA IDEIA FOI UM SUCESSO!
          </h2>
        ) : (
          <h2 className="text-2xl font-extrabold text-center">
            QUASE LÁ! <br /> FALTOU POUCO PARA O SUCESSO
          </h2>
        )}

        {/* Investment and Profit Section */}
        <div className="flex justify-around">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-yellow-500 leading-3">
              <img src="/moeda.png" alt="Moeda" className="size-14" />
            </span>
            <div className="text-lg text-gray-700">
              <p>
                VOCÊ RECEBEU {intlFormat.format(action.investedValue)} EM
                INVESTIMENTOS
              </p>

              <p>
                SUA IDEIA TEVE {intlFormat.format(action.marketingResult)} EM
                {action.winned ? " LUCROS" : " PREJUIZO"}
              </p>
            </div>
          </div>
        </div>

        {/* Participants Section */}
        <div className="">
          <h3 className="bg-primary text-lg font-semibold text-white border-2 rounded-lg px-2">
            JOGADORES PARTICIPANTES
          </h3>
          <div className="flex justify-around items-center py-4">
            {store.game?.users.map((u) => (
              <div
                className="flex justify-center items-center gap-2"
                key={u.id}
              >
                <Avatar
                  className={cn(
                    u.avatar.color,
                    u.connected ? "opacity-100" : "opacity-25",
                    "size-10"
                  )}
                >
                  <AvatarImage src={u.avatar.image} alt={`${u.name} avatar`} />
                </Avatar>
                <span className="text-base text-gray-600">{u.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inspiration Cards Section */}
        <div className="space-y-4">
          <h3 className="bg-primary text-lg font-semibold text-white border-2 rounded-lg px-2">
            CARTAS DE INSPIRAÇÃO
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {action.cards.map((card, idx) => (
              <img
                key={idx}
                src={`/ia_cards/${cardsUrls[card]}`}
                className="w-[236px] h-[347px] bg-gray-200 rounded-md"
              />
            ))}
          </div>
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
            <div>CENÁRIO</div>
            <div>PROBLEMA</div>
            <div>INSIGHT</div>
            <div>SOLUÇÃO</div>
          </div> */}
        </div>

        {/* Idea and Journey Section */}
        <div className="py-4">
          <h3 className="bg-primary text-lg font-semibold text-white border-2 rounded-lg px-2">
            REGISTRE SUA IDEIA E SUA JORNADA
          </h3>
          <textarea
            className="w-full h-24 border border-gray-300 rounded-md p-2 text-sm text-gray-700 my-4"
            placeholder="DIGITE AQUI SOBRE A SUA IDEIA!"
          />
          <Button className="w-full" type="submit" onClick={save}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
