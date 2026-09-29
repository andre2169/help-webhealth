import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../api/api";
import Icon from "../components/Icon";
import CollapsiblePanel from "../components/CollapsiblePanel";
import DonutChart from "../components/DonutChart";
import MetricBarList from "../components/MetricBarList";
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

const KPI_STATUS_COLORS = {
  open: "#2ea7ed",
  reopened: "#ef6a76",
  in_progress: "#f0a34a",
  resolved: "#2fbf9f",
  closed: "#8a9db0",
};

function entries(object = {}, labels = {}) {
  return Object.entries(object).map(([key, value]) => ({
    key,
    label: labels[key] || key,
    value,
  }));
}

const goToTicketFilter = (navigate, parameter, value) => {
  if (!value || value === "Sem valor") return;
  navigate(`/tickets?${parameter}=${encodeURIComponent(value)}`);
};

function sumStatusValues(statuses = {}, keys = []) {
  return keys.reduce((total, key) => total + (Number(statuses[key]) || 0), 0);
}

function percentage(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const panelScope = String(user?.id ?? "session");
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
      <Topbar
        title={isAdmin ? "Dashboard geral" : "Meu dashboard"}
        subtitle={isAdmin ? "Visão geral da operação de TI" : "Seus atendimentos e a fila compartilhada"}
      />
      <main className="main">
        <div className="page-title">
          <div>
            <h2>Olá, {user?.name}</h2>
            <p>
              {isAdmin
                ? "Acompanhe todos os chamados, setores, impactos e cumprimento de SLA."
                : "Acompanhe seus atendimentos e consulte chamados disponíveis na fila."
              }
            </p>
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
            {(() => {
              const activeTotal = sumStatusValues(data.by_status, ["open", "reopened", "in_progress"]);
              const resolvedTotal = sumStatusValues(data.by_status, ["resolved", "closed"]);
              const slaResolved = Number(data.sla?.resolved_total) || 0;
              const slaWithin = Number(data.sla?.within_sla) || 0;
              const slaPercent = percentage(slaWithin, slaResolved);
              const statusItems = entries(data.by_status, STATUS_LABELS).filter((item) => item.value > 0);

              return (
                <>
                  <div className="dashboard-kpi-grid">
                    <article className="dashboard-kpi dashboard-kpi-primary">
                      <div className="dashboard-kpi-head"><span>Chamados visíveis</span><Icon name="ticket" /></div>
                      <strong className="dashboard-kpi-value">{data.total}</strong>
                      <div className="kpi-status-strip" aria-label="Composição dos chamados por status">
                        {statusItems.map((item) => (
                          <span
                            key={item.key}
                            style={{
                              width: `${Math.max(3, percentage(item.value, data.total))}%`,
                              backgroundColor: KPI_STATUS_COLORS[item.key] || "#8a9db0",
                            }}
                            title={`${item.label}: ${item.value}`}
                          />
                        ))}
                      </div>
                      <small>
                        {isAdmin
                          ? "Distribuição atual de toda a operação"
                          : "Distribuição dos chamados atribuídos a você"
                        }
                      </small>
                    </article>

                    <article className="dashboard-kpi dashboard-kpi-active">
                      <div className="dashboard-kpi-head"><span>Fila ativa</span><Icon name="activity" /></div>
                      <strong className="dashboard-kpi-value">{activeTotal}</strong>
                      <div className="kpi-meter" aria-hidden="true">
                        <span style={{ width: `${percentage(activeTotal, data.total)}%` }} />
                      </div>
                      <small>{percentage(activeTotal, data.total)}% dos chamados ainda exigem acompanhamento</small>
                    </article>

                    <article className="dashboard-kpi dashboard-kpi-alert">
                      <div className="dashboard-kpi-head"><span>SLA vencido</span><Icon name="alert" /></div>
                      <strong className="dashboard-kpi-value">{data.sla?.overdue || 0}</strong>
                      <div className="kpi-meter" aria-hidden="true">
                        <span style={{ width: `${percentage(data.sla?.overdue || 0, activeTotal)}%` }} />
                      </div>
                      <small>{data.sla?.due_soon || 0} chamado(s) vencem nas próximas 4 horas</small>
                    </article>

                    <article className="dashboard-kpi dashboard-kpi-success">
                      <div className="dashboard-kpi-head"><span>Concluídos</span><Icon name="check" /></div>
                      <strong className="dashboard-kpi-value">{resolvedTotal}</strong>
                      <div className="kpi-meter" aria-hidden="true">
                        <span style={{ width: `${percentage(resolvedTotal, data.total)}%` }} />
                      </div>
                      <small>{percentage(resolvedTotal, data.total)}% do total visível</small>
                    </article>
                  </div>

                  <div className="dashboard-kpi-summary" aria-label="Indicador de cumprimento de SLA">
                    {[
                      { key: "resolution-time", title: "Tempo médio de resolução", icon: "clock", value: data.sla?.avg_resolution_minutes ? `${Math.round(data.sla.avg_resolution_minutes / 60)}h` : "--" },
                      { key: "sla", title: "SLA cumprido", icon: "check", value: slaResolved ? `${slaPercent}%` : "--" },
                      { key: "attention", title: "Atenção necessária", icon: "alert", value: (data.sla?.overdue || 0) + (data.sla?.due_soon || 0) },
                    ].map((metric) => (
                      <div
                        key={metric.key}
                        className="dashboard-sla-metric"
                      >
                        <Icon name={metric.icon} />
                        <span>{metric.title}</span>
                        <strong>{metric.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            <div className="dashboard-chart-grid dashboard-chart-grid-modern">
              <CollapsiblePanel
                storageKey="dashboard.chart.status"
                scope={panelScope}
                title="Status dos chamados"
                className="panel dashboard-chart-panel dashboard-chart-panel-featured"
                heading={<h3><Icon name="activity" /> Status dos chamados</h3>}
              >
                <DonutChart
                  data={data.by_status}
                  labels={STATUS_LABELS}
                  title="Chamados por status"
                  onView={(value) => goToTicketFilter(navigate, "status", value)}
                />
              </CollapsiblePanel>

              <CollapsiblePanel
                storageKey="dashboard.chart.priority"
                scope={panelScope}
                title="Prioridade técnica"
                className="panel dashboard-chart-panel"
                heading={<h3><Icon name="trend" /> Prioridade técnica</h3>}
              >
                <DonutChart
                  data={data.by_priority}
                  labels={PRIORITY_LABELS}
                  title="Chamados por prioridade"
                  onView={(value) => goToTicketFilter(navigate, "priority", value)}
                />
              </CollapsiblePanel>

              <CollapsiblePanel
                storageKey="dashboard.chart.impact"
                scope={panelScope}
                title="Impacto no atendimento"
                className="panel dashboard-chart-panel"
                heading={<h3><Icon name="alert" /> Impacto no atendimento</h3>}
              >
                <DonutChart
                  data={data.by_operational_impact}
                  labels={IMPACT_LABELS}
                  title="Chamados por impacto"
                  onView={(value) => goToTicketFilter(navigate, "operational_impact", value)}
                />
              </CollapsiblePanel>
            </div>

            <div className="dashboard-grid dashboard-breakdown-grid">
              <CollapsiblePanel
                storageKey="dashboard.breakdown.sectors"
                scope={panelScope}
                title="Setores"
                className="panel"
                heading={<h3><Icon name="folder" /> Setores</h3>}
              >
                <MetricBarList data={data.by_sector} onSelect={(value) => goToTicketFilter(navigate, "sector", value)} />
              </CollapsiblePanel>

              <CollapsiblePanel
                storageKey="dashboard.breakdown.categories"
                scope={panelScope}
                title="Categorias"
                className="panel"
                heading={<h3><Icon name="list" /> Categorias</h3>}
              >
                <MetricBarList data={data.by_category} onSelect={(value) => goToTicketFilter(navigate, "category", value)} />
              </CollapsiblePanel>
            </div>

            <div className="dashboard-lower-grid section-gap">
              <CollapsiblePanel
                storageKey="dashboard.recent-tickets"
                scope={panelScope}
                title="Chamados recentes"
                className="panel"
                headerClassName="dashboard-section-heading"
                heading={(
                  <div>
                    <h3>
                      <Icon name="clock" />
                      Chamados recentes
                    </h3>
                    <p>Últimas solicitações registradas</p>
                  </div>
                )}
                actions={(
                  <button className="secondary small" onClick={() => navigate("/tickets")}>
                    Ver todos
                  </button>
                )}
              >
                <div className="compact-list">
                  {(data.recent_tickets || []).map((ticket) => (
                    <button key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)}>
                      <span className="compact-ticket-title"><span className="ticket-code">{formatTicketCode(ticket.id)}</span><span>{ticket.title}</span></span>
                      <StatusBadge status={ticket.status} />
                    </button>
                  ))}
                </div>
              </CollapsiblePanel>

              {user?.role !== "user" && (
                <CollapsiblePanel
                  storageKey="dashboard.technician-queue"
                  scope={panelScope}
                  title="Fila de atendimento"
                  className="panel"
                  headerClassName="dashboard-section-heading"
                  heading={(
                    <div>
                      <h3>
                        <Icon name="headset" />
                        Fila de atendimento
                      </h3>
                      <p>Chamados que aguardam acompanhamento</p>
                    </div>
                  )}
                  actions={(
                    <button className="secondary small" onClick={() => navigate("/atendimento")}>
                      Abrir fila
                    </button>
                  )}
                >
                  <div className="compact-list">
                    {(data.technician_queue || []).slice(0, 5).map((ticket) => (
                      <button key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        <span className="compact-ticket-title"><span className="ticket-code">{formatTicketCode(ticket.id)}</span><span>{ticket.title}</span></span>
                        <StatusBadge status={ticket.status} />
                      </button>
                    ))}
                    {!data.technician_queue?.length && <p className="dashboard-empty-line">A fila está em dia.</p>}
                  </div>
                </CollapsiblePanel>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}


