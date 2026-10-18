import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/sign-in")({
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const raw = emailOrUsername.trim();
    if (!raw) {
      setError("Enter your email or username");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    setBusy(true);
    try {
      let email = raw;
      // If input doesn't look like email, treat as username and resolve email via profiles
      if (!raw.includes("@")) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .ilike("username", raw)
          .limit(1)
          .maybeSingle();
        if (profileError) {
          console.error(profileError);
        }
        if (profile?.email) {
          email = profile.email;
        } else {
          setError("Username not found. Try your email instead.");
          return;
        }
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="font-arabic text-lg text-gold">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <CardTitle className="font-serif text-3xl">Sign in</CardTitle>
          <CardDescription>Use your email (or username) and password to manage your wedding invitations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrUsername">Email or Username</Label>
              <Input
                id="emailOrUsername"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="you@example.com or your username"
                required
                autoComplete="username"
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
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full bg-burgundy text-ivory hover:bg-burgundy/90">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link to="/recover" className="text-burgundy underline">
              Forgot your password? Recover via email
            </Link>
          </div>
          <div className="mt-4 text-center text-sm">
            No account yet?{" "}
            <Link to="/sign-up" className="text-burgundy underline">
              Create account
            </Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <Link to="/" className="text-muted-foreground underline">
              ← Back to invitation
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
