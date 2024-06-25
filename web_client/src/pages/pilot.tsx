import { PilotGA, PrototypeGA } from "#/game";
import { Coin } from "@/components/coin/coin";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Dice } from "@/components/dice/dice";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { Link } from "react-router-dom";

interface PilotPageProps {
  action: PilotGA;
}
export function PilotPage({ action }: PilotPageProps) {
  const store = useGameStore();

  function finishSelection() {
    socket.emit("run_problem");
  }

  // useEffect(() => {
  //   if (store.game?.state === "MARKETING") {
  //     navigate("/marketing");
  //     return;
  //   }
  //   if (store.game?.state === "PROTOTYPE") {
  //     navigate("/prototype");
  //     return;
  //   }
  //   if (store.game?.state !== undefined && store.game.state !== "PILOT") {
  //     navigate("/prototype");
  //     return;
  //   }
  // }, [navigate, store.game?.state]);

  async function rollDice() {
    if (
      store.game?.actualAction.state === "PILOT" &&
      store.game?.actualAction.started === "idle"
    ) {
      socket.emit("run_project_test");
      return store.game?.actualAction.value;
    }

    return 1;
  }

  function goToCoin() {
    socket.emit("run_project_test");
  }

  const game = store.game!;

  const investmentValue =
    (game.actions[game.actionIndex - 1] as PrototypeGA).investment *
    action.value;

  return (
    <>
      <div className="relative flex justify-center">
        <span className="text-white text-base bg-secondary leading-[0rem] h-4 p-2 rounded-md my-3">
          pontos totais: {Math.floor(game.teamPoints)}
        </span>

        <InstructionDialog
          defaultOpen={store.isActive()}
          title="Instruções"
          key={store.game?.actionIndex}
          className="absolute right-0 top-0"
        >
          <p>
            Chegou a hora de levar o protótipo de vocês para o público mais
            amplo. Tudo pronto para iniciar o teste?
          </p>
          <p>
            O valor do teste será sorteado X vezes o valor investido no
            protótipo
          </p>
          <p>
            Depois será definido se o teste funcionou, caso tenha falhado vocês
            voltarão ao protótipo
          </p>
        </InstructionDialog>
      </div>

      <div>
        <div className="flex justify-center my-4">
          <div className="max-w-72 w-full">
            {/* window top bar */}
            <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
              <p className="text-white text-xl">TESTE</p>
            </div>

            {/* window */}
            <div className="relative flex w-full bg-accent border-2 rounded-b-xl p-6">
              <div className="border-dashed border-[3px] rounded-xl  w-[236px] h-[347px] flex justify-center items-center dice-container">
                {action.started !== "passed" ? (
                  <div className="flex flex-col gap-4 items-center justify-center">
                    <Dice
                      onClick={rollDice}
                      diceValue={action.value}
                      hasRolled={action.started === "dice"}
                    />
                    {action.started === "dice" && (
                      <p className="text-white text-base animate-in fade-in delay-1000 duration-1000">
                        <span className="text-white text-base bg-secondary leading-[0rem] p-1 px-2 rounded-md">
                          {Math.round(investmentValue)}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <Coin approved={action.passed} />
                )}
              </div>
            </div>
            {/* end centralize window */}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {store.isActive() ? (
            <>
              {action.started === "dice" && (
                <Button onClick={goToCoin}>Ir para Teste do protótipo</Button>
              )}
              {action.started === "passed" && (
                <Button onClick={finishSelection} className="w-36 relative">
                  <span className="absolute top-0 right-0 bg-secondary leading-[0rem] -mt-3 -mr-6 h-4 p-2 rounded-md">
                    -{Math.round(investmentValue)}
                  </span>
                  Finalizar Teste
                </Button>
              )}
            </>
          ) : (
            <p className="text-center text-xl text-secondary">
              {action.activeUser.name} está com o protótipo
            </p>
          )}
          <Button asChild variant={"secondary"} className="w-36">
            <Link to="/board">Tabuleiro</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
