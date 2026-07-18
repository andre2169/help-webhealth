import { useEffect, useState } from "react";
import { adminChangeUserRole, adminDeleteUser, adminListUsers } from "../../api/api";
import Icon from "../../components/Icon";
import RoleBadge from "../../components/RoleBadge";
import Topbar from "../../components/Topbar";
import { useAuth } from "../../context/AuthContext";

const ROLES = ["user", "technician", "admin"];

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setError("");
    adminListUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

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
            <p>{users.length} usuário{users.length === 1 ? "" : "s"} cadastrado{users.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="admin-table">
          <div className="admin-head-row">
            <span>Nome</span>
            <span>Email</span>
            <span>Papel</span>
            <span></span>
          </div>

          {loading && <p className="loading-line" style={{ padding: "16px 18px" }}>Carregando usuários…</p>}

          {!loading &&
            users.map((u) => (
              <div className="admin-row" key={u.id}>
                <span>{u.name}</span>
                <span style={{ color: "var(--slate)" }}>{u.email}</span>
                <span>
                  <RoleBadge role={u.role} />
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
      </main>
    </>
  );
}


