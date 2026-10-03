import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/api";
import Icon from "../components/Icon";
import PasswordField from "../components/PasswordField";
import ThemeToggle from "../components/ThemeToggle";
import BrandLogo from "../components/BrandLogo";
import SiteFooter from "../components/SiteFooter";
import {
  BRAZIL_PHONE_HINT,
  BRAZIL_PHONE_MAX_LENGTH,
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
  password: 72,
  jobTitle: 40,
  department: 30,
  unitName: 80,
};

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [unitName, setUnitName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const validatedPassword = validatePassword(password);
      if (validatedPassword !== confirmPassword) {
        throw new Error("As senhas não conferem.");
      }

      await registerUser({
        name: validateName(name),
        email: validateEmail(email),
        password: validatedPassword,
        phone: validatePhone(phone),
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
    <div className="auth-shell auth-shell-modern">
      <div className="auth-theme-control"><ThemeToggle compact /></div>
      <div className="card auth-card auth-register-card">
        <div className="card-brand auth-brand">
          <BrandLogo full className="auth-brand-logo" />
        </div>

        <h1>Criar sua conta</h1>
        <p>Cadastre-se para abrir seus chamados de suporte.</p>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-field register-field-wide">
            <label htmlFor="register-name">Nome completo</label>
            <input
              id="register-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              maxLength={PROFILE_LIMITS.name}
              autoComplete="name"
              required
            />
          </div>

          <div className="register-form-grid register-form-grid-two">
            <div className="register-field">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                maxLength={PROFILE_LIMITS.email}
                autoComplete="email"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-phone">Telefone</label>
              <input
                id="register-phone"
                value={phone}
                onChange={(e) => setPhone(onlyDigits(e.target.value, BRAZIL_PHONE_MAX_LENGTH))}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={BRAZIL_PHONE_MAX_LENGTH}
                placeholder={BRAZIL_PHONE_HINT}
                autoComplete="tel-national"
              />
              <p className="field-hint">DDD + número, sem +55.</p>
            </div>
          </div>

          <div className="register-form-grid register-form-grid-three">
            <div className="register-field">
              <label htmlFor="register-job-title">Cargo ou função</label>
              <input
                id="register-job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Ex.: recepção"
                maxLength={PROFILE_LIMITS.jobTitle}
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-department">Setor</label>
              <input
                id="register-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex.: UTI"
                maxLength={PROFILE_LIMITS.department}
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-unit">Unidade</label>
              <input
                id="register-unit"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Ex.: UPA Centro"
                maxLength={PROFILE_LIMITS.unitName}
              />
            </div>
          </div>

          <div className="register-form-grid register-form-grid-two">
            <div className="register-field">
              <label htmlFor="register-password">Senha</label>
              <PasswordField
                id="register-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 10 caracteres"
                required
                minLength={10}
                maxLength={PROFILE_LIMITS.password}
                autoComplete="new-password"
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-confirm-password">Confirmar senha</label>
              <PasswordField
                id="register-confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                required
                minLength={10}
                maxLength={PROFILE_LIMITS.password}
                autoComplete="new-password"
              />
            </div>
          </div>

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
      <SiteFooter />
    </div>
  );
}

