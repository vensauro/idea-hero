import { PageWithUsersBar } from "@/components/container/page-with-users-bar";
import { useGameStore } from "@/lib/store";
import { ReactNode } from "react";
import { BetterSalesPage } from "./better-sales";
import { EndPage } from "./end-screen";
import { InsightsPage } from "./insights";
import { LobbyPage } from "./lobby";
import { MarketingPage } from "./marketing";
import { PilotPage } from "./pilot";
import { PremiumCardPage } from "./premium-card";
import { ProblemFinishPage } from "./problem-end";
import { ProblemInvestment } from "./problem-investment";
import { ProblemsPage } from "./problems";
import { PrototypePage } from "./prototype";
import { ScenarioPage } from "./scenario";
import { SolutionsPage } from "./solutions";

export function RunningGamePage() {
  const store = useGameStore();

  // console.log(store.game);

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
    case "SOLUTION_INVESTMENT":
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
      // return wrapper(<SalesPage action={store.game?.actualAction} />);
      return <EndPage action={store.game?.actualAction} />;

    case "COMPETITIVE_SALES":
      return <BetterSalesPage action={store.game?.actualAction} />;

    case "RANDOM_PREMIUM":
      return wrapper(<PremiumCardPage action={store.game?.actualAction} />);

    case undefined:
    default:
      return <div>Carregando</div>;
  }
}
