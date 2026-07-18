import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../api/api";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { formatTicketCode } from "../utils/ticketCode";

const STATUS_LABELS = {
  open: "Abertos",
  reopened: "Reabertos",
  in_progress: "Em andamento",
  resolved: "Resolvidos",
  closed: "Fechados",
};

const PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const IMPACT_LABELS = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

function entries(object = {}, labels = {}) {
  return Object.entries(object).map(([key, value]) => ({
    key,
    label: labels[key] || key,
    value,
  }));
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Topbar title="Dashboard" subtitle="Operação de TI em ambiente de saúde" />
      <main className="main">
        <div className="page-title">
          <div>
            <h2>Olá, {user?.name}</h2>
            <p>Acompanhe chamados por setor, impacto operacional e cumprimento de SLA.</p>
          </div>
          <button onClick={() => navigate("/tickets/novo")}>
            <Icon name="plus" />
            Novo chamado
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {loading && <p className="loading-line">Carregando dashboard…</p>}

        {data && (
          <>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-card-head">
                  <Icon name="ticket" />
                  <span>chamados visíveis</span>
                </div>
                <strong>{data.total}</strong>
              </div>
              <div className="summary-card">
                <div className="summary-card-head">
                  <Icon name="alert" />
                  <span>SLA vencido</span>
                </div>
                <strong>{data.sla?.overdue || 0}</strong>
              </div>
              <div className="summary-card">
                <div className="summary-card-head">
                  <Icon name="clock" />
                  <span>vence em 4h</span>
                </div>
                <strong>{data.sla?.due_soon || 0}</strong>
              </div>
              {entries(data.by_status, STATUS_LABELS).map((item) => (
                <div className="summary-card" key={item.key}>
                  <div className="summary-card-head">
                    <Icon name={item.key === "closed" || item.key === "resolved" ? "check" : "activity"} />
                    <span>{item.label}</span>
                  </div>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="dashboard-grid">
              <section className="panel">
                <h3>
                  <Icon name="alert" />
                  Impacto no atendimento
                </h3>
                <div className="metric-list">
                  {entries(data.by_operational_impact, IMPACT_LABELS).map((item) => (
                    <div className="metric-row" key={item.key}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <h3>
                  <Icon name="folder" />
                  Setores
                </h3>
                <div className="metric-list">
                  {entries(data.by_sector).map((item) => (
                    <div className="metric-row" key={item.key}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <h3>
                  <Icon name="alert" />
                  Prioridades
                </h3>
                <div className="metric-list">
                  {entries(data.by_priority, PRIORITY_LABELS).map((item) => (
                    <div className="metric-row" key={item.key}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <h3>
                  <Icon name="list" />
                  Categorias
                </h3>
                <div className="metric-list">
                  {entries(data.by_category).map((item) => (
                    <div className="metric-row" key={item.key}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="panel section-gap">
              <h3>
                <Icon name="clock" />
                Chamados recentes
              </h3>
              <div className="compact-list">
                {data.recent_tickets.map((ticket) => (
                  <button key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    <span className="compact-ticket-title"><span className="ticket-code">{formatTicketCode(ticket.id)}</span><span>{ticket.title}</span></span>
                    <StatusBadge status={ticket.status} />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}


