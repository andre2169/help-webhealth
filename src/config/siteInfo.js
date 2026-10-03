// Public information only. Replace demo contacts before enabling contact links.
export const SITE_INFO = {
  developer: "André Vilas Boas",
  technologies: ["React", "Vite", "FastAPI", "Python"],
  updatedAt: "", // Optional fixed release date: YYYY-MM-DD.
  support: {
    demonstration: true,
    phone: "(00) 00000-0000",
    email: "suporte@example.invalid",
  },
};

export function supportLinks(support) {
  if (support.demonstration) return { phone: null, email: null };
  const digits = support.phone.replace(/\D/g, "");
  const validPhone = /^(?:55)?[1-9]\d\d{8,9}$/.test(digits);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support.email)
    && !/\.(?:invalid|example|test|localhost)$/i.test(support.email);
  return {
    phone: validPhone ? `tel:+${digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`}` : null,
    email: validEmail ? `mailto:${encodeURIComponent(support.email)}` : null,
  };
}

export function releaseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
