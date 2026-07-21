import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import Icon from "./Icon";

export default function NotificationToast() {
  const navigate = useNavigate();
  const { enabled, toastNotification, dismissToast, markAsRead } = useNotifications();

  if (!enabled || !toastNotification) return null;

  async function handleOpen() {
    if (!toastNotification.is_read) {
      await markAsRead(toastNotification.id);
    }
    if (toastNotification.ticket_id) {
      navigate(`/tickets/${toastNotification.ticket_id}`);
    }
  }

  return (
    <div className="notification-toast" role="status" aria-live="polite">
      <div className="notification-toast-icon">
        <Icon name={toastNotification.type === "ticket.reopened" ? "refresh" : "bell"} />
      </div>
      <div className="notification-toast-content">
        <strong>{toastNotification.title}</strong>
        <span>{toastNotification.message}</span>
      </div>
      <button type="button" className="notification-toast-action" onClick={handleOpen}>
        Ver
      </button>
      <button
        type="button"
        className="notification-toast-close"
        onClick={dismissToast}
        aria-label="Fechar notificação"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
