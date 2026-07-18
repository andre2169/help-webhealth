import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTickets } from "../api/api";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { formatApiDate } from "../utils/dateTime";
import { formatTicketCode } from "../utils/ticketCode";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
  { value: "reopened", label: "Reaberto" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const IMPACT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "low", label: "Baixo" },
  { value: "medium", label: "Médio" },
  { value: "high", label: "Alto" },
  { value: "critical", label: "Crítico" },
];

const CATEGORY_OPTIONS = [
  "Infraestrutura",
  "Rede",
  "Hardware",
  "Software hospitalar",
  "Impressão",
  "Acesso",
  "Telefonia",
  "Internet",
  "Segurança",
  "Periféricos",
  "Sistema de gestão hospitalar",
  "Leitor ou coletor",
];

const SECTOR_OPTIONS = [
  "Recepção",
  "UTI",
  "Enfermaria",
  "Laboratório",
  "Farmácia",
  "Centro Cirúrgico",
  "Pronto Atendimento",
  "Radiologia",
  "Ambulatório",
  "Almoxarifado",
  "Administrativo",
  "TI",
];

const PAGE_SIZE = 10;
const FILTER_LIMITS = {
  category: 40,
  sector: 30,
};

export default function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [sector, setSector] = useState("");
  const [operationalImpact, setOperationalImpact] = useState("");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getTickets({
      status,
      priority,
      category,
      sector,
      operationalImpact,
      direction,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        if (!active) return;
        setTickets(data.items || []);
        setTotal(data.total || 0);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [status, priority, category, sector, operationalImpact, direction, page]);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Topbar
        title={user?.role === "user" ? "Meus chamados" : "Chamados"}
        subtitle="Acompanhe e gerencie as solicitações de suporte"
      />

      <main className="main">
        <div className="page-title">
          <div>
            <h2>{user?.role === "user" ? "Meus chamados" : "Todos os chamados"}</h2>
            <p>{total} chamado{total === 1 ? "" : "s"} de TI em ambiente de saúde</p>
          </div>
          <button onClick={() => navigate("/tickets/novo")}>
            <Icon name="plus" />
            Novo chamado
          </button>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-card-head">
              <Icon name="ticket" />
              <span>no total</span>
            </div>
            <strong>{total}</strong>
          </div>
          <div className="summary-card">
            <div className="summary-card-head">
              <Icon name="activity" />
              <span>abertos nesta página</span>
            </div>
            <strong>{openCount}</strong>
          </div>
          <div className="summary-card">
            <div className="summary-card-head">
              <Icon name="filter" />
              <span>filtro atual</span>
            </div>
            <strong>{status ? STATUS_OPTIONS.find((s) => s.value === status)?.label : "Todos"}</strong>
          </div>
        </div>

        <div className="filters">
          <div>
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Prioridade</label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(0);
              }}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Impacto</label>
            <select
              value={operationalImpact}
              onChange={(e) => {
                setOperationalImpact(e.target.value);
                setPage(0);
              }}
            >
              {IMPACT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Categoria</label>
            <input
              list="ticket-filter-category-options"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value.slice(0, FILTER_LIMITS.category));
                setPage(0);
              }}
              placeholder="Todas ou digite uma categoria"
              maxLength={FILTER_LIMITS.category}
            />
            <datalist id="ticket-filter-category-options">
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>

          <div>
            <label>Setor</label>
            <input
              list="ticket-filter-sector-options"
              value={sector}
              onChange={(e) => {
                setSector(e.target.value.slice(0, FILTER_LIMITS.sector));
                setPage(0);
              }}
              placeholder="Todos ou digite um setor"
              maxLength={FILTER_LIMITS.sector}
            />
            <datalist id="ticket-filter-sector-options">
              {SECTOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>

          <div>
            <label>Ordenação</label>
            <select
              value={direction}
              onChange={(e) => {
                setDirection(e.target.value);
                setPage(0);
              }}
            >
              <option value="desc">Mais recentes primeiro</option>
              <option value="asc">Mais antigos primeiro</option>
            </select>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="ticket-table">
          <div className="table-head-row">
            <span>Código</span>
            <span>Chamado</span>
            <span>Status</span>
            <span>Responsável</span>
            <span>Aberto em</span>
          </div>

          {loading && <p className="loading-line" style={{ padding: "16px 18px" }}>Carregando chamados…</p>}

          {!loading &&
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                className="ticket-row"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <span className="ticket-row-id ticket-code">{formatTicketCode(ticket.id)}</span>
                <span className="ticket-row-main">
                  <strong>{ticket.title}</strong>
                  <span>
                    {ticket.sector || "Setor não informado"} · {ticket.equipment || ticket.category || "Infraestrutura"} · {ticket.priority || "Prioridade padrão"}
                  </span>
                </span>
                <span>
                  <StatusBadge status={ticket.status} />
                </span>
                <span className="ticket-row-meta">
                  {ticket.technician_name || (ticket.technician_id ? "Equipe técnica" : "Não atribuído")}
                </span>
                <span className="ticket-row-date">{formatApiDate(ticket.created_at)}</span>
              </button>
            ))}

          {!loading && tickets.length === 0 && (
            <div className="empty-state">
              <strong>Nenhum chamado encontrado</strong>
              <p>Ajuste os filtros ou crie um novo chamado.</p>
            </div>
          )}
        </div>

        <div className="pagination">
          <span>
            Página {page + 1} de {totalPages}
          </span>
          <div className="pagination-controls">
            <button
              className="secondary small"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <button
              className="secondary small"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </main>
    </>
  );
}


