import { BoardState, BoardSvg } from "@/components/board/board-svg";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

export function BoardIndex() {
  const navigate = useNavigate();
  const store = useGameStore();
  const possibleStates = [
    "SCENARIO",
    "PROBLEM",
    "INSIGHT",
    "SOLUTION",
    "PROTOTYPE",
    "PILOT",
    "MARKETING",
    "SALES",
  ];

  const active = possibleStates.includes(store.game?.state ?? "")
    ? (store.game?.state as BoardState)
    : undefined;

  return (
    <div className="flex flex-col items-center justify-center">
      <BoardSvg active={active} />
      <div className="my-6">
        <Button
          className="bg-accent text-accent-foreground"
          onClick={() => navigate(-1)}
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}
