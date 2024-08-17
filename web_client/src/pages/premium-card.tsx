import { RandomPremiumGA } from "#/game";
import { Button } from "@/components/ui/button";
import { socket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import { replaceTemplate } from "@/lib/text";
import { random_cards } from "@/lib/text-revised.json";
import { Link } from "react-router-dom";

interface PremiumCardPageProps {
  action: RandomPremiumGA;
}
export function PremiumCardPage({ action }: PremiumCardPageProps) {
  const store = useGameStore();

  function finishSelection() {
    socket.emit("run_problem");
  }

  const texts =
    action.earnedValue > 0 ? random_cards.positive : random_cards.negative;
  const textTemplate = texts[action.textIndex];
  const text = replaceTemplate(textTemplate, { points: action.earnedValue });

  return (
    <>
      <div>
        <div className="flex justify-center my-4">
          <div className="max-w-72 w-full">
            {/* window top bar */}
            <div className="h-8 border-2 rounded-t-xl w-full bg-secondary border-b-0 flex justify-center relative items-center">
              <p className="text-white text-xl">SURPRESA</p>
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
                  <p className="text-base text-white text-center w-4/5 leading-3 mt-2 mb-1">
                    {text}
                  </p>
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
