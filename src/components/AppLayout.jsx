import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationToast from "./NotificationToast";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { logout } = useAuth();

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

