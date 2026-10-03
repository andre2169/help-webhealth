const ACTIVE_STATUSES = new Set(["open", "reopened", "in_progress"]);

function durationLabel(milliseconds) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function getSlaState({ dueAt, slaHours = 24, status = "open", now = Date.now() }) {
  if (!ACTIVE_STATUSES.has(status)) return { label: "SLA encerrado", tone: "neutral" };
  if (!dueAt) return { label: "Sem prazo", tone: "neutral" };
  if (!now) return { label: "Calculando prazo…", tone: "neutral" };

  const deadline = new Date(dueAt).getTime();
  if (!Number.isFinite(deadline)) return { label: "Prazo indisponível", tone: "neutral" };

  const remaining = deadline - now;
  if (remaining <= 0) {
    return { label: `Vencido há ${durationLabel(Math.abs(remaining))}`, tone: "overdue" };
  }

  const riskWindow = Math.max(30 * 60000, Math.max(1, Number(slaHours) || 24) * 3600000 * 0.2);
  return {
    label: `Restam ${durationLabel(remaining)}`,
    tone: remaining <= riskWindow ? "risk" : "healthy",
  };
}
