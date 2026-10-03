import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";
import ThemeToggle from "./ThemeToggle";
import BrandLogo from "./BrandLogo";
import NavigationIcon from "./NavigationIcon";

const ROLE_LABELS = {
  user: "Usuário",
  technician: "Técnico",
  admin: "Administrador",
};

const SIDEBAR_COLLAPSED_KEY = "helpweb_sidebar_collapsed";

function readCollapsedPreference() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export default function Sidebar({ onLogout }) {
  const { user } = useAuth();
  const role = user?.role;
  const isSupportRole = role === "technician" || role === "admin";
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const navigationRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!window.matchMedia("(max-width: 720px)").matches) return;
    const strip = navigationRef.current;
    const active = strip?.querySelector('[aria-current="page"]');
    if (!strip || !active) return;
    const linkBounds = active.getBoundingClientRect();
    const stripBounds = strip.getBoundingClientRect();
    if (linkBounds.left < stripBounds.left || linkBounds.right > stripBounds.right) {
      strip.scrollLeft += linkBounds.left - stripBounds.left - 8;
    }
  }, [location.pathname]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // A blocked localStorage must not prevent navigation.
      }
      return next;
    });
  }

  return (
    <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`}>
      <div className="sidebar-content">
        <NavLink to="/" className="sidebar-brand" title="Início">
          <div className="sidebar-brand-mark">
            <BrandLogo decorative />
          </div>
          <div>
            <strong>HELP WEB HEALTH</strong>
            <span>Chamados de TI hospitalar</span>
          </div>
        </NavLink>

        <div className="sidebar-navigation" ref={navigationRef} role="region" aria-label="Navegação do sistema" tabIndex={0}>
        <div className="sidebar-section">Operação</div>
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            title="Início"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <NavigationIcon name="home" />
            <span>Início</span>
          </NavLink>

          {isSupportRole && (
            <NavLink
              to="/dashboard"
              title="Dashboard"
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              <NavigationIcon name="dashboard" />
              <span>Dashboard</span>
            </NavLink>
          )}

          <NavLink
            to="/tickets"
            end
            title={role === "user" ? "Meus chamados" : "Chamados"}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <NavigationIcon name="tickets" />
            <span>{role === "user" ? "Meus chamados" : "Chamados"}</span>
          </NavLink>

          <NavLink
            to="/tickets/novo"
            title="Novo chamado"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <NavigationIcon name="createTicket" />
            <span>Novo chamado</span>
          </NavLink>

          {isSupportRole && (
            <NavLink
              to="/atendimento"
              title="Atendimento"
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              <NavigationIcon name="serviceDesk" />
              <span>Atendimento</span>
            </NavLink>
          )}

          {isSupportRole && (
            <NavLink
              to="/relatorios"
              title="Relatórios"
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              <NavigationIcon name="reports" />
              <span>Relatórios</span>
            </NavLink>
          )}

          <NavLink
            to="/perfil"
            title="Perfil"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <NavigationIcon name="profile" />
            <span>Perfil</span>
          </NavLink>
        </nav>

        {role === "admin" && (
          <>
            <div className="sidebar-section">Administração</div>
            <nav className="sidebar-nav">
              <NavLink
                to="/admin/usuarios"
                title="Usuários"
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              >
                <NavigationIcon name="users" />
                <span>Usuários</span>
              </NavLink>
              <NavLink
                to="/admin/eventos"
                title="Eventos"
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              >
                <NavigationIcon name="events" />
                <span>Eventos</span>
              </NavLink>
              <NavLink
                to="/admin/avisos"
                title="Avisos"
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              >
                <NavigationIcon name="notices" />
                <span>Avisos</span>
              </NavLink>
              <NavLink
                to="/admin/catalogo"
                title="Setores e categorias"
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              >
                <NavigationIcon name="catalog" />
                <span>Setores e categorias</span>
              </NavLink>
            </nav>
          </>
        )}
        </div>

        <div className="sidebar-footer">
          <NavLink to="/perfil" className="sidebar-user" title={user?.name || "Perfil"}>
            <UserAvatar user={user} size={38} className="sidebar-user-avatar" />
            <div className="sidebar-user-info">
              <strong>{user?.name || "-"}</strong>
              <span>{ROLE_LABELS[role] || role}</span>
            </div>
          </NavLink>
          <ThemeToggle />
          <button className="ghost full sidebar-logout" onClick={onLogout} title="Sair">
            <Icon name="logOut" />
            <span>Sair</span>
          </button>
        </div>
      </div>
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
      >
        <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={16} />
      </button>
    </aside>
  );
}



