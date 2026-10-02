import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient.js";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<User | null>;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (): Promise<User | null> => {
    try {
      const res = await apiClient.get<any>("/api/auth/me");
      const userData = res && "id" in res ? res : res?.user || null;
      setUser(userData);
      return userData;
    } catch (_) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    const res = await apiClient.post<any>("/api/auth/login", credentials);
    const userData = res && "id" in res ? res : res?.user || null;
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await apiClient.post("/api/auth/logout", {});
    } catch (_) {
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, fetchUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      loading: false,
      setUser: () => {},
      fetchUser: async () => null,
      login: async () => { throw new Error("AuthProvider missing"); },
      logout: async () => {},
    };
  }
  return context;
};
