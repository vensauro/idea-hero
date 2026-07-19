import { describe, expect, it } from "vitest";
import {
  BOARD_STATES,
  COLLABORATIVE_PHASES,
  COLLABORATIVE_STAGES,
} from "./App";

describe("Idea Hero board cycle", () => {
  it("preserves the canonical eight-stage journey", () => {
    expect(BOARD_STATES).toEqual([
      "SCENARIO",
      "PROBLEM",
      "INSIGHT",
      "SOLUTION",
      "PROTOTYPE",
      "PILOT",
      "MARKETING",
      "SALES",
    ]);
  });

  it("uses collective creation, voting and review in the first four stages", () => {
    expect([...COLLABORATIVE_STAGES]).toEqual([
      "SCENARIO",
      "PROBLEM",
      "INSIGHT",
      "SOLUTION",
    ]);
    expect(COLLABORATIVE_PHASES).toEqual(["CONTRIBUTING", "VOTING", "REVIEW"]);
  });
});
