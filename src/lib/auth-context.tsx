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
      if (data.session?.user) void ensureProfile(data.session.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      if (nextSession?.user) void ensureProfile(nextSession.user);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function ensureProfile(u: User) {
    try {
      const username = (u.user_metadata as Record<string, unknown>)?.username as string | undefined;
      const email = u.email;
      if (!username || !email || !u.id) return;
      const { data } = await supabase.from("profiles").select("id").eq("id", u.id).maybeSingle();
      if (!data) {
        await supabase.from("profiles").insert({ id: u.id, username, email });
      }
    } catch {
      // non-critical
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>{children}</AuthContext.Provider>
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
  return (meta.username as string) || (meta.user_name as string) || (app.username as string) || "";
}
