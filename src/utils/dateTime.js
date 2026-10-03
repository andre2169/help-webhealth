const APP_TIME_ZONE = "America/Sao_Paulo";

export function parseApiDate(value) {
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

export function apiDateToLocalInput(value) {
  const date = parseApiDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = number => String(number).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeToIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || "")) return null;
  const date = new Date(`${value}:00`);
  if (Number.isNaN(date.getTime()) || apiDateToLocalInput(date) !== value) return null;
  return date.toISOString();
}
