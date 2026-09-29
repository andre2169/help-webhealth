import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import PasswordField from "../components/PasswordField";
import { confirmAccountRecovery, requestAccountRecovery } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { validateEmail, validatePassword } from "../utils/validation";
import ThemeToggle from "../components/ThemeToggle";

function secondsFromVerification(result) {
  return Math.max(0, Number(result?.expires_in_minutes || 0) * 60);
}

function resendSecondsFromVerification(result) {
  return Math.max(0, Number(result?.resend_after_seconds || 0));
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function verificationMessage(result, fallback) {
  const minutes = result?.expires_in_minutes;
  const expiration = minutes ? ` O código expira em ${minutes} minutos.` : "";
  return `${result?.message || fallback}${expiration}`;
}

export default function Login() {
  const { login, verifyLoginMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginNotice, setLoginNotice] = useState(location.state?.notice || "");
  const [submitting, setSubmitting] = useState(false);
  const [loginChallenge, setLoginChallenge] = useState("");
  const [loginMfaCode, setLoginMfaCode] = useState("");

  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryAwaitingCode, setRecoveryAwaitingCode] = useState(false);
  const [recoveryTimeLeft, setRecoveryTimeLeft] = useState(0);
  const [recoveryResendLeft, setRecoveryResendLeft] = useState(0);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryError, setRecoveryError] = useState("");

  useEffect(() => {
    if (!recoveryAwaitingCode || (recoveryTimeLeft <= 0 && recoveryResendLeft <= 0)) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRecoveryTimeLeft((current) => Math.max(0, current - 1));
      setRecoveryResendLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [recoveryAwaitingCode, recoveryTimeLeft, recoveryResendLeft]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoginNotice("");
    setSubmitting(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser?.status === "verification_required") {
        setLoginChallenge(loggedUser.challenge_id);
        setLoginMfaCode("");
        setPassword("");
        setLoginNotice(loggedUser.message);
        return;
      }

      if (loggedUser && !loggedUser.email_verified) {
        navigate("/perfil", {
          state: {
            notice: "Confirme seu email para liberar a abertura de chamados. Digite o código recebido ou solicite um novo.",
          },
        });
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyLoginMfa(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const loggedUser = await verifyLoginMfa(loginChallenge, loginMfaCode);
      if (loggedUser && !loggedUser.email_verified) {
        navigate("/perfil", {
          state: {
            notice: "Confirme seu email para liberar a abertura de chamados. Digite o código recebido ou solicite um novo.",
          },
        });
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function requestRecoveryCode(event) {
    event?.preventDefault();
    setRecoveryError("");
    setRecoveryMessage("");
    setRecoveryBusy(true);

    try {
      const normalizedEmail = validateEmail(recoveryEmail);
      const newPassword = validatePassword(recoveryPassword);
      const result = await requestAccountRecovery({
        email: normalizedEmail,
        newPassword,
      });

      setRecoveryEmail(normalizedEmail);
      setRecoveryPassword(newPassword);
      setRecoveryAwaitingCode(true);
      setRecoveryCode("");
      setRecoveryTimeLeft(secondsFromVerification(result));
      setRecoveryResendLeft(resendSecondsFromVerification(result));
      setRecoveryMessage(
        verificationMessage(result, "Se houver uma conta com esse email, enviaremos um código.")
      );
    } catch (err) {
      setRecoveryError(err.message);
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function confirmRecoveryCode(event) {
    event.preventDefault();
    setRecoveryError("");
    setRecoveryMessage("");
    setRecoveryBusy(true);

    try {
      await confirmAccountRecovery({
        email: validateEmail(recoveryEmail),
        newPassword: validatePassword(recoveryPassword),
        code: recoveryCode,
      });

      setMode("login");
      setEmail(recoveryEmail);
      setPassword("");
      resetRecovery(false);
      setError("");
      setLoginNotice("Senha redefinida com sucesso. Entre usando a nova senha.");
    } catch (err) {
      setRecoveryError(err.message);
    } finally {
      setRecoveryBusy(false);
    }
  }

  function resetRecovery(clearEmail = true) {
    if (clearEmail) setRecoveryEmail("");
    setRecoveryPassword("");
    setRecoveryCode("");
    setRecoveryAwaitingCode(false);
    setRecoveryTimeLeft(0);
    setRecoveryResendLeft(0);
    setRecoveryMessage("");
    setRecoveryError("");
  }

  function showRecovery() {
    setMode("recovery");
    setLoginChallenge("");
    setLoginMfaCode("");
    setRecoveryEmail(email);
    setError("");
    setLoginNotice("");
    resetRecovery(false);
  }

  function showLogin() {
    setMode("login");
    setLoginChallenge("");
    setLoginMfaCode("");
    resetRecovery();
  }

  const isRecovery = mode === "recovery";

  return (
    <div className="auth-shell auth-shell-modern">
      <div className="auth-theme-control"><ThemeToggle compact /></div>
      <div className="card auth-card">
        <div className="card-brand">
          <div className="card-brand-mark"><Icon name="shield" size={20} /></div>
          <div>
            <strong style={{ display: "block", fontFamily: "var(--font-display)" }}>
              HelpWeb Health
            </strong>
          </div>
        </div>

        <h1>{isRecovery ? "Recuperar conta" : loginChallenge ? "Confirmar acesso" : "Entrar na conta"}</h1>
        <p>
          {isRecovery
            ? "Receba um código no email cadastrado para redefinir sua senha."
            : loginChallenge
              ? "Informe o código enviado ao email da sua conta para concluir o acesso."
              : "Acesse o sistema de chamados de TI."}
        </p>

        {!isRecovery ? (
          <form onSubmit={loginChallenge ? handleVerifyLoginMfa : handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              autoComplete="email"
              disabled={Boolean(loginChallenge)}
              required
            />

            {!loginChallenge ? (
              <>
                <label>Senha</label>
                <PasswordField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </>
            ) : (
              <>
                <label htmlFor="login-mfa-code">Código de acesso</label>
                <input
                  id="login-mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={loginMfaCode}
                  onChange={(event) =>
                    setLoginMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  required
                />
              </>
            )}

            {error && <p className="error">{error}</p>}
            {loginNotice && <p className="success compact-feedback">{loginNotice}</p>}

            <button type="submit" className="full" disabled={submitting}>
              <Icon name={loginChallenge ? "shield" : "logIn"} />
              {submitting
                ? loginChallenge ? "Confirmando…" : "Entrando…"
                : loginChallenge ? "Confirmar código" : "Entrar"}
            </button>
            {loginChallenge && (
              <button
                type="button"
                className="secondary full"
                onClick={() => {
                  setLoginChallenge("");
                  setLoginMfaCode("");
                  setLoginNotice("");
                }}
              >
                Voltar ao login
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={recoveryAwaitingCode ? confirmRecoveryCode : requestRecoveryCode}>
            <label>Email cadastrado</label>
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => {
                setRecoveryEmail(e.target.value);
                if (recoveryAwaitingCode) resetRecovery(false);
              }}
              placeholder="voce@empresa.com"
              autoComplete="email"
              disabled={recoveryAwaitingCode}
              required
            />

            <label>Nova senha</label>
            <PasswordField
              value={recoveryPassword}
              onChange={(e) => {
                setRecoveryPassword(e.target.value);
                if (recoveryAwaitingCode) resetRecovery(false);
              }}
              placeholder="Mínimo 10 caracteres"
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              disabled={recoveryAwaitingCode}
              required
            />

            {recoveryAwaitingCode && (
              <div className="recovery-verification">
                <div className={`code-timer ${recoveryTimeLeft <= 60 ? "is-ending" : ""}`}>
                  <Icon name="clock" />
                  <span>
                    {recoveryTimeLeft > 0
                      ? `Expira em ${formatTimer(recoveryTimeLeft)}`
                      : "Código expirado"}
                  </span>
                  <span className="resend-hint">
                    {recoveryResendLeft > 0
                      ? `Reenvio em ${formatTimer(recoveryResendLeft)}`
                      : "Reenvio liberado"}
                  </span>
                </div>

                <label>Código recebido por email</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={recoveryCode}
                  onChange={(e) =>
                    setRecoveryCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                />

                <button
                  type="button"
                  className="ghost full"
                  onClick={() => requestRecoveryCode()}
                  disabled={recoveryBusy || recoveryResendLeft > 0}
                >
                  <Icon name="refresh" />
                  Reenviar código
                </button>
              </div>
            )}

            {recoveryError && <p className="error compact-feedback">{recoveryError}</p>}
            {recoveryMessage && <p className="success compact-feedback">{recoveryMessage}</p>}

            <button
              type="submit"
              className="full"
              disabled={
                recoveryBusy ||
                (recoveryAwaitingCode && (recoveryTimeLeft <= 0 || recoveryCode.length !== 6))
              }
            >
              <Icon name={recoveryAwaitingCode ? "check" : "mail"} />
              {recoveryBusy
                ? "Processando..."
                : recoveryAwaitingCode
                  ? "Confirmar nova senha"
                  : "Enviar código"}
            </button>
          </form>
        )}

        <div className="auth-switch">
          {!isRecovery ? (
            <>
              <button type="button" className="auth-link-button" onClick={showRecovery}>
                Esqueci minha senha
              </button>
              <div className="auth-register-link">
                <span>Ainda não tem conta?</span>
                <Link to="/cadastro">Criar cadastro</Link>
              </div>
            </>
          ) : (
            <button type="button" className="auth-link-button" onClick={showLogin}>
              Voltar para o login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
