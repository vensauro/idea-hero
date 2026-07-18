import { describe, expect, it } from "vitest";
import { BOARD_STATES } from "./App";

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
});
