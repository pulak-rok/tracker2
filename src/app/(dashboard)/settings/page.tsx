"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check } from "lucide-react";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || "");
        setCurrency(data.currency || "USD");
        setTelegramChatId(data.telegram_chat_id || "");
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          currency,
          telegram_chat_id: telegramChatId.trim() || null,
        })
        .eq("id", user.id);
      setSaved(true);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-profit" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Terminal Settings</h1>
        <p className="text-xs text-gray-400 mt-1">Manage your trader profile, currency, and Telegram bot link.</p>
      </div>

      <form onSubmit={handleSave} className="bg-terminal-surface border border-terminal-border rounded-xl p-6 space-y-4 text-xs">
        <div>
          <label className="block text-gray-400 mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
          />
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Account Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 mb-1">Telegram Chat ID</label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="Send /start to your bot to get your Chat ID"
            className="w-full bg-terminal-elevated border border-terminal-border rounded-lg p-2.5 text-white font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-profit hover:bg-profit/90 text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saved ? "Saved" : "Save Preferences"}
        </button>
      </form>
    </div>
  );
}
