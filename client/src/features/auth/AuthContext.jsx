import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authApi } from '../../api/auth.js';
import {
  clearAccessToken,
  setAccessToken,
  setUnauthenticatedHandler,
} from '../../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  const handleUnauthenticated = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(handleUnauthenticated);
  }, [handleUnauthenticated]);

  /** Try to restore session from httpOnly refresh cookie on mount. */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    authApi
      .refresh()
      .then((data) => {
        setAccessToken(data.accessToken);
        return authApi.me();
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        clearAccessToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    setAccessToken(data.accessToken);
    const me = await authApi.me();
    setUser(me.user);
    return me.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    await authApi.register({ name, email, password });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

