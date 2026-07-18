import { useEffect, useState } from "react";
import {
  confirmEmailChange,
  confirmPasswordChange,
  requestEmailChange,
  requestPasswordChange,
  updateMe,
} from "../api/api";
import Icon from "../components/Icon";
import PasswordField from "../components/PasswordField";
import Topbar from "../components/Topbar";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/AuthContext";
import {
  fileToAvatarDataUrl,
  getUserAvatar,
  removeUserAvatar,
  saveUserAvatar,
} from "../utils/avatar";
import {
  PHONE_COUNTRIES,
  getPhoneCountry,
  onlyDigits,
  parsePhoneValue,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
  validateShortText,
} from "../utils/validation";

const ROLE_LABELS = {
  user: "Usuário",
  technician: "Técnico",
  admin: "Administrador",
};

const PROFILE_LIMITS = {
  name: 100,
  email: 254,
  password: 128,
  jobTitle: 40,
  department: 30,
  unitName: 80,
};

const DEFAULT_RESEND_SECONDS = 300;

function verificationMessage(result, fallback) {
  const minutes = result?.expires_in_minutes;
  const expiration = minutes ? ` O código expira em ${minutes} minutos.` : "";
  return `${result?.message || fallback}${expiration}`;
}

function secondsFromVerification(result) {
  return Number(result?.expires_in_minutes || 15) * 60;
}

function resendSecondsFromVerification(result) {
  return Number(result?.resend_after_seconds || DEFAULT_RESEND_SECONDS);
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const initialPhone = parsePhoneValue(user?.phone);
  const [name, setName] = useState(user?.name || "");
  const [phoneCountry, setPhoneCountry] = useState(initialPhone.countryCode);
  const [phone, setPhone] = useState(initialPhone.nationalNumber);
  const [jobTitle, setJobTitle] = useState(user?.job_title || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [unitName, setUnitName] = useState(user?.unit_name || "");
  const [notificationPreference, setNotificationPreference] = useState(
    user?.notification_preference || "email"
  );
  const [avatarSrc, setAvatarSrc] = useState(() => getUserAvatar(user));

  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailAwaitingCode, setEmailAwaitingCode] = useState(false);
  const [emailTimeLeft, setEmailTimeLeft] = useState(0);
  const [emailResendLeft, setEmailResendLeft] = useState(0);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordAwaitingCode, setPasswordAwaitingCode] = useState(false);
  const [passwordTimeLeft, setPasswordTimeLeft] = useState(0);
  const [passwordResendLeft, setPasswordResendLeft] = useState(0);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    const parsedPhone = parsePhoneValue(user?.phone);
    setPhoneCountry(parsedPhone.countryCode);
    setPhone(parsedPhone.nationalNumber);
    setJobTitle(user?.job_title || "");
    setDepartment(user?.department || "");
    setUnitName(user?.unit_name || "");
    setNotificationPreference(user?.notification_preference || "email");
    setNewEmail(user?.email || "");
    setAvatarSrc(getUserAvatar(user));
  }, [user]);

  useEffect(() => {
    if (!emailAwaitingCode || (emailTimeLeft <= 0 && emailResendLeft <= 0)) return undefined;

    const timer = window.setInterval(() => {
      setEmailTimeLeft((current) => Math.max(0, current - 1));
      setEmailResendLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [emailAwaitingCode, emailTimeLeft, emailResendLeft]);

  useEffect(() => {
    if (!passwordAwaitingCode || (passwordTimeLeft <= 0 && passwordResendLeft <= 0)) return undefined;

    const timer = window.setInterval(() => {
      setPasswordTimeLeft((current) => Math.max(0, current - 1));
      setPasswordResendLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [passwordAwaitingCode, passwordTimeLeft, passwordResendLeft]);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await updateMe({
        name: validateName(name),
        phone: validatePhone(phone, false, phoneCountry),
        jobTitle: validateShortText(jobTitle, "Cargo", { maxLength: PROFILE_LIMITS.jobTitle }),
        department: validateShortText(department, "Setor", { maxLength: PROFILE_LIMITS.department }),
        unitName: validateShortText(unitName, "Unidade", { maxLength: PROFILE_LIMITS.unitName }),
        notificationPreference,
      });
      await refreshUser();
      setMessage("Perfil atualizado.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function requestEmailCode(event) {
    event?.preventDefault();
    setEmailError("");
    setEmailMessage("");
    setEmailBusy(true);
    try {
      const result = await requestEmailChange({
        newEmail: validateEmail(newEmail),
        currentPassword: emailPassword,
      });
      setEmailAwaitingCode(true);
      setEmailTimeLeft(secondsFromVerification(result));
      setEmailResendLeft(resendSecondsFromVerification(result));
      setEmailCode("");
      setEmailMessage(verificationMessage(result, "Código enviado para confirmação do email."));
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function confirmEmailCode(event) {
    event.preventDefault();
    setEmailError("");
    setEmailMessage("");
    setEmailBusy(true);
    try {
      await confirmEmailChange({
        newEmail: validateEmail(newEmail),
        code: emailCode,
      });
      setEmailPassword("");
      setEmailCode("");
      setEmailAwaitingCode(false);
      setEmailTimeLeft(0);
      setEmailResendLeft(0);
      await refreshUser();
      setEmailMessage("Email alterado com confirmação.");
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function requestPasswordCode(event) {
    event?.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    setPasswordBusy(true);
    try {
      const result = await requestPasswordChange({
        currentPassword,
        newPassword: validatePassword(newPassword),
      });
      setPasswordAwaitingCode(true);
      setPasswordTimeLeft(secondsFromVerification(result));
      setPasswordResendLeft(resendSecondsFromVerification(result));
      setPasswordCode("");
      setPasswordMessage(verificationMessage(result, "Código enviado para confirmação da senha."));
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordBusy(false);
    }
  }

  async function confirmPasswordCode(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    setPasswordBusy(true);
    try {
      await confirmPasswordChange({
        newPassword: validatePassword(newPassword),
        code: passwordCode,
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordCode("");
      setPasswordAwaitingCode(false);
      setPasswordTimeLeft(0);
      setPasswordResendLeft(0);
      setPasswordMessage("Senha alterada com confirmação.");
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordBusy(false);
    }
  }

  function resetEmailVerification() {
    setEmailAwaitingCode(false);
    setEmailCode("");
    setEmailTimeLeft(0);
    setEmailResendLeft(0);
    setEmailMessage("");
    setEmailError("");
  }

  function resetPasswordVerification() {
    setPasswordAwaitingCode(false);
    setPasswordCode("");
    setPasswordTimeLeft(0);
    setPasswordResendLeft(0);
    setPasswordMessage("");
    setPasswordError("");
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError("");
    setAvatarMessage("");
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await updateMe({ avatarImage: dataUrl });
      saveUserAvatar(user, dataUrl);
      setAvatarSrc(dataUrl);
      await refreshUser();
      setAvatarMessage("Foto atualizada e salva no perfil.");
    } catch (err) {
      setAvatarError(err.message);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError("");
    setAvatarMessage("");
    try {
      await updateMe({ avatarImage: "" });
      removeUserAvatar(user);
      setAvatarSrc("");
      await refreshUser();
      setAvatarMessage("Foto removida do perfil.");
    } catch (err) {
      setAvatarError(err.message);
    }
  }

  return (
    <>
      <Topbar title="Perfil" subtitle="Dados da sua conta" />
      <main className="main profile-page">
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <section className="profile-identity panel">
          <div className="profile-identity-main">
            <UserAvatar user={user} src={avatarSrc} size={76} className="profile-avatar" />
            <div className="profile-identity-text">
              <span>Minha conta</span>
              <h3>{user?.name || "Usuário"}</h3>
              <p>{ROLE_LABELS[user?.role] || user?.role || "Usuário"}</p>
            </div>
          </div>
          <div className="profile-avatar-actions">
            <input
              id="profile-avatar-file"
              className="avatar-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <label className="avatar-upload-button" htmlFor="profile-avatar-file">
              <Icon name="camera" />
              Alterar foto
            </label>
            {avatarSrc && (
              <button type="button" className="ghost" onClick={handleRemoveAvatar}>
                <Icon name="trash" />
                Remover
              </button>
            )}
            {avatarError && <p className="error compact-feedback">{avatarError}</p>}
            {avatarMessage && <p className="success compact-feedback">{avatarMessage}</p>}
          </div>
        </section>

        <div className="dashboard-grid">
          <form className="panel" onSubmit={saveProfile}>
            <h3>
              <Icon name="user" />
              DADOS DO PERFIL
            </h3>
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={PROFILE_LIMITS.name} />
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
              placeholder="Ex.: recepção, enfermagem, técnico de TI"
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
            <label>Preferência de notificação</label>
            <select
              value={notificationPreference}
              onChange={(e) => setNotificationPreference(e.target.value)}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp futuramente</option>
              <option value="both">Email e WhatsApp futuramente</option>
            </select>
            <button type="submit">
              <Icon name="save" />
              Salvar perfil
            </button>
          </form>

          <form
            className="panel secure-panel"
            onSubmit={emailAwaitingCode ? confirmEmailCode : requestEmailCode}
          >
            <h3>
              <Icon name="mail" />
              EMAIL DE ACESSO
            </h3>
            <p className="muted-note">Email atual: {user?.email}</p>
            <label>Novo email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setEmailAwaitingCode(false);
                setEmailCode("");
                setEmailResendLeft(0);
                setEmailMessage("");
                setEmailError("");
              }}
              autoComplete="email"
              disabled={emailAwaitingCode}
              maxLength={PROFILE_LIMITS.email}
              required
            />
            <label>Senha atual</label>
            <PasswordField
              value={emailPassword}
              onChange={(e) => {
                setEmailPassword(e.target.value);
                setEmailError("");
              }}
              autoComplete="current-password"
              disabled={emailAwaitingCode}
              maxLength={PROFILE_LIMITS.password}
              required
            />
            {emailAwaitingCode && (
              <>
                <div className="verification-lock">
                  <Icon name="shield" />
                  <span>Digite o código recebido. Ele tem tempo limitado e só vale para este email.</span>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => requestEmailCode()}
                    disabled={emailBusy || emailResendLeft > 0}
                  >
                    Reenviar código
                  </button>
                </div>
                <div className={`code-timer ${emailTimeLeft <= 60 ? "is-ending" : ""}`}>
                  <Icon name="clock" />
                  <span>{emailTimeLeft > 0 ? `Expira em ${formatTimer(emailTimeLeft)}` : "Código expirado"}</span>
                  <span className="resend-hint">
                    {emailResendLeft > 0 ? `Reenvio em ${formatTimer(emailResendLeft)}` : "Reenvio liberado"}
                  </span>
                </div>
                <label>Código recebido por email</label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => {
                    setEmailCode(e.target.value.replace(/\D/g, ""));
                    setEmailError("");
                  }}
                  placeholder="000000"
                  required
                />
                <button type="button" className="ghost small change-request" onClick={resetEmailVerification}>
                  Alterar email ou senha atual
                </button>
              </>
            )}
            {emailError && <p className="error compact-feedback">{emailError}</p>}
            {emailMessage && <p className="success compact-feedback">{emailMessage}</p>}
            <button
              type="submit"
              className="secondary"
              disabled={emailBusy || (emailAwaitingCode && (emailTimeLeft <= 0 || emailCode.length !== 6))}
            >
              <Icon name={emailAwaitingCode ? "check" : "mail"} />
              {emailBusy ? "Processando..." : emailAwaitingCode ? "Confirmar email" : "Enviar código"}
            </button>
          </form>

          <form
            className="panel secure-panel"
            onSubmit={passwordAwaitingCode ? confirmPasswordCode : requestPasswordCode}
          >
            <h3>
              <Icon name="lock" />
              SENHA
            </h3>
            <label>Senha atual</label>
            <PasswordField
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (passwordAwaitingCode) resetPasswordVerification();
                setPasswordError("");
              }}
              autoComplete="current-password"
              disabled={passwordAwaitingCode}
              maxLength={PROFILE_LIMITS.password}
              required
            />
            <label>Nova senha</label>
            <PasswordField
              minLength={8}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordAwaitingCode(false);
                setPasswordCode("");
                setPasswordResendLeft(0);
                setPasswordMessage("");
                setPasswordError("");
              }}
              autoComplete="new-password"
              disabled={passwordAwaitingCode}
              maxLength={PROFILE_LIMITS.password}
              required
            />
            {passwordAwaitingCode && (
              <>
                <div className="verification-lock">
                  <Icon name="shield" />
                  <span>Digite o código recebido. Ele tem tempo limitado e só vale para esta nova senha.</span>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => requestPasswordCode()}
                    disabled={passwordBusy || passwordResendLeft > 0}
                  >
                    Reenviar código
                  </button>
                </div>
                <div className={`code-timer ${passwordTimeLeft <= 60 ? "is-ending" : ""}`}>
                  <Icon name="clock" />
                  <span>{passwordTimeLeft > 0 ? `Expira em ${formatTimer(passwordTimeLeft)}` : "Código expirado"}</span>
                  <span className="resend-hint">
                    {passwordResendLeft > 0
                      ? `Reenvio em ${formatTimer(passwordResendLeft)}`
                      : "Reenvio liberado"}
                  </span>
                </div>
                <label>Código recebido por email</label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={passwordCode}
                  onChange={(e) => {
                    setPasswordCode(e.target.value.replace(/\D/g, ""));
                    setPasswordError("");
                  }}
                  placeholder="000000"
                  required
                />
                <button type="button" className="ghost small change-request" onClick={resetPasswordVerification}>
                  Alterar senhas
                </button>
              </>
            )}
            {passwordError && <p className="error compact-feedback">{passwordError}</p>}
            {passwordMessage && <p className="success compact-feedback">{passwordMessage}</p>}
            <button
              type="submit"
              className="secondary"
              disabled={
                passwordBusy ||
                (passwordAwaitingCode && (passwordTimeLeft <= 0 || passwordCode.length !== 6))
              }
            >
              <Icon name="key" />
              {passwordBusy ? "Processando..." : passwordAwaitingCode ? "Confirmar senha" : "Enviar código"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}


