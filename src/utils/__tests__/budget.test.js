import { getBudgetState, BUDGET_COLORS } from "../budget";

describe("getBudgetState", () => {
  it("reports no budget when amount is missing or zero", () => {
    [null, undefined, { amount: 0 }, { amount: "0" }].forEach((budget) => {
      const state = getBudgetState(budget, 50);
      expect(state.hasBudget).toBe(false);
      expect(state.status).toBe("No budget set");
      expect(state.color).toBe(BUDGET_COLORS.onTrack);
      expect(state.progress).toBe(0);
    });
  });

  it("is on track below the warning threshold", () => {
    const state = getBudgetState({ amount: 100 }, 50);
    expect(state.status).toBe("On track");
    expect(state.color).toBe(BUDGET_COLORS.onTrack);
    expect(state.detail).toBe("$50.00 left this month");
    expect(state.progress).toBeCloseTo(0.5, 6);
  });

  it("warns at the 80% default threshold", () => {
    const state = getBudgetState({ amount: 100 }, 85);
    expect(state.status).toBe("Nearing monthly budget");
    expect(state.color).toBe(BUDGET_COLORS.warning);
    expect(state.detail).toBe("$15.00 left this month");
  });

  it("flags exceeded at/above 100%", () => {
    const state = getBudgetState({ amount: 100 }, 120);
    expect(state.status).toBe("Budget exceeded");
    expect(state.color).toBe(BUDGET_COLORS.exceeded);
    expect(state.detail).toBe("$20.00 over budget");
  });

  it("caps progress at 1 when over budget", () => {
    expect(getBudgetState({ amount: 100 }, 250).progress).toBe(1);
  });

  it("treats exactly the budget as exceeded (ratio 1)", () => {
    expect(getBudgetState({ amount: 100 }, 100).status).toBe("Budget exceeded");
  });

  it("honors custom warning/exceeded thresholds", () => {
    const budget = { amount: 100, warningThreshold: 0.5, exceededThreshold: 0.9 };
    expect(getBudgetState(budget, 60).status).toBe("Nearing monthly budget");
    expect(getBudgetState(budget, 95).status).toBe("Budget exceeded");
    expect(getBudgetState(budget, 40).status).toBe("On track");
  });
});
