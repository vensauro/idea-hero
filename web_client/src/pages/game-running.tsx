import { PageWithUsersBar } from "@/components/container/page-with-users-bar";
import { useGameStore } from "@/lib/store";
import { ScenarioPage } from "./scenario";
import { ProblemsPage } from "./problems";
import { ProblemInvestment } from "./problem-investment";
import { ProblemFinishPage } from "./problem-end";
import { ReactNode } from "react";
import { InsightsPage } from "./insights";
import { SolutionsPage } from "./solutions";
import { PrototypePage } from "./prototype";
import { PilotPage } from "./pilot";
import { MarketingPage } from "./marketing";
import { SalesPage } from "./sales";
import { LobbyPage } from "./lobby";
import { PremiumCardPage } from "./premium-card";

export function RunningGamePage() {
  const store = useGameStore();

  console.log(store.game);

  function wrapper(child: ReactNode) {
    return (
      <PageWithUsersBar
        activeUserId={store.game?.actualAction?.activeUser.id}
        users={store.game?.users}
      >
        {child}
      </PageWithUsersBar>
    );
  }

  switch (store.game?.actualAction.state) {
    case "LOBBY":
      return wrapper(<LobbyPage />);

    case "SCENARIO":
      return wrapper(<ScenarioPage action={store.game?.actualAction} />);
    case "PROBLEM":
      return wrapper(<ProblemsPage action={store.game?.actualAction} />);
    case "PROBLEM_INVESTMENT":
      return <ProblemInvestment action={store.game?.actualAction} />;
    case "PROBLEM_END":
      return wrapper(<ProblemFinishPage action={store.game?.actualAction} />);
    case "INSIGHT":
    case "INSIGHT_END":
      return wrapper(<InsightsPage action={store.game?.actualAction} />);

    case "SOLUTION":
    case "SOLUTION_ADVOCATE":
    case "SOLUTION_SELECTION":
      return wrapper(<SolutionsPage action={store.game?.actualAction} />);

    case "PROTOTYPE":
      return wrapper(<PrototypePage action={store.game?.actualAction} />);

    case "PILOT":
      return wrapper(<PilotPage action={store.game?.actualAction} />);
    case "MARKETING":
      return wrapper(<MarketingPage action={store.game?.actualAction} />);
    case "SALES":
      return wrapper(<SalesPage action={store.game?.actualAction} />);

    case "RANDOM_PREMIUM":
      return wrapper(<PremiumCardPage action={store.game?.actualAction} />);

    case undefined:
    default:
      return <div>Carregando</div>;
  }
}
