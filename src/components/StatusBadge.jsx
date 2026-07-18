const LABELS = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
  reopened: "Reaberto",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status}`}>
      {LABELS[status] || status}
    </span>
  );
}

