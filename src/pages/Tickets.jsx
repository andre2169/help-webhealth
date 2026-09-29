import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  adminRestoreDeletedTicket,
  getDeletedTicketById,
  getDeletedTickets,
  getTicketById,
  getTickets,
} from "../api/api";
import CollapsiblePanel from "../components/CollapsiblePanel";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { formatApiDate, formatApiDateTime } from "../utils/dateTime";
import { formatTicketCode } from "../utils/ticketCode";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
  { value: "reopened", label: "Reaberto" },
  { value: "deleted", label: "Excluído" },
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const panelScope = String(user?.id ?? "session");

  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || (searchParams.get("view") === "deleted" ? "deleted" : "");
  const initialPriority = searchParams.get("priority") || "";
  const initialImpact = searchParams.get("operational_impact") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialSector = searchParams.get("sector") || "";
  const [tickets, setTickets] = useState([]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch.trim());
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [categoryInput, setCategoryInput] = useState(initialCategory);
  const [category, setCategory] = useState(initialCategory.trim());
  const [sectorInput, setSectorInput] = useState(initialSector);
  const [sector, setSector] = useState(initialSector.trim());
  const [operationalImpact, setOperationalImpact] = useState(initialImpact);
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(location.state?.notice || "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCategory(categoryInput.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [categoryInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSector(sectorInput.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [sectorInput]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setTickets([]);

    const isDeletedView = status === "deleted";
    const filters = {
      search,
      status: isDeletedView ? "" : status,
      priority,
      category,
      sector,
      operationalImpact,
      direction,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      signal: controller.signal,
    };
    const loadTickets = isDeletedView
      ? getDeletedTickets(filters)
      : getTickets(filters);

    loadTickets
      .then((data) => {
        if (!active) return;
        setTickets((data.items || []).map((ticket) => ({
          ...ticket,
          id: ticket.id ?? ticket.ticket_id,
          is_deleted: isDeletedView,
        })));
        setTotal(Number.isFinite(data.total) ? data.total : null);
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
  }, [search, status, priority, category, sector, operationalImpact, direction, page, reloadKey]);

  useEffect(() => {
    if (!selectedTicket) {
      setTicketDetail(null);
      setDetailError("");
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    setDetailLoading(true);
    setDetailError("");
    setTicketDetail(null);

    const getTicket = selectedTicket.is_deleted ? getDeletedTicketById : getTicketById;
    getTicket(selectedTicket.id, { signal: controller.signal })
      .then((ticket) => active && setTicketDetail(ticket))
      .catch((err) => {
        if (active && err.name !== "AbortError") {
          setDetailError(err.message || "Não foi possível carregar os detalhes.");
        }
      })
      .finally(() => active && setDetailLoading(false));

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedTicket]);

  useEffect(() => {
    if (!selectedTicket) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape" && !restoring) setSelectedTicket(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedTicket, restoring]);

  const isDeletedView = status === "deleted";
  const openCount = isDeletedView ? null : tickets.filter((t) => t.status === "open").length;
  const hasFilters = Boolean(searchInput || status || priority || categoryInput || sectorInput || operationalImpact);
  const visibleTotal = total === null ? `${tickets.length}${hasMore ? "+" : ""}` : total;

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPriority("");
    setCategoryInput("");
    setCategory("");
    setSectorInput("");
    setSector("");
    setOperationalImpact("");
    setPage(0);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      ["search", "status", "priority", "category", "sector", "operational_impact", "view"].forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }

  function changeStatusFilter(nextStatus) {
    setStatus(nextStatus);
    setSelectedTicket(null);
    setPage(0);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("view");
      if (nextStatus) next.set("status", nextStatus);
      else next.delete("status");
      return next;
    }, { replace: true });
  }

  function viewFullTicket() {
    if (!ticketDetail) return;
    const ticketId = ticketDetail.id || ticketDetail.ticket_id || selectedTicket?.id;
    setSelectedTicket(null);
    navigate(
      `/tickets/${ticketId}${selectedTicket?.is_deleted ? "?deleted=1" : ""}`,
      { state: { returnTo: `${location.pathname}${location.search}` } }
    );
  }

  async function restoreTicket() {
    if (!ticketDetail || restoring || user?.role !== "admin") return;
    const confirmed = window.confirm(
      `Recuperar ${formatTicketCode(ticketDetail.id)}? Ele voltará com o status ${STATUS_OPTIONS.find((option) => option.value === ticketDetail.status)?.label || ticketDetail.status}.`
    );
    if (!confirmed) return;

    setRestoring(true);
    setDetailError("");
    try {
      await adminRestoreDeletedTicket(ticketDetail.id);
      setSelectedTicket(null);
      setNotice(`${formatTicketCode(ticketDetail.id)} foi recuperado com o status original.`);
      setReloadKey((value) => value + 1);
    } catch (err) {
      setDetailError(err.message || "Não foi possível recuperar o chamado.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <Topbar
        title={isDeletedView ? "Chamados excluídos" : user?.role === "user" ? "Meus chamados" : "Chamados"}
        subtitle={isDeletedView ? "Consulta de chamados arquivados" : "Acompanhe e gerencie as solicitações de suporte"}
      />

      <main className="main">
        <div className="page-title">
          <div>
            <h2>{isDeletedView ? "Chamados excluídos" : user?.role === "user" ? "Meus chamados" : "Todos os chamados"}</h2>
            <p>{visibleTotal} chamado{total === 1 ? "" : "s"} nesta página</p>
          </div>
          <button onClick={() => navigate("/tickets/novo")}>
            <Icon name="plus" />
            Novo chamado
          </button>
        </div>

        {notice && (
          <div className="ticket-archive-notice" role="status">
            <Icon name="check" size={16} />
            <span>{notice}</span>
            <button type="button" className="ghost small" onClick={() => setNotice("")} aria-label="Dispensar aviso">
              <Icon name="x" size={16} />
            </button>
          </div>
        )}

        {!isDeletedView && <div className="summary-grid">
          {[
            { key: "page-total", icon: "ticket", title: "Nesta página", value: tickets.length },
            { key: "page-open", icon: "activity", title: "Abertos nesta página", value: openCount },
            { key: "active-filter", icon: "filter", title: "Filtro atual", value: status ? STATUS_OPTIONS.find((item) => item.value === status)?.label : "Todos" },
          ].map((metric) => (
            <article
              key={metric.key}
              className="summary-card"
            >
              <div className="summary-card-head">
                <Icon name={metric.icon} />
                <span>{metric.title}</span>
              </div>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </div>}

        <CollapsiblePanel
          storageKey="tickets.filters"
          scope={panelScope}
          title="Filtros dos chamados"
          icon="filter"
          className="panel ticket-filters-panel"
        >
        <div className="filters ticket-filter-grid">
          <div>
            <label htmlFor="ticket-search">Pesquisar chamado</label>
            <div className="search-control">
              <input
                id="ticket-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.slice(0, 80))}
                placeholder="Código, título ou descrição"
                maxLength={80}
                autoComplete="off"
              />
              {searchInput && (
                <button type="button" className="search-clear" onClick={() => setSearchInput("")} aria-label="Limpar pesquisa">
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => changeStatusFilter(e.target.value)}
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
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value.slice(0, FILTER_LIMITS.category))}
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
              value={sectorInput}
              onChange={(e) => setSectorInput(e.target.value.slice(0, FILTER_LIMITS.sector))}
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

          <div className="filters-actions">
            <button type="button" className="secondary small" onClick={clearFilters} disabled={!hasFilters}>
              <Icon name="refresh" size={16} />
              Limpar filtros
            </button>
          </div>

          <div className="filter-summary" aria-live="polite">
            <Icon name="filter" size={15} />
            Exibindo {tickets.length} resultado{tickets.length === 1 ? "" : "s"}{hasMore ? " — há mais resultados" : ""}
          </div>
        </div>
        </CollapsiblePanel>

        {error && <p className="error">{error}</p>}

        <CollapsiblePanel
          storageKey="tickets.results"
          scope={panelScope}
          title={isDeletedView ? "Chamados excluídos" : "Chamados encontrados"}
          icon="ticket"
          subtitle={`${visibleTotal} resultado${total === 1 ? "" : "s"}`}
          className="ticket-results-panel"
        >
        <div className="ticket-table">
          <div className="table-head-row">
            <span>Código</span>
            <span>Chamado</span>
            <span>Status</span>
            <span>Responsável</span>
            <span>{isDeletedView ? "Excluído em" : "Aberto em"}</span>
          </div>

          {loading && <p className="loading-line" style={{ padding: "16px 18px" }}>Carregando chamados…</p>}

          {!loading &&
            tickets.map((ticket) => (
              <button
                key={ticket.id}
                className={`ticket-row${ticket.is_deleted ? " is-deleted" : ""}`}
                onClick={() => setSelectedTicket(ticket)}
                aria-haspopup="dialog"
              >
                <span className="ticket-row-id ticket-code">{formatTicketCode(ticket.id)}</span>
                <span className="ticket-row-main">
                  <strong>{ticket.title}</strong>
                  <span>
                    {ticket.sector || "Setor não informado"} · {ticket.equipment || ticket.category || "Infraestrutura"} · {ticket.priority || "Prioridade padrão"}
                  </span>
                </span>
                <span className="ticket-row-status">
                  <StatusBadge status={ticket.status} />
                  {ticket.is_deleted && <small className="ticket-deleted-label"><Icon name="trash" size={12} />Excluído</small>}
                </span>
                <span className="ticket-row-meta">
                  {ticket.technician_name || (ticket.technician_id ? "Equipe técnica" : "Não atribuído")}
                </span>
                <span className="ticket-row-date">
                  {ticket.is_deleted ? formatApiDateTime(ticket.deleted_at) : formatApiDate(ticket.created_at)}
                </span>
              </button>
            ))}

          {!loading && tickets.length === 0 && (
            <div className="empty-state">
              <strong>{isDeletedView ? "Nenhum chamado excluído encontrado" : "Nenhum chamado encontrado"}</strong>
              <p>{isDeletedView ? "Tente ajustar a pesquisa ou os filtros." : "Ajuste os filtros ou crie um novo chamado."}</p>
            </div>
          )}
        </div>
        </CollapsiblePanel>

        <div className="pagination">
          <span>
            Página {page + 1}{hasMore ? " — há mais resultados" : ""}
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
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </main>

      {selectedTicket && (
        <div className="admin-event-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !restoring) setSelectedTicket(null);
        }}>
          <section className="admin-event-modal ticket-deleted-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-preview-modal-title">
            <header className="admin-event-modal-header">
              <div>
                <span className="admin-event-modal-code">{formatTicketCode(ticketDetail?.id || selectedTicket.id)}</span>
                <h3 id="ticket-preview-modal-title">{ticketDetail?.title || selectedTicket.title}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedTicket(null)} disabled={restoring} aria-label="Fechar detalhes">
                <Icon name="x" />
              </button>
            </header>

            {detailLoading && <p className="loading-line ticket-deleted-modal-loading">Carregando detalhes...</p>}
            {detailError && <p className="error ticket-deleted-modal-error">{detailError}</p>}
            {ticketDetail && !detailLoading && (
              <>
                <div className="admin-event-modal-summary">
                  <div><small>{selectedTicket.is_deleted ? "Status ao excluir" : "Status"}</small><StatusBadge status={ticketDetail.status} /></div>
                  <div><small>Prioridade</small><strong>{PRIORITY_OPTIONS.find((option) => option.value === ticketDetail.priority)?.label || ticketDetail.priority}</strong></div>
                  <div><small>Setor</small><strong>{ticketDetail.sector || "Não informado"}</strong></div>
                  <div><small>Categoria</small><strong>{ticketDetail.category || "Não informada"}</strong></div>
                  <div><small>Solicitante</small><strong>{ticketDetail.owner_name || "Não informado"}</strong></div>
                  <div><small>Técnico</small><strong>{ticketDetail.technician_name || "Fila aberta"}</strong></div>
                </div>

                <div className="admin-event-modal-body ticket-deleted-modal-body">
                  {selectedTicket.is_deleted && (
                    <div className="ticket-deleted-warning" role="status">
                      <Icon name="trash" size={16} />
                      <span>Este chamado foi excluído e está em modo de consulta.</span>
                    </div>
                  )}
                  <div className="admin-event-modal-title-row">
                    <h4><Icon name="ticket" /> Informações do chamado</h4>
                    <span>{selectedTicket.is_deleted ? `Excluído em ${formatApiDateTime(ticketDetail.deleted_at)}` : `Criado em ${formatApiDateTime(ticketDetail.created_at)}`}</span>
                  </div>
                  <p className="ticket-deleted-modal-description">{ticketDetail.description}</p>
                  <dl className="ticket-deleted-modal-meta">
                    <div><dt>Criado em</dt><dd>{formatApiDateTime(ticketDetail.created_at)}</dd></div>
                    <div><dt>Equipamento</dt><dd>{ticketDetail.equipment || "Não informado"}</dd></div>
                    {ticketDetail.asset_tag && <div><dt>Patrimônio</dt><dd>{ticketDetail.asset_tag}</dd></div>}
                    {selectedTicket.is_deleted && <div><dt>Excluído por</dt><dd>{ticketDetail.deleted_by_name || "Administrador"}</dd></div>}
                  </dl>
                </div>

                <footer className="admin-event-modal-footer ticket-deleted-modal-actions">
                  <span>
                    {selectedTicket.is_deleted ? "Histórico e comentários preservados." : "Abra o chamado para consultar o histórico completo e as fotos."}
                    {selectedTicket.is_deleted && user?.role === "admin" && <> Voltará como {STATUS_OPTIONS.find((option) => option.value === ticketDetail.status)?.label || ticketDetail.status}.</>}
                  </span>
                  <div className="ticket-preview-actions">
                    <button type="button" className="secondary small" onClick={viewFullTicket}>
                      <Icon name="eye" size={16} />
                      Ver chamado
                    </button>
                    {selectedTicket.is_deleted && user?.role === "admin" && (
                      <button type="button" className="primary small" onClick={restoreTicket} disabled={restoring}>
                        <Icon name="refresh" size={16} />
                        {restoring ? "Recuperando..." : "Recuperar chamado"}
                      </button>
                    )}
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}


