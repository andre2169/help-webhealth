import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminListTicketEventSummaries,
  getTicketTimeline,
} from "../../api/api";
import Icon from "../../components/Icon";
import StatusBadge from "../../components/StatusBadge";
import Topbar from "../../components/Topbar";
import { formatApiDateTime } from "../../utils/dateTime";
import { formatTicketCode } from "../../utils/ticketCode";

const EVENT_LABELS = {
  CREATED: "Chamado criado",
  REOPENED: "Chamado reaberto",
  COMMENTED: "Comentário adicionado",
  ASSIGNED: "Chamado atribuído",
  RESOLVED: "Chamado resolvido",
  CLOSED: "Chamado encerrado",
  RECOVERED: "Chamado recuperado",
};

const STATUS_LABELS = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
  reopened: "Reaberto",
};

const PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const PAGE_SIZE = 12;

function formatTransition(item) {
  if (!item.from_status || !item.to_status) return "Registro inicial";
  return `${STATUS_LABELS[item.from_status] || item.from_status} -> ${STATUS_LABELS[item.to_status] || item.to_status}`;
}

function eventLabel(item) {
  if (item.type === "comment") return "Comentário adicionado";
  return EVENT_LABELS[item.event_type] || "Atualização do chamado";
}

function isAbortError(error) {
  return error?.name === "AbortError";
}

export default function AdminNotificationEvents() {
  const [tickets, setTickets] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const timelineRequestRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await adminListTicketEventSummaries({
          search: appliedSearch,
          skip: page * PAGE_SIZE,
          limit: PAGE_SIZE,
          signal: controller.signal,
        });
        if (!active) return;
        setTickets(Array.isArray(data?.items) ? data.items : []);
        setHasMore(Boolean(data?.has_more));
      } catch (err) {
        if (active && !isAbortError(err)) {
          setError(err.message || "Não foi possível carregar os chamados.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [appliedSearch, page, reloadKey]);

  useEffect(() => {
    if (!selectedTicket) return undefined;

    function closeWithEscape(event) {
      if (event.key === "Escape") setSelectedTicket(null);
    }

    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [selectedTicket]);

  async function openTicket(ticket) {
    const requestId = timelineRequestRef.current + 1;
    timelineRequestRef.current = requestId;
    setSelectedTicket(ticket);
    setTimeline([]);
    setTimelineError("");
    setTimelineLoading(true);
    try {
      const items = await getTicketTimeline(ticket.ticket_id);
      if (requestId !== timelineRequestRef.current) return;
      setTimeline(Array.isArray(items) ? items : []);
    } catch (err) {
      if (requestId !== timelineRequestRef.current) return;
      setTimelineError(err.message || "Não foi possível carregar o histórico.");
    } finally {
      if (requestId === timelineRequestRef.current) setTimelineLoading(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setPage(0);
    setAppliedSearch(nextSearch);
    setReloadKey((value) => value + 1);
  }

  function clearSearch() {
    setSearchInput("");
    setPage(0);
    setAppliedSearch("");
    setReloadKey((value) => value + 1);
  }

  const hasPreviousPage = page > 0;

  return (
    <>
      <Topbar title="Administração" subtitle="Acompanhamento dos eventos dos chamados" />
      <main className="main admin-events-page">
        <div className="page-title">
          <div>
            <h2>
              <Icon name="activity" />
              Eventos dos chamados
            </h2>
            <p>{tickets.length}{hasMore ? "+" : ""} chamado{tickets.length === 1 ? "" : "s"} exibido{tickets.length === 1 ? "" : "s"} nesta página</p>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            <Icon name="refresh" />
            Atualizar
          </button>
        </div>

        <form className="admin-events-search" onSubmit={submitSearch}>
          <Icon name="search" className="admin-events-search-icon" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value.slice(0, 80))}
            placeholder="Pesquisar por código, título ou palavra-chave"
            maxLength={80}
            autoComplete="off"
            aria-label="Pesquisar chamados nos eventos"
          />
          {searchInput && (
            <button
              type="button"
              className="admin-events-search-clear"
              onClick={clearSearch}
              aria-label="Limpar pesquisa"
            >
              <Icon name="x" size={16} />
            </button>
          )}
          <button type="submit" className="secondary small" disabled={loading}>
            <Icon name="search" size={16} />
            Pesquisar
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="admin-event-list" aria-live="polite">
          <div className="admin-event-list-head">
            <span>Chamado</span>
            <span>Responsáveis</span>
            <span>Último evento</span>
            <span>Status</span>
            <span aria-hidden="true" />
          </div>

          {loading && <p className="loading-line admin-event-loading">Carregando chamados...</p>}

          {!loading && tickets.map((ticket) => (
            <button
              type="button"
              className="admin-event-ticket-row"
              key={ticket.ticket_id}
              onClick={() => openTicket(ticket)}
            >
              <span className="admin-event-ticket-main">
                <strong>{formatTicketCode(ticket.ticket_id)}</strong>
                <span>{ticket.title}</span>
                <small>{ticket.sector} · {ticket.category} · {ticket.event_count} evento{ticket.event_count === 1 ? "" : "s"}</small>
              </span>
              <span className="admin-event-responsibles">
                <small>Solicitante: {ticket.owner_name || "Não informado"}</small>
                <small>Técnico: {ticket.technician_name || "Fila aberta"}</small>
              </span>
              <span className="admin-event-last">
                <strong>{ticket.last_event ? eventLabel(ticket.last_event) : "Sem evento"}</strong>
                <small>{formatApiDateTime(ticket.last_event?.created_at || ticket.updated_at || ticket.created_at)}</small>
              </span>
              <span><StatusBadge status={ticket.status} /></span>
              <span className="admin-event-row-arrow" aria-hidden="true">
                <Icon name="chevronRight" />
              </span>
            </button>
          ))}

          {!loading && !tickets.length && (
            <div className="empty-state">
              <strong>{appliedSearch ? "Nenhum chamado corresponde à pesquisa" : "Nenhum chamado com eventos encontrado"}</strong>
              {appliedSearch && <span>Revise o código ou o texto pesquisado.</span>}
            </div>
          )}
        </div>

        {(tickets.length > 0 || page > 0) && (
          <div className="admin-events-pagination">
            <span>Página {page + 1}{hasMore ? " — há mais resultados" : ""}</span>
            <div>
              <button
                type="button"
                className="secondary small icon-only"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={!hasPreviousPage || loading}
                aria-label="Página anterior"
              >
                <Icon name="chevronLeft" />
              </button>
              <button
                type="button"
                className="secondary small icon-only"
                onClick={() => setPage((value) => value + 1)}
                disabled={!hasMore || loading}
                aria-label="Próxima página"
              >
                <Icon name="chevronRight" />
              </button>
            </div>
          </div>
        )}
      </main>

      {selectedTicket && (
        <div
          className="admin-event-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedTicket(null);
          }}
        >
          <section className="admin-event-modal" role="dialog" aria-modal="true" aria-labelledby="admin-event-modal-title">
            <header className="admin-event-modal-header">
              <div>
                <span className="admin-event-modal-code">{formatTicketCode(selectedTicket.ticket_id)}</span>
                <h3 id="admin-event-modal-title">{selectedTicket.title}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedTicket(null)} aria-label="Fechar detalhes">
                <Icon name="x" />
              </button>
            </header>

            <div className="admin-event-modal-summary">
              <div><small>Status</small><StatusBadge status={selectedTicket.status} /></div>
              <div><small>Prioridade</small><strong>{PRIORITY_LABELS[selectedTicket.priority] || selectedTicket.priority}</strong></div>
              <div><small>Setor</small><strong>{selectedTicket.sector}</strong></div>
              <div><small>Categoria</small><strong>{selectedTicket.category}</strong></div>
              <div><small>Solicitante</small><strong>{selectedTicket.owner_name || "Não informado"}</strong></div>
              <div><small>Técnico</small><strong>{selectedTicket.technician_name || "Fila aberta"}</strong></div>
            </div>

            <div className="admin-event-modal-body">
              <div className="admin-event-modal-title-row">
                <h4><Icon name="activity" /> Linha do tempo</h4>
                <span>{selectedTicket.event_count} evento{selectedTicket.event_count === 1 ? "" : "s"}</span>
              </div>

              {timelineLoading && <p className="loading-line">Carregando histórico...</p>}
              {timelineError && <p className="error">{timelineError}</p>}
              {!timelineLoading && !timelineError && !timeline.length && (
                <p className="loading-line">Sem eventos registrados ainda.</p>
              )}
              {!timelineLoading && !timelineError && timeline.length > 0 && (
                <div className="admin-event-timeline">
                  {timeline.map((item) => (
                    <article className="admin-event-timeline-item" key={`${item.type}-${item.id}`}>
                      <span className="admin-event-timeline-marker">
                        <Icon name={item.type === "comment" ? "message" : "activity"} size={15} />
                      </span>
                      <div>
                        <div className="admin-event-timeline-head">
                          <strong>{eventLabel(item)}</strong>
                          <time>{formatApiDateTime(item.created_at)}</time>
                        </div>
                        {item.type === "comment" ? (
                          <p>{item.content}</p>
                        ) : (
                          <p>
                            {item.author?.name || "Sistema"}
                            {item.from_status || item.to_status ? ` · ${formatTransition(item)}` : ""}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <footer className="admin-event-modal-footer">
              <span>Criado em {formatApiDateTime(selectedTicket.created_at)}</span>
              <Link className="secondary small" to={`/tickets/${selectedTicket.ticket_id}`} onClick={() => setSelectedTicket(null)}>
                <Icon name="ticket" size={16} />
                Abrir chamado
              </Link>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
