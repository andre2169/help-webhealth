import { useEffect, useMemo, useState } from "react";
import { downloadReportsPdf, getReportsOverview } from "../api/api";
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
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

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
  const queueSnapshot = data?.queue_snapshot || {};
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
          <div className="report-toolbar-actions">
            <button type="button" onClick={exportPdf} disabled={!data || exportingPdf}>
              <Icon name="save" />
              {exportingPdf ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
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
                <strong>{summaryMetrics.unassigned_active_total || 0}</strong>
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
