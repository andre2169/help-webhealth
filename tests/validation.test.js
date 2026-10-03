import test from "node:test";
import assert from "node:assert/strict";
import { validateName, validatePassword, validatePhone, parsePhoneValue, validateShortText, validateLongText, validateAssetTag } from "../src/utils/validation.js";

test("names preserve accents, apostrophes and hyphens while normalizing spaces", () => {
  assert.equal(validateName("  André   Vilas Boas  "), "André Vilas Boas");
  assert.equal(validateName("Ana-Maria D'Avila"), "Ana-Maria D'Avila");
  for (const value of ["A", "Pessoa123", "Nome\u200bOculto", "Nome\u0000Inválido", "<script>"]) assert.throws(() => validateName(value));
});

test("Brazilian telephone validation does not confuse DDD 55 with international prefix", () => {
  assert.equal(validatePhone("55999998888"), "55999998888");
  assert.equal(parsePhoneValue("+55 (55) 99999-8888"), "55999998888");
  assert.equal(validatePhone("7133334444"), "7133334444");
  for (const value of ["00999998888", "7191234567x", "+5571999998888", "71888888888", "11111111111"]) assert.throws(() => validatePhone(value));
  assert.equal(validatePhone(""), "");
  assert.throws(() => validatePhone("", true));
});

test("password length is enforced in UTF-8 bytes, not only characters", () => {
  assert.equal(validatePassword("Aa1" + "é".repeat(34) + "B"), "Aa1" + "é".repeat(34) + "B");
  assert.throws(() => validatePassword("Aa1" + "é".repeat(35)));
  for (const value of ["Senha123", "somenteletras", "123456789012", "password123", "SenhaValida123\u200b"]) assert.throws(() => validatePassword(value));
});

test("short fields enforce exact length boundaries and normalize ordinary spaces", () => {
  assert.equal(validateShortText("  Sala   02  ", "Setor", { maxLength: 7 }), "Sala 02");
  assert.throws(() => validateShortText("Sala 002", "Setor", { maxLength: 7 }));
  assert.equal(validateShortText("", "Setor"), "");
  assert.throws(() => validateShortText("", "Setor", { required: true }));
  assert.equal(validateAssetTag(" PC_2026-01 "), "PC_2026-01");
});

test("multiline descriptions and comments keep legitimate line breaks and tabs", () => {
  assert.equal(validateLongText("  Diagnóstico:\r\n\tSem rede.\r\nAção: reiniciar.  ", "Comentário", { required: true, maxLength: 250 }), "Diagnóstico:\n\tSem rede.\nAção: reiniciar.");
  assert.equal(validateLongText("Texto\n\n\n\n\nOutro", "Descrição"), "Texto\n\n\nOutro");
});

test("long fields reject HTML, executable payloads and invisible controls", () => {
  for (const payload of ["<img src=x>", "javascript:alert(1)", "data:text/html,test", "onclick=executar", "Texto\u0000", "Texto\u200b", "Texto\ud800"]) {
    assert.throws(() => validateLongText(payload, "Descrição"));
  }
  assert.equal(validateLongText("x".repeat(1000), "Descrição", { maxLength: 1000 }).length, 1000);
  assert.throws(() => validateLongText("x".repeat(1001), "Descrição", { maxLength: 1000 }));
});
