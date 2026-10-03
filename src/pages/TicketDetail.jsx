import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  assignTicket,
  adminRestoreDeletedTicket,
  closeTicket,
  cancelTicket,
  createComment,
  deleteTicket,
  getTicketById,
  getDeletedTicketById,
  getDeletedTicketTimeline,
  getTicketTimeline,
  reopenTicket,
  resolveTicket,
} from "../api/api";
import Icon from "../components/Icon";
import ImageLightbox from "../components/ImageLightbox";
import StatusBadge from "../components/StatusBadge";
import SlaCountdown from "../components/SlaCountdown";
import Topbar from "../components/Topbar";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";
import { formatApiDateTime } from "../utils/dateTime";
import { formatTicketCode } from "../utils/ticketCode";
import { validateLongText } from "../utils/validation";

const EVENT_LABELS = {
  CREATED: "Chamado criado",
  ASSIGNED: "Técnico assumiu o chamado",
  RESOLVED: "Chamado marcado como resolvido",
  CLOSED: "Chamado fechado",
  REOPENED: "Chamado reaberto",
  CANCELLED: "Chamado cancelado pelo solicitante",
  RECOVERED: "Chamado recuperado pelo administrador",
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

const STATUS_LABELS = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
  reopened: "Reaberto",
  cancelled: "Cancelado",
};

const ROLE_LABELS = {
  user: "Usuário",
  technician: "Técnico",
  admin: "Administrador",
};

const COMMENT_LIMIT = 250;

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isArchived = searchParams.get("deleted") === "1";

  const [ticket, setTicket] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [viewerIndex, setViewerIndex] = useState(null);
  const actionBusy = useRef(false);

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const items = isArchived
        ? await getDeletedTicketTimeline(id)
        : await getTicketTimeline(id);
      setTimeline(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setTimelineLoading(false);
    }
  }, [id, isArchived]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setTicket(null);
    setTimeline([]);

    const getTicket = isArchived ? getDeletedTicketById : getTicketById;
    getTicket(id)
      .then((found) => {
        if (!active) return;
        if (found) setTicket(found);
        else setError("Chamado não encontrado ou sem permissão de acesso.");
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, isArchived]);

  useEffect(() => {
    if (!ticket) return;
    loadTimeline();
  }, [loadTimeline, ticket]);

  async function runAction(action) {
    if (actionBusy.current) return;
    actionBusy.current = true;
    setActionError("");
    setActionLoading(true);
    try {
      const updated = await action();
      setTicket(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message);
    } finally {
      actionBusy.current = false;
      setActionLoading(false);
    }
  }

  async function handleComment(event) {
    event.preventDefault();
    setCommentError("");

    let cleanedComment;
    try {
      cleanedComment = validateLongText(comment, "Comentário", {
        required: true,
        maxLength: COMMENT_LIMIT,
      });
    } catch (err) {
      setCommentError(err.message);
      return;
    }

    setPostingComment(true);
    try {
      await createComment(id, cleanedComment);
      setComment("");
      await loadTimeline();
    } catch (err) {
      setCommentError(err.message);
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteTicket() {
    if (actionBusy.current) return;
    const confirmed = window.confirm(
      "Enviar este chamado para Excluídos? O histórico e os comentários serão preservados, e um administrador poderá recuperá-lo depois."
    );
    if (!confirmed) return;

    actionBusy.current = true;
    setActionError("");
    setActionLoading(true);
    try {
      await deleteTicket(ticket.id);
      navigate(`/tickets?status=deleted&search=${encodeURIComponent(formatTicketCode(ticket.id))}`, {
        replace: true,
        state: { notice: `${formatTicketCode(ticket.id)} foi movido para Excluídos.` },
      });
    } catch (err) {
      setActionError(err.message);
    } finally {
      actionBusy.current = false;
      setActionLoading(false);
    }
  }

  async function handleRestoreArchivedTicket() {
    if (!ticket || actionBusy.current || user?.role !== "admin") return;
    const restoredStatus = ticket.status === "cancelled" ? "open" : ticket.status;
    const confirmed = window.confirm(
      `Recuperar ${formatTicketCode(ticket.id)}? O chamado voltará com o status ${STATUS_LABELS[restoredStatus] || restoredStatus}.`
    );
    if (!confirmed) return;

    actionBusy.current = true;
    setActionError("");
    setActionLoading(true);
    try {
      await adminRestoreDeletedTicket(ticket.id);
      navigate(`/tickets?search=${encodeURIComponent(formatTicketCode(ticket.id))}`, {
        replace: true,
        state: { notice: `${formatTicketCode(ticket.id)} foi recuperado como ${STATUS_LABELS[restoredStatus] || restoredStatus}.` },
      });
    } catch (err) {
      setActionError(err.message);
    } finally {
      actionBusy.current = false;
      setActionLoading(false);
    }
  }

  async function handleCancelTicket() {
    if (actionBusy.current || !ticket?.can_cancel) return;
    if (!window.confirm("Cancelar este chamado? Ele sairá da fila e dos indicadores. O histórico será preservado e apenas o administrador poderá recuperá-lo.")) return;
    actionBusy.current = true;
    setActionLoading(true);
    setActionError("");
    try {
      await cancelTicket(ticket.id);
      navigate("/tickets", {
        replace: true,
        state: { notice: `${formatTicketCode(ticket.id)} foi cancelado e retirado da fila.` },
      });
    } catch (err) {
      setActionError(err.message);
      // Refresh eligibility if assignment won the race with cancellation.
      try {
        setTicket(await getTicketById(ticket.id));
      } catch {
        setTicket((current) => ({ ...current, can_cancel: false }));
      }
    } finally {
      actionBusy.current = false;
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Chamado" />
        <main className="main">
          <p className="loading-line">Carregando chamado...</p>
        </main>
      </>
    );
  }

  if (!ticket) {
    return (
      <>
        <Topbar title="Chamado" />
        <main className="main">
          <p className="error">{error || "Chamado não encontrado."}</p>
          <button className="secondary" onClick={() => navigate(location.state?.returnTo || (isArchived ? "/tickets?status=deleted" : "/tickets"))}>
            <Icon name="arrowLeft" />
            Voltar para chamados
          </button>
        </main>
      </>
    );
  }

  const role = user?.role;
  const ticketsHref = location.state?.returnTo || (isArchived ? "/tickets?status=deleted" : "/tickets");
  const isOwner = ticket.user_id === user?.id;
  const isAssignedTechnician = ticket.technician_id === user?.id;

  const canAssign =
    !isArchived && (role === "technician" || role === "admin") &&
    ["open", "reopened"].includes(ticket.status);
  const canResolve =
    !isArchived && (role === "technician" || role === "admin") &&
    ticket.status === "in_progress" &&
    (role === "admin" || isAssignedTechnician);
  const canClose = !isArchived && ticket.status === "resolved" && (isOwner || role === "admin");
  const canReopen =
    !isArchived && ["resolved", "closed"].includes(ticket.status) && role === "admin";
  const canDelete = !isArchived && role === "admin";
  const canCancel = !isArchived && isOwner && ticket.can_cancel === true;
  const isCancelled = ticket.status === "cancelled";
  const issueImages =
    Array.isArray(ticket.issue_images) && ticket.issue_images.length > 0
      ? ticket.issue_images
      : ticket.issue_image
        ? [ticket.issue_image]
        : [];

  return (
    <>
      <Topbar
        title={formatTicketCode(ticket.id)}
        subtitle={isArchived ? `${ticket.title} · ${isCancelled ? "Cancelado" : "Excluído"}` : ticket.title}
      />
      <main className="main">
        <button className="ghost" style={{ marginBottom: 12, padding: "4px 0" }} onClick={() => navigate(ticketsHref)}>
          <Icon name="arrowLeft" />
          Voltar para chamados
        </button>

        {notice && (
          <div className="success ticket-notice">
            <span>{notice}</span>
            <button type="button" className="ghost small" onClick={() => setNotice("")}>
              Fechar
            </button>
          </div>
        )}

        <div className="detail-header">
          <div className="detail-badges">
            <span className="ticket-code">{formatTicketCode(ticket.id)}</span>
            <StatusBadge status={ticket.status} />
            {!isArchived && <SlaCountdown ticket={ticket} />}
          </div>
          <h2 className="detail-title">{ticket.title}</h2>
        </div>

        {isArchived && (
          <section className="ticket-archived-detail-notice" role="status">
            <div>
              <strong><Icon name="trash" size={17} /> Chamado {isCancelled ? "cancelado" : "excluído"}</strong>
              <span>
                {isCancelled ? "Cancelado" : "Excluído"} em {formatApiDateTime(ticket.deleted_at)}
                {ticket.deleted_by_name ? ` por ${ticket.deleted_by_name}` : ""}. Esta ficha está em modo somente leitura.
              </span>
              {actionError && <p className="error">{actionError}</p>}
            </div>
            {user?.role === "admin" && (
              <button type="button" className="primary small" onClick={handleRestoreArchivedTicket} disabled={actionLoading}>
                <Icon name="refresh" size={16} />
                {actionLoading ? "Recuperando..." : "Recuperar chamado"}
              </button>
            )}
          </section>
        )}
        {!isArchived && actionError && <p className="error" role="alert">{actionError}</p>}

        <div className="health-context-strip">
          <div>
            <span>Setor</span>
            <strong>{ticket.sector || "Não informado"}</strong>
          </div>
          <div>
            <span>Equipamento</span>
            <strong>{ticket.equipment || "Não informado"}</strong>
          </div>
          <div>
            <span>Impacto</span>
            <strong>{IMPACT_LABELS[ticket.operational_impact] || "Médio"}</strong>
          </div>
          <div>
            <span>Prazo SLA</span>
            <strong>{ticket.sla_hours || 24}h</strong>
          </div>
        </div>

        <div className="detail-layout">
          <div>
            <div className="detail-description">{ticket.description}</div>

            {issueImages.length > 0 && (
              <div className="side-panel ticket-issue-image-panel">
                <h4>
                  <Icon name="camera" />
                  Fotos do problema
                </h4>
                <div className="ticket-issue-image-grid">
                  {issueImages.map((image, index) => (
                    <figure className="ticket-issue-image" key={`${image.slice(0, 32)}-${index}`}>
                      <button
                        type="button"
                        className="image-thumb-button"
                        onClick={() => setViewerIndex(index)}
                        aria-label={`Ampliar foto ${index + 1}`}
                      >
                        <img src={image} alt={`Foto anexada ao chamado ${index + 1}`} />
                        <span>Ampliar</span>
                      </button>
                      <figcaption>Imagem {index + 1}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}

            <div className="side-panel timeline-panel">
              <h4>
                <Icon name="message" />
                Histórico e comentários
              </h4>

              {timelineLoading && <p className="loading-line">Carregando histórico...</p>}

              {!timelineLoading && (
                <div className="timeline" tabIndex={0} role="region" aria-label="Histórico e comentários do chamado">
                  {timeline.map((item) => {
                    const author = item.author || {};
                    const authorName = author.name || "Sistema";
                    const authorRole = ROLE_LABELS[author.role] || author.role || "sistema";

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`timeline-item${item.type === "comment" ? " is-comment" : ` event-kind-${String(item.event_type || "").toLowerCase()}`}`}
                      >
                        <UserAvatar user={author} name={authorName} size={36} className="timeline-avatar" />
                        <div className="timeline-card">
                          <div className="timeline-head">
                            <strong>
                              {item.type === "comment"
                                ? `${authorName} comentou`
                                : EVENT_LABELS[item.event_type] || item.event_type}
                            </strong>
                            <time>{formatApiDateTime(item.created_at)}</time>
                          </div>
                          {item.type === "event" ? (
                            <div className="timeline-body">
                              por {authorName} ({authorRole})
                            </div>
                          ) : (
                            <div className="timeline-body">{item.content}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {timeline.length === 0 && (
                    <p className="loading-line">Sem eventos registrados ainda.</p>
                  )}
                </div>
              )}

              {!isArchived && <form className="comment-form" onSubmit={handleComment}>
                <div className="comment-composer">
                  <UserAvatar user={user} size={38} className="comment-avatar" />
                  <div className="comment-composer-body">
                    <label htmlFor="ticket-comment">Adicionar comentário</label>
                    <textarea
                      id="ticket-comment"
                      className="comment-input"
                      aria-describedby={`ticket-comment-counter${commentError ? " ticket-comment-error" : ""}`}
                      aria-invalid={Boolean(commentError)}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Escreva uma atualização ou pergunta sobre o chamado"
                      rows="3"
                      maxLength={COMMENT_LIMIT}
                    />
                    <p id="ticket-comment-counter" className={comment.length >= COMMENT_LIMIT * 0.9 ? "field-counter is-warning" : "field-counter"}>
                      {comment.length}/{COMMENT_LIMIT}
                    </p>
                    {commentError && <p id="ticket-comment-error" className="error" role="alert">{commentError}</p>}
                    <button
                      type="submit"
                      className="secondary"
                      disabled={postingComment || !comment.trim()}
                      style={{ alignSelf: "flex-start" }}
                    >
                      <Icon name="message" />
                      {postingComment ? "Enviando..." : "Comentar"}
                    </button>
                  </div>
                </div>
              </form>}
            </div>
          </div>

          <div>
            <div className="side-panel">
              <h4>
                <Icon name="list" />
                Detalhes
              </h4>
              <div className="meta-row">
                <span>Aberto por</span>
                <span>{ticket.owner_name || (isOwner ? "Você" : "Solicitante cadastrado")}</span>
              </div>
              <div className="meta-row">
                <span>Técnico</span>
                <span>{ticket.technician_name || (ticket.technician_id ? "Equipe técnica" : "Não atribuído")}</span>
              </div>
              <div className="meta-row">
                <span>Categoria</span>
                <span>{ticket.category || "Geral"}</span>
              </div>
              <div className="meta-row">
                <span>Setor</span>
                <span>{ticket.sector || "Não informado"}</span>
              </div>
              <div className="meta-row">
                <span>Equipamento</span>
                <span>{ticket.equipment || "Não informado"}</span>
              </div>
              <div className="meta-row">
                <span>Patrimônio</span>
                <span>{ticket.asset_tag || "Não informado"}</span>
              </div>
              <div className="meta-row">
                <span>Impacto</span>
                <span>{IMPACT_LABELS[ticket.operational_impact] || "Médio"}</span>
              </div>
              <div className="meta-row">
                <span>Prioridade</span>
                <span>{PRIORITY_LABELS[ticket.priority] || ticket.priority || "Média"}</span>
              </div>
              <div className="meta-row">
                <span>Prazo SLA</span>
                <span>{formatApiDateTime(ticket.due_at)}</span>
              </div>
              <div className="meta-row">
                <span>Criado em</span>
                <span>{formatApiDateTime(ticket.created_at)}</span>
              </div>
              {ticket.resolved_at && (
                <div className="meta-row">
                  <span>Resolvido em</span>
                  <span>{formatApiDateTime(ticket.resolved_at)}</span>
                </div>
              )}
              {ticket.updated_at && (
                <div className="meta-row">
                  <span>Atualizado em</span>
                  <span>{formatApiDateTime(ticket.updated_at)}</span>
                </div>
              )}
            </div>

            {!isArchived && (canAssign || canResolve || canClose || canReopen || canDelete || canCancel) && (
              <div className="side-panel">
                <h4>
                  <Icon name="activity" />
                  Ações
                </h4>
                <div className="action-stack">
                  {canCancel && (
                    <button className="danger" disabled={actionLoading} onClick={handleCancelTicket}>
                      <Icon name="x" />
                      {actionLoading ? "Processando..." : "Cancelar chamado"}
                    </button>
                  )}
                  {canAssign && (
                    <button disabled={actionLoading} onClick={() => runAction(() => assignTicket(ticket.id))}>
                      <Icon name={ticket.status === "reopened" ? "refresh" : "play"} />
                      {ticket.status === "reopened" ? "Retomar chamado" : "Assumir chamado"}
                    </button>
                  )}
                  {canResolve && (
                    <button
                      className="accent"
                      disabled={actionLoading}
                      onClick={() => runAction(() => resolveTicket(ticket.id))}
                    >
                      <Icon name="check" />
                      Marcar como resolvido
                    </button>
                  )}
                  {canClose && (
                    <button disabled={actionLoading} onClick={() => runAction(() => closeTicket(ticket.id))}>
                      <Icon name="check" />
                      Fechar chamado
                    </button>
                  )}
                  {canReopen && (
                    <button
                      className="secondary"
                      disabled={actionLoading}
                      onClick={() => runAction(() => reopenTicket(ticket.id))}
                    >
                      <Icon name="refresh" />
                      Reabrir chamado
                    </button>
                  )}
                  {canDelete && (
                    <button className="danger" disabled={actionLoading} onClick={handleDeleteTicket}>
                      <Icon name="trash" />
                      Excluir chamado
                    </button>
                  )}
                </div>
                {canCancel && <p className="ticket-cancel-hint">Cancelamento disponível apenas antes do primeiro atendimento.</p>}
              </div>
            )}
          </div>
        </div>
      </main>

      {viewerIndex !== null && (
        <ImageLightbox
          images={issueImages.map((image, index) => ({
            src: image,
            name: `Foto do problema ${index + 1}`,
          }))}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}




