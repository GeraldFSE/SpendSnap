import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import PieChart from "../PieChart";

// react-native-svg renders native primitives; swap them for plain Views so we can count
// and interact with slices in the test renderer.
jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const make = (name) => (props) => React.createElement(View, { ...props, testID: props.testID ?? name });
  return { __esModule: true, default: make("Svg"), Svg: make("Svg"), Circle: make("Circle"), G: make("G"), Path: make("Path") };
});

const data = [
  { key: "a", value: 30, color: "#111111", label: "A" },
  { key: "b", value: 10, color: "#222222", label: "B" }
];

describe("PieChart", () => {
  it("draws one Path per positive slice", () => {
    const { queryAllByTestId } = render(<PieChart data={data} onSlicePress={jest.fn()} />);
    expect(queryAllByTestId("Path")).toHaveLength(2);
  });

  it("calls onSlicePress with the slice key when a slice is pressed", () => {
    const onSlicePress = jest.fn();
    const { queryAllByTestId } = render(<PieChart data={data} onSlicePress={onSlicePress} />);
    fireEvent.press(queryAllByTestId("Path")[0]);
    expect(onSlicePress).toHaveBeenCalledWith("a");
  });

  it("renders a single value as a full Circle (no arc paths)", () => {
    const { queryAllByTestId } = render(
      <PieChart data={[{ key: "solo", value: 50, color: "#333333", label: "Solo" }]} />
    );
    expect(queryAllByTestId("Path")).toHaveLength(0);
    expect(queryAllByTestId("Circle").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a placeholder Circle when there is no data", () => {
    const { queryAllByTestId } = render(<PieChart data={[]} />);
    expect(queryAllByTestId("Path")).toHaveLength(0);
    expect(queryAllByTestId("Circle").length).toBeGreaterThanOrEqual(1);
  });
});
