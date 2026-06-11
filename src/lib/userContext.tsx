"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signOut as nextAuthSignOut } from "next-auth/react";

import type { TierKey, BadgeKey } from "@/lib/traderTier";

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
  isAdmin:          boolean;
  tradeCount:       number;
  lastNameChangeAt: string | null;
  tier:             TierKey;
  badges:           BadgeKey[];
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

  const GUEST_STORAGE_KEY = "investmart_guest_id";

  const initDemo = useCallback(async () => {
    setLoading(true);
    try {
      // Retrieve or generate a per-browser UUID for this guest
      let guestId = localStorage.getItem(GUEST_STORAGE_KEY);
      if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem(GUEST_STORAGE_KEY, guestId);
      }
      await fetch("/api/demo/init", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ guestId }),
      });
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

  // Load user on mount — no auto-create; welcome page handles guest init
  useEffect(() => {
    async function init() {
      try {
        const res  = await fetch("/api/user/me");
        const data = (await res.json()) as { user: UserState | null };
        setUser(data.user);
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
