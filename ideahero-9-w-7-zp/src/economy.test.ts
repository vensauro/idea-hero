import { describe, expect, it } from "vitest";
import {
  BOARD_STAGES,
  FUNDING_STAGES,
  FUNDING_VALUES,
  MARKETING_LAUNCH_OPTIONS,
  MARKET_RESPONSES,
  PILOT_FEEDBACK,
  PROTOTYPE_CHALLENGES,
  calculateSalesResult,
  createFundingOpportunity,
  createStageCosts,
  effectiveMarketMultiplier,
  marketingLaunchOption,
  pilotFeedbackForSeed,
  prototypeChallengeForSeed,
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

  it("semeia desafios de protótipo e feedbacks sem criar uma nota", () => {
    const challenges = new Set();
    const feedbacks = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const challenge = prototypeChallengeForSeed(seed);
      const feedback = pilotFeedbackForSeed(seed);
      expect(PROTOTYPE_CHALLENGES).toContain(challenge);
      expect(PILOT_FEEDBACK).toContain(feedback);
      expect(challenge.artifactKinds.length).toBeGreaterThanOrEqual(2);
      expect(feedback.options).toHaveLength(3);
      expect(pilotFeedbackForSeed(seed)).toEqual(feedback);
      challenges.add(challenge.key);
      feedbacks.add(feedback.title);
    }
    expect(challenges.size).toBe(PROTOTYPE_CHALLENGES.length);
    expect(feedbacks.size).toBe(PILOT_FEEDBACK.length);
  });

  it("oferece três cartas de Marketing com custos fixos e reserva previsível", () => {
    expect(MARKETING_LAUNCH_OPTIONS.map((option) => option.investment)).toEqual(
      [0, 500, 1_000],
    );
    for (const option of MARKETING_LAUNCH_OPTIONS) {
      expect(marketingLaunchOption(option.key)).toEqual(option);
      expect(option.imagePath).toMatch(/^\/cards\/.+\.webp$/);
      expect(option.imageAlt.length).toBeGreaterThan(30);
    }
    expect(marketingLaunchOption("INVALID")).toBeUndefined();
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
        multiplier: 100,
      }).tier,
    ).toBe("MARKET_SIGNAL");
    expect(
      calculateSalesResult({
        remainingCredits: 6_000,
        marketingInvestment: 1_000,
        multiplier: 110,
      }).tier,
    ).toBe("TRACTION");
    expect(
      calculateSalesResult({
        remainingCredits: 8_000,
        marketingInvestment: 2_000,
        multiplier: 130,
      }).tier,
    ).toBe("GROWTH_OPPORTUNITY");
  });
});
