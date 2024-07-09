import { CompetitiveSalesGA } from "#/game";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface SalesPageProps {
  action: CompetitiveSalesGA;
}
export function BetterSalesPage({ action }: SalesPageProps) {
  useEffect(() => {
    confetti();
  }, []);

  const intlFormat = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <>
      <div className="flex justify-center my-4">
        <div className="max-w-72 w-full">
          {/* window top bar */}
          <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
            <p className="text-white text-xl">Vendas</p>
          </div>

          {/* window */}
          <div className="w-full bg-accent border-2 rounded-b-xl p-6  text-primary text-xl leading-5">
            <p className="text-center">Parabéns!!</p>
            <p className="">
              {action.winner.from.name} teve um projeto de sucesso!
            </p>

            <p>
              O valor do produto foi de{" "}
              {intlFormat.format(action.winner.productPrice)}
            </p>

            <p>Totalizando um lucro de:</p>
            <p className="font-bold text-secondary font-mono text-base text-center">
              {intlFormat.format(
                action.winner.marketingResult - action.winner.investedValue
              )}
            </p>
          </div>
          {/* end centralize window */}
        </div>
      </div>
    </>
  );
}
