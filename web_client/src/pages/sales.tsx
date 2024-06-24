import { SalesGA } from "#/game";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

interface SalesPageProps {
  action: SalesGA;
}
export function SalesPage({ action }: SalesPageProps) {
  const store = useGameStore();
  const navigate = useNavigate();

  // function finishSelection() {
  //   socket.emit("run_problem");
  // }

  useEffect(() => {
    confetti({ disableForReducedMotion: true });
  }, []);

  useEffect(() => {
    if (store.game?.state === "LOBBY") {
      navigate("/lobby");
      return;
    }
    if (store.game?.state !== undefined && store.game.state !== "SALES") {
      navigate("/lobby");
      return;
    }
  }, [navigate, store.game?.state]);

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
            {!action.winned ? (
              <>
                <p className="text-center">Parabéns!!</p>
                <p className="">Vocês tiveram um projeto de sucesso!</p>

                <p>
                  O valor do produto foi de{" "}
                  {intlFormat.format(action.productPrice)}
                </p>

                <p>Totalizando um lucro de:</p>
                <p className="font-bold text-secondary font-mono text-base text-center">
                  {intlFormat.format(
                    action.marketingResult - action.investedValue
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="text-center">Não foi dessa vez!</p>
                <p>Vocês tiveram um prejuízo com essa rodada do projeto. </p>
                <p>
                  O valor do produto foi de{" "}
                  <span className="font-mono text-sm">
                    {intlFormat.format(action.productPrice)}
                  </span>
                </p>
                <p>Totalizando um prejuízo de:</p>
                <p className="font-bold text-secondary font-mono text-base text-center">
                  {intlFormat.format(
                    action.investedValue - action.marketingResult
                  )}
                </p>
                <p>Querem tentar fazer o marketing e vender novamente?</p>
              </>
            )}
          </div>
          {/* end centralize window */}
        </div>
      </div>

      <div>
        <div className="flex flex-col items-center gap-2">
          {action.winned ? (
            <Button onClick={() => socket.emit("reset_game")}>
              Começar novamente
            </Button>
          ) : (
            <Button onClick={() => socket.emit("run_problem")}>
              Voltar ao plano de marketing
            </Button>
          )}

          <Button asChild variant={"secondary"} className="w-36">
            <Link to="/board">Tabuleiro</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
