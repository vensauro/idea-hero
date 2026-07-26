import { describe, expect, it } from "vitest";
import {
  BOARD_STAGES,
  FUNDING_STAGES,
  FUNDING_VALUES,
  MARKET_RESPONSES,
  PROTOTYPE_FIDELITIES,
  calculateSalesResult,
  createFundingOpportunity,
  createStageCosts,
  effectiveMarketMultiplier,
  pilotReadinessBonus,
  resolvePilotOutcome,
  roundToHundred,
} from "../spacetimedb/src/economy";

describe("economia de runway", () => {
  it("sempre distribui 5.000 créditos de custo operacional", () => {
    for (let seed = 1; seed <= 500; seed += 1) {
      const costs = createStageCosts(seed);
      expect(costs.map((item) => item.stage)).toEqual(BOARD_STAGES);
      expect(costs.reduce((total, item) => total + item.amount, 0)).toBe(5_000);
      expect(
        costs
          .slice(0, 2)
          .map((item) => item.amount)
          .sort((a, b) => a - b),
      ).toEqual([250, 500]);
      expect(
        costs
          .slice(2, 4)
          .map((item) => item.amount)
          .sort((a, b) => a - b),
      ).toEqual([500, 750]);
      expect(
        costs
          .slice(4, 6)
          .map((item) => item.amount)
          .sort((a, b) => a - b),
      ).toEqual([750, 1_000]);
      expect(
        costs
          .slice(6, 8)
          .map((item) => item.amount)
          .sort((a, b) => a - b),
      ).toEqual([500, 750]);
    }
  });

  it("repete a mesma jornada com a mesma seed e varia entre seeds", () => {
    expect(createStageCosts(42)).toEqual(createStageCosts(42));
    const patterns = new Set(
      Array.from({ length: 60 }, (_, seed) =>
        createStageCosts(seed)
          .map((item) => item.amount)
          .join(","),
      ),
    );
    expect(patterns.size).toBeGreaterThan(4);
  });

  it("cria exatamente uma oportunidade elegível, positiva e reproduzível", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const opportunity = createFundingOpportunity(seed);
      expect(FUNDING_STAGES).toContain(opportunity.stage);
      expect(FUNDING_VALUES).toContain(opportunity.value);
      expect(opportunity.value).toBeGreaterThan(0);
      expect(createFundingOpportunity(seed)).toEqual(opportunity);
    }
  });

  it("mantém as probabilidades de fidelidade completas e resolve bônus", () => {
    for (const fidelity of Object.keys(PROTOTYPE_FIDELITIES) as Array<
      keyof typeof PROTOTYPE_FIDELITIES
    >) {
      const odds = PROTOTYPE_FIDELITIES[fidelity];
      expect(odds.promising + odds.mixed + odds.friction).toBe(100);
      const outcomes = new Set(
        Array.from({ length: 1_000 }, (_, seed) =>
          resolvePilotOutcome(seed, fidelity),
        ),
      );
      expect(outcomes).toEqual(new Set(["PROMISING", "MIXED", "FRICTION"]));
    }
    expect(pilotReadinessBonus("PROMISING")).toBe(2_000);
    expect(pilotReadinessBonus("MIXED")).toBe(1_000);
    expect(pilotReadinessBonus("FRICTION")).toBe(0);
  });

  it("aplica a combinação de mercado e limita o multiplicador a 1,3×", () => {
    for (const response of MARKET_RESPONSES) {
      const matchingAudience =
        response.matchType === "AUDIENCE"
          ? response.matchValue
          : "EARLY_ADOPTERS";
      const matchingChannel =
        response.matchType === "CHANNEL" ? response.matchValue : "SOCIAL";
      const result = effectiveMarketMultiplier(
        response,
        matchingAudience,
        matchingChannel,
      );
      expect(result.matched).toBe(true);
      expect(result.multiplier).toBeGreaterThanOrEqual(90);
      expect(result.multiplier).toBeLessThanOrEqual(130);
    }
  });

  it("arredonda Vendas a centenas e classifica os quatro resultados", () => {
    expect(roundToHundred(5_449)).toBe(5_400);
    expect(roundToHundred(5_450)).toBe(5_500);
    expect(
      calculateSalesResult({
        remainingCredits: 1_000,
        marketingInvestment: 0,
        readinessBonus: 0,
        multiplier: 90,
      }),
    ).toEqual({
      simulatedSales: 4_500,
      finalRunway: 5_500,
      tier: "NEEDS_ITERATION",
    });
    expect(
      calculateSalesResult({
        remainingCredits: 3_000,
        marketingInvestment: 500,
        readinessBonus: 1_000,
        multiplier: 100,
      }).tier,
    ).toBe("MARKET_SIGNAL");
    expect(
      calculateSalesResult({
        remainingCredits: 6_000,
        marketingInvestment: 1_000,
        readinessBonus: 2_000,
        multiplier: 110,
      }).tier,
    ).toBe("TRACTION");
    expect(
      calculateSalesResult({
        remainingCredits: 8_000,
        marketingInvestment: 2_000,
        readinessBonus: 2_000,
        multiplier: 130,
      }).tier,
    ).toBe("GROWTH_OPPORTUNITY");
  });
});
