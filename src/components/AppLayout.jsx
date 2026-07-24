import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationToast from "./NotificationToast";
import { useAuth } from "../context/AuthContext";
import useKeyboardPageScroll from "../utils/keyboardScroll";

export default function AppLayout() {
  const { logout } = useAuth();
  useKeyboardPageScroll();

  return (
    <div className="app-shell">
      <Sidebar onLogout={logout} />
      <div className="app-body">
        <Outlet />
      </div>
      <NotificationToast />
    </div>
  );
}

