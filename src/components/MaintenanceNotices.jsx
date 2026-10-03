import { useEffect, useRef, useState } from "react";
import { CheckCheck } from "lucide-react";
import { getActiveMaintenanceNotices, markMaintenanceNoticeRead, MAINTENANCE_NOTICES_UPDATED_EVENT } from "../api/api";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";

const NOTICE_ICONS = {
  info: "activity",
  warning: "alert",
  critical: "alert",
};

const NOTICE_LABELS = { info: "Informativo", warning: "Atenção", critical: "Crítico" };

export default function MaintenanceNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [pending, setPending] = useState(() => new Set());
  const [errors, setErrors] = useState({});
  const requests = useRef(new Set());
  const refresh = useRef(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    function reload() {
      const current = ++revision;
      getActiveMaintenanceNotices()
        .then(items => { if (active && current === revision) setNotices(Array.isArray(items) ? items : []); })
        .catch(() => {});
    }
    refresh.current = reload;
    reload();
    window.addEventListener(MAINTENANCE_NOTICES_UPDATED_EVENT, reload);
    return () => {
      active = false;
      refresh.current = null;
      window.removeEventListener(MAINTENANCE_NOTICES_UPDATED_EVENT, reload);
    };
  }, [user?.id]);

  async function markRead(notice) {
    if (requests.current.has(notice.id)) return;
    requests.current.add(notice.id);
    setPending(current => new Set(current).add(notice.id));
    setErrors(current => ({ ...current, [notice.id]: "" }));
    try {
      await markMaintenanceNoticeRead(notice.id, notice.revision ?? 1);
      setNotices(current => current.filter(item => item.id !== notice.id || item.revision !== notice.revision));
    } catch (error) {
      setErrors(current => ({ ...current, [notice.id]: error.status && error.message
        ? error.message : "Não foi possível marcar o aviso como lido. Tente novamente." }));
      if (error.status === 409 || error.status === 404) refresh.current?.();
    } finally {
      requests.current.delete(notice.id);
      setPending(current => { const next = new Set(current); next.delete(notice.id); return next; });
    }
  }

  if (notices.length === 0) return null;

  return (
    <div className="maintenance-notice-stack" aria-label="Avisos operacionais">
      {notices.map((notice) => (
        <aside className={`maintenance-notice is-${notice.severity}`} key={notice.id} role="status">
          <Icon name={NOTICE_ICONS[notice.severity] || "activity"} size={18} />
          <div className="maintenance-notice-copy">
            <div className="maintenance-notice-heading">
              <span className="maintenance-notice-tag">Aviso · {NOTICE_LABELS[notice.severity] || "Informativo"}</span>
              <strong>{notice.title}</strong>
            </div>
            <span>{notice.message}</span>
            {errors[notice.id] && <p className="maintenance-notice-error" role="alert">{errors[notice.id]}</p>}
          </div>
          <button
            type="button"
            className="ghost small maintenance-notice-read"
            disabled={pending.has(notice.id)}
            aria-busy={pending.has(notice.id)}
            onClick={() => markRead(notice)}
            title="Marcar como lido e fechar"
            aria-label={`Marcar como lido: ${notice.title}`}
          >
            <CheckCheck size={17} aria-hidden="true" />
            {pending.has(notice.id) ? "Marcando..." : "Marcar como lido"}
          </button>
        </aside>
      ))}
    </div>
  );
}
