import { useEffect, useState } from "react";
import { getSlaState } from "../utils/sla";

export default function SlaCountdown({ ticket, compact = false }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const state = getSlaState({
    dueAt: ticket?.due_at,
    slaHours: ticket?.sla_hours,
    status: ticket?.status,
    now,
  });

  return (
    <span className={`sla-indicator is-${state.tone}${compact ? " is-compact" : ""}`} aria-label={`Prazo de atendimento: ${state.label}`}>
      {state.label}
    </span>
  );
}
