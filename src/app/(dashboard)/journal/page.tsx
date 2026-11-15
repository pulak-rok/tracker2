import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function GlobalJournalPage() {
  const supabase = createClient();

  const { data: records } = await supabase
    .from("daily_records")
    .select("*, roadmaps(name)")
    .order("trade_date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Global Trade Journal</h1>
        <p className="text-xs text-gray-400 mt-1">All recorded trading sessions across your roadmaps.</p>
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-6 shadow-xl overflow-x-auto">
        {!records || records.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center">No daily records logged yet.</p>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-terminal-border text-gray-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Roadmap</th>
                <th className="py-3 px-4">Session</th>
                <th className="py-3 px-4">W / L / BE</th>
                <th className="py-3 px-4">Net P/L</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {records.map((rec: any) => (
                <tr key={rec.id} className="hover:bg-terminal-elevated/40">
                  <td className="py-3 px-4 font-mono text-white">{rec.trade_date}</td>
                  <td className="py-3 px-4">
                    <Link href={`/roadmaps/${rec.roadmap_id}`} className="text-profit hover:underline">
                      {rec.roadmaps?.name || "Roadmap"}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{rec.session || "—"}</td>
                  <td className="py-3 px-4 font-mono">
                    {rec.wins}W / {rec.losses}L / {rec.break_evens}BE
                  </td>
                  <td
                    className={`py-3 px-4 font-mono font-bold ${
                      Number(rec.net_pl) >= 0 ? "text-profit" : "text-loss"
                    }`}
                  >
                    {formatCurrency(Number(rec.net_pl), "USD", true)}
                  </td>
                  <td className="py-3 px-4 text-gray-400 max-w-xs truncate">{rec.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
