const SHORT_TEXT_RE = /^[0-9A-Za-zÀ-ÖØ-öø-ÿºª° .,:&\-/()]+$/;
const ASSET_TAG_RE = /^[0-9A-Za-zÀ-ÖØ-öø-ÿ ._\-/]+$/;
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DANGEROUS_TEXT_RE = /<|>|javascript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i;

export const PHONE_COUNTRIES = [
  { code: "55", label: "Brasil", hint: "DDD + número", localMin: 10, localMax: 11 },
  { code: "351", label: "Portugal", hint: "Número local", localMin: 9, localMax: 9 },
  { code: "1", label: "EUA/Canadá", hint: "Código de área + número", localMin: 10, localMax: 10 },
  { code: "34", label: "Espanha", hint: "Número local", localMin: 9, localMax: 9 },
  { code: "39", label: "Itália", hint: "Número local", localMin: 8, localMax: 11 },
  { code: "44", label: "Reino Unido", hint: "Número local", localMin: 10, localMax: 10 },
];

export function onlyDigits(value, maxLength = 15) {
  return String(value || "").replace(/\D/g, "").slice(0, maxLength);
}

function collapseSpaces(value) {
  return String(value || "").trim().replace(/[ \t]+/g, " ");
}

function hasEmojiOrControl(value) {
  return /[\p{Extended_Pictographic}\p{Cc}\p{Cf}\p{Cs}]/u.test(value);
}

export function getPhoneCountry(code) {
  return PHONE_COUNTRIES.find((country) => country.code === String(code)) || PHONE_COUNTRIES[0];
}

export function parsePhoneValue(value) {
  const raw = String(value || "");
  const digits = onlyDigits(raw, 15);
  if (!digits) {
    return { countryCode: "55", nationalNumber: "" };
  }

  const matchedCountry = [...PHONE_COUNTRIES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((country) => digits.startsWith(country.code));

  if (!matchedCountry) {
    return { countryCode: "55", nationalNumber: digits };
  }

  return {
    countryCode: matchedCountry.code,
    nationalNumber: digits.slice(matchedCountry.code.length),
  };
}

export function buildPhoneValue(countryCode, nationalNumber) {
  const local = onlyDigits(nationalNumber, 15);
  if (!local) return "";
  return `+${countryCode}${local}`;
}

export function validatePhone(value, required = false, countryCode = "55") {
  const phone = onlyDigits(value, 15);
  if (!phone) {
    if (required) throw new Error("Informe DDI, DDD e telefone.");
    return "";
  }

  if (countryCode === "55") {
    if (![10, 11].includes(phone.length)) {
      throw new Error("Telefone do Brasil deve ter DDD e 10 ou 11 números.");
    }

    const ddd = Number(phone.slice(0, 2));
    if (ddd < 11 || ddd > 99 || new Set(phone).size === 1) {
      throw new Error("Informe um DDD e telefone válidos.");
    }

    if (phone.length === 11 && phone[2] !== "9") {
      throw new Error("Celular do Brasil com 11 números deve começar com 9 depois do DDD.");
    }

    return `+55${phone}`;
  }

  const country = getPhoneCountry(countryCode);
  if (phone.length < country.localMin || phone.length > country.localMax || new Set(phone).size === 1) {
    throw new Error(`Telefone de ${country.label} deve ter ${country.localMin === country.localMax ? country.localMin : `${country.localMin} a ${country.localMax}`} números.`);
  }

  return `+${countryCode}${phone}`;
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
  if (password.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(password) || !/\d/.test(password)) {
    throw new Error("A senha deve ter letras e números.");
  }
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(password)) {
    throw new Error("A senha contém caracteres inválidos.");
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
