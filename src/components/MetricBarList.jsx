import { useMemo } from "react";

function normalizeEntries(data = {}, labels = {}) {
  return Object.entries(data)
    .map(([key, value]) => ({
      key,
      label: labels[key] || key,
      value: Number(value) || 0,
    }))
    .filter((item) => item.value > 0)
    .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label));
}

export default function MetricBarList({ data = {}, labels = {}, onSelect, limit = 8 }) {
  const items = useMemo(() => normalizeEntries(data, labels).slice(0, limit), [data, labels, limit]);
  const max = items[0]?.value || 1;

  if (!items.length) {
    return <p className="metric-empty">Sem dados para este período.</p>;
  }

  return (
    <div className="metric-bar-list" role="list">
      {items.map((item) => {
        const canOpen = typeof onSelect === "function" && item.key !== "Sem valor";
        const content = (
          <>
            <span className="metric-bar-label" title={item.label}>
              {item.label}
            </span>
            <span className="metric-bar-track" aria-hidden="true">
              <span className="metric-bar-fill" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
            </span>
            <strong>{item.value}</strong>
          </>
        );

        return canOpen ? (
          <button
            className="metric-bar-row is-action"
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-label={`Ver chamados de ${item.label}: ${item.value}`}
          >
            {content}
          </button>
        ) : (
          <div className="metric-bar-row" key={item.key} role="listitem">
            {content}
          </div>
        );
      })}
    </div>
  );
}
