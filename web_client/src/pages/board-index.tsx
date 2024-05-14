import { BoardSvg } from "@/components/board/board-svg";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function BoardIndex() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center">
      <BoardSvg />
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
