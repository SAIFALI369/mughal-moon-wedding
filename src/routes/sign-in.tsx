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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const raw = username.trim();
    if (!raw) {
      setError("Enter your username");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    setBusy(true);
    try {
      const { data: email, error: lookupError } = await supabase.rpc("username_login_address", { requested_username: raw, requested_password: password });
      if (lookupError || !email) {
        setError("Invalid username or password");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      if (error) {
        setError("Invalid username or password");
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
          <CardDescription>Use your username and password to manage your wedding invitations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
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
            Forgot your password? There is no password recovery. Create a new account with a different username.
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
