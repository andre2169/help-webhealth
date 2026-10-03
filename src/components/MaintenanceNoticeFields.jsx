import DateTimeField from "./DateTimeField";

export default function MaintenanceNoticeFields({ value, onChange, sectors, prefix, disabled }) {
  const change = (field, next) => onChange({ ...value, [field]: next });
  const sectorNames = [...new Set([...sectors, ...value.target_sectors])];
  return (
    <fieldset className="notice-fields" disabled={disabled}>
      <div className="form-grid">
        <div>
          <label htmlFor={`${prefix}-title`}>Título</label>
          <input id={`${prefix}-title`} value={value.title} onChange={event => change("title", event.target.value)} minLength={3} maxLength={100} required />
        </div>
        <div>
          <label htmlFor={`${prefix}-severity`}>Nível</label>
          <select id={`${prefix}-severity`} value={value.severity} onChange={event => change("severity", event.target.value)}>
            <option value="info">Informativo</option>
            <option value="warning">Atenção</option>
            <option value="critical">Crítico</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${prefix}-audience`}>Público</label>
          <select id={`${prefix}-audience`} value={value.audience} onChange={event => change("audience", event.target.value)}>
            <option value="all">Usuários e técnicos</option>
            <option value="users">Somente usuários</option>
            <option value="technicians">Somente técnicos</option>
          </select>
        </div>
        <DateTimeField id={`${prefix}-ends`} label="Encerrar em (opcional)" value={value.endsAt}
          onChange={next => change("endsAt", next)} disabled={disabled} />
      </div>
      <label htmlFor={`${prefix}-message`}>Mensagem</label>
      <textarea id={`${prefix}-message`} value={value.message} onChange={event => change("message", event.target.value)} minLength={3} maxLength={500} rows={3} required />
      <fieldset className="notice-sector-picker">
        <legend>Setores</legend>
        <label className="notice-sector-option">
          <input type="checkbox" checked={value.target_sectors.length === 0} onChange={() => change("target_sectors", [])} />
          <span>Todos os setores</span>
        </label>
        {sectorNames.map(sector => (
          <label className="notice-sector-option" key={sector}>
            <input type="checkbox" checked={value.target_sectors.includes(sector)}
              onChange={event => change("target_sectors", event.target.checked
                ? [...value.target_sectors, sector] : value.target_sectors.filter(item => item !== sector))} />
            <span>{sector}</span>
          </label>
        ))}
      </fieldset>
    </fieldset>
  );
}
