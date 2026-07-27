import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ExpenseItem from "../ExpenseItem";

const expense = {
  id: "e1",
  amount: 12.5,
  category: "Food",
  notes: "Lunch",
  date: { toDate: () => new Date("2026-06-24T13:05:00") }
};

describe("ExpenseItem", () => {
  it("renders category, SGD amount and notes", () => {
    const { getByText } = render(<ExpenseItem expense={expense} />);
    expect(getByText("Food")).toBeTruthy();
    expect(getByText("$12.50")).toBeTruthy();
    expect(getByText("Lunch")).toBeTruthy();
  });

  it("omits notes when none are provided", () => {
    const { queryByText } = render(<ExpenseItem expense={{ ...expense, notes: "" }} />);
    expect(queryByText("Lunch")).toBeNull();
  });

  it("appends attribution to the date line when provided", () => {
    const { getByText } = render(<ExpenseItem expense={expense} attribution="alice@example.com" />);
    expect(getByText(/alice@example\.com/)).toBeTruthy();
  });

  it("shows a Delete control only when onDelete is given, and fires it", () => {
    const onDelete = jest.fn();
    const { queryByText, getByText, rerender } = render(<ExpenseItem expense={expense} />);
    expect(queryByText("Delete")).toBeNull();

    rerender(<ExpenseItem expense={expense} onDelete={onDelete} />);
    fireEvent.press(getByText("Delete"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows an Edit control and fires it", () => {
    const onEdit = jest.fn();
    const { getByText } = render(<ExpenseItem expense={expense} onEdit={onEdit} />);
    fireEvent.press(getByText("Edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("falls back to a friendly date when the timestamp is missing", () => {
    const { getByText } = render(<ExpenseItem expense={{ ...expense, date: null }} />);
    expect(getByText(/Just now/)).toBeTruthy();
  });
});
