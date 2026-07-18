import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";

export default function Topbar({ title, subtitle }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="topbar-actions">
        {user?.name && (
          <div className="topbar-user-chip">
            <UserAvatar user={user} size={32} />
            <span>{user.name}</span>
          </div>
        )}
        <button className="ghost topbar-logout" onClick={handleLogout}>
          <Icon name="logOut" />
          Sair
        </button>
      </div>
    </header>
  );
}

