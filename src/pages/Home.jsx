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
  const isAdmin = user?.role === "admin";
  const needsEmailVerification = user && !user.email_verified;
  const welcomeText = isAdmin
    ? "Acompanhe a operação de TI, as prioridades da fila e os resultados da equipe."
    : isSupportRole
      ? "Organize seus atendimentos, acompanhe os prazos e assuma as próximas solicitações."
      : "Precisa de ajuda com TI? Abra uma solicitação e acompanhe aqui as respostas da equipe.";

  useEffect(() => {
    let active = true;

    async function loadHome() {
      setLoading(true);
      setError("");

      try {
        const ticketsResult = await getTickets({ limit: 5, includeTotal: true });
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
  }, [isSupportRole, user?.id]);

  const quickActions = useMemo(() => {
    if (isAdmin) {
      return [
        { icon: "dashboard", title: "Dashboard", text: "Visão geral da operação e dos prazos.", to: "/dashboard" },
        { icon: "headset", title: "Atendimento", text: "Acompanhar a fila de solicitações.", to: "/atendimento" },
        { icon: "reports", title: "Relatórios", text: "Resultados por período, setor e equipe.", to: "/relatorios" },
        { icon: "users", title: "Usuários", text: "Gerenciar contas e permissões.", to: "/admin/usuarios" },
      ];
    }
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
          text: isAdmin ? "Indicadores gerais da operação." : "Seus indicadores de atendimento.",
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
        icon: needsEmailVerification ? "shield" : "plus",
        title: needsEmailVerification ? "Confirmar email" : "Novo chamado",
        text: needsEmailVerification
          ? "Confirme sua conta antes de abrir chamados."
          : "Registrar uma falha ou solicitação de TI.",
        to: needsEmailVerification ? "/perfil" : "/tickets/novo",
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
  }, [isAdmin, isSupportRole, needsEmailVerification]);

  return (
    <>
      <Topbar title="Início" subtitle="HELP WEB HEALTH" />
      <main className="main home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-eyebrow">{ROLE_LABELS[user?.role] || "Acesso"}</span>
            <h2>Olá, {firstName(user?.name)}</h2>
            <p>{welcomeText}</p>
          </div>
          <div className="home-hero-actions">
            <button onClick={() => navigate(isAdmin ? "/dashboard" : isSupportRole ? "/atendimento" : needsEmailVerification ? "/perfil" : "/tickets/novo")}>
              <Icon name={isAdmin ? "dashboard" : isSupportRole ? "headset" : needsEmailVerification ? "shield" : "plus"} />
              {isAdmin ? "Visão da operação" : isSupportRole ? "Ir para atendimento" : needsEmailVerification ? "Confirmar email" : "Novo chamado"}
            </button>
            <button className="secondary" onClick={() => navigate("/tickets")}>
              <Icon name="ticket" />
              {isSupportRole ? "Ver chamados" : "Meus chamados"}
            </button>
          </div>
        </section>

        {error && <p className="error">{error}</p>}
        {loading && <p className="loading-line">Carregando início…</p>}

        {!loading && !error && (
          <>
            <div className="home-stat-grid">
              <div className="summary-card home-stat-card">
                <div className="summary-card-head">
                  <Icon name="ticket" />
                  <span>{isAdmin ? "chamados da operação" : isSupportRole ? "meus atendimentos" : "meus chamados"}</span>
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
                    <strong>{summary?.technician_queue_total ?? 0}</strong>
                  </div>
                  <div className="summary-card home-stat-card">
                    <div className="summary-card-head">
                      <Icon name="activity" />
                      <span>{isAdmin ? "em andamento" : "minha fila"}</span>
                    </div>
                    <strong>{isAdmin ? summary?.by_status?.in_progress ?? 0 : summary?.my_active_total ?? 0}</strong>
                  </div>
                  <div className="summary-card home-stat-card">
                    <div className="summary-card-head">
                      <Icon name="alert" />
                      <span>SLA vencido</span>
                    </div>
                    <strong>{summary?.sla?.overdue || 0}</strong>
                  </div>
                </>
              ) : null}
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
                  {isAdmin ? "Prioridades da operação" : isSupportRole ? "Foco no atendimento" : "Antes de registrar"}
                </h3>
                <div className="home-guidance-list">
                  {isSupportRole ? (
                    <>
                      <span>{isAdmin ? "Acompanhe chamados críticos e prazos vencidos." : "Priorize o impacto no atendimento e o prazo SLA."}</span>
                      <span>{isAdmin ? "Mantenha setores, categorias e permissões atualizados." : "Registre o diagnóstico e as ações no histórico do chamado."}</span>
                      <span>Preserve a privacidade: não registre dados de pacientes.</span>
                    </>
                  ) : (
                    <>
                      <span>Informe setor, equipamento e o que não está funcionando.</span>
                      <span>Anexe uma foto se ela ajudar a identificar o problema.</span>
                      <span>Não inclua nome, documento ou dado clínico de paciente.</span>
                    </>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}
