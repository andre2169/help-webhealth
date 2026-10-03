import { useEffect, useRef, useState } from "react";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import {
  adminCreateMaintenanceNotice,
  adminDeleteMaintenanceNotice,
  adminListMaintenanceNotices,
  adminSetMaintenanceNoticeActive,
  adminUpdateMaintenanceNotice,
} from "../../api/api";
import Icon from "../../components/Icon";
import Topbar from "../../components/Topbar";
import RowActionsMenu from "../../components/RowActionsMenu";
import MaintenanceNoticeFields from "../../components/MaintenanceNoticeFields";
import MaintenanceNoticeDialog from "../../components/MaintenanceNoticeDialog";
import { apiDateToLocalInput, formatApiDateTime, localDateTimeToIso, parseApiDate } from "../../utils/dateTime";
import useTicketCatalog from "../../hooks/useTicketCatalog";

const emptyNotice = () => ({ title: "", message: "", severity: "warning", audience: "all", target_sectors: [], endsAt: "" });
const audienceLabels = { all: "Usuários e técnicos", users: "Somente usuários", technicians: "Somente técnicos" };

function payload(value) {
  const { endsAt, ...fields } = value;
  const ends_at = endsAt ? localDateTimeToIso(endsAt) : null;
  if (endsAt && !ends_at) throw new Error("Selecione uma data e hora válidas para o encerramento.");
  return { ...fields, ends_at };
}

function noticeStatus(notice) {
  if (!notice.active) return "Inativo";
  const now = Date.now();
  if (notice.ends_at && parseApiDate(notice.ends_at)?.getTime() <= now) return "Encerrado";
  if (parseApiDate(notice.starts_at)?.getTime() > now) return "Agendado";
  return "Ativo";
}

export default function AdminMaintenanceNotices() {
  const catalog = useTicketCatalog();
  const pending = useRef(false);
  const [notices, setNotices] = useState([]);
  const [value, setValue] = useState(emptyNotice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState("");

  async function loadNotices() {
    try {
      setNotices(await adminListMaintenanceNotices());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadNotices(); }, []);

  function startRequest() {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    return true;
  }

  function finishRequest() { pending.current = false; setBusy(false); }

  async function createNotice(event) {
    event.preventDefault();
    if (!startRequest()) return;
    try {
      await adminCreateMaintenanceNotice(payload(value));
      setValue(emptyNotice());
      setFeedback("Aviso publicado.");
      await loadNotices();
    } catch (err) {
      setError(err.message);
    } finally {
      finishRequest();
    }
  }

  async function toggleNotice(notice) {
    if (!startRequest()) return;
    try {
      await adminSetMaintenanceNoticeActive(notice.id, !notice.active);
      setFeedback(notice.active ? "Aviso desativado." : "Aviso ativado.");
      await loadNotices();
    } catch (err) {
      setError(err.message);
    } finally {
      finishRequest();
    }
  }

  function openDialog(notice, mode) {
    setDialogError("");
    setDialog({ notice, mode });
  }

  async function confirmDialog(next) {
    if (!startRequest()) return;
    setDialogError("");
    try {
      if (dialog.mode === "delete") await adminDeleteMaintenanceNotice(dialog.notice.id);
      else {
        const data = payload(next);
        if (next.endsAt && next.endsAt === apiDateToLocalInput(dialog.notice.ends_at)) {
          data.ends_at = parseApiDate(dialog.notice.ends_at).toISOString();
        }
        await adminUpdateMaintenanceNotice(dialog.notice.id, data);
      }
      setFeedback(dialog.mode === "delete" ? "Aviso excluído." : "Aviso atualizado.");
      setDialog(null);
      await loadNotices();
    } catch (err) { setDialogError(err.message); }
    finally { finishRequest(); }
  }

  return (
    <>
      <Topbar title="Avisos operacionais" subtitle="Comunicados de manutenção por setor" />
      <main className="main admin-notices-page">
        <div className="page-title">
          <div>
            <h2>Avisos de manutenção</h2>
            <p>Comunicados por setor</p>
          </div>
        </div>
        {(error || catalog.error) && <p className="error" role="alert">{error || catalog.error}</p>}
        {feedback && <p className="success" role="status">{feedback}</p>}

        <form className="panel admin-notice-form" onSubmit={createNotice}>
          <h3><Icon name="alert" /> Publicar aviso</h3>
          <MaintenanceNoticeFields value={value} onChange={setValue} sectors={catalog.sectors} prefix="notice" disabled={busy || catalog.loading} />
          <button type="submit" disabled={busy || catalog.loading || !!catalog.error || value.title.trim().length < 3 || value.message.trim().length < 3}>
            <Icon name="send" /> {busy ? "Publicando..." : "Publicar aviso"}
          </button>
        </form>

        <section className="panel admin-notice-list">
          <h3>Avisos publicados</h3>
          {notices.length === 0 ? <p className="loading-line">Nenhum aviso cadastrado.</p> : (
            <div className="admin-notice-rows">
              {notices.map((notice) => (
                <article className={`admin-notice-row is-${notice.severity}${notice.active ? "" : " is-inactive"}`} key={notice.id}>
                  <div className="admin-notice-row-copy">
                    <div className="admin-notice-row-heading"><strong>{notice.title}</strong><span className="notice-state">{noticeStatus(notice)}</span></div>
                    <p>{notice.message}</p>
                    <small>{audienceLabels[notice.audience] || audienceLabels.all} · {notice.target_sectors.length ? notice.target_sectors.join(", ") : "Todos os setores"} · Publicado em {formatApiDateTime(notice.created_at)}{notice.ends_at ? ` · Encerra em ${formatApiDateTime(notice.ends_at)}` : ""}</small>
                  </div>
                  <RowActionsMenu label={`Ações do aviso: ${notice.title}`} disabled={busy} items={[
                    { label: "Editar", icon: <Pencil size={17} />, onSelect: () => openDialog(notice, "edit") },
                    { label: notice.active ? "Desativar" : "Ativar", icon: notice.active ? <PowerOff size={17} /> : <Power size={17} />, onSelect: () => toggleNotice(notice) },
                    { label: "Excluir", icon: <Trash2 size={17} />, danger: true, onSelect: () => openDialog(notice, "delete") },
                  ]} />
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      {dialog && <MaintenanceNoticeDialog key={`${dialog.notice.id}-${dialog.mode}`} notice={dialog.notice} mode={dialog.mode}
        sectors={catalog.sectors} busy={busy} error={dialogError} onClose={() => { if (!pending.current) setDialog(null); }} onConfirm={confirmDialog} />}
    </>
  );
}
