import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/api";
import Icon from "../components/Icon";
import PasswordField from "../components/PasswordField";
import {
  PHONE_COUNTRIES,
  getPhoneCountry,
  onlyDigits,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
  validateShortText,
} from "../utils/validation";

const PROFILE_LIMITS = {
  name: 100,
  email: 254,
  password: 128,
  jobTitle: 40,
  department: 30,
  unitName: 80,
};

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("55");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [unitName, setUnitName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await registerUser({
        name: validateName(name),
        email: validateEmail(email),
        password: validatePassword(password),
        phone: validatePhone(phone, false, phoneCountry),
        jobTitle: validateShortText(jobTitle, "Cargo", { maxLength: PROFILE_LIMITS.jobTitle }),
        department: validateShortText(department, "Setor", { maxLength: PROFILE_LIMITS.department }),
        unitName: validateShortText(unitName, "Unidade", { maxLength: PROFILE_LIMITS.unitName }),
      });
      setSuccess("Conta criada. Enviamos um código para confirmar seu email. Entre na conta e digite o código no Perfil.");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card">
        <div className="card-brand">
          <div className="card-brand-mark">HD</div>
          <div>
            <strong style={{ display: "block", fontFamily: "var(--font-display)" }}>
              HELPE DESK
            </strong>
          </div>
        </div>

        <h1>CRIAR CONTA</h1>
        <p>Cadastre-se para abrir seus chamados de suporte.</p>

        <form onSubmit={handleSubmit}>
          <label>Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            maxLength={PROFILE_LIMITS.name}
            required
          />

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            maxLength={PROFILE_LIMITS.email}
            required
          />

          <label>Telefone</label>
          <div className="phone-grid">
            <select value={phoneCountry} onChange={(e) => setPhoneCountry(e.target.value)}>
              {PHONE_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  +{country.code} {country.label}
                </option>
              ))}
            </select>
            <input
              value={phone}
              onChange={(e) => setPhone(onlyDigits(e.target.value, 15))}
              inputMode="numeric"
              maxLength={15}
              placeholder={getPhoneCountry(phoneCountry).hint}
            />
          </div>
          <p className="field-hint">No Brasil, informe DDD + número. Ex.: 21999998888.</p>

          <label>Cargo ou função</label>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Ex.: recepção, enfermagem"
            maxLength={PROFILE_LIMITS.jobTitle}
          />

          <label>Setor</label>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Ex.: UTI, laboratório, farmácia"
            maxLength={PROFILE_LIMITS.department}
          />

          <label>Unidade</label>
          <input
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
            placeholder="Ex.: UPA Centro, UBS Bairro"
            maxLength={PROFILE_LIMITS.unitName}
          />

          <label>Senha</label>
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres, com letras e números"
            required
            minLength={8}
            maxLength={PROFILE_LIMITS.password}
            autoComplete="new-password"
          />

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}

          <button type="submit" className="full" disabled={submitting}>
            <Icon name="userPlus" />
            {submitting ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <p className="auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

