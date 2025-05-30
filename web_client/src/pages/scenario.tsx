import { ScenarioGA } from "#/game";
import { InstructionDialog } from "@/components/dialogs/instruction-dialog";
import { Button } from "@/components/ui/button";
import { getRandomCardUrl } from "@/lib/cards_urls";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import json from "@/lib/text-revised.json";
import { replaceTemplate } from "@/lib/text";

interface ScenarioPageProps {
  action: ScenarioGA;
}
export function ScenarioPage({ action }: ScenarioPageProps) {
  const store = useGameStore();
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  const canGetCard = store.isActive() && cardUrl === null;
  function getCard() {
    if (canGetCard) {
      const card = getRandomCardUrl();
      setCardUrl(card);
      socket.emit("get_scenario", card);
    }
  }

  function finishSelection() {
    socket.emit("run_problem");
  }

  useEffect(() => {
    setCardUrl(action.scenario);
  }, [action]);

  const gameText = json[store.game?.mode ?? "collaborative"].scenario_state;

  return (
    <>
      <InstructionDialog
        defaultOpen
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
              <p className="text-white text-xl">CENÁRIO</p>
            </div>

            {/* window */}
            <div
              className="flex w-full bg-accent border-2 rounded-b-xl p-6"
              onClick={getCard}
            >
              <div className="relative border-dashed border-[3px] rounded-xl overflow-hidden w-[236px] h-[347px] group">
                {store.isActive() ? (
                  <>
                    <div
                      className={cn(
                        "bg-slate-400 border-[10px] border-secondary",
                        "flex flex-col justify-center items-center",
                        "absolute top-0 left-0 w-full h-full",
                        "[backface-visibility:hidden] transition-all",
                        cardUrl !== null && "[transform:rotateY(180deg)]"
                      )}
                      onClick={getCard}
                    >
                      <img
                        src="/idea-hero-logo.svg"
                        alt="IDEA HERO"
                        className="h-16"
                      />
                      {gameText.card_text.active_user_content.map(
                        (content, idx) => (
                          <p
                            key={idx}
                            className="text-base text-white w-4/5 leading-3 my-2"
                          >
                            {content}
                          </p>
                        )
                      )}
                    </div>
                    <img
                      src={cardUrl ?? ""}
                      className={cn(
                        "aspect-[180/271] object-cover",
                        "absolute top-0 left-0 w-full h-full",
                        "[transform:rotateY(180deg)] transition-all [backface-visibility:hidden]",
                        cardUrl !== null && "[transform:rotateY(0deg)]"
                      )}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className={cn(
                        "bg-slate-400 border-[10px] border-secondary",
                        "flex flex-col justify-center items-center",
                        "absolute top-0 left-0 w-full h-full",
                        "[backface-visibility:hidden] transition-all",
                        cardUrl !== null && "[transform:rotateY(180deg)]"
                      )}
                    >
                      <img
                        src="/idea-hero-logo.svg"
                        alt="IDEA HERO"
                        className="h-16"
                      />
                      {gameText.card_text.not_active_users_content.map(
                        (content, idx) => (
                          <p
                            key={idx}
                            className="text-base text-white w-4/5 leading-3 my-2"
                          >
                            {replaceTemplate(content, action)}
                          </p>
                        )
                      )}
                    </div>
                    <img
                      src={cardUrl ?? ""}
                      className={cn(
                        "aspect-[180/271] object-cover",
                        "absolute top-0 left-0 w-full h-full",
                        "[transform:rotateY(180deg)] transition-all [backface-visibility:hidden]",
                        cardUrl !== null && "[transform:rotateY(0deg)]"
                      )}
                    />
                  </>
                )}
              </div>
            </div>
            {/* end centralize window */}
          </div>
        </div>

        {action.activeUser.name === store.nickname ? (
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={finishSelection}
              className="w-36"
              disabled={store.game?.mode === "competitive" && cardUrl === null}
            >
              Terminar Jogada
            </Button>

            <Button asChild variant={"secondary"} className="w-36">
              <Link to="/board">Tabuleiro</Link>
            </Button>
          </div>
        ) : (
          <p className="text-center text-xl text-secondary">
            esperando {action.activeUser.name}
          </p>
        )}
      </div>
    </>
  );
}
