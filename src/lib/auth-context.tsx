import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

const OFFLINE_USER_KEY = "invitingyou:offline-user:v1";

function cacheOfflineUser(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(OFFLINE_USER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function readCachedOfflineUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OFFLINE_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const resolvedUser =
          data.session?.user ??
          (typeof navigator !== "undefined" && navigator.onLine === false
            ? readCachedOfflineUser()
            : null);
        if (data.session?.user) cacheOfflineUser(data.session.user);
        setSession(data.session);
        setUser(resolvedUser);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        const fallback =
          typeof navigator !== "undefined" && navigator.onLine === false
            ? readCachedOfflineUser()
            : null;
        setUser(fallback);
        setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (nextSession?.user) {
        cacheOfflineUser(nextSession.user);
      } else if (event === "SIGNED_OUT") {
        cacheOfflineUser(null);
      }
      if (
        !nextSession &&
        event !== "SIGNED_OUT" &&
        typeof navigator !== "undefined" &&
        navigator.onLine === false
      ) {
        const fallback = readCachedOfflineUser();
        if (fallback) {
          setUser(fallback);
          setLoading(false);
          return;
        }
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const handleOnline = () => {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!mounted) return;
          if (data.session?.user) {
            cacheOfflineUser(data.session.user);
            setSession(data.session);
            setUser(data.session.user);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("online", handleOnline);

    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    cacheOfflineUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Allow signing out locally even if offline
    }
    setSession(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function getUsernameFromUser(user: User | null): string {
  if (!user) return "";
  // username may be in user_metadata or app_metadata
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const app = (user.app_metadata || {}) as Record<string, unknown>;
  const stored =
    (meta.username as string) ||
    (meta.user_name as string) ||
    (meta.preferred_username as string) ||
    (app.username as string) ||
    "";
  if (stored) return stored;

  // Accounts created directly in Supabase Auth (before the username migration)
  // have no username metadata. Use the email local part for display, but never
  // expose the UUID-based internal identifier used by app-created accounts.
  const email = user.email?.trim() ?? "";
  if (!email || /@accounts\.invalid$/i.test(email)) return "";
  return email.split("@")[0]?.trim() ?? "";
}
