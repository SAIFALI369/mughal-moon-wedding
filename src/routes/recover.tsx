import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/recover")({
  component: Recover,
});

function Recover() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const em = email.trim().toLowerCase();
    if (!em.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo });
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
      toast.success("Password recovery email sent! Check your inbox.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-3xl">Password recovery</CardTitle>
          <CardDescription>
            Enter your email and we’ll send you a secure link to reset your password. Works with any account created with email &amp; password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full bg-burgundy text-ivory hover:bg-burgundy/90">
                {busy ? "Sending…" : "Send recovery email"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm">We’ve sent a recovery link to <strong>{email}</strong> if an account exists. Click it to set a new password.</p>
              <p className="text-xs text-muted-foreground">Link expires in an hour. Didn’t get it? Check spam or try again.</p>
            </div>
          )}
          <div className="mt-6 text-center text-sm space-y-2">
            <div>
              <Link to="/sign-in" className="text-burgundy underline">
                ← Back to sign in
              </Link>
            </div>
            <div>
              <Link to="/" className="text-muted-foreground underline">
                Back to invitation
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
