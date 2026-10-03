import Icon from "./Icon";

export default function ListPagination({ page, pageSize, total, onChange }) {
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  return (
    <nav className="list-pagination no-print" aria-label="Paginação">
      <span>{total ? `${page * pageSize + 1} a ${Math.min((page + 1) * pageSize, total)} de ${total}` : "Nenhum resultado"}</span>
      <div>
        <button type="button" className="secondary small" disabled={page === 0} onClick={() => onChange(page - 1)} title="Página anterior" aria-label="Página anterior"><Icon name="chevronLeft" /></button>
        <span>Página {page + 1} de {lastPage + 1}</span>
        <button type="button" className="secondary small" disabled={page >= lastPage} onClick={() => onChange(page + 1)} title="Próxima página" aria-label="Próxima página"><Icon name="chevronRight" /></button>
      </div>
    </nav>
  );
}
