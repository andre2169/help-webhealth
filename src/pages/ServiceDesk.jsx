import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { assignTicket, getDashboardSummary, resolveTicket } from "../api/api";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
import Topbar from "../components/Topbar";
import { formatTicketCode } from "../utils/ticketCode";

export default function ServiceDesk() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      setData(await getDashboardSummary());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(ticketId, action) {
    setBusyId(ticketId);
    setError("");
    try {
      await action(ticketId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar title="Painel de atendimento" subtitle="Fila operacional para técnicos" />
      <main className="main">
        {error && <p className="error">{error}</p>}
        {!data && !error && <p className="loading-line">Carregando fila…</p>}

        {data && (
          <div className="dashboard-grid">
            <section className="panel">
              <h3>
                <Icon name="headset" />
                Fila aberta
              </h3>
              <div className="action-list">
                {data.technician_queue.map((ticket) => (
                  <div className="action-row" key={ticket.id}>
                    <button className="ghost" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                      <span className="ticket-action-title"><span className="ticket-code">{formatTicketCode(ticket.id)}</span><span>{ticket.title}</span></span>
                    </button>
                    <StatusBadge status={ticket.status} />
                    <button
                      className="small"
                      disabled={busyId === ticket.id}
                      onClick={() => run(ticket.id, assignTicket)}
                    >
                      <Icon name={ticket.status === "reopened" ? "refresh" : "play"} />
                      {ticket.status === "reopened" ? "Retomar" : "Assumir"}
                    </button>
                  </div>
                ))}
                {data.technician_queue.length === 0 && <p className="loading-line">Sem chamados aguardando atendimento.</p>}
              </div>
            </section>

            <section className="panel">
              <h3>
                <Icon name="activity" />
                Minha fila ativa
              </h3>
              <div className="action-list">
                {data.my_active_tickets.map((ticket) => (
                  <div className="action-row" key={ticket.id}>
                    <button className="ghost" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                      <span className="ticket-action-title"><span className="ticket-code">{formatTicketCode(ticket.id)}</span><span>{ticket.title}</span></span>
                    </button>
                    <StatusBadge status={ticket.status} />
                    <button
                      className="small accent"
                      disabled={busyId === ticket.id}
                      onClick={() => run(ticket.id, resolveTicket)}
                    >
                      <Icon name="check" />
                      Resolver
                    </button>
                  </div>
                ))}
                {data.my_active_tickets.length === 0 && <p className="loading-line">Nenhum chamado em andamento com você.</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}


