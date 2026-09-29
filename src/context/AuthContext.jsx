import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  clearAuthToken,
  ensureCsrfToken,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  verifyLoginMfa as verifyLoginMfaRequest,
} from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const me = await getMe();
      await ensureCsrfToken();
      setUser(me);
      return me;
    } catch {
      clearAuthToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(email, password) {
    const result = await loginRequest(email, password);
    if (result?.status === "verification_required") {
      return result;
    }

    const loggedUser = await loadUser();

    if (!loggedUser) {
      throw new Error(
        "O login foi aceito, mas a sessão não pôde ser iniciada. Verifique a configuração do cookie da API local."
      );
    }

    return loggedUser;
  }

  async function handleVerifyLoginMfa(challengeId, code) {
    await verifyLoginMfaRequest(challengeId, code);
    const loggedUser = await loadUser();
    if (!loggedUser) {
      throw new Error("Não foi possível iniciar a sessão. Tente entrar novamente.");
    }
    return loggedUser;
  }

  async function handleLogout() {
    await logoutRequest();
    setUser(null);
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login: handleLogin,
    verifyLoginMfa: handleVerifyLoginMfa,
    logout: handleLogout,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return ctx;
}

