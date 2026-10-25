import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Moon } from "lucide-react";
import { supabase } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — InvitingYou" },
      { name: "description", content: "Sign in to your InvitingYou invitation account." },
      { property: "og:title", content: "Sign in — InvitingYou" },
      { property: "og:description", content: "Sign in to your InvitingYou invitation account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignIn,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS = "Invalid username/email or password";

function SignIn() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const raw = identifier.trim();
    if (!raw) {
      setError("Enter your username or email");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    const looksLikeEmail = raw.includes("@");
    if (looksLikeEmail && !EMAIL_PATTERN.test(raw)) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      let loginEmail = raw.toLowerCase();
      if (!looksLikeEmail) {
        const { data: email, error: lookupError } = await supabase.rpc("username_login_address", {
          requested_username: raw,
          requested_password: password,
        });
        if (lookupError) {
          console.error("Username lookup failed", lookupError);
          setError("Sign-in is temporarily unavailable. Please try again.");
          return;
        }
        if (!email) {
          setError(INVALID_CREDENTIALS);
          return;
        }
        loginEmail = String(email).toLowerCase();
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (signInError) {
        setError(
          signInError.code === "invalid_credentials" ||
            /invalid login credentials/i.test(signInError.message)
            ? INVALID_CREDENTIALS
            : "Sign-in failed. Please try again.",
        );
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Session storage is blocked in this browser. Allow storage and try again.");
        return;
      }

      toast.success("Signed in");
      await navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      console.error("Sign-in failed", err);
      setError("Sign-in failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-stone-200 bg-white p-7 shadow-xs">
        <div className="space-y-1.5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-lg font-medium text-[#263c3a]"
          >
            <Moon size={18} />
            <span>
              inviting<span className="text-[#9d684f]">you.</span>
            </span>
          </Link>
          <h1 className="pt-2 text-xl font-semibold tracking-tight text-stone-900">
            Partner sign in
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="identifier">Username or email</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username or email"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              disabled={busy}
            />
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="border-t border-stone-100 pt-4 text-xs leading-relaxed text-muted-foreground">
          Need access or credits? Contact the InvitingYou representative for your shop.
        </p>
      </div>
    </main>
  );
}
