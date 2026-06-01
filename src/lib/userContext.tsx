"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signOut as nextAuthSignOut } from "next-auth/react";

interface Holding {
  ticker:   string;
  shares:   number;
  avgCost:  number;
  currency: string;
}

interface UserState {
  id:               string;
  name:             string | null;
  username:         string | null;
  bio:              string | null;
  email:            string | null;
  cashThb:          number;
  cashUsd:          number;
  holdings:         Holding[];
  isDemo:           boolean;
  lastNameChangeAt: string | null; // ISO string
}

interface UserContextValue {
  user:        UserState | null;
  loading:     boolean;
  refreshUser: () => Promise<void>;
  initDemo:    () => Promise<void>;
  signOut:     () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user:        null,
  loading:     true,
  refreshUser: async () => {},
  initDemo:    async () => {},
  signOut:     async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res  = await fetch("/api/user/me");
      const data = (await res.json()) as { user: UserState | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const initDemo = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/demo/init", { method: "POST" });
      await refreshUser();
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    await nextAuthSignOut({ redirect: false });
    await fetch("/api/auth/clear-demo", { method: "POST" });
    setUser(null);
  }, []);

  // Auto-create a demo session for new visitors so posting always works.
  // Real sign-in (Google / email) replaces the demo session.
  useEffect(() => {
    async function init() {
      try {
        const res  = await fetch("/api/user/me");
        const data = (await res.json()) as { user: UserState | null };
        if (data.user) {
          setUser(data.user);
          setLoading(false);
          return;
        }
        await fetch("/api/demo/init", { method: "POST" });
        const res2  = await fetch("/api/user/me");
        const data2 = (await res2.json()) as { user: UserState | null };
        setUser(data2.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, initDemo, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
