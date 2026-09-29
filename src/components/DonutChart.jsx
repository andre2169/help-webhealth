import { useEffect, useMemo, useState } from "react";

const COLORS = [
  "#4d7c3b",
  "#c2873d",
  "#4f7d87",
  "#a95e50",
  "#7666a2",
  "#748b55",
];

function polarToCartesian(center, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}

function donutPath(startAngle, endAngle, center = 100, outerRadius = 76, innerRadius = 43) {
  const startOuter = polarToCartesian(center, outerRadius, endAngle);
  const endOuter = polarToCartesian(center, outerRadius, startAngle);
  const startInner = polarToCartesian(center, innerRadius, endAngle);
  const endInner = polarToCartesian(center, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function translateForSlice(startAngle, endAngle, selected) {
  if (!selected) return "";
  const middle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
  return `translate(${Math.cos(middle) * 6} ${Math.sin(middle) * 6})`;
}

export default function DonutChart({ data = {}, labels = {}, title, onView }) {
  const items = useMemo(
    () =>
      Object.entries(data)
        .map(([key, value]) => ({ key, value: Number(value) || 0, label: labels[key] || key }))
        .filter((item) => item.value > 0),
    [data, labels]
  );
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const [selectedKey, setSelectedKey] = useState(items[0]?.key || null);

  useEffect(() => {
    setSelectedKey(items[0]?.key || null);
  }, [items]);

  if (!total) {
    return <p className="donut-empty">Sem dados para este período.</p>;
  }

  let cursor = 0;
  const slices = items.map((item, index) => {
    const startAngle = cursor;
    const endAngle = cursor + (item.value / total) * 360;
    cursor = endAngle;
    return {
      ...item,
      color: COLORS[index % COLORS.length],
      startAngle,
      endAngle,
      percentage: Math.round((item.value / total) * 100),
    };
  });
  const selected = slices.find((item) => item.key === selectedKey) || slices[0];
  const isSingleSlice = slices.length === 1;

  function selectSlice(key) {
    setSelectedKey(key);
  }

  function handleKeyDown(event, key) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectSlice(key);
    }
  }

  return (
    <div className="donut-chart" aria-label={title}>
      <div className="donut-visual">
        <svg className="donut-svg" viewBox="0 0 200 200" role="img" aria-label={title}>
          <circle className="donut-ring-base" cx="100" cy="100" r="59" />
          {isSingleSlice ? (
            <circle
              className={`donut-single-slice ${selected.key === slices[0].key ? "selected" : ""}`}
              cx="100"
              cy="100"
              r="59"
              stroke={slices[0].color}
              onClick={() => selectSlice(slices[0].key)}
              onKeyDown={(event) => handleKeyDown(event, slices[0].key)}
              tabIndex="0"
              role="button"
              aria-label={`${slices[0].label}: ${slices[0].value}`}
            />
          ) : (
            slices.map((slice) => (
              <path
                key={slice.key}
                className={`donut-slice ${selected.key === slice.key ? "selected" : ""}`}
                d={donutPath(slice.startAngle, slice.endAngle)}
                fill={slice.color}
                transform={translateForSlice(slice.startAngle, slice.endAngle, selected.key === slice.key)}
                onClick={() => selectSlice(slice.key)}
                onKeyDown={(event) => handleKeyDown(event, slice.key)}
                tabIndex="0"
                role="button"
                aria-label={`${slice.label}: ${slice.value}`}
                aria-pressed={selected.key === slice.key}
              />
            ))
          )}
        </svg>
        <div className="donut-center" aria-live="polite">
          <strong>{selected.value}</strong>
          <span>{selected.label}</span>
          <small>{selected.percentage}%</small>
        </div>
      </div>

      <div className="donut-legend" role="list">
        {slices.map((slice) => (
          <button
            key={slice.key}
            type="button"
            className={`donut-legend-item ${selected.key === slice.key ? "selected" : ""}`}
            onClick={() => selectSlice(slice.key)}
            aria-pressed={selected.key === slice.key}
          >
            <span className="donut-swatch" style={{ backgroundColor: slice.color }} aria-hidden="true" />
            <span>{slice.label}</span>
            <strong>{slice.value}</strong>
          </button>
        ))}
        {onView && selected && (
          <button
            type="button"
            className="donut-view-button"
            onClick={() => onView(selected.key)}
          >
            Ver chamados
          </button>
        )}
      </div>
    </div>
  );
}
