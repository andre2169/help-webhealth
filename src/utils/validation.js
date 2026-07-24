const SHORT_TEXT_RE = /^[0-9A-Za-zÀ-ÖØ-öø-ÿºª° .,:&\-/()]+$/;
const ASSET_TAG_RE = /^[0-9A-Za-zÀ-ÖØ-öø-ÿ ._\-/]+$/;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DANGEROUS_TEXT_RE = /<|>|javascript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i;
const COMMON_WEAK_PASSWORDS = new Set([
  "1234567890",
  "123456789",
  "password123",
  "password1234",
  "senha12345",
  "senha123456",
  "admin12345",
  "admin123456",
  "qwerty12345",
  "qwerty123456",
]);

export const BRAZIL_PHONE_HINT = "DDD + número. Ex.: 71999998888";
export const BRAZIL_PHONE_MAX_LENGTH = 11;
export const BRAZIL_DDDS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

export function onlyDigits(value, maxLength = 15) {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

function collapseSpaces(value) {
  return String(value || "").trim().replace(/[ \t]+/g, " ");
}

function hasEmojiOrControl(value) {
  return /[\p{Extended_Pictographic}\p{Cc}\p{Cf}\p{Cs}]/u.test(value);
}

export function parsePhoneValue(value) {
  const raw = String(value || "");
  const digits = onlyDigits(raw, 13);
  if (!digits) {
    return "";
  }

  // Compatibilidade com perfis antigos que foram salvos no formato +55.
  if (digits.startsWith("55") && [12, 13].includes(digits.length)) {
    return digits.slice(2);
  }

  return digits.slice(0, BRAZIL_PHONE_MAX_LENGTH);
}

export function validatePhone(value, required = false) {
  const raw = String(value || "").trim();
  const phone = onlyDigits(raw, 13);
  if (!phone) {
    if (required) throw new Error("Informe telefone com DDD.");
    return "";
  }

  if (raw.startsWith("+") || (phone.startsWith("55") && [12, 13].includes(phone.length))) {
    throw new Error("Use somente DDD + número, sem DDI ou +55.");
  }

  if (![10, 11].includes(phone.length)) {
    throw new Error("Telefone deve ter DDD brasileiro e 10 ou 11 números.");
  }

  const ddd = phone.slice(0, 2);
  if (!BRAZIL_DDDS.has(ddd) || new Set(phone).size === 1) {
    throw new Error("Informe um DDD brasileiro e telefone válidos.");
  }

  if (phone.length === 11 && phone[2] !== "9") {
    throw new Error("Celular com 11 números deve começar com 9 depois do DDD.");
  }

  return phone;
}

export function validateName(value) {
  const text = collapseSpaces(value);
  if (text.length < 2 || text.length > 100 || !NAME_RE.test(text) || hasEmojiOrControl(text)) {
    throw new Error("Nome deve conter apenas letras, espaços, hífen ou apóstrofo.");
  }
  return text;
}

export function validateEmail(value) {
  const email = collapseSpaces(value).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new Error("Informe um email válido com @ e domínio.");
  }
  return email;
}

export function validatePassword(value) {
  const password = String(value || "");
  if (password.length < 10) {
    throw new Error("A senha deve ter pelo menos 10 caracteres.");
  }
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(password) || !/\d/.test(password)) {
    throw new Error("A senha deve ter letras e números.");
  }
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(password)) {
    throw new Error("A senha contém caracteres inválidos.");
  }
  const normalized = password.trim().toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(normalized) || new Set(normalized).size <= 3) {
    throw new Error("Escolha uma senha menos previsível.");
  }
  return password;
}

export function validateShortText(value, label, { required = false, maxLength } = {}) {
  const text = collapseSpaces(value);
  if (!text) {
    if (required) throw new Error(`${label} é obrigatório.`);
    return "";
  }
  if (maxLength && text.length > maxLength) {
    throw new Error(`${label} deve ter no máximo ${maxLength} caracteres.`);
  }
  if (hasEmojiOrControl(text) || !SHORT_TEXT_RE.test(text)) {
    throw new Error(`${label} contém caracteres inválidos.`);
  }
  if (DANGEROUS_TEXT_RE.test(text)) {
    throw new Error(`${label} contém conteúdo não permitido.`);
  }
  return text;
}

export function validateAssetTag(value, { maxLength = 40 } = {}) {
  const text = collapseSpaces(value);
  if (!text) return "";
  if (maxLength && text.length > maxLength) {
    throw new Error(`Patrimônio deve ter no máximo ${maxLength} caracteres.`);
  }
  if (hasEmojiOrControl(text) || !ASSET_TAG_RE.test(text)) {
    throw new Error("Patrimônio contém caracteres inválidos.");
  }
  return text;
}

export function validateLongText(value, label, { required = false, maxLength } = {}) {
  const text = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  if (!text) {
    if (required) throw new Error(`${label} é obrigatório.`);
    return "";
  }
  if (maxLength && text.length > maxLength) {
    throw new Error(`${label} deve ter no máximo ${maxLength} caracteres.`);
  }
  if (hasEmojiOrControl(text)) {
    throw new Error(`${label} não aceita emoji ou caracteres invisíveis.`);
  }
  if (DANGEROUS_TEXT_RE.test(text)) {
    throw new Error(`${label} contém conteúdo não permitido.`);
  }
  return text;
}
