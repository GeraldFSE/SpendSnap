import React from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

function polarToCartesian(cx, cy, radius, angleDegrees) {
  const angle = ((angleDegrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function arcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// A tappable pie chart. `data` is [{ key, value, color }]; tapping a slice calls
// onSlicePress(key). The selected slice is pulled out slightly and outlined.
export default function PieChart({ data, size = 200, selectedKey = null, onSlicePress }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const center = size / 2;
  const radius = size / 2 - 6;
  const slices = data.filter((item) => (Number(item.value) || 0) > 0);

  if (total <= 0 || slices.length === 0) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} fill="#E2E8F0" />
      </Svg>
    );
  }

  // A single non-zero slice can't be drawn as an arc (start and end coincide), so draw
  // it as a full circle instead.
  if (slices.length === 1) {
    const only = slices[0];
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill={only.color}
          stroke={selectedKey === only.key ? "#0F172A" : "#FFFFFF"}
          strokeWidth={selectedKey === only.key ? 3 : 1}
          onPress={() => onSlicePress?.(only.key)}
        />
      </Svg>
    );
  }

  let angle = 0;

  return (
    <Svg width={size} height={size}>
      {slices.map((item) => {
        const sweep = ((Number(item.value) || 0) / total) * 360;
        const startAngle = angle;
        const endAngle = angle + sweep;
        angle = endAngle;

        const selected = selectedKey === item.key;
        const midAngle = (startAngle + endAngle) / 2;
        const offset = selected ? polarToCartesian(0, 0, 8, midAngle) : { x: 0, y: 0 };

        return (
          <G key={item.key} x={offset.x} y={offset.y}>
            <Path
              d={arcPath(center, center, radius, startAngle, endAngle)}
              fill={item.color}
              stroke={selected ? "#0F172A" : "#FFFFFF"}
              strokeWidth={selected ? 3 : 1}
              onPress={() => onSlicePress?.(item.key)}
            />
          </G>
        );
      })}
    </Svg>
  );
}
