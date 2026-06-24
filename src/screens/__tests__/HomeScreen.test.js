import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import HomeScreen from "../HomeScreen";
import { subscribeToPersonalExpenses, subscribeToMonthlyBudget, saveMonthlyBudget } from "../../services/firebase";

jest.mock("../../services/firebase", () => ({
  subscribeToPersonalExpenses: jest.fn(),
  subscribeToMonthlyBudget: jest.fn(),
  saveMonthlyBudget: jest.fn(() => Promise.resolve())
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() })
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

const user = { uid: "u1", email: "me@example.com", isAnonymous: false };

// An expense dated "now" so it counts toward the current month regardless of run date.
const thisMonthExpense = { id: "e1", amount: 50, category: "Food", notes: "", date: { toDate: () => new Date() } };

function mockExpenses(expenses) {
  subscribeToPersonalExpenses.mockImplementation((uid, onExpenses) => {
    onExpenses(expenses);
    return jest.fn();
  });
}

function mockBudget(budget) {
  subscribeToMonthlyBudget.mockImplementation((uid, onBudget) => {
    onBudget(budget);
    return jest.fn();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockExpenses([thisMonthExpense]);
  mockBudget(null);
});

describe("HomeScreen", () => {
  it("subscribes to the signed-in user's own expenses", () => {
    render(<HomeScreen user={user} onSignOut={jest.fn()} />);
    expect(subscribeToPersonalExpenses).toHaveBeenCalledWith("u1", expect.any(Function), expect.any(Function));
  });

  it("shows the account email and the monthly total", () => {
    const { getByText, getAllByText } = render(<HomeScreen user={user} onSignOut={jest.fn()} />);
    expect(getByText("me@example.com")).toBeTruthy();
    // The $50 expense surfaces in the month total, the "today" metric and the row itself.
    expect(getAllByText("$50.00").length).toBeGreaterThanOrEqual(1);
  });

  it("prompts to set a budget when none exists", () => {
    const { getByText } = render(<HomeScreen user={user} onSignOut={jest.fn()} />);
    expect(getByText("No monthly budget set")).toBeTruthy();
    expect(getByText("Set budget")).toBeTruthy();
  });

  it("saves a new budget from the modal", async () => {
    const { getByText, getByPlaceholderText } = render(<HomeScreen user={user} onSignOut={jest.fn()} />);
    fireEvent.press(getByText("Set budget"));
    fireEvent.changeText(getByPlaceholderText("0.00"), "200");
    fireEvent.press(getByText("Save"));

    await waitFor(() => expect(saveMonthlyBudget).toHaveBeenCalledWith("u1", 200));
  });

  it("shows budget progress and an Edit button once a budget exists", () => {
    mockBudget({ amount: 100 });
    const { getByText } = render(<HomeScreen user={user} onSignOut={jest.fn()} />);
    expect(getByText("Edit")).toBeTruthy();
    expect(getByText(/50% of \$100\.00/)).toBeTruthy();
  });

  it("invokes onSignOut when sign out is pressed", () => {
    const onSignOut = jest.fn();
    const { getByText } = render(<HomeScreen user={user} onSignOut={onSignOut} />);
    fireEvent.press(getByText("Sign out"));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
