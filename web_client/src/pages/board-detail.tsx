import { GameState } from "#/game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minus, Square, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const content: Record<
  GameState,
  {
    title: string;
    body: string;
  }
> = {
  SCENARIO: { title: "Cenário", body: "" },
  PROBLEM: { title: "Problema", body: "PROBLEMA BODY" },
  SOLUTION: { title: "Solução", body: "" },
  INSIGHT: { title: "Insights", body: "" },
  PROTOTYPE: { title: "Protótipo", body: "" },
  PILOT: { title: "Piloto", body: "" },
  MARKETING: { title: "Marketing", body: "" },
  SALES: { title: "Vendas", body: "" },
  LOBBY: { title: "", body: "" },
  ENDED: { title: "", body: "" },
  PROBLEM_END: { title: "", body: "" },
  INSIGHT_END: {
    title: "INSIGHTS",
    body: `Arremate os insights escolhidos até aqui. Caso não esteja satisfeito
  com o resultado, você pode fazer suas considerações e propor uma
  nova rodada, mas lembre-se que a contribuição de cada jogador tem um
  custo de 1000 pontos`,
  },
  SOLUTION_SELECTION: { title: "", body: "" },
  SOLUTION_ADVOCATE: { title: "", body: "" },
};

export function BoardDetailPage() {
  const navigate = useNavigate();
  const { state } = useParams();

  const gameState = (state?.toUpperCase() ?? "PROBLEM") as GameState;

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
              {content[gameState].title}
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
          <p>{content[gameState].body}</p>
        </div>
        <div className="flex justify-end my-2 px-9">
          <Button onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </div>
    </div>
  );
}
