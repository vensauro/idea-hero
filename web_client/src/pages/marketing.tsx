import { MarketingGA } from "#/game";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { sum, toggle } from "radash";
import { useState } from "react";
import { Link } from "react-router-dom";

interface MarketingPageProps {
  action: MarketingGA;
}

export function MarketingPage({ action }: MarketingPageProps) {
  const store = useGameStore();

  const [productValue, setProductValue] = useState(0);

  const game = store.game!;

  const restingPoints =
    game.mode === "collaborative"
      ? game.teamPoints - sum(action.investment, (e) => e.value)
      : game.users.find((e) => e.id === store.user?.id)?.points ?? 0;

  const showFinishButton =
    store.isActive() &&
    (action.productValues.length ===
      game.users.filter((e) => e.connected).length ||
      game.mode === "competitive");

  return (
    <>
      {game.mode === "collaborative" && (
        <div className="flex justify-center mt-4">
          <span className="text-white text-base bg-secondary leading-[0rem] h-4 p-2 rounded-md">
            pontos totais: {Math.floor(game.teamPoints)}
          </span>
        </div>
      )}

      <div className="max-w-72 w-full mx-auto my-8">
        <div className="relative h-8 border-2 w-full bg-secondary border-b-0 flex  items-center z-0">
          <div className="absolute -top-7 [clip-path:polygon(20%_0%,_80%_0%,_100%_100%,_0%_100%)] h-7 w-32 bg-secondary  z-10 ">
            <p className="text-center text-white text-base -mt-1">Marketing</p>
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
            {store.isActive() ? (
              game.mode === "collaborative" ? (
                <>
                  <p>
                    Defina o valor do produto em sigilo e em que Mídias de
                    marketing irão investir. Você está com todo recurso do grupo
                    em mãos.
                  </p>
                  <p>
                    O produto terá sucesso nas vendas dependendo das escolhas
                    nessa tela!
                  </p>
                  <p>
                    Que tal conversar com o grupo para decidir como utilizar?
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Defina o valor do produto em sigilo e em que Mídias de
                    marketing investirá.
                  </p>
                  <p>
                    O produto terá sucesso nas vendas dependendo das escolhas
                    nessa tela!
                  </p>
                </>
              )
            ) : game.mode === "collaborative" ? (
              <p>
                Defina o valor do produto em sigilo, converse com{" "}
                {action.activeUser.name} para saber em quais métodos de
                marketing investir
              </p>
            ) : (
              <p>
                própria
                {action.activeUser.name} está fazendo as decisões de marketing
                da própria solução
              </p>
            )}
          </InstructionDialog>
        </div>
        <div className="flex flex-col w-full bg-[#fff6e5] p-3 border-2">
          <div className="h-full w-full bg-primary">
            <ScrollArea className="h-[380px] w-[260px] border-2">
              <div className="flex flex-col gap-4 items-center justify-center">
                {(store.game?.mode !== "competitive" || store.isActive()) && (
                  <form
                    className="w-4/5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      // startGame();
                    }}
                  >
                    <div className="w-full flex justify-center mt-2">
                      <Label
                        htmlFor="nickname"
                        className="text-border text-white"
                      >
                        Quanto custa para o usuário?
                      </Label>
                    </div>
                    <Input
                      id="product_value"
                      type="number"
                      placeholder="Valor do produto"
                      required
                      value={productValue.toString()}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d+$/.test(value) || value === "")
                          setProductValue(Number(value));
                      }}
                      className="text-primary placeholder:text-primary-foreground border-2 border-border rounded-sm"
                      onBlur={() => {
                        socket.emit("product_value", { value: productValue });
                      }}
                    />
                  </form>
                )}

                <Label htmlFor="nickname" className="text-border text-white">
                  Em que mídias você vai investir?
                </Label>

                <Button
                  className="w-36 relative"
                  variant={
                    action.investment.find((e) => e.name === "social_media")
                      ? "outline"
                      : "secondary"
                  }
                  onClick={() =>
                    socket.emit("update_marketing_investment", {
                      values: toggle(
                        action.investment,
                        { name: "social_media", value: 1000, multiplier: 1 },
                        (e) => e.name
                      ),
                    })
                  }
                  disabled={restingPoints < 1000 || !store.isActive()}
                >
                  <span className="absolute top-0 right-0 bg-secondary leading-[0rem] border-2 -mt-3 -mr-6 h-4 p-2 rounded-md">
                    -1000
                  </span>
                  Social Média
                </Button>

                <Button
                  className="w-36 relative"
                  variant={
                    action.investment.find((e) => e.name === "trafego_pago")
                      ? "outline"
                      : "secondary"
                  }
                  onClick={() =>
                    socket.emit("update_marketing_investment", {
                      values: toggle(
                        action.investment,
                        { name: "trafego_pago", value: 3000, multiplier: 1 },
                        (e) => e.name
                      ),
                    })
                  }
                  disabled={restingPoints < 3000 || !store.isActive()}
                >
                  <span className="absolute top-0 right-0 bg-secondary leading-[0rem] border-2 -mt-3 -mr-6 h-4 p-2 rounded-md">
                    -3000
                  </span>
                  Tráfego Pago
                </Button>

                <Button
                  className="w-36 relative"
                  variant={
                    action.investment.find((e) => e.name === "assessor")
                      ? "outline"
                      : "secondary"
                  }
                  onClick={() =>
                    socket.emit("update_marketing_investment", {
                      values: toggle(
                        action.investment,
                        { name: "assessor", value: 5000, multiplier: 1 },
                        (e) => e.name
                      ),
                    })
                  }
                  disabled={restingPoints < 5000 || !store.isActive()}
                >
                  <span className="absolute top-0 right-0 bg-secondary leading-[0rem] border-2 -mt-3 -mr-6 h-4 p-2 rounded-md">
                    -5000
                  </span>
                  Assessor de imprensa
                </Button>

                <Button
                  className="w-36 relative"
                  variant={
                    action.investment.find((e) => e.name === "tv")
                      ? "outline"
                      : "secondary"
                  }
                  onClick={() =>
                    socket.emit("update_marketing_investment", {
                      values: toggle(
                        action.investment,
                        { name: "tv", value: 10000, multiplier: 1 },
                        (e) => e.name
                      ),
                    })
                  }
                  disabled={restingPoints < 10000 || !store.isActive()}
                >
                  <span className="absolute top-0 right-0 bg-secondary leading-[0rem] border-2 -mt-3 -mr-6 h-4 p-2 rounded-md">
                    -10.000
                  </span>
                  Inserção na TV
                </Button>

                <Label htmlFor="nickname" className="text-border text-white">
                  Precisa de dinheiro?
                </Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant={
                        action.loan?.type === "bank" ? "outline" : "secondary"
                      }
                      className="w-40"
                      disabled={!store.isActive()}
                    >
                      Empréstimo do Banco
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="sm:max-w-[425px]"
                    title="Empréstimo"
                  >
                    <DialogHeader>
                      <DialogDescription className="py-4">
                        <p>
                          O banco está te oferecendo um empréstimo de 15.000
                          pontos
                        </p>
                        <p>
                          Após a venda, terá de devolver ao banco com 40% de
                          juros (21.000 pontos)
                        </p>
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex flex-row justify-end gap-2">
                      <DialogClose asChild>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            socket.emit("make_marketing_loan", null)
                          }
                          disabled={!store.isActive()}
                        >
                          Negar
                        </Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          type="submit"
                          onClick={() =>
                            socket.emit("make_marketing_loan", {
                              type: "bank",
                              value: 15000,
                            })
                          }
                        >
                          Aceitar
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant={
                        action.loan?.type === "angel" ? "outline" : "secondary"
                      }
                      className="w-40"
                      disabled={!store.isActive()}
                    >
                      Investidor Anjo
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="sm:max-w-[425px]"
                    title="Investidor"
                  >
                    <DialogHeader>
                      <DialogDescription className="py-4">
                        <p>
                          Um investidor está de olho no projeto, e oferecendo
                          5.000 pontos.
                        </p>
                        <p>
                          Após a venda, o investidor terá 10% do valor vendido
                        </p>
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex flex-row justify-end gap-2">
                      <DialogClose asChild>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            socket.emit("make_marketing_loan", null)
                          }
                        >
                          Negar
                        </Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          type="submit"
                          onClick={() =>
                            socket.emit("make_marketing_loan", {
                              type: "angel",
                              value: 5000,
                            })
                          }
                        >
                          Aceitar
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      <div>
        <div className="flex flex-col items-center gap-2">
          {showFinishButton && (
            <Button
              onClick={() => socket.emit("finish_marketing_investment")}
              className="w-36"
            >
              Terminar Jogada
            </Button>
          )}
          {!store.isActive() && (
            <p className="text-center text-xl text-secondary">
              esperando {action.activeUser.name}
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
