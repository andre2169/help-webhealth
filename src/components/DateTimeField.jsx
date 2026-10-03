import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, X } from "lucide-react";
import { localDateTimeToIso } from "../utils/dateTime";

function DateTimeDialog({ value, onChange, onClose }) {
  const id = useId();
  const dialog = useRef(null);
  const [date, setDate] = useState(value.split("T")[0] || "");
  const [time, setTime] = useState(value.split("T")[1] || "");
  const [error, setError] = useState("");

  useEffect(() => {
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal();
    return () => {
      document.body.style.overflow = overflow;
      if (focus?.isConnected) focus.focus({ preventScroll: true });
    };
  }, []);

  function confirm(event) {
    event.preventDefault();
    event.stopPropagation();
    const next = `${date}T${time}`;
    if (!localDateTimeToIso(next)) { setError("Selecione uma data e hora válidas."); return; }
    onChange(next);
    onClose();
  }

  return createPortal(
    <dialog ref={dialog} className="catalog-dialog date-time-dialog" aria-labelledby={`${id}-title`}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
      <form onSubmit={confirm}>
        <header>
          <h3 id={`${id}-title`}>Data e hora de encerramento</h3>
          <button type="button" className="catalog-dialog-close" aria-label="Fechar seleção de data e hora" title="Fechar" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="catalog-dialog-body date-time-fields">
          <div>
            <label htmlFor={`${id}-date`}>Data</label>
            <input id={`${id}-date`} type="date" value={date} onChange={event => { setDate(event.target.value); setError(""); }} required />
          </div>
          <div>
            <label htmlFor={`${id}-time`}>Hora</label>
            <input id={`${id}-time`} type="time" value={time} onChange={event => { setTime(event.target.value); setError(""); }} required />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <footer>
          <button type="button" className="ghost date-time-clear" disabled={!value} onClick={() => { onChange(""); onClose(); }}>Limpar</button>
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={!date || !time}><Check size={17} /> Confirmar data e hora</button>
        </footer>
      </form>
    </dialog>, document.body,
  );
}

export default function DateTimeField({ id, label, value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const iso = localDateTimeToIso(value);
  const display = iso ? new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "Selecionar data e hora";
  return (
    <div className="date-time-field">
      <label htmlFor={id}>{label}</label>
      <button id={id} type="button" className={`date-time-trigger${iso ? " has-value" : ""}`}
        aria-haspopup="dialog" disabled={disabled} onClick={() => setOpen(true)}>
        <span>{display}</span><CalendarDays size={18} aria-hidden="true" />
      </button>
      {open && <DateTimeDialog value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}
