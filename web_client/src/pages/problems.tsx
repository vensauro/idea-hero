import { ProblemsGA } from "#/game";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Button } from "@/components/ui/button";
import { cardsUrls } from "@/lib/cards_urls";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import json from "@/lib/text-revised.json";

interface ProblemsPageProps {
  action: ProblemsGA;
}
export function ProblemsPage({ action }: ProblemsPageProps) {
  const store = useGameStore();
  const [flipCard, setFlipCard] = useState(false);

  useEffect(() => {
    setTimeout(() => setFlipCard(true), 1500);
  }, []);

  const cardUrl = `/ia_cards/${cardsUrls[action.randomCard]}`;

  function finishSelection() {
    socket.emit("run_problem");
  }

  const gameText = json[store.game?.mode ?? "collaborative"].problem_state;

  return (
    <>
      <InstructionDialog
        defaultOpen={store.isActive()}
        title={gameText.instructions.title}
        key={store.game?.actionIndex}
      >
        <p>{gameText.instructions.content}</p>
      </InstructionDialog>

      <div>
        <div className="flex justify-center my-4">
          <div className="max-w-72 w-full">
            {/* window top bar */}
            <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
              <p className="text-white text-xl">PROBLEMA</p>
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
              </div>
            </div>
            {/* end centralize window */}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {action.activeUser.name === store.nickname ? (
            <Button onClick={finishSelection} className="w-36">
              Terminar Jogada
            </Button>
          ) : (
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
