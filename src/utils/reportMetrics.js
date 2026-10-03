export function metricRows(data, { preserveOrder = false, limit = 6 } = {}) {
  const entries = Object.entries(data || {})
    .map(([key, value]) => ({ key, label: key, total: Math.max(0, Number(value) || 0) }))
    .filter(row => preserveOrder || row.total > 0);
  if (preserveOrder) return entries;
  entries.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"));
  if (entries.length <= limit) return entries;
  const remaining = entries.slice(limit);
  return [...entries.slice(0, limit), {
    key: "report-remainder", label: "Outros", total: remaining.reduce((sum, row) => sum + row.total, 0),
    remainder: true,
  }];
}
