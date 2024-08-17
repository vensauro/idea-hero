import { InsightEndGA, InsightGA } from "#/game";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Button } from "@/components/ui/button";
import { cardsUrls } from "@/lib/cards_urls";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import json from "@/lib/text-revised.json";
import { replaceTemplate } from "@/lib/text";

interface InsightsPageProps {
  action: InsightGA | InsightEndGA;
}
export function InsightsPage({ action }: InsightsPageProps) {
  const store = useGameStore();
  const [flipCard, setFlipCard] = useState(false);

  useEffect(() => {
    setTimeout(() => setFlipCard(true), 1500);
  }, []);

  function finishSelection() {
    socket.emit("run_problem");
  }

  function repeatRound() {
    socket.emit("new_insight_round");
  }

  const gameText =
    json[store.game?.mode ?? "collaborative"][
      action.state === "INSIGHT" ? "insights_state" : "insights_ending_state"
    ];

  return (
    <>
      <InstructionDialog
        defaultOpen={store.isActive()}
        title={gameText.instructions.title}
        key={store.game?.actionIndex}
      >
        {gameText.instructions.content.map((content) => (
          <p>{content}</p>
        ))}
      </InstructionDialog>

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
                {action.state === "INSIGHT_END" ? (
                  <div className="bg-slate-400 w-full h-full flex justify-center items-center flex-col border-[10px] border-secondary">
                    <img
                      src="/idea-hero-logo.svg"
                      alt="IDEA HERO"
                      className="h-16"
                    />
                    {gameText.card_text.content.map((content) => (
                      <p className="text-base text-white text-center w-4/5 leading-3 mt-2 mb-1">
                        {replaceTemplate(content, action)}
                      </p>
                    ))}
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
                      src={`/ia_cards/${cardsUrls[action.randomCard]}`}
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
              {action.state === "INSIGHT_END" && store.isActive() && (
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
