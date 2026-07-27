import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AddExpenseScreen from "../AddExpenseScreen";
import { parseExpenseText } from "../../services/openai";
import { saveExpense, updateExpense } from "../../services/firebase";

jest.mock("../../services/firebase", () => ({
  saveExpense: jest.fn(() => Promise.resolve()),
  updateExpense: jest.fn(() => Promise.resolve()),
  subscribeToGroup: jest.fn(() => jest.fn())
}));

jest.mock("../../services/openai", () => ({
  parseExpenseText: jest.fn()
}));

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

const user = { uid: "user-1", email: "user@example.com" };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  console.warn.mockRestore();
});

describe("AddExpenseScreen Quick Log", () => {
  it("prefills the existing manual form for review", async () => {
    parseExpenseText.mockResolvedValue({
      merchant: "McDonald's",
      amount: 12.8,
      category: "Food",
      type: "expense",
      date: "2026-07-27",
      message: ""
    });

    const screen = render(<AddExpenseScreen user={user} groupIds={[]} />);
    fireEvent.changeText(screen.getByTestId("quick-log-input"), "Lunch at McDonald's $12.80");
    fireEvent.press(screen.getByText("Fill expense with AI"));

    await waitFor(() => {
      expect(parseExpenseText).toHaveBeenCalledWith("Lunch at McDonald's $12.80");
      expect(screen.getByPlaceholderText("0.00").props.value).toBe("12.8");
      expect(screen.getByPlaceholderText("Optional").props.value).toBe("McDonald's");
      expect(screen.getByPlaceholderText("YYYY-MM-DD").props.value).toBe("2026-07-27");
      expect(screen.getByText("Food")).toBeTruthy();
      expect(saveExpense).not.toHaveBeenCalled();
    });
  });

  it("leaves uncertain fields blank and shows a helpful message", async () => {
    parseExpenseText.mockResolvedValue({
      merchant: null,
      amount: 20,
      category: null,
      type: "expense",
      date: "2026-07-27",
      message: "Some details were unclear. I filled what I could; review the remaining fields."
    });

    const screen = render(<AddExpenseScreen user={user} groupIds={[]} />);
    fireEvent.changeText(screen.getByTestId("quick-log-input"), "Maybe around $20");
    fireEvent.press(screen.getByText("Fill expense with AI"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("0.00").props.value).toBe("20");
      expect(screen.getByPlaceholderText("Optional").props.value).toBe("");
      expect(screen.getByText("Choose category")).toBeTruthy();
      expect(screen.getByText(/Some details were unclear/)).toBeTruthy();
    });
  });

  it("keeps manual entry available when the callable function fails", async () => {
    parseExpenseText.mockRejectedValue(new Error("unavailable"));

    const screen = render(<AddExpenseScreen user={user} groupIds={[]} />);
    fireEvent.changeText(screen.getByTestId("quick-log-input"), "Lunch 10");
    fireEvent.press(screen.getByText("Fill expense with AI"));

    await waitFor(() => {
      expect(screen.getByText(/You can still enter the expense manually/)).toBeTruthy();
      expect(screen.getByPlaceholderText("0.00")).toBeTruthy();
    });
  });
});

describe("AddExpenseScreen editing", () => {
  it("prefills and updates the existing expense without creating a new document", async () => {
    const editingExpense = {
      id: "expense-1",
      amount: 9.5,
      category: "Food",
      notes: "Breakfast",
      date: { toDate: () => new Date(2026, 6, 20, 12) },
      groupIds: ["group-1"]
    };
    const onEditComplete = jest.fn();
    const screen = render(
      <AddExpenseScreen
        user={user}
        groupIds={[]}
        editingExpense={editingExpense}
        onEditComplete={onEditComplete}
      />
    );

    expect(screen.getByPlaceholderText("0.00").props.value).toBe("9.5");
    expect(screen.getByPlaceholderText("Optional").props.value).toBe("Breakfast");
    expect(screen.getByPlaceholderText("YYYY-MM-DD").props.value).toBe("2026-07-20");

    fireEvent.changeText(screen.getByPlaceholderText("0.00"), "11.25");
    fireEvent.press(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(updateExpense).toHaveBeenCalledWith("user-1", "expense-1", {
        amount: 11.25,
        category: "Food",
        notes: "Breakfast",
        date: expect.any(Date)
      });
      expect(saveExpense).not.toHaveBeenCalled();
      expect(onEditComplete).toHaveBeenCalled();
    });
  });
});
