import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/api";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);
const SUPPORT_ROLES = ["technician", "admin"];
const POLL_INTERVAL_MS = 45000;

function canReceiveNotifications(user) {
  return SUPPORT_ROLES.includes(user?.role);
}

export function NotificationsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seenIdsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const enabled = isAuthenticated && canReceiveNotifications(user);

  const loadNotifications = useCallback(
    async ({ showToast = false } = {}) => {
      if (!enabled) {
        setItems([]);
        setUnreadCount(0);
        setToastNotification(null);
        return;
      }

      try {
        setLoading(true);
        const data = await getNotifications({ limit: 20 });
        const notifications = Array.isArray(data?.items) ? data.items : [];
        const nextUnreadCount = Number(data?.unread_count || 0);

        if (initializedRef.current && showToast) {
          const newestUnread = notifications.find(
            (notification) =>
              !notification.is_read && !seenIdsRef.current.has(notification.id)
          );
          if (newestUnread) {
            setToastNotification(newestUnread);
          }
        }

        notifications.forEach((notification) => {
          seenIdsRef.current.add(notification.id);
        });
        initializedRef.current = true;
        setItems(notifications);
        setUnreadCount(nextUnreadCount);
        setError("");
      } catch (err) {
        setError(err.message || "Não foi possível carregar as notificações.");
      } finally {
        setLoading(false);
      }
    },
    [enabled]
  );

  useEffect(() => {
    seenIdsRef.current = new Set();
    initializedRef.current = false;

    if (!enabled) {
      setItems([]);
      setUnreadCount(0);
      setToastNotification(null);
      return undefined;
    }

    loadNotifications({ showToast: false });
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications({ showToast: true });
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, loadNotifications, user?.id]);

  const markAsRead = useCallback(
    async (notificationId) => {
      await markNotificationRead(notificationId);
      setItems((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      setToastNotification((current) =>
        current?.id === notificationId ? null : current
      );
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((current) =>
      current.map((notification) => ({ ...notification, is_read: true }))
    );
    setUnreadCount(0);
    setToastNotification(null);
  }, []);

  const value = {
    enabled,
    items,
    unreadCount,
    toastNotification,
    loading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
    dismissToast: () => setToastNotification(null),
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications deve ser usado dentro de NotificationsProvider");
  }
  return ctx;
}
