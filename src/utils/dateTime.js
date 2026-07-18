const APP_TIME_ZONE = "America/Sao_Paulo";

function parseApiDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const hasTimeZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const normalized = hasTimeZone ? trimmed : `${trimmed}Z`;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatApiDate(value, fallback = "—") {
  const date = parseApiDate(value);
  if (!date) return fallback;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
}

export function formatApiDateTime(value, fallback = "Não definido") {
  const date = parseApiDate(value);
  if (!date) return fallback;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  });
}
