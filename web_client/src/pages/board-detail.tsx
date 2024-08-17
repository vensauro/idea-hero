import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minus, Square, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import json from "../lib/text-revised.json";
import { BoardState } from "@/components/board/board-svg";

const boardTitle = {
  SCENARIO: "Cenário",
  PROBLEM: "Problema",
  INSIGHT: "Insights",
  SOLUTION: "Solução",
  PROTOTYPE: "Protótipo",
  PILOT: "Piloto",
  MARKETING: "Marketing",
  SALES: "Vendas",
};

export function BoardDetailPage() {
  const navigate = useNavigate();
  const { state } = useParams();

  const gameState = (state?.toUpperCase() ?? "PROBLEM") as BoardState;

  return (
    <div>
      <div
        className={cn(
          "border-2 grid w-full max-w-lg gap-4 bg-background shadow-lg duration-200 sm:rounded-lg min-w-96"
        )}
      >
        <div>
          <div className="border-2 flex items-center p-1 bg-primary justify-between">
            <p className="text-base text-white leading-3 mx-2">
              {boardTitle[gameState]}
            </p>
            <div className="flex items-center gap-1">
              <div className="bg-white border-2">
                <Minus className="h-4 w-4" />
              </div>
              <div className="bg-white border-2">
                <Square className="h-4 w-4" />
              </div>
              <div className="bg-white border-2 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 text-base leading-3">
          <p>{json.board[gameState]}</p>
        </div>
        <div className="flex justify-end my-2 px-9">
          <Button onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </div>
    </div>
  );
}
