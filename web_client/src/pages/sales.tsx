import { Button } from "@/components/ui/button";
import { UsersBar } from "@/components/users-bar/users-bar";
import { useGameStore } from "@/lib/store";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { socket } from "@/lib/socket";

export function SalesPage() {
  const store = useGameStore();
  const navigate = useNavigate();

  // function finishSelection() {
  //   socket.emit("run_problem");
  // }

  useEffect(() => {
    confetti({ disableForReducedMotion: true });
  }, []);

  useEffect(() => {
    if (store.game?.state === "MARKETING") {
      navigate("/marketing");
      return;
    }
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

  if (store.game?.actualAction.state !== "SALES") return;

  return (
    <main className="min-h-screen flex flex-col">
      <UsersBar
        activeUser={store.game?.actualAction.activeUser}
        users={store.game?.users}
      />

      <div className="flex justify-center my-4">
        <div className="max-w-72 w-full">
          {/* window top bar */}
          <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
            <p className="text-white text-xl">Vendas</p>
          </div>

          {/* window */}
          <div className="w-full bg-accent border-2 rounded-b-xl p-6  text-primary text-xl leading-5">
            {!store.game.actualAction.winned ? (
              <>
                <p className="text-center">Parabéns!!</p>
                <p className="">Vocês tiveram um projeto de sucesso!</p>
                <p className="">Teve um investimento de:</p>
                <p className="text-center font-bold text-secondary font-mono text-base">
                  {intlFormat.format(store.game.actualAction.investedValue)}
                </p>
                <p>
                  O valor do produto foi de{" "}
                  {intlFormat.format(store.game.actualAction.productPrice)}
                </p>
                <p>Vendas de:</p>
                <p className="text-center font-bold text-secondary font-mono text-base">
                  {intlFormat.format(store.game.actualAction.marketingResult)}
                </p>
                <p>Totalizando um lucro de:</p>
                <p className="font-bold text-secondary font-mono text-base text-center">
                  {intlFormat.format(
                    store.game.actualAction.marketingResult -
                      store.game.actualAction.investedValue
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="text-center">Não foi dessa vez!</p>
                <p>Vocês tiveram um prejuízo com essa rodada do projeto. </p>
                <p className="">Teve um investimento de:</p>
                <p className="text-center font-bold text-secondary font-mono text-base">
                  {intlFormat.format(store.game.actualAction.investedValue)}
                </p>
                <p>
                  O valor do produto foi de{" "}
                  <span className="font-mono text-sm">
                    {intlFormat.format(store.game.actualAction.productPrice)}
                  </span>
                </p>
                <p>Vendas de:</p>
                <p className="text-center font-bold text-secondary font-mono text-base">
                  {intlFormat.format(store.game.actualAction.marketingResult)}
                </p>
                <p>Totalizando um prejuízo de:</p>
                <p className="font-bold text-secondary font-mono text-base text-center">
                  {intlFormat.format(
                    store.game.actualAction.investedValue -
                      store.game.actualAction.marketingResult
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
          {store.game.actualAction.winned ? (
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
    </main>
  );
}
