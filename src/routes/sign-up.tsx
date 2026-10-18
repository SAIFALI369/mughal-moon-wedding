import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/sign-up")({
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    // already signed in
    // keep form but also offer dashboard
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const em = email.trim().toLowerCase();
    if (u.length < 3 || u.length > 30) {
      setError("Username must be 3–30 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(u)) {
      setError("Username may contain letters, numbers, dot, hyphen and underscore.");
      return;
    }
    if (!em || !em.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const { data, error: signError } = await supabase.auth.signUp({
        email: em,
        password,
        options: { data: { username: u } },
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      // Create profile row (if session present)
      const newUser = data.user;
      if (newUser) {
        // Try to insert profile - requires authenticated session; after signUp user is often auto-logged in
        // Use small delay to ensure session is set
        try {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: newUser.id,
            username: u,
            email: em,
          });
          if (profileError && !profileError.message.includes("duplicate")) {
            // If duplicate username/email, surface error but account exists
            console.error(profileError);
            if (profileError.code === "23505") {
              setError("Username or email already taken. Please choose another.");
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      toast.success("Account created! Check your email to confirm, then sign in.");
      navigate({ to: "/sign-in" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="font-arabic text-lg text-gold">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <CardTitle className="font-serif text-3xl">Create your invitation account</CardTitle>
          <CardDescription>
            Username, email and password to manage your personal wedding cards. Up to 3 active cards, stored privately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. mohsin_simran"
                maxLength={30}
                required
                autoComplete="username"
              />
              <p className="text-xs text-muted-foreground">3–30 chars, letters/numbers/._- (unique)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">Used for sign-in and password recovery.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full bg-burgundy text-ivory hover:bg-burgundy/90">
              {busy ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link to="/sign-in" className="text-burgundy underline">
              Sign in
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
