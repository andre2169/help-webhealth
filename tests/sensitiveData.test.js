import assert from "node:assert/strict";
import test from "node:test";
import { detectSensitiveData } from "../src/utils/sensitiveData.js";

test("warns for a CPF with valid check digits without returning its value", () => {
  const result = detectSensitiveData("Documento informado: 529.982.247-25");
  assert.deepEqual(result, ["possível CPF"]);
  assert.equal(JSON.stringify(result).includes("529"), false);
});

test("warns for Brazilian phone, email and patient references", () => {
  assert.deepEqual(
    detectSensitiveData("Contato 11987654321; paciente com prontuário 123"),
    ["telefone", "referência a dados de paciente"]
  );
  assert.deepEqual(detectSensitiveData("Enviar para pessoa@hospital.com"), ["email"]);
});

test("does not warn on ordinary operational descriptions", () => {
  assert.deepEqual(detectSensitiveData("A impressora da recepção está sem conexão."), []);
});
