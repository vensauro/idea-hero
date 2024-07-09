import { ProblemsInvestmentGA, SolutionInvestmentGa } from "#/game";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { UserAvatar } from "@/components/users-bar/user-avatar";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { useState } from "react";

interface ProblemInvestmentProps {
  action: ProblemsInvestmentGA | SolutionInvestmentGa;
}
export function ProblemInvestment({ action }: ProblemInvestmentProps) {
  const store = useGameStore();

  const [investmentValue, setInvestmentValue] = useState(1000);

  function makeInvestment(userId: string, value: number) {
    socket.emit("problem_investment", { value, userId });
  }

  function repeatRound() {
    socket.emit("new_problem_round");
  }

  const haveInvestedThisTurn =
    action.usersInvestment.find((e) => e.from.id === store.user?.id) !==
    undefined;

  const showNewRoundButton =
    !haveInvestedThisTurn && action.state === "PROBLEM_INVESTMENT";

  function skipInvestment() {
    if (store.user?.id)
      socket.emit("problem_investment", { value: 0, userId: store.user.id });
  }

  const haveInvestedBefore =
    store.game?.actions
      .slice(0, store.game.actions.length - 1)
      .filter(
        (e): e is SolutionInvestmentGa => e.state === "SOLUTION_INVESTMENT"
      )
      .find((e) =>
        e.usersInvestment.find(
          (u) => u.from.id === store.user?.id && u.action === "invested"
        )
      ) !== undefined;

  const showSkipInvestment =
    haveInvestedBefore &&
    store.game?.mode === "competitive" &&
    !haveInvestedThisTurn;

  return (
    <div>
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center bg-primary text-white mb-6">
        Problema
      </h1>
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-120px)]">
        {/* limit window width */}
        <div className="max-w-72 w-full">
          {/* window top bar */}
          <div className="relative h-8 border-2 w-full bg-secondary border-b-0 flex  items-center z-0">
            <div className="absolute -top-7 [clip-path:polygon(20%_0%,_80%_0%,_100%_100%,_0%_100%)] h-7 w-32 bg-secondary  z-10 ">
              <p className="text-center text-white text-base -mt-1">
                investimento
              </p>
            </div>
            <div className="text-white flex mx-2">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                  fill="currentColor"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                ></path>
              </svg>

              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
                  fill="currentColor"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                ></path>
              </svg>
            </div>

            <div className="w-full border-2 bg-white h-5" />

            <InstructionDialog defaultOpen title="Instruções">
              <p>
                Em sigilo, escolha o jogador que apresentou o problema em que
                você deseja investir e defina um valor ou invista $1000 para
                mais uma rodada
              </p>
              <p>O resultado é definido pelo investimento coletivo</p>
            </InstructionDialog>
          </div>

          {/* window */}
          <div className="flex flex-col w-full bg-[#fff6e5] p-3 border-2 h-96">
            <div className="h-full w-full bg-primary">
              <ScrollArea className="h-[356px] w-[260px] border-2">
                <div className="grid grid-cols-3 gap-2 p-2">
                  {store.game?.users.map((user) =>
                    haveInvestedThisTurn ? (
                      <UserAvatar
                        key={user.id}
                        color={user.avatar.color}
                        connected={user.connected}
                        avatarImage={user.avatar.image}
                        name={user.name}
                        points={user.points}
                        showPoints={user.id === store.user?.id}
                      />
                    ) : (
                      <Dialog key={user.id}>
                        <DialogTrigger>
                          <UserAvatar
                            key={user.id}
                            color={user.avatar.color}
                            connected={user.connected}
                            avatarImage={user.avatar.image}
                            name={user.name}
                            points={user.points}
                            showPoints={user.id === store.user?.id}
                          />
                        </DialogTrigger>
                        <DialogContent title={`Investir em ${user.name}?`}>
                          <p className="text-base text-center">
                            <span className="text-primary">INVESTIR:</span>{" "}
                            <span>{investmentValue}</span>
                          </p>
                          <Slider
                            defaultValue={[investmentValue]}
                            onValueChange={([value]) =>
                              setInvestmentValue(value)
                            }
                            max={10000}
                            min={0}
                            step={1000}
                          />
                          <div className="flex justify-center py-4">
                            <Button
                              variant={"secondary"}
                              onClick={() =>
                                makeInvestment(user.id, investmentValue)
                              }
                            >
                              Investir!
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          {/* end centralize window */}
          {showSkipInvestment && (
            <div className="flex justify-center my-4">
              <Button className="relative" onClick={skipInvestment}>
                Não desejo investir novamente
              </Button>
            </div>
          )}
          {showNewRoundButton ? (
            <div className="flex justify-center my-4">
              <Button className="relative" onClick={repeatRound}>
                Mais uma rodada
                <span className="absolute top-0 right-0 bg-secondary leading-[0rem] -mt-3 -mr-6 h-4 p-2 rounded-md">
                  -1000
                </span>
              </Button>
            </div>
          ) : (
            <p className="text-center text-lg text-secondary">
              Aguardando ações dos outros jogadores!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
