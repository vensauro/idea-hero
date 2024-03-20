import { GameUser } from "#/game";
import { Button } from "@/components/ui/button";
import { UsersBar } from "@/components/users-bar/users-bar";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { group, max, sum } from "radash";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export function ProblemFinishPage() {
  const store = useGameStore();
  const navigate = useNavigate();

  console.log(store.game?.actualAction);

  const investments = (store.game?.actions ?? []).filter(
    (
      e
    ): e is {
      state: "PROBLEM_INVESTMENT";
      activeUser: GameUser;
      toUser: GameUser;
      investment: number;
    } => e.state === "PROBLEM_INVESTMENT" && "investment" in e
  );

  const winner = max(
    Object.entries(group(investments, (e) => e.toUser.name)).map(([k, v]) => ({
      name: k,
      value: sum(v!.map((i) => i.investment)),
    })),
    (e) => e.value
  );

  function finishSelection() {
    socket.emit("run_problem");
  }

  useEffect(() => {
    if (store.game?.actualAction.state === "INSIGHT") {
      navigate("/insights");
    }
  }, [navigate, store.game?.actualAction.state]);

  return (
    <main className="min-h-screen flex flex-col ">
      <UsersBar
        activeUser={store.game?.actualAction.activeUser}
        users={store.game?.users}
      />

      <div>
        <div className="flex justify-center my-4">
          <div className="max-w-72 w-full">
            {/* window top bar */}
            <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
              <p className="text-white text-xl">PROBLEMA</p>
              <button className="absolute right-0 text-white mx-4 h-5 w-5 bg-border flex justify-center items-center font-bold">
                <span className="mb-1">x</span>
              </button>
            </div>

            {/* window */}
            <div className="flex w-full bg-accent border-2 rounded-b-xl p-6">
              <div className="relative border-dashed border-[3px] rounded-xl overflow-hidden w-[236px] h-[347px]">
                <div className="bg-slate-400 w-full h-full flex justify-center items-center flex-col border-[10px] border-secondary">
                  <img
                    src="/idea-hero-logo.svg"
                    alt="IDEA HERO"
                    className="h-16"
                  />
                  <p className="text-base text-white text-center w-4/5 leading-3 mt-2 mb-1">
                    Continuaremos com o problema de {winner?.name}!
                  </p>
                  <p className="text-base text-white text-center w-4/5 leading-3 mb-1">
                    Esse problema recebeu {winner?.value} pontos de investimento
                  </p>
                  <p className="text-base text-white text-center w-4/5 leading-3 mb-2">
                    Recomendamos recapitular o que ocorreu até agora!
                  </p>
                </div>
              </div>
            </div>
            {/* end centralize window */}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {store.game?.actualAction.activeUser.name === store.nickname ? (
            <Button onClick={finishSelection} className="w-36">
              Terminar Jogada
            </Button>
          ) : (
            <p className="text-center text-xl text-secondary">
              esperando {store.game?.actualAction.activeUser.name}
            </p>
          )}
          <Button asChild variant={"secondary"} className="w-36">
            <Link to="/board">Tabuleiro</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
