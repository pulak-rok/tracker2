"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Directly sign in to bypass email confirmation step if configured or auto-session
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // If email confirmation is strictly required by Supabase dashboard settings, show helpful hint
      setError("Account created! Please check your Supabase settings if email confirmation is enabled, or sign in directly.");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-terminal-surface border border-terminal-border rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-profit-muted border border-profit-border flex items-center justify-center text-profit">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">TradePulse Command</h1>
            <p className="text-xs text-gray-400">Create your trading terminal account</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-loss-muted border border-loss-border rounded-lg text-sm text-loss">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@example.com"
                className="w-full bg-terminal-elevated border border-terminal-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-profit"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password (min 6 chars)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-terminal-elevated border border-terminal-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-profit"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-profit hover:bg-profit/90 text-black font-semibold rounded-lg py-2.5 text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-profit/10"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account & Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-profit hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
