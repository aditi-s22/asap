import React, { createContext, useState, useEffect } from 'react';
import { setAuthToken, setOnSessionExpired, refreshAccessToken, logoutUser } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnSessionExpired(() => {
      localStorage.removeItem('asap_user');
      localStorage.removeItem('asap_refresh_token');
      setAuthToken(null);
      setUser(null);
    });

    // The access token is never persisted to localStorage. On load, use the stored
    // refresh token (as fallback) or httpOnly refresh cookie to silently re-establish
    // the session — this is what survives a page reload or browser restart.
    const bootstrapSession = async () => {
      try {
        const storedRefresh = localStorage.getItem('asap_refresh_token');
        const res = await refreshAccessToken(storedRefresh);
        if (res.data.refreshToken) {
          localStorage.setItem('asap_refresh_token', res.data.refreshToken);
        }
        setAuthToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('asap_user', JSON.stringify(res.data.user));
      } catch {
        setAuthToken(null);
        localStorage.removeItem('asap_user');
        localStorage.removeItem('asap_refresh_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  // Used right after login/register/google-auth, where the server has just issued a
  // fresh access token + set the refresh cookie.
  const login = (token, userData, refreshToken) => {
    localStorage.setItem('asap_user', JSON.stringify(userData));
    if (refreshToken) {
      localStorage.setItem('asap_refresh_token', refreshToken);
    }
    setAuthToken(token);
    setUser(userData);
  };

  // Used when the user object changes (e.g. profile edit, host application) without a
  // new token being issued — keeps the existing session, just refreshes the cached user.
  const updateUser = (userData) => {
    localStorage.setItem('asap_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Clear local state regardless of whether the network call succeeds.
    }
    localStorage.removeItem('asap_user');
    localStorage.removeItem('asap_refresh_token');
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
