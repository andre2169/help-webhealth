import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationsContext";
import Icon from "./Icon";

function formatNotificationTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const {
    enabled,
    items,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!enabled) return null;

  async function handleOpenNotification(notification) {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setOpen(false);
    if (notification.ticket_id) {
      navigate(`/tickets/${notification.ticket_id}`);
    }
  }

  async function handleToggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      refresh({ showToast: false });
    }
  }

  return (
    <div className="notification-center" ref={menuRef}>
      <button
        type="button"
        className={`notification-button ${unreadCount ? "has-unread" : ""}`}
        onClick={handleToggle}
        aria-label={
          unreadCount
            ? `${unreadCount} notificações não lidas`
            : "Abrir notificações"
        }
        aria-expanded={open}
      >
        <Icon name="bell" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-menu" role="menu">
          <div className="notification-menu-header">
            <div>
              <strong>Notificações</strong>
              <span>Chamados novos e reabertos</span>
            </div>
            <button
              type="button"
              className="ghost small"
              onClick={markAllAsRead}
              disabled={!unreadCount}
            >
              Marcar lidas
            </button>
          </div>

          {error && <p className="notification-error">{error}</p>}
          {loading && !items.length && (
            <p className="notification-empty">Carregando...</p>
          )}

          {!loading && !items.length && !error && (
            <p className="notification-empty">Nenhuma notificação por enquanto.</p>
          )}

          <div className="notification-list">
            {items.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className={`notification-item ${
                  notification.is_read ? "" : "unread"
                }`}
                onClick={() => handleOpenNotification(notification)}
              >
                <span className="notification-item-icon">
                  <Icon
                    name={
                      notification.type === "ticket.reopened" ? "refresh" : "ticket"
                    }
                    size={16}
                  />
                </span>
                <span className="notification-item-content">
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <small>{formatNotificationTime(notification.created_at)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
