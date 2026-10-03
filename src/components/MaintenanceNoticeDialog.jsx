import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Save, Trash2, X } from "lucide-react";
import MaintenanceNoticeFields from "./MaintenanceNoticeFields";
import { apiDateToLocalInput } from "../utils/dateTime";

export default function MaintenanceNoticeDialog({ notice, mode, sectors, busy, error, onClose, onConfirm }) {
  const dialog = useRef(null);
  const deleting = mode === "delete";
  const [value, setValue] = useState(() => ({
    title: notice.title, message: notice.message, severity: notice.severity,
    audience: notice.audience || "all",
    target_sectors: [...notice.target_sectors], endsAt: apiDateToLocalInput(notice.ends_at),
  }));

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

  return createPortal(
    <dialog ref={dialog} className={`catalog-dialog${deleting ? "" : " notice-edit-dialog"}`}
      aria-labelledby="notice-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
      <form onSubmit={event => { event.preventDefault(); if (!busy) onConfirm(value); }}>
        <header>
          <h3 id="notice-dialog-title">{deleting ? "Excluir aviso" : "Editar aviso"}</h3>
          <button type="button" className="catalog-dialog-close" title="Fechar" aria-label="Fechar" disabled={busy} onClick={onClose}><X size={20} /></button>
        </header>
        <div className="catalog-dialog-body">
          {deleting ? <>
            <p className="catalog-delete-name">{notice.title}</p>
            <p>A exclusão é definitiva. Para apenas interromper a exibição, desative o aviso.</p>
          </> : <MaintenanceNoticeFields value={value} onChange={setValue} sectors={sectors} prefix="notice-edit" disabled={busy} />}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <footer>
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className={deleting ? "catalog-delete-button" : ""}
            disabled={busy || (!deleting && (value.title.trim().length < 3 || value.message.trim().length < 3))}>
            {deleting ? <Trash2 size={17} /> : <Save size={17} />}
            {busy ? "Salvando..." : deleting ? "Excluir" : "Salvar alterações"}
          </button>
        </footer>
      </form>
    </dialog>, document.body,
  );
}
