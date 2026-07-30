import { describe, expect, it } from "vitest";
import {
  BOARD_STATES,
  COLLABORATIVE_PHASES,
  COLLABORATIVE_STAGES,
} from "./App";

describe("Idea Hero board cycle", () => {
  it("preserves the canonical nine-stage journey", () => {
    expect(BOARD_STATES).toEqual([
      "SCENARIO",
      "PROBLEM",
      "INSIGHT",
      "SOLUTION",
      "POLISHING",
      "PROTOTYPE",
      "TESTING",
      "CONQUERING",
      "FINAL",
    ]);
  });

  it("uses collective creation, voting and review in collaborative stages", () => {
    expect([...COLLABORATIVE_STAGES]).toEqual([
      "SCENARIO",
      "PROBLEM",
      "INSIGHT",
      "SOLUTION",
      "POLISHING",
      "CONQUERING",
    ]);
    expect(COLLABORATIVE_PHASES).toEqual(["CONTRIBUTING", "VOTING", "REVIEW"]);
  });
});
