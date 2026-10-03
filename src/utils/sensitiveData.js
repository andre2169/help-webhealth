function isValidCpf(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^([0-9])\1{10}$/.test(digits)) return false;

  const calculateDigit = (length) => {
    const sum = digits
      .slice(0, length)
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
}

export function detectSensitiveData(text = "") {
  const warnings = [];
  if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(text)) warnings.push("email");
  if (/(?:\d[ .-]?){10,11}/.test(text) && /\d{10,11}/.test(text.replace(/\D/g, ""))) {
    const phoneCandidates = text.match(/(?:\+?55[ .-]?)?(?:\(?\d{2}\)?[ .-]?)?\d{4,5}[ .-]?\d{4}/g) || [];
    if (phoneCandidates.some((candidate) => candidate.replace(/\D/g, "").length >= 10)) {
      warnings.push("telefone");
    }
  }
  const cpfCandidates = text.match(/(?:\d[ .-]?){11,14}/g) || [];
  if (cpfCandidates.some(isValidCpf)) warnings.push("possível CPF");
  if (/\b(paciente|prontu[aá]rio|registro cl[ií]nico|diagn[oó]stico|prescri[cç][aã]o|nome do paciente)\b/i.test(text)) {
    warnings.push("referência a dados de paciente");
  }
  return [...new Set(warnings)];
}
