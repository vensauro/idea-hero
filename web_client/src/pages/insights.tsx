import { ProblemsGA } from "#/game";
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
import { UsersBar } from "@/components/users-bar/users-bar";
import { cardsUrls } from "@/lib/cards_urls";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function InsightsPage() {
  const store = useGameStore();
  const navigate = useNavigate();
  const [flipCard, setFlipCard] = useState(false);

  useEffect(() => {
    setTimeout(() => setFlipCard(true), 1500);
  }, []);

  const action = store.game?.actualAction as ProblemsGA;
  const cardUrl = `/ia_cards/${cardsUrls[action.randomCard]}`;

  function finishSelection() {
    socket.emit("run_problem");
  }

  function repeatRound() {
    socket.emit("new_insight_round");
  }

  useEffect(() => {
    if (
      store.game?.state !== undefined &&
      store.game?.state !== "INSIGHT" &&
      store.game?.state !== "INSIGHT_END"
    ) {
      navigate("/solutions");
    }
  }, [navigate, store.game?.state]);

  if (
    store.game?.actualAction.state !== "INSIGHT_END" &&
    store.game?.actualAction.state !== "INSIGHT"
  )
    return;

  return (
    <main className="min-h-screen flex flex-col ">
      <UsersBar
        activeUser={store.game?.actualAction.activeUser}
        users={store.game?.users}
      />

      <Dialog defaultOpen={store.isActive()} key={store.game?.actionIndex}>
        <div className="relative">
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-border absolute right-0">
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
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Instruções</DialogTitle>
            <DialogDescription className="py-4">
              {store.game.actualAction.state === "INSIGHT_END" ? (
                <p>
                  Arremate os insights escolhidos até aqui. Caso não esteja
                  satisfeito com o resultado, você pode fazer suas considerações
                  e propor uma nova rodada, mas lembre-se que a contribuição de
                  cada jogador tem um custo de 1000 pontos
                </p>
              ) : (
                <p>
                  Busque um insight para resolver o problema na sua carta de
                  inspiração. Lembre-se um insight ainda não é uma solução, mas
                  um caminho possível para ser adotado.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit">Continuar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div>
        <div className="flex justify-center my-4">
          <div className="max-w-72 w-full">
            {/* window top bar */}
            <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
              <p className="text-white text-xl">INSIGHTS</p>
            </div>

            {/* window */}
            <div className="flex w-full bg-accent border-2 rounded-b-xl p-6">
              <div
                className={cn(
                  "border-dashed border-[3px] rounded-xl overflow-hidden ",
                  "w-[236px] h-[347px]",
                  "group relative",
                  flipCard && "is-flipped"
                )}
              >
                {store.game.actualAction.state === "INSIGHT_END" ? (
                  <div className="bg-slate-400 w-full h-full flex justify-center items-center flex-col border-[10px] border-secondary">
                    <img
                      src="/idea-hero-logo.svg"
                      alt="IDEA HERO"
                      className="h-16"
                    />
                    <p className="text-base text-white">
                      {store.game.owner.name} está escolhendo o insight!
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        "bg-slate-400 border-[10px] border-secondary",
                        "flex flex-col justify-center items-center",
                        "absolute top-0 left-0 w-full h-full",
                        "[backface-visibility:hidden] transition-all",
                        "group-[.is-flipped]:[transform:rotateY(180deg)]"
                      )}
                    >
                      <img
                        src="/idea-hero-logo.svg"
                        alt="IDEA HERO"
                        className="h-16"
                      />
                    </div>
                    <img
                      src={cardUrl}
                      className={cn(
                        "aspect-[180/271] object-cover object-center",
                        "absolute top-0 left-0 w-full h-full",
                        "[transform:rotateY(180deg)] transition-all [backface-visibility:hidden]",
                        "group-[.is-flipped]:[transform:rotateY(0deg)]"
                      )}
                    />
                  </>
                )}
              </div>
            </div>
            {/* end centralize window */}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {store.isActive() ? (
            <div className="flex gap-6">
              {store.game.actualAction.state === "INSIGHT_END" &&
                store.isOwner() && (
                  <Button className="relative" onClick={repeatRound}>
                    Mais uma rodada
                    <span className="absolute top-0 right-0 bg-secondary leading-[0rem] -mt-3 -mr-6 h-4 p-2 rounded-md">
                      -1000
                    </span>
                  </Button>
                )}
              <Button onClick={finishSelection} className="w-36">
                Terminar Jogada
              </Button>
            </div>
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
