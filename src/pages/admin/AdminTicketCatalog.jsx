import { useRef, useState } from "react";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { adminCreateCatalogOption, adminDeleteCatalogOption, adminRenameCatalogOption, adminSetCatalogOptionActive } from "../../api/api";
import CatalogOptionDialog from "../../components/CatalogOptionDialog";
import RowActionsMenu from "../../components/RowActionsMenu";
import Icon from "../../components/Icon";
import ListPagination from "../../components/ListPagination";
import Topbar from "../../components/Topbar";
import useTicketCatalog from "../../hooks/useTicketCatalog";
import { validateShortText } from "../../utils/validation";

const PAGE_SIZE = 12;
const searchKey = value => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();

export default function AdminTicketCatalog() {
  const catalog = useTicketCatalog({ includeInactive: true });
  const [kind, setKind] = useState("sector");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState("");
  const lock = useRef(false);
  const items = catalog.options.filter(option => option.kind === kind
    && (includeInactive || option.active) && searchKey(option.name).includes(searchKey(search)));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(items.length / PAGE_SIZE) - 1));
  const rows = items.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  async function mutate(operation, message, inDialog = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    setDialogError("");
    try {
      await operation();
      setFeedback(message);
      catalog.reload();
      if (inDialog) setDialog(null);
    } catch (err) {
      if (inDialog) setDialogError(err.message);
      else setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function openDialog(option, mode) {
    setDialogError("");
    setDialog({ option, mode });
  }

  function confirmDialog(editedName) {
    if (dialog.mode === "delete") {
      mutate(() => adminDeleteCatalogOption(dialog.option.id), "Cadastro excluído.", true);
    } else {
      mutate(() => adminRenameCatalogOption(dialog.option.id,
        validateShortText(editedName, "Nome", { required: true, maxLength: dialog.option.kind === "sector" ? 30 : 40 })),
      "Nome atualizado nos registros vinculados.", true);
    }
  }

  function addOption(event) {
    event.preventDefault();
    mutate(async () => {
      const cleanedName = validateShortText(name, "Nome", { required: true, maxLength: kind === "sector" ? 30 : 40 });
      await adminCreateCatalogOption({ kind, name: cleanedName });
      setName("");
      setPage(0);
    }, kind === "sector" ? "Setor cadastrado." : "Categoria cadastrada.");
  }

  return (
    <>
      <Topbar title="Setores e categorias" subtitle="Cadastros oficiais" />
      <main className="main catalog-page">
        <div className="page-title">
          <h2>Setores e categorias</h2>
          <div className="report-segmented" aria-label="Tipo de cadastro">
            {[{ value: "sector", label: "Setores" }, { value: "category", label: "Categorias" }].map(tab => (
              <button key={tab.value} type="button" aria-pressed={kind === tab.value} onClick={() => {
                setKind(tab.value); setName(""); setPage(0); setError(""); setFeedback("");
              }}>{tab.label}</button>
            ))}
          </div>
        </div>
        {(error || catalog.error) && <p className="error" role="alert">{error || catalog.error}</p>}
        {feedback && <p className="success" role="status">{feedback}</p>}
        <form className="catalog-create-form" onSubmit={addOption}>
          <label htmlFor="catalog-name">{kind === "sector" ? "Novo setor" : "Nova categoria"}</label>
          <div>
            <input id="catalog-name" value={name} onChange={event => setName(event.target.value)} maxLength={kind === "sector" ? 30 : 40} minLength={2} required disabled={busy} />
            <button type="submit" disabled={busy || catalog.loading || !name.trim()}><Icon name="plus" /> {busy ? "Salvando..." : "Adicionar"}</button>
          </div>
        </form>
        <section className="catalog-list" aria-label={kind === "sector" ? "Setores cadastrados" : "Categorias cadastradas"} aria-busy={catalog.loading}>
          <div className="catalog-list-tools">
            <label htmlFor="catalog-search">Buscar
              <input id="catalog-search" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} maxLength={40} />
            </label>
            <label className="catalog-checkbox"><input type="checkbox" checked={includeInactive} onChange={event => { setIncludeInactive(event.target.checked); setPage(0); }} /> Incluir inativos</label>
            <button type="button" className="secondary small" onClick={catalog.reload} title="Atualizar cadastros" aria-label="Atualizar cadastros" disabled={busy || catalog.loading}><Icon name="refresh" /></button>
          </div>
          <div className="report-table-wrap">
            <table className="report-data-table catalog-data-table">
              <thead><tr><th scope="col">Nome</th><th scope="col">Situação</th><th scope="col" className="catalog-actions-cell">Ações</th></tr></thead>
              <tbody>
                {rows.map(option => (
                  <tr key={option.id}>
                    <th scope="row">{option.name}</th>
                    <td><span className={`catalog-status ${option.active ? "is-active" : "is-inactive"}`}>{option.active ? "Ativo" : "Inativo"}</span></td>
                    <td className="catalog-actions-cell"><RowActionsMenu label={`Ações de ${option.name}`} disabled={busy || catalog.loading} items={[
                      { label: "Editar", icon: <Pencil size={16} />, onSelect: () => openDialog(option, "edit") },
                      { label: option.active ? "Desativar" : "Ativar", icon: option.active ? <PowerOff size={16} /> : <Power size={16} />,
                        onSelect: () => mutate(() => adminSetCatalogOptionActive(option.id, !option.active), option.active ? "Cadastro desativado." : "Cadastro reativado.") },
                      { label: "Excluir", icon: <Trash2 size={16} />, danger: true, onSelect: () => openDialog(option, "delete") },
                    ]} /></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={3}>{catalog.loading ? "Carregando..." : "Nenhum cadastro encontrado."}</td></tr>}
              </tbody>
            </table>
          </div>
          <ListPagination page={currentPage} pageSize={PAGE_SIZE} total={items.length} onChange={setPage} />
        </section>
      </main>
      {dialog && <CatalogOptionDialog option={dialog.option} mode={dialog.mode} busy={busy} error={dialogError}
        onClose={() => setDialog(null)} onConfirm={confirmDialog} />}
    </>
  );
}
