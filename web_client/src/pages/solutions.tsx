import { SolutionAdvocateGA, SolutionGA, SolutionSelectionGA } from "#/game";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Button } from "@/components/ui/button";
import { cardsUrls } from "@/lib/cards_urls";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { Link } from "react-router-dom";

import json from "@/lib/text-revised.json";
import { replaceTemplate } from "@/lib/text";

interface SolutionsPageProps {
  action: SolutionGA | SolutionAdvocateGA | SolutionSelectionGA;
}
export function SolutionsPage({ action }: SolutionsPageProps) {
  const store = useGameStore();

  function finishSelection() {
    socket.emit("run_problem");
  }

  const gameText =
    json[store.game?.mode ?? "collaborative"][
      action.state === "SOLUTION"
        ? "solutions_state"
        : action.state === "SOLUTION_SELECTION"
        ? "solutions_selection_state"
        : "solutions_advocate_state"
    ];

  return (
    <>
      <InstructionDialog
        defaultOpen={store.isActive()}
        title={gameText.instructions.title}
        key={store.game?.actionIndex}
      >
        {gameText.instructions.content.map((content, idx) => (
          <p key={idx}>{content}</p>
        ))}
      </InstructionDialog>

      <div>
        <div className="flex justify-center my-4">
          <div className="max-w-72 w-full">
            {/* window top bar */}
            <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
              <p className="text-white text-xl">SOLUÇÃO</p>
            </div>

            {/* window */}
            <div className="flex w-full bg-accent border-2 rounded-b-xl p-6">
              <div className="relative border-dashed border-[3px] rounded-xl overflow-hidden w-[236px] h-[347px]">
                {action.state === "SOLUTION" ? (
                  <img
                    src={`/ia_cards/${cardsUrls[action.randomCard]}`}
                    className="aspect-[180/271] object-cover h-full w-full"
                  />
                ) : (
                  <div className="bg-slate-400 w-full h-full flex justify-center items-center flex-col border-[10px] border-secondary">
                    <img
                      src="/idea-hero-logo.svg"
                      alt="IDEA HERO"
                      className="h-16"
                    />
                    {"card_text" in gameText &&
                      gameText.card_text.content.map((content, idx) => (
                        <p
                          key={idx}
                          className="text-base text-white text-center leading-3 mt-3"
                        >
                          {replaceTemplate(content, action)}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            </div>
            {/* end centralize window */}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {store.isActive() ? (
            <>
              <Button onClick={finishSelection} className="w-36">
                Terminar Jogada
              </Button>
            </>
          ) : (
            gameText.not_active_user_bottom_text.map((content, idx) => (
              <p key={idx} className="text-center text-xl text-secondary">
                {replaceTemplate(content, action)}
              </p>
            ))
          )}
          <Button asChild variant={"secondary"} className="w-36">
            <Link to="/board">Tabuleiro</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
