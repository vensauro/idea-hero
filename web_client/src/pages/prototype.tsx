import { PrototypeGA } from "#/game";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { Link } from "react-router-dom";

import json from "@/lib/text-revised.json";
import { replaceTemplate } from "@/lib/text";

interface PrototypePageProps {
  action: PrototypeGA;
}
export function PrototypePage({ action }: PrototypePageProps) {
  const store = useGameStore();

  function startPrototype() {
    socket.emit("start_prototype", 1);
  }

  function finishSelection() {
    socket.emit("run_problem");
  }

  // const teamPrice = Math.floor(store.game!.teamPoints * 0.2)
  // const price = teamPrice > 0 ? teamPrice : 10000

  const gameText = json[store.game?.mode ?? "collaborative"].prototype_state;

  return (
    <>
      <div className="relative flex justify-center">
        {store.game?.mode === "collaborative" && (
          <span className="text-white text-base bg-secondary leading-[0rem] h-4 p-2 rounded-md my-3">
            pontos totais: {Math.floor(store.game?.teamPoints ?? 0)}
          </span>
        )}
        <InstructionDialog
          defaultOpen={store.isActive()}
          title={gameText.instructions.title}
          key={store.game?.actionIndex}
          className="absolute right-0 top-0"
          onClickContinue={startPrototype}
          onOpenChange={(opened) =>
            opened === false && store.isActive() && startPrototype()
          }
        >
          {store.isActive()
            ? gameText.instructions.active_user_content.map((content, idx) => (
                <p key={idx}>{content}</p>
              ))
            : gameText.instructions.not_active_users_content.map(
                (content, idx) => <p key={idx}>{content}</p>
              )}
        </InstructionDialog>
      </div>

      <div>
        <div className="flex justify-center my-4">
          <div className="max-w-72 w-full">
            {/* window top bar */}
            <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
              <p className="text-white text-xl">PROTÓTIPO</p>
            </div>

            {/* window */}
            <div className="relative flex w-full bg-accent border-2 rounded-b-xl p-6">
              <div className="relative border-dashed border-[3px] rounded-xl overflow-hidden w-[236px] h-[347px]">
                <div className="bg-slate-400 w-full h-full flex justify-center items-center flex-col border-[10px] border-secondary">
                  <img
                    src="/idea-hero-logo.svg"
                    alt="IDEA HERO"
                    className="h-16"
                  />
                  {gameText.card_text.content.map((content, idx) => (
                    <p
                      key={idx}
                      className="text-base text-white text-center leading-3 mt-3"
                    >
                      {replaceTemplate(content, action)}
                    </p>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-8 -right-8 bg-secondary rounded-full">
                <CountdownCircleTimer
                  key={store.game?.actionIndex}
                  size={60}
                  isPlaying={action.started}
                  duration={120}
                  onComplete={() => {}}
                  colors={["#F26389", "#F7B801", "#A30000", "#A30000"]}
                  colorsTime={[7, 5, 2, 0]}
                >
                  {({ remainingTime }) =>
                    remainingTime > 0 ? (
                      <span className="text-white text-xl">
                        {remainingTime}
                      </span>
                    ) : (
                      <span className="text-white text-base">PARE!</span>
                    )
                  }
                </CountdownCircleTimer>
              </div>
            </div>
            {/* end centralize window */}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {store.isActive() ? (
            <>
              <Button onClick={finishSelection} className="w-36 relative">
                <span className="absolute top-0 right-0 bg-secondary leading-[0rem] -mt-3 -mr-6 h-4 p-2 rounded-md">
                  -{Math.floor(store.game!.teamPoints * 0.2)}
                </span>
                Finalizar protótipo
              </Button>
            </>
          ) : (
            gameText.not_active_user_bottom_text.map((content) => (
              <p className="text-center text-xl text-secondary">
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
