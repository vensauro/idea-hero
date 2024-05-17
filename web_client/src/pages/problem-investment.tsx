import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { UserAvatar } from "@/components/users-bar/user-avatar";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function ProblemInvestment() {
  const store = useGameStore();
  const navigate = useNavigate();

  const [investmentValue, setInvestmentValue] = useState(1000);

  function makeInvestment(userId: string, value: number) {
    socket.emit("problem_investment", { value, userId });
  }

  function repeatRound() {
    socket.emit("new_problem_round");
  }

  useEffect(() => {
    if (store.game?.actualAction.state === "PROBLEM") {
      navigate("/problems");
    }

    if (store.game?.actualAction.state === "PROBLEM_END") {
      navigate("/problems-end");
    }
  }, [navigate, store.game?.actualAction.state]);

  if (store.game?.actualAction.state !== "PROBLEM_INVESTMENT") return;

  const haveInvested =
    store.game?.actualAction.usersInvestment.find(
      (e) => e.from.id === store.user?.id
    ) !== undefined;

  // const isMe = store.game?.actualAction.activeUser.name === store.nickname;

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

            <Dialog
              defaultOpen={store.isActive()}
              key={store.game?.actionIndex}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" className="text-border">
                  <div className="mx-2">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M0.877075 7.49972C0.877075 3.84204 3.84222 0.876892 7.49991 0.876892C11.1576 0.876892 14.1227 3.84204 14.1227 7.49972C14.1227 11.1574 11.1576 14.1226 7.49991 14.1226C3.84222 14.1226 0.877075 11.1574 0.877075 7.49972ZM7.49991 1.82689C4.36689 1.82689 1.82708 4.36671 1.82708 7.49972C1.82708 10.6327 4.36689 13.1726 7.49991 13.1726C10.6329 13.1726 13.1727 10.6327 13.1727 7.49972C13.1727 4.36671 10.6329 1.82689 7.49991 1.82689ZM8.24993 10.5C8.24993 10.9142 7.91414 11.25 7.49993 11.25C7.08571 11.25 6.74993 10.9142 6.74993 10.5C6.74993 10.0858 7.08571 9.75 7.49993 9.75C7.91414 9.75 8.24993 10.0858 8.24993 10.5ZM6.05003 6.25C6.05003 5.57211 6.63511 4.925 7.50003 4.925C8.36496 4.925 8.95003 5.57211 8.95003 6.25C8.95003 6.74118 8.68002 6.99212 8.21447 7.27494C8.16251 7.30651 8.10258 7.34131 8.03847 7.37854L8.03841 7.37858C7.85521 7.48497 7.63788 7.61119 7.47449 7.73849C7.23214 7.92732 6.95003 8.23198 6.95003 8.7C6.95004 9.00376 7.19628 9.25 7.50004 9.25C7.8024 9.25 8.04778 9.00601 8.05002 8.70417L8.05056 8.7033C8.05924 8.6896 8.08493 8.65735 8.15058 8.6062C8.25207 8.52712 8.36508 8.46163 8.51567 8.37436L8.51571 8.37433C8.59422 8.32883 8.68296 8.27741 8.78559 8.21506C9.32004 7.89038 10.05 7.35382 10.05 6.25C10.05 4.92789 8.93511 3.825 7.50003 3.825C6.06496 3.825 4.95003 4.92789 4.95003 6.25C4.95003 6.55376 5.19628 6.8 5.50003 6.8C5.80379 6.8 6.05003 6.55376 6.05003 6.25Z"
                        fill="currentColor"
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Instruções</DialogTitle>
                  <DialogDescription className="py-4">
                    <p>
                      Em sigilo, escolha o jogador que apresentou o problema em
                      que você deseja investir e defina um valor ou invista
                      $1000 para mais uma rodada
                    </p>
                    <p>O resultado é definido pelo investimento coletivo</p>
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="submit">Continuar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* window */}
          <div className="flex flex-col w-full bg-[#fff6e5] p-3 border-2 h-96">
            <div className="h-full w-full bg-primary">
              <ScrollArea className="h-[356px] w-[260px] border-2">
                <div className="grid grid-cols-3 gap-2 p-2">
                  {store.game?.users.map((user) =>
                    haveInvested ? (
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
          {!haveInvested ? (
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
