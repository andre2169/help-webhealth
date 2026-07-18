import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  assignTicket,
  closeTicket,
  createComment,
  deleteTicket,
  getTicketById,
  getTicketTimeline,
  reopenTicket,
  resolveTicket,
} from "../api/api";
import Icon from "../components/Icon";
import StatusBadge from "../components/StatusBadge";
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
  const { user } = useAuth();

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

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const items = await getTicketTimeline(id);
      setTimeline(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setTimelineLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setTicket(null);
    setTimeline([]);

    getTicketById(id)
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
  }, [id]);

  useEffect(() => {
    if (!ticket) return;
    loadTimeline();
  }, [loadTimeline, ticket]);

  async function runAction(action) {
    setActionError("");
    setActionLoading(true);
    try {
      const updated = await action();
      setTicket(updated);
      await loadTimeline();
    } catch (err) {
      setActionError(err.message);
    } finally {
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
    const confirmed = window.confirm(
      "Excluir este chamado? Essa ação remove o histórico e comentários do ticket."
    );
    if (!confirmed) return;

    setActionError("");
    setActionLoading(true);
    try {
      await deleteTicket(ticket.id);
      navigate("/tickets", { replace: true });
    } catch (err) {
      setActionError(err.message);
    } finally {
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
          <button className="secondary" onClick={() => navigate("/tickets")}>
            <Icon name="arrowLeft" />
            Voltar para chamados
          </button>
        </main>
      </>
    );
  }

  const role = user?.role;
  const isOwner = ticket.user_id === user?.id;
  const isAssignedTechnician = ticket.technician_id === user?.id;

  const canAssign =
    (role === "technician" || role === "admin") &&
    ["open", "reopened"].includes(ticket.status);
  const canResolve =
    (role === "technician" || role === "admin") &&
    ticket.status === "in_progress" &&
    (role === "admin" || isAssignedTechnician);
  const canClose = ticket.status === "resolved" && (isOwner || role === "admin");
  const canReopen =
    ["resolved", "closed"].includes(ticket.status) && (isOwner || role === "admin");
  const canDelete = role === "admin";
  const issueImages =
    Array.isArray(ticket.issue_images) && ticket.issue_images.length > 0
      ? ticket.issue_images
      : ticket.issue_image
        ? [ticket.issue_image]
        : [];

  return (
    <>
      <Topbar title={formatTicketCode(ticket.id)} subtitle={ticket.title} />
      <main className="main">
        <button className="ghost" style={{ marginBottom: 12, padding: "4px 0" }} onClick={() => navigate("/tickets")}>
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
          <div className="detail-id"><span className="ticket-code">{formatTicketCode(ticket.id)}</span></div>
          <h2 className="detail-title">{ticket.title}</h2>
          <StatusBadge status={ticket.status} />
        </div>

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
            <span>SLA</span>
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
                      <img src={image} alt={`Foto anexada ao chamado ${index + 1}`} />
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
                <div className="timeline">
                  {timeline.map((item) => {
                    const author = item.author || {};
                    const authorName = author.name || "Sistema";
                    const authorRole = ROLE_LABELS[author.role] || author.role || "sistema";

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`timeline-item${item.type === "comment" ? " is-comment" : ""}`}
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

              <form className="comment-form" onSubmit={handleComment}>
                <div className="comment-composer">
                  <UserAvatar user={user} size={38} className="comment-avatar" />
                  <div className="comment-composer-body">
                    <label>Adicionar comentário</label>
                    <textarea
                      className="comment-input"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Escreva uma atualização ou pergunta sobre o chamado"
                      rows="3"
                      maxLength={COMMENT_LIMIT}
                    />
                    <p className={comment.length >= COMMENT_LIMIT * 0.9 ? "field-counter is-warning" : "field-counter"}>
                      {comment.length}/{COMMENT_LIMIT}
                    </p>
                    {commentError && <p className="error">{commentError}</p>}
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
              </form>
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

            {(canAssign || canResolve || canClose || canReopen || canDelete) && (
              <div className="side-panel">
                <h4>
                  <Icon name="activity" />
                  Ações
                </h4>
                {actionError && <p className="error">{actionError}</p>}
                <div className="action-stack">
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
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}




