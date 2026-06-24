// Pure SVG pie-geometry helpers, extracted from PieChart so the math can be unit tested
// without rendering.

export function polarToCartesian(cx, cy, radius, angleDegrees) {
  const angle = ((angleDegrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export function arcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// Splits chart data into drawable slices with cumulative start/end angles. Filters out
// zero/negative values and returns total for callers that special-case empty data.
export function computeSlices(data) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const positive = data.filter((item) => (Number(item.value) || 0) > 0);

  let angle = 0;
  const slices = positive.map((item) => {
    const sweep = total > 0 ? ((Number(item.value) || 0) / total) * 360 : 0;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;
    return { ...item, startAngle, endAngle, sweep };
  });

  return { total, slices };
}
