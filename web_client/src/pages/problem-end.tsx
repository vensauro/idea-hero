import { ProblemsEndGA } from "#/game";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import json from "@/lib/text-revised.json";
import { replaceTemplate } from "@/lib/text";

interface ProblemFinishPageProps {
  action: ProblemsEndGA;
}
export function ProblemFinishPage({ action }: ProblemFinishPageProps) {
  const store = useGameStore();
  const navigate = useNavigate();

  function finishSelection() {
    socket.emit("run_problem");
  }

  useEffect(() => {
    if (store.game?.state !== undefined && store.game.state !== "PROBLEM_END") {
      navigate("/insights");
    }
  }, [navigate, store.game?.state]);

  const problemWinner = store.game?.problemWinner;

  const gameText =
    json[store.game?.mode ?? "collaborative"].problem_ending_state;

  return (
    <>
      <InstructionDialog
        defaultOpen={store.isActive()}
        title={gameText.instructions.title}
        key={store.game?.actionIndex}
      >
        {problemWinner?.winner.id === store.user?.id
          ? gameText.instructions.active_user_content.map((content) => (
              <p>{content}</p>
            ))
          : gameText.instructions.not_active_users_content.map((content) => (
              <p>
                {replaceTemplate(content, {
                  problemWinner: { ...problemWinner?.winner, ...problemWinner },
                })}
              </p>
            ))}
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
              <div className="relative border-dashed border-[3px] rounded-xl overflow-hidden w-[236px] h-[347px]">
                <div className="bg-slate-400 w-full h-full flex justify-center items-center flex-col border-[10px] border-secondary">
                  <img
                    src="/idea-hero-logo.svg"
                    alt="IDEA HERO"
                    className="h-16"
                  />
                  {gameText.card_text.content.map((content) => (
                    <p className="text-base text-white text-center w-4/5 leading-3 mt-2 mb-1">
                      {replaceTemplate(content, {
                        problemWinner: {
                          ...problemWinner?.winner,
                          ...problemWinner,
                        },
                      })}
                    </p>
                  ))}
                </div>
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
