import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Save, Trash2, X } from "lucide-react";

export default function CatalogOptionDialog({ option, mode, busy, error, onClose, onConfirm }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const [name, setName] = useState(option.name);
  const deleting = mode === "delete";
  const type = option.kind === "sector" ? "setor" : "categoria";

  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal();
    input.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog ref={dialog} className="catalog-dialog" aria-modal="true" aria-labelledby="catalog-dialog-title"
      aria-describedby="catalog-dialog-description" onCancel={event => {
        event.preventDefault(); if (!busy) onClose();
      }} onClick={event => {
        if (busy || event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      <form onSubmit={event => { event.preventDefault(); if (!busy) onConfirm(name); }}>
        <header>
          <h3 id="catalog-dialog-title">{deleting ? "Excluir" : "Editar"} {type}</h3>
          <button type="button" className="catalog-dialog-close" title="Fechar" aria-label="Fechar" disabled={busy} onClick={onClose}><X size={20} /></button>
        </header>
        <div className="catalog-dialog-body">
          {deleting ? (
            <>
              <p className="catalog-delete-name">{option.name}</p>
              <p id="catalog-dialog-description">A exclusão é definitiva e só é permitida para cadastros sem vínculos. Cadastros já utilizados devem ser desativados para preservar o histórico.</p>
            </>
          ) : (
            <>
              <label htmlFor="catalog-edit-name">Nome {type === "setor" ? "do setor" : "da categoria"}</label>
              <input ref={input} id="catalog-edit-name" value={name} onChange={event => setName(event.target.value)}
                minLength={2} maxLength={option.kind === "sector" ? 30 : 40} required disabled={busy} />
              <p id="catalog-dialog-description">O nome será atualizado também nos registros vinculados. Chamados, comentários e eventos serão preservados.</p>
            </>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
        <footer>
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className={deleting ? "catalog-delete-button" : ""}
            disabled={busy || (!deleting && (name.trim().length < 2 || name.trim() === option.name))}>
            {deleting ? <Trash2 size={17} /> : <Save size={17} />}
            {busy ? "Salvando..." : deleting ? "Excluir" : "Salvar alterações"}
          </button>
        </footer>
      </form>
    </dialog>, document.body,
  );
}
