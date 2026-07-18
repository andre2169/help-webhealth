import { useEffect, useMemo, useState } from "react";
import { getReportsOverview } from "../api/api";
import Icon from "../components/Icon";
import Topbar from "../components/Topbar";
import { formatApiDateTime } from "../utils/dateTime";
import { validateShortText } from "../utils/validation";

const LABELS = {
  open: "Aberto",
  reopened: "Reaberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "open", label: "Aberto" },
  { value: "reopened", label: "Reaberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
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

const EMPTY_FILTERS = {
  startDate: "",
  endDate: "",
  status: "",
  priority: "",
  category: "",
  sector: "",
  operationalImpact: "",
};

const REPORT_LIMITS = {
  category: 40,
  sector: 30,
  rangeDays: 366,
};

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function startOfCurrentMonth() {
  const today = new Date();
  return toInputDate(new Date(today.getFullYear(), today.getMonth(), 1));
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toInputDate(date);
}

function today() {
  return toInputDate(new Date());
}

function parseInputDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Informe uma data válida.");
  }
  return date;
}

function daysBetween(startDate, endDate) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((endDate.getTime() - startDate.getTime()) / dayMs);
}

function formatInputDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function MetricBlock({ title, data, icon }) {
  const entries = Object.entries(data || {});

  return (
    <section className="panel report-panel">
      <h3>
        <Icon name={icon} />
        {title}
      </h3>
      <div className="metric-list">
        {entries.length === 0 && <p className="empty-metric">Sem dados para este recorte.</p>}
        {entries.map(([key, value]) => (
          <div className="metric-row" key={key}>
            <span>{safeReportLabel(LABELS[key] || key)}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function sumValues(data = {}) {
  return Object.values(data).reduce((total, value) => total + Number(value || 0), 0);
}

function safeReportLabel(value, maxLength = 90) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function validateReportDates(filters) {
  const startDate = parseInputDate(filters.startDate);
  const endDate = parseInputDate(filters.endDate);
  const currentDate = parseInputDate(today());

  if (startDate && startDate > currentDate) {
    throw new Error("Data inicial não pode ser futura.");
  }

  if (endDate && endDate > currentDate) {
    throw new Error("Data final não pode ser futura.");
  }

  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new Error("Informe data inicial e data final para filtrar por período.");
  }

  if (startDate && endDate) {
    if (endDate < startDate) {
      throw new Error("Data final não pode ser menor que a data inicial.");
    }

    if (daysBetween(startDate, endDate) > REPORT_LIMITS.rangeDays) {
      throw new Error("O período do relatório deve ter no máximo 366 dias.");
    }
  }
}

function cleanFilters(filters) {
  validateReportDates(filters);

  return {
    ...filters,
    category: validateShortText(filters.category, "Categoria", {
      maxLength: REPORT_LIMITS.category,
    }),
    sector: validateShortText(filters.sector, "Setor", {
      maxLength: REPORT_LIMITS.sector,
    }),
  };
}

function selectedLabel(options, value, fallback = "Todos") {
  return options.find((option) => option.value === value)?.label || fallback;
}

function periodLabel(filters) {
  if (filters.startDate && filters.endDate) {
    return `${formatInputDate(filters.startDate)} a ${formatInputDate(filters.endDate)}`;
  }
  if (filters.startDate) return `A partir de ${formatInputDate(filters.startDate)}`;
  if (filters.endDate) return `Até ${formatInputDate(filters.endDate)}`;
  return "Todo o histórico";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function reportRows(data = {}) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return '<tr><td colspan="2" class="empty-row">Sem dados para este recorte.</td></tr>';
  }

  return entries
    .map(
      ([key, value]) =>
        `<tr><td>${escapeHtml(safeReportLabel(LABELS[key] || key))}</td><td class="num">${escapeHtml(value)}</td></tr>`
    )
    .join("");
}

function reportTable(title, data) {
  return `
    <section class="report-section">
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr><th>Indicador</th><th>Total</th></tr>
        </thead>
        <tbody>${reportRows(data)}</tbody>
      </table>
    </section>
  `;
}

function buildReportDocument({
  data,
  appliedSummary,
  totalAnalyzed,
  activeTotal,
  completedTotal,
  completedPercent,
  queueSnapshot,
  reopenEvents,
  avgResolutionHours,
  slaWithinTotal,
  slaResolvedTotal,
  slaWithinPercent,
}) {
  const generatedAt = formatApiDateTime(data.generated_at);
  const criticalActive = queueSnapshot["Críticos ativos"] || 0;
  const highPriorityActive = queueSnapshot["Alta prioridade ativa"] || 0;

  const filtersRows = appliedSummary
    .map(
      (item) =>
        `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`
    )
    .join("");

  const technicianRows = (data.technicians || [])
    .map(
      (tech) => `
        <tr>
          <td>${escapeHtml(tech.name)}</td>
          <td class="num">${escapeHtml(tech.assigned_total)}</td>
          <td class="num">${escapeHtml(tech.resolved_total)}</td>
          <td class="num">${escapeHtml(tech.closed_total)}</td>
        </tr>
      `
    )
    .join("");

  const technicianSection =
    (data.technicians || []).length > 0
      ? `
        <section class="report-section full">
          <h2>Desempenho por técnico</h2>
          <table>
            <thead>
              <tr>
                <th>Técnico</th>
                <th>Atribuídos</th>
                <th>Resolvidos</th>
                <th>Fechados</th>
              </tr>
            </thead>
            <tbody>${technicianRows}</tbody>
          </table>
        </section>
      `
      : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>HelpWeb Health - Relatório gerencial</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f4f7f1;
      color: #182315;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm;
      background: #fff;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 14px;
      border-bottom: 2px solid #2f6426;
    }
    .eyebrow {
      margin: 0 0 4px;
      color: #2f6426;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.1;
    }
    .subtitle {
      margin: 6px 0 0;
      color: #53604e;
      max-width: 520px;
    }
    .stamp {
      min-width: 150px;
      text-align: right;
      color: #53604e;
      font-size: 11px;
    }
    .stamp strong {
      display: block;
      color: #182315;
      font-size: 12px;
    }
    .meta {
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1.35fr;
      gap: 14px;
    }
    .box {
      border: 1px solid #cddac7;
      border-radius: 8px;
      padding: 12px;
      background: #fbfdf8;
    }
    h2 {
      margin: 0 0 8px;
      color: #1c2b17;
      font-size: 14px;
    }
    .filters-table th,
    .filters-table td {
      padding: 4px 0;
      border: 0;
      text-align: left;
      vertical-align: top;
    }
    .filters-table th {
      width: 88px;
      color: #2f6426;
      font-size: 10px;
      text-transform: uppercase;
    }
    .summary-text {
      margin: 0;
      color: #3f4d3a;
    }
    .kpis {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .kpi {
      border: 1px solid #d8e1d3;
      border-radius: 8px;
      padding: 10px;
      background: #fff;
    }
    .kpi span {
      display: block;
      color: #53604e;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .kpi strong {
      display: block;
      margin-top: 6px;
      color: #2f6426;
      font-size: 22px;
      line-height: 1;
    }
    .kpi small {
      display: block;
      margin-top: 6px;
      color: #53604e;
      font-size: 10px;
    }
    .sections {
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .report-section {
      break-inside: avoid;
      border: 1px solid #d8e1d3;
      border-radius: 8px;
      padding: 12px;
    }
    .report-section.full {
      grid-column: 1 / -1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 7px 6px;
      border-bottom: 1px solid #e5ece0;
      text-align: left;
    }
    thead th {
      color: #53604e;
      background: #f2f6ee;
      font-size: 10px;
      text-transform: uppercase;
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    .num {
      width: 80px;
      text-align: right;
      font-weight: 700;
      color: #2f6426;
    }
    .empty-row {
      color: #6b7665;
      text-align: center;
    }
    .actions {
      position: sticky;
      top: 0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 10px;
      background: #f4f7f1;
    }
    .actions button {
      border: 0;
      border-radius: 6px;
      padding: 9px 14px;
      background: #2f6426;
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #d8e1d3;
      color: #6b7665;
      font-size: 10px;
    }
    @media print {
      body { background: #fff; }
      .page {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
      }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Salvar como PDF</button>
  </div>
  <main class="page">
    <header class="report-header">
      <div>
        <p class="eyebrow">HelpWeb Health</p>
        <h1>Relatório gerencial de chamados</h1>
        <p class="subtitle">Indicadores de suporte técnico para acompanhamento da operação de TI em ambiente de saúde.</p>
      </div>
      <div class="stamp">
        <strong>Gerado em</strong>
        ${escapeHtml(generatedAt)}
      </div>
    </header>

    <section class="meta">
      <div class="box">
        <h2>Filtros aplicados</h2>
        <table class="filters-table"><tbody>${filtersRows}</tbody></table>
      </div>
      <div class="box">
        <h2>Resumo executivo</h2>
        <p class="summary-text">
          Foram analisados ${escapeHtml(totalAnalyzed)} chamados no recorte selecionado. A fila ativa possui
          ${escapeHtml(activeTotal)} chamados, sendo ${escapeHtml(queueSnapshot["Sem técnico"] || 0)} sem técnico atribuído.
          Há ${escapeHtml(criticalActive)} chamados críticos ativos e ${escapeHtml(highPriorityActive)} chamados ativos de alta prioridade.
          Foram registradas ${escapeHtml(reopenEvents)} reaberturas no período.
        </p>
      </div>
    </section>

    <section class="kpis">
      <article class="kpi"><span>Total analisado</span><strong>${escapeHtml(totalAnalyzed)}</strong><small>Chamados no recorte</small></article>
      <article class="kpi"><span>Fila ativa</span><strong>${escapeHtml(activeTotal)}</strong><small>Abertos, reabertos ou em andamento</small></article>
      <article class="kpi"><span>Concluídos</span><strong>${escapeHtml(completedTotal)}</strong><small>${escapeHtml(completedPercent)}% do total</small></article>
      <article class="kpi"><span>SLA vencido</span><strong>${escapeHtml(data.sla?.overdue || 0)}</strong><small>Ativos fora do prazo</small></article>
      <article class="kpi"><span>Sem técnico</span><strong>${escapeHtml(queueSnapshot["Sem técnico"] || 0)}</strong><small>Aguardando atribuição</small></article>
      <article class="kpi"><span>Reaberturas</span><strong>${escapeHtml(reopenEvents)}</strong><small>Eventos no recorte</small></article>
      <article class="kpi"><span>Tempo médio</span><strong>${escapeHtml(avgResolutionHours)}h</strong><small>Média de resolução</small></article>
      <article class="kpi"><span>SLA cumprido</span><strong>${escapeHtml(slaWithinTotal)}/${escapeHtml(slaResolvedTotal)}</strong><small>${escapeHtml(slaWithinPercent)}% dos resolvidos</small></article>
    </section>

    <section class="sections">
      ${reportTable("Por status", data.status_counts)}
      ${reportTable("Por impacto", data.impact_counts)}
      ${reportTable("Por setor", data.sector_counts)}
      ${reportTable("Por categoria", data.category_counts)}
      ${reportTable("Equipamentos recorrentes", data.equipment_counts)}
      ${reportTable("Por prioridade", data.priority_counts)}
      ${reportTable("Evolução por dia", data.daily_counts)}
      ${reportTable("Idade da fila ativa", data.active_age_counts)}
      ${reportTable("Situação da fila", data.queue_snapshot)}
      ${reportTable("Solicitantes recorrentes", data.requester_counts)}
      ${technicianSection}
    </section>

    <footer class="footer">
      Documento gerado pelo HelpWeb Health. O relatório apresenta apenas indicadores de suporte técnico e não deve conter dados de pacientes.
    </footer>
  </main>
</body>
</html>`;
}

export default function Reports() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getReportsOverview(appliedFilters)
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const totalAnalyzed = sumValues(data?.status_counts);
  const activeTotal =
    (data?.status_counts?.open || 0) +
    (data?.status_counts?.reopened || 0) +
    (data?.status_counts?.in_progress || 0);
  const completedTotal = (data?.status_counts?.resolved || 0) + (data?.status_counts?.closed || 0);
  const completedPercent = Math.round((completedTotal / Math.max(1, totalAnalyzed)) * 100);
  const slaResolvedTotal = data?.sla?.resolved_total || 0;
  const slaWithinTotal = data?.sla?.within_sla || 0;
  const slaWithinPercent = Math.round((slaWithinTotal / Math.max(1, slaResolvedTotal)) * 100);
  const avgResolutionHours = Math.round((data?.sla?.avg_resolution_minutes || 0) / 60);
  const queueSnapshot = data?.queue_snapshot || {};
  const reopenEvents = data?.reopen_events_count || 0;

  const appliedSummary = useMemo(
    () => [
      { label: "Período", value: periodLabel(appliedFilters) },
      { label: "Status", value: selectedLabel(STATUS_OPTIONS, appliedFilters.status) },
      { label: "Prioridade", value: selectedLabel(PRIORITY_OPTIONS, appliedFilters.priority, "Todas") },
      { label: "Impacto", value: selectedLabel(IMPACT_OPTIONS, appliedFilters.operationalImpact) },
      { label: "Setor", value: appliedFilters.sector || "Todos" },
      { label: "Categoria", value: appliedFilters.category || "Todas" },
    ],
    [appliedFilters]
  );

  function updateFilter(field, value) {
    const limits = {
      category: REPORT_LIMITS.category,
      sector: REPORT_LIMITS.sector,
    };
    const nextValue = limits[field] ? value.slice(0, limits[field]) : value;
    setFilters((current) => ({ ...current, [field]: nextValue }));
  }

  function applyPreset(preset) {
    const endDate = today();
    if (preset === "7d") {
      setFilters((current) => ({ ...current, startDate: daysAgo(6), endDate }));
    }
    if (preset === "30d") {
      setFilters((current) => ({ ...current, startDate: daysAgo(29), endDate }));
    }
    if (preset === "month") {
      setFilters((current) => ({ ...current, startDate: startOfCurrentMonth(), endDate }));
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      setAppliedFilters(cleanFilters(filters));
    } catch (err) {
      setError(err.message);
    }
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function exportPdf() {
    if (!data) return;

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      window.print();
      return;
    }

    reportWindow.opener = null;
    reportWindow.document.open();
    reportWindow.document.write(
      buildReportDocument({
        data,
        appliedSummary,
        totalAnalyzed,
        activeTotal,
        completedTotal,
        completedPercent,
        queueSnapshot,
        reopenEvents,
        avgResolutionHours,
        slaWithinTotal,
        slaResolvedTotal,
        slaWithinPercent,
      })
    );
    reportWindow.document.close();
    reportWindow.focus();
  }

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "HelpWeb Health - Relatório";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <>
      <Topbar title="Relatórios" subtitle="Indicadores de suporte técnico em instituições de saúde" />
      <main className="main report-page">
        <section className="panel report-toolbar no-print">
          <div>
            <h3>
              <Icon name="filter" />
              Filtros do relatório
            </h3>
            <p>Analise chamados por período, setor, categoria, status e impacto operacional.</p>
          </div>
          <button type="button" className="secondary" onClick={exportPdf} disabled={!data}>
            <Icon name="save" />
            Gerar PDF
          </button>
        </section>

        <form className="filters report-filters no-print" onSubmit={handleSubmit}>
          <div className="report-period-presets">
            <label>Período rápido</label>
            <div>
              <button type="button" className="secondary small" onClick={() => applyPreset("7d")}>
                7 dias
              </button>
              <button type="button" className="secondary small" onClick={() => applyPreset("30d")}>
                30 dias
              </button>
              <button type="button" className="secondary small" onClick={() => applyPreset("month")}>
                Mês atual
              </button>
            </div>
          </div>

          <div>
            <label>Data inicial</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter("startDate", e.target.value)}
              max={today()}
            />
          </div>

          <div>
            <label>Data final</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
              max={today()}
            />
          </div>

          <div>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Prioridade</label>
            <select
              value={filters.priority}
              onChange={(e) => updateFilter("priority", e.target.value)}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Impacto</label>
            <select
              value={filters.operationalImpact}
              onChange={(e) => updateFilter("operationalImpact", e.target.value)}
            >
              {IMPACT_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Setor</label>
            <input
              list="report-sector-options"
              value={filters.sector}
              onChange={(e) => updateFilter("sector", e.target.value)}
              placeholder="Todos ou digite um setor"
              maxLength={REPORT_LIMITS.sector}
            />
            <datalist id="report-sector-options">
              {SECTOR_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div>
            <label>Categoria</label>
            <input
              list="report-category-options"
              value={filters.category}
              onChange={(e) => updateFilter("category", e.target.value)}
              placeholder="Todas ou digite uma categoria"
              maxLength={REPORT_LIMITS.category}
            />
            <datalist id="report-category-options">
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="filters-actions">
            <button type="submit">
              <Icon name="filter" />
              Aplicar
            </button>
            <button type="button" className="secondary" onClick={clearFilters}>
              Limpar
            </button>
          </div>
        </form>

        {error && <p className="error">{error}</p>}
        {loading && <p className="loading-line">Carregando relatórios…</p>}

        {data && !loading && (
          <section className="report-export-area">
            <div className="report-print-header only-print">
              <h1>HelpWeb Health</h1>
              <p>Relatório de chamados de suporte técnico</p>
            </div>

            <section className="panel report-summary">
              <div>
                <h3>
                  <Icon name="reports" />
                  Recorte do relatório
                </h3>
                <p>
                  Gerado em {formatApiDateTime(data.generated_at)}. Os números abaixo consideram
                  apenas os filtros aplicados.
                </p>
              </div>
              <dl className="report-filter-summary">
                {appliedSummary.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <div className="insight-grid">
              <div className="insight-card">
                <div className="insight-card-head">
                  <Icon name="chart" />
                  <span>Total analisado</span>
                </div>
                <strong>{totalAnalyzed}</strong>
                <small>Chamados no recorte atual</small>
              </div>
              <div className="insight-card">
                <div className="insight-card-head">
                  <Icon name="activity" />
                  <span>Fila ativa</span>
                </div>
                <strong>{activeTotal}</strong>
                <small>Abertos, reabertos e em andamento</small>
              </div>
              <div className="insight-card">
                <div className="insight-card-head">
                  <Icon name="check" />
                  <span>Concluídos</span>
                </div>
                <strong>{completedTotal}</strong>
                <small>{completedPercent}% do total analisado</small>
              </div>
              <div className="insight-card">
                <div className="insight-card-head">
                  <Icon name="alert" />
                  <span>SLA vencido</span>
                </div>
                <strong>{data.sla?.overdue || 0}</strong>
                <small>Chamados ativos fora do prazo</small>
              </div>
              <div className="insight-card">
                <div className="insight-card-head">
                  <Icon name="headset" />
                  <span>Sem técnico</span>
                </div>
                <strong>{queueSnapshot["Sem técnico"] || 0}</strong>
                <small>Chamados ativos ainda não atribuídos</small>
              </div>
              <div className="insight-card">
                <div className="insight-card-head">
                  <Icon name="refresh" />
                  <span>Reaberturas</span>
                </div>
                <strong>{reopenEvents}</strong>
                <small>Eventos de reabertura no recorte</small>
              </div>
              <div className="insight-card">
                <div className="insight-card-head">
                  <Icon name="clock" />
                  <span>Tempo médio</span>
                </div>
                <strong>{avgResolutionHours}h</strong>
                <small>Média de resolução dos chamados</small>
              </div>
              <div className="insight-card">
                <div className="insight-card-head">
                  <Icon name="check" />
                  <span>SLA cumprido</span>
                </div>
                <strong>
                  {slaWithinTotal}/{slaResolvedTotal}
                </strong>
                <small>{slaWithinPercent}% dos chamados resolvidos</small>
              </div>
            </div>

            <div className="dashboard-grid">
              <MetricBlock title="Por status" data={data.status_counts} icon="activity" />
              <MetricBlock title="Por impacto" data={data.impact_counts} icon="alert" />
              <MetricBlock title="Por setor" data={data.sector_counts} icon="folder" />
              <MetricBlock title="Por categoria" data={data.category_counts} icon="folder" />
              <MetricBlock title="Equipamentos recorrentes" data={data.equipment_counts} icon="list" />
              <MetricBlock title="Por prioridade" data={data.priority_counts} icon="alert" />
              <MetricBlock title="Evolução por dia" data={data.daily_counts} icon="chart" />
              <MetricBlock title="Idade da fila ativa" data={data.active_age_counts} icon="clock" />
              <MetricBlock title="Situação da fila" data={data.queue_snapshot} icon="headset" />
              <MetricBlock title="Solicitantes recorrentes" data={data.requester_counts} icon="user" />
            </div>

            {(data.technicians || []).length > 0 && (
              <section className="panel section-gap">
                <h3>
                  <Icon name="headset" />
                  Desempenho por técnico
                </h3>
                <div className="report-table">
                  <div className="report-head">
                    <span>Técnico</span>
                    <span>Atribuídos</span>
                    <span>Resolvidos</span>
                    <span>Fechados</span>
                  </div>
                  {data.technicians.map((tech) => (
                    <div className="report-row" key={tech.id}>
                      <span>{tech.name}</span>
                      <span>{tech.assigned_total}</span>
                      <span>{tech.resolved_total}</span>
                      <span>{tech.closed_total}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>
        )}
      </main>
    </>
  );
}
