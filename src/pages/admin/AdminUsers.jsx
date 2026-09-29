import { useEffect, useState } from "react";
import { adminChangeUserRole, adminDeleteUser, adminListUsers } from "../../api/api";
import Icon from "../../components/Icon";
import RoleBadge from "../../components/RoleBadge";
import Topbar from "../../components/Topbar";
import { useAuth } from "../../context/AuthContext";

const ROLES = ["user", "technician", "admin"];
const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [orderBy, setOrderBy] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setUsers([]);

    adminListUsers({
      search,
      role,
      isActive,
      orderBy,
      direction,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      signal: controller.signal,
    })
      .then((data) => {
        if (!active) return;
        setUsers(data.items || []);
        setHasMore(Boolean(data.has_more));
      })
      .catch((err) => {
        if (active && err.name !== "AbortError") setError(err.message);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
      controller.abort();
    };
  }, [search, role, isActive, orderBy, direction, page]);

  async function handleRoleChange(userId, role) {
    setBusyId(userId);
    setError("");
    try {
      const updated = await adminChangeUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm("Excluir este usuário? Essa ação não pode ser desfeita.")) {
      return;
    }
    setBusyId(userId);
    setError("");
    try {
      await adminDeleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setRole("");
    setIsActive("");
    setOrderBy("name");
    setDirection("asc");
    setPage(0);
  }

  const hasFilters = Boolean(searchInput || role || isActive);

  return (
    <>
      <Topbar title="Administração" subtitle="Gestão de usuários do sistema" />
      <main className="main">
        <div className="page-title">
          <div>
            <h2>
              <Icon name="users" />
              Usuários
            </h2>
            <p>{users.length}{hasMore ? "+" : ""} usuário{users.length === 1 ? "" : "s"} exibido{users.length === 1 ? "" : "s"} nesta página</p>
          </div>
        </div>

        <div className="filters admin-user-filters">
          <div>
            <label htmlFor="admin-user-search">Pesquisar usuário</label>
            <div className="search-control">
              <input
                id="admin-user-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.slice(0, 80))}
                placeholder="Digite o início do nome"
                maxLength={80}
                autoComplete="off"
              />
              {searchInput && (
                <button type="button" className="search-clear" onClick={() => setSearchInput("")} aria-label="Limpar pesquisa de usuário">
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="admin-user-role">Papel</label>
            <select
              id="admin-user-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Todos os papéis</option>
              {ROLES.map((option) => (
                <option key={option} value={option}>
                  {option === "user" ? "Usuário" : option === "technician" ? "Técnico" : "Administrador"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-user-active">Situação</label>
            <select
              id="admin-user-active"
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Ativos e inativos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
          <div>
            <label htmlFor="admin-user-order">Ordenar por</label>
            <select id="admin-user-order" value={`${orderBy}:${direction}`} onChange={(e) => {
              const [nextOrder, nextDirection] = e.target.value.split(":");
              setOrderBy(nextOrder);
              setDirection(nextDirection);
              setPage(0);
            }}>
              <option value="name:asc">Nome: A-Z</option>
              <option value="name:desc">Nome: Z-A</option>
              <option value="created_at:desc">Mais recentes</option>
              <option value="created_at:asc">Mais antigos</option>
            </select>
          </div>
          <div className="filters-actions">
            <button type="button" className="secondary small" onClick={clearFilters} disabled={!hasFilters}>
              <Icon name="refresh" size={16} />
              Limpar filtros
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="admin-table">
          <div className="admin-head-row">
            <span>Nome</span>
            <span>Email</span>
            <span>Papel</span>
            <span>Situação</span>
            <span></span>
          </div>

          {loading && <p className="loading-line" style={{ padding: "16px 18px" }}>Carregando usuários…</p>}

          {!loading &&
            users.map((u) => (
              <div className="admin-row" key={u.id}>
                <span>{u.name}</span>
                <span style={{ color: "var(--slate)" }}>
                  {u.email_masked || u.email}
                  <small className={`email-verified-pill ${u.email_verified ? "is-ok" : "is-pending"}`}>
                    {u.email_verified ? "Confirmado" : "Pendente"}
                  </small>
                </span>
                <span>
                  <RoleBadge role={u.role} />
                </span>
                <span>
                  <small className={`admin-active-pill ${u.is_active ? "is-active" : "is-inactive"}`}>
                    {u.is_active ? "Ativo" : "Inativo"}
                  </small>
                </span>
                <span className="admin-row-actions">
                  <select
                    className="role-select"
                    value={u.role}
                    disabled={busyId === u.id || u.id === currentUser?.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button
                    className="danger small"
                    disabled={busyId === u.id || u.id === currentUser?.id}
                    onClick={() => handleDelete(u.id)}
                  >
                    <Icon name="trash" />
                    Excluir
                  </button>
                </span>
              </div>
            ))}

          {!loading && users.length === 0 && (
            <div className="empty-state">
              <strong>Nenhum usuário encontrado</strong>
            </div>
          )}
        </div>

        <div className="pagination">
          <span>
            Página {page + 1}{hasMore ? " — há mais resultados" : ""}
          </span>
          <div className="pagination-controls">
            <button
              className="secondary small"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Anterior
            </button>
            <button
              className="secondary small"
              disabled={!hasMore || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </main>
    </>
  );
}


