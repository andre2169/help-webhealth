import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";

const ROLE_LABELS = {
  user: "Usuário",
  technician: "Técnico",
  admin: "Administrador",
};

export default function Sidebar({ onLogout }) {
  const { user } = useAuth();
  const role = user?.role;
  const isSupportRole = role === "technician" || role === "admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <Icon name="shield" size={20} />
        </div>
        <div>
          <strong>HelpWeb Health</strong>
          <span>Chamados de TI hospitalar</span>
        </div>
      </div>

      <div className="sidebar-section">Operação</div>
      <nav className="sidebar-nav">
        {isSupportRole && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <Icon name="dashboard" />
            <span>Dashboard</span>
          </NavLink>
        )}

        <NavLink
          to="/tickets"
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          <Icon name="ticket" />
          <span>{role === "user" ? "Meus chamados" : "Chamados"}</span>
        </NavLink>

        <NavLink
          to="/tickets/novo"
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          <Icon name="plus" />
          <span>Novo chamado</span>
        </NavLink>

        {isSupportRole && (
          <NavLink
            to="/atendimento"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <Icon name="headset" />
            <span>Atendimento</span>
          </NavLink>
        )}

        {isSupportRole && (
          <NavLink
            to="/relatorios"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <Icon name="reports" />
            <span>Relatórios</span>
          </NavLink>
        )}

        <NavLink
          to="/perfil"
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          <Icon name="user" />
          <span>Perfil</span>
        </NavLink>
      </nav>

      {role === "admin" && (
        <>
          <div className="sidebar-section">Administração</div>
          <nav className="sidebar-nav">
            <NavLink
              to="/admin/usuarios"
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              <Icon name="users" />
              <span>Usuários</span>
            </NavLink>
          </nav>
        </>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <UserAvatar user={user} size={38} className="sidebar-user-avatar" />
          <div className="sidebar-user-info">
            <strong>{user?.name || "-"}</strong>
            <span>{ROLE_LABELS[role] || role}</span>
          </div>
        </div>
        <button className="ghost full sidebar-logout" onClick={onLogout}>
          <Icon name="logOut" />
          Sair
        </button>
      </div>
    </aside>
  );
}



