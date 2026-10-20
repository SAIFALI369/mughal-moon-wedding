import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/sign-in")({
  component: SignIn,
});

// Email-shaped input is checked against Supabase Auth directly. That keeps
// accounts created before the username-only migration usable: they have an
// auth.users row and password but no public.profiles row for the RPC to find.
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
          setError("Sign-in is temporarily unavailable. Please try again in a moment.");
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

      // A blocked storage adapter can accept the grant but drop the session.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError(
          "Signed in, but this browser blocked session storage. Allow storage for this site and try again.",
        );
        return;
      }

      toast.success("Welcome back!");
      await navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      console.error("Sign-in failed", err);
      setError("Sign-in failed. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="font-arabic text-lg text-gold">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <CardTitle className="font-serif text-3xl">Partner sign in</CardTitle>
          <CardDescription>
            Exclusive access for printing-shop partners. Use the login issued to your shop.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or email</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Your username or account email"
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
                disabled={busy}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-burgundy text-ivory hover:bg-burgundy/90"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Already have an account in Supabase? Sign in with that email address and password.
          </p>
          <div className="mt-5 rounded-lg border border-gold/20 bg-muted/40 p-4 text-sm leading-relaxed">
            <p className="font-medium">By invitation. For your printing business.</p>
            <p className="mt-2 text-muted-foreground">
              ₹1,000 in cash includes 10 digital card credits. Your account is created personally by
              InvitingYou after payment—there is no online registration or checkout.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Need access, more credits, or a password reset? Contact the InvitingYou representative
              who visited your shop. Do not create a replacement account.
            </p>
          </div>
          <div className="mt-2 text-center text-sm">
            <Link to="/" className="text-muted-foreground underline">
              ← Back to partner portal
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
