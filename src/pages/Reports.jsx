import { useEffect, useMemo, useState } from "react";
import { downloadReportsPdf, getReportsOverview } from "../api/api";
import Icon from "../components/Icon";
import CollapsiblePanel from "../components/CollapsiblePanel";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
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

const REPORT_BREAKDOWNS = [
  { key: "status_counts", label: "Status" },
  { key: "priority_counts", label: "Prioridade" },
  { key: "impact_counts", label: "Impacto" },
  { key: "sector_counts", label: "Setor" },
  { key: "category_counts", label: "Categoria" },
];

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

function MetricRows({ data, preserveOrder = false, initialLimit = 6, maxItems = 50, latest = false }) {
  const [expanded, setExpanded] = useState(false);
  const allEntries = Object.entries(data || {})
    .map(([key, value]) => [key, Number(value) || 0])
    .filter(([, value]) => value > 0);

  if (!preserveOrder) {
    allEntries.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  }

  const entries = allEntries.length > maxItems
    ? (latest ? allEntries.slice(-maxItems) : allEntries.slice(0, maxItems))
    : allEntries;
  const visibleEntries = expanded ? entries : entries.slice(0, initialLimit);
  const maxValue = entries.reduce((max, [, value]) => Math.max(max, value), 1);

  if (!entries.length) {
    return <p className="report-empty">Sem dados para este recorte.</p>;
  }

  return (
    <div className="report-metric-list">
      {visibleEntries.map(([key, value]) => (
        <div className="report-metric-row" key={key}>
          <div className="report-metric-copy">
            <span>{safeReportLabel(LABELS[key] || key)}</span>
            <strong>{value}</strong>
          </div>
          <div className="report-metric-track" aria-hidden="true">
            <span style={{ width: `${Math.max(3, (value / maxValue) * 100)}%` }} />
          </div>
        </div>
      ))}
      {entries.length > initialLimit && (
        <button
          type="button"
          className="report-show-more"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? "Mostrar menos" : `Ver mais (${entries.length})`}
        </button>
      )}
      {allEntries.length > entries.length && (
        <p className="report-metric-note">
          {latest
            ? `Exibindo os ${entries.length} dias mais recentes.`
            : `Exibindo os ${entries.length} itens de maior volume entre ${allEntries.length}.`}
        </p>
      )}
    </div>
  );
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

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const panelScope = String(user?.id ?? "session");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [activeBreakdown, setActiveBreakdown] = useState("status_counts");

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

  const summaryMetrics = data?.summary_metrics || {};
  const totalAnalyzed = summaryMetrics.total_analyzed || 0;
  const activeTotal = summaryMetrics.active_total || 0;
  const completedTotal = summaryMetrics.completed_total || 0;
  const completedPercent = summaryMetrics.completed_percent || 0;
  const slaResolvedTotal = summaryMetrics.sla_resolved_total || 0;
  const slaWithinTotal = summaryMetrics.sla_within_total || 0;
  const slaWithinPercent = summaryMetrics.sla_within_percent || 0;
  const avgResolutionHours = summaryMetrics.avg_resolution_hours || 0;
  const reopenEvents = summaryMetrics.reopen_events_count || 0;

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
  const visibleAppliedSummary = appliedSummary.filter(
    (item, index) => index === 0 || !["Todos", "Todas"].includes(item.value)
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

  async function exportPdf() {
    if (!data || exportingPdf) return;

    setError("");
    setExportingPdf(true);
    try {
      const { blob, fileName } = await downloadReportsPdf(appliedFilters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message || "Não foi possível gerar o PDF do relatório.");
    } finally {
      setExportingPdf(false);
    }
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
      <Topbar
        title={isAdmin ? "Relatórios gerais" : "Meus relatórios"}
        subtitle={isAdmin ? "Indicadores de toda a operação" : "Indicadores dos chamados atribuídos a você"}
      />
      <main className="main report-page">
        <CollapsiblePanel
          storageKey="reports.filters"
          scope={panelScope}
          title="Filtros do relatório"
          className="panel report-controls no-print"
          headerClassName="report-controls-heading"
          heading={(
            <div>
              <span className="report-eyebrow">ANÁLISE OPERACIONAL</span>
              <h2>{isAdmin ? "Relatórios gerais" : "Meus relatórios"}</h2>
              <p>
                {isAdmin
                  ? "Acompanhe volume, fila, prazos e recorrências da operação."
                  : "Acompanhe seus atendimentos, prazos e recorrências."}
              </p>
            </div>
          )}
          actions={(
            <button type="button" onClick={exportPdf} disabled={!data || exportingPdf}>
              <Icon name="save" />
              {exportingPdf ? "Gerando PDF..." : "Baixar PDF"}
            </button>
          )}
        >

          <form className="report-filter-form" onSubmit={handleSubmit}>
            <div className="report-filter-main">
              <fieldset className="report-period-choice">
                <legend>Período rápido</legend>
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
              </fieldset>

              <div className="report-date-fields">
                <label htmlFor="report-start-date">
                  Data inicial
                  <input
                    id="report-start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => updateFilter("startDate", e.target.value)}
                    max={today()}
                  />
                </label>
                <label htmlFor="report-end-date">
                  Data final
                  <input
                    id="report-end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => updateFilter("endDate", e.target.value)}
                    max={today()}
                  />
                </label>
              </div>

              <div className="report-filter-actions">
                <button type="submit">
                  <Icon name="filter" />
                  Aplicar filtros
                </button>
                <button type="button" className="secondary" onClick={clearFilters}>
                  Limpar
                </button>
              </div>
            </div>

            <details className="report-advanced-filters">
              <summary>
                <Icon name="filter" />
                Filtros adicionais
              </summary>
              <div className="report-advanced-grid">
                <label htmlFor="report-status">
                  Status
                  <select
                    id="report-status"
                    value={filters.status}
                    onChange={(e) => updateFilter("status", e.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="report-priority">
                  Prioridade
                  <select
                    id="report-priority"
                    value={filters.priority}
                    onChange={(e) => updateFilter("priority", e.target.value)}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="report-impact">
                  Impacto
                  <select
                    id="report-impact"
                    value={filters.operationalImpact}
                    onChange={(e) => updateFilter("operationalImpact", e.target.value)}
                  >
                    {IMPACT_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor="report-sector">
                  Setor
                  <input
                    id="report-sector"
                    list="report-sector-options"
                    value={filters.sector}
                    onChange={(e) => updateFilter("sector", e.target.value)}
                    placeholder="Todos os setores"
                    maxLength={REPORT_LIMITS.sector}
                  />
                  <datalist id="report-sector-options">
                    {SECTOR_OPTIONS.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </label>
                <label htmlFor="report-category">
                  Categoria
                  <input
                    id="report-category"
                    list="report-category-options"
                    value={filters.category}
                    onChange={(e) => updateFilter("category", e.target.value)}
                    placeholder="Todas as categorias"
                    maxLength={REPORT_LIMITS.category}
                  />
                  <datalist id="report-category-options">
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </label>
              </div>
            </details>
          </form>
        </CollapsiblePanel>

        {error && <p className="error">{error}</p>}
        {loading && <p className="loading-line">Carregando relatórios…</p>}

        {data && !loading && (
          <section className="report-export-area">
            <div className="report-print-header only-print">
              <h1>HelpWeb Health</h1>
              <p>Relatório de chamados de suporte técnico</p>
            </div>

            <CollapsiblePanel
              storageKey="reports.applied-filters"
              scope={panelScope}
              title="Recorte aplicado"
              className="panel report-summary"
              headingClassName="report-summary-heading"
              heading={(
                <div>
                  <h3>
                    <Icon name="reports" />
                    Recorte aplicado
                  </h3>
                  <p>Atualizado em {formatApiDateTime(data.generated_at)}</p>
                </div>
              )}
            >
              <dl className="report-filter-summary">
                <div className="report-period-summary">
                  <dt>PERÍODO</dt>
                  <dd>{periodLabel(appliedFilters)}</dd>
                </div>
                {visibleAppliedSummary.slice(1).map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </CollapsiblePanel>

            <div className="report-primary-metrics">
              {[
                { key: "total", title: "Total analisado", icon: "chart", value: totalAnalyzed, note: "Chamados no período" },
                { key: "active", title: "Em aberto", icon: "activity", value: activeTotal, note: "Abertos, reabertos ou em andamento" },
                { key: "completed", title: "Concluídos", icon: "check", value: completedTotal, note: `${completedPercent}% do total` },
                { key: "sla", title: "SLA vencido", icon: "alert", value: data.sla?.overdue || 0, note: "Atendimentos ativos fora do prazo", className: "report-alert-metric" },
              ].map((metric) => (
                <article
                  key={metric.key}
                  className={`insight-card ${metric.className || ""}`}
                >
                  <div className="insight-card-head">
                    <Icon name={metric.icon} />
                    <span>{metric.title}</span>
                  </div>
                  <strong>{metric.value}</strong>
                  <small>{metric.note}</small>
                </article>
              ))}
            </div>

            <div className="report-secondary-metrics" aria-label="Indicadores complementares">
              {[
                { key: "unassigned", title: "Sem técnico", value: summaryMetrics.unassigned_active_total || 0 },
                { key: "reopened", title: "Reaberturas", value: reopenEvents },
                { key: "resolution-time", title: "Tempo médio", value: `${avgResolutionHours}h` },
                { key: "sla", title: "SLA cumprido", value: `${slaWithinPercent}%`, note: `${slaWithinTotal} de ${slaResolvedTotal} concluídos` },
              ].map((metric) => (
                <div
                  key={metric.key}
                  className="report-secondary-metric"
                >
                  <span>{metric.title}</span>
                  <strong>{metric.value}</strong>
                  {metric.note && <small>{metric.note}</small>}
                </div>
              ))}
            </div>

            <CollapsiblePanel
              storageKey="reports.breakdown"
              scope={panelScope}
              title="Distribuição dos chamados"
              className="panel report-breakdown-panel"
              headerClassName="report-section-heading"
              heading={(
                <div>
                  <h3>Distribuição dos chamados</h3>
                  <p>Compare o volume do recorte por dimensão.</p>
                </div>
              )}
              actions={(
                <div className="report-segmented" aria-label="Dimensão da distribuição">
                  {REPORT_BREAKDOWNS.map((breakdown) => (
                    <button
                      type="button"
                      key={breakdown.key}
                      aria-pressed={activeBreakdown === breakdown.key}
                      onClick={() => setActiveBreakdown(breakdown.key)}
                    >
                      {breakdown.label}
                    </button>
                  ))}
                </div>
              )}
            >
              <MetricRows data={data[activeBreakdown]} />
            </CollapsiblePanel>

            <CollapsiblePanel
              storageKey="reports.supporting-indicators"
              scope={panelScope}
              title="Indicadores de apoio"
              icon="chart"
              className="panel report-more-metrics"
            >
              <div className="report-more-grid">
                <section>
                  <h4>Situação da fila</h4>
                  <MetricRows data={data.queue_snapshot} preserveOrder />
                </section>
                <section>
                  <h4>Idade dos chamados ativos</h4>
                  <MetricRows data={data.active_age_counts} preserveOrder />
                </section>
                <section>
                  <h4>Equipamentos recorrentes</h4>
                  <MetricRows data={data.equipment_counts} />
                </section>
                <section>
                  <h4>Evolução por dia</h4>
                  <MetricRows data={data.daily_counts} preserveOrder initialLimit={14} maxItems={14} latest />
                </section>
              </div>
            </CollapsiblePanel>

            {(data.technicians || []).length > 0 && (
              <CollapsiblePanel
                storageKey="reports.team-performance"
                scope={panelScope}
                title={isAdmin ? "Atendimentos por técnico" : "Meu atendimento"}
                className="panel report-team-panel"
                headerClassName="report-section-heading"
                heading={(
                  <div>
                    <h3>{isAdmin ? "Atendimentos por técnico" : "Meu atendimento"}</h3>
                    <p>{isAdmin ? "Chamados atribuídos e concluídos no recorte." : "Chamados vinculados ao seu atendimento."}</p>
                  </div>
                )}
              >
                <div className="report-table-wrap">
                  <table className="report-data-table">
                    <thead>
                      <tr>
                        <th scope="col">Técnico</th>
                        <th scope="col">Atribuídos</th>
                        <th scope="col">Resolvidos</th>
                        <th scope="col">Fechados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.technicians.map((tech) => (
                        <tr key={tech.id}>
                          <th scope="row">{safeReportLabel(tech.name, 100)}</th>
                          <td>{tech.assigned_total}</td>
                          <td>{tech.resolved_total}</td>
                          <td>{tech.closed_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsiblePanel>
            )}
          </section>
        )}
      </main>
    </>
  );
}
