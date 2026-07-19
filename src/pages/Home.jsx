import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary, getTickets } from "../api/api";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { formatTicketCode } from "../utils/ticketCode";

const ROLE_LABELS = {
  user: "Solicitante",
  technician: "Técnico",
  admin: "Administrador",
};

function firstName(name = "") {
  return name.trim().split(/\s+/)[0] || "bem-vindo";
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isSupportRole = user?.role === "technician" || user?.role === "admin";

  useEffect(() => {
    let active = true;

    async function loadHome() {
      setLoading(true);
      setError("");

      try {
        const ticketsResult = await getTickets({ limit: 5 });
        let summaryResult = null;

        if (isSupportRole) {
          summaryResult = await getDashboardSummary();
        }

        if (!active) return;
        setTickets(ticketsResult.items || []);
        setTotalTickets(ticketsResult.total || 0);
        setSummary(summaryResult);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHome();

    return () => {
      active = false;
    };
  }, [isSupportRole]);

  const quickActions = useMemo(() => {
    if (isSupportRole) {
      return [
        {
          icon: "headset",
          title: "Atendimento",
          text: "Fila aberta e chamados em andamento.",
          to: "/atendimento",
        },
        {
          icon: "dashboard",
          title: "Dashboard",
          text: "Indicadores operacionais do suporte.",
          to: "/dashboard",
        },
        {
          icon: "reports",
          title: "Relatórios",
          text: "Filtros por período, setor e prioridade.",
          to: "/relatorios",
        },
        {
          icon: "plus",
          title: "Novo chamado",
          text: "Registrar uma solicitação técnica.",
          to: "/tickets/novo",
        },
      ];
    }

    return [
      {
        icon: "plus",
        title: "Novo chamado",
        text: "Registrar uma falha ou solicitação de TI.",
        to: "/tickets/novo",
      },
      {
        icon: "ticket",
        title: "Meus chamados",
        text: "Acompanhar retornos e encerramentos.",
        to: "/tickets",
      },
      {
        icon: "user",
        title: "Meu perfil",
        text: "Atualizar contato, setor e unidade.",
        to: "/perfil",
      },
    ];
  }, [isSupportRole]);

  return (
    <>
      <Topbar title="Início" subtitle="HelpWeb Health" />
      <main className="main home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-eyebrow">{ROLE_LABELS[user?.role] || "Acesso"}</span>
            <h2>Olá, {firstName(user?.name)}</h2>
            <p>
              Central de chamados de TI para unidades de saúde, com registro simples,
              acompanhamento por status e apoio à equipe técnica.
            </p>
          </div>
          <div className="home-hero-actions">
            <button onClick={() => navigate("/tickets/novo")}>
              <Icon name="plus" />
              Novo chamado
            </button>
            <button className="secondary" onClick={() => navigate("/tickets")}>
              <Icon name="ticket" />
              Ver chamados
            </button>
          </div>
        </section>

        {error && <p className="error">{error}</p>}
        {loading && <p className="loading-line">Carregando início…</p>}

        {!loading && (
          <>
            <div className="home-stat-grid">
              <div className="summary-card home-stat-card">
                <div className="summary-card-head">
                  <Icon name="ticket" />
                  <span>{isSupportRole ? "chamados visíveis" : "meus chamados"}</span>
                </div>
                <strong>{summary?.total ?? totalTickets}</strong>
              </div>
              {isSupportRole ? (
                <>
                  <div className="summary-card home-stat-card">
                    <div className="summary-card-head">
                      <Icon name="headset" />
                      <span>fila aberta</span>
                    </div>
                    <strong>{summary?.technician_queue?.length || 0}</strong>
                  </div>
                  <div className="summary-card home-stat-card">
                    <div className="summary-card-head">
                      <Icon name="activity" />
                      <span>minha fila</span>
                    </div>
                    <strong>{summary?.my_active_tickets?.length || 0}</strong>
                  </div>
                  <div className="summary-card home-stat-card">
                    <div className="summary-card-head">
                      <Icon name="alert" />
                      <span>SLA vencido</span>
                    </div>
                    <strong>{summary?.sla?.overdue || 0}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="summary-card home-stat-card">
                    <div className="summary-card-head">
                      <Icon name="clock" />
                      <span>recentes</span>
                    </div>
                    <strong>{tickets.length}</strong>
                  </div>
                  <div className="summary-card home-stat-card">
                    <div className="summary-card-head">
                      <Icon name="shield" />
                      <span>perfil</span>
                    </div>
                    <strong>{user?.unit_name ? "OK" : "-"}</strong>
                  </div>
                </>
              )}
            </div>

            <div className="home-action-grid">
              {quickActions.map((action) => (
                <button
                  type="button"
                  className="home-action-card"
                  key={action.to}
                  onClick={() => navigate(action.to)}
                >
                  <span className="home-action-icon">
                    <Icon name={action.icon} />
                  </span>
                  <span>
                    <strong>{action.title}</strong>
                    <small>{action.text}</small>
                  </span>
                </button>
              ))}
              {user?.role === "admin" && (
                <button
                  type="button"
                  className="home-action-card"
                  onClick={() => navigate("/admin/usuarios")}
                >
                  <span className="home-action-icon">
                    <Icon name="users" />
                  </span>
                  <span>
                    <strong>Usuários</strong>
                    <small>Perfis, funções e permissões.</small>
                  </span>
                </button>
              )}
            </div>

            <div className="dashboard-grid home-dashboard-grid">
              <section className="panel">
                <h3>
                  <Icon name="clock" />
                  Chamados recentes
                </h3>
                <div className="compact-list">
                  {tickets.map((ticket) => (
                    <button key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)}>
                      <span className="compact-ticket-title">
                        <span className="ticket-code">{formatTicketCode(ticket.id)}</span>
                        <span>{ticket.title}</span>
                      </span>
                      <StatusBadge status={ticket.status} />
                    </button>
                  ))}
                  {tickets.length === 0 && (
                    <p className="loading-line">Nenhum chamado encontrado.</p>
                  )}
                </div>
              </section>

              <section className="panel home-guidance-panel">
                <h3>
                  <Icon name="shield" />
                  Antes de registrar
                </h3>
                <div className="home-guidance-list">
                  <span>Informe setor, equipamento e impacto no atendimento.</span>
                  <span>Anexe foto quando ela ajudar a identificar o problema.</span>
                  <span>Não inclua nome, documento ou dado clínico de paciente.</span>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}
