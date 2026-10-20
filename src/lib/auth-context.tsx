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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
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
