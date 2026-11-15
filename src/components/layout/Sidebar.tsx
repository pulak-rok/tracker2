'client';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Target, 
  BookOpen, 
  BarChart3, 
  Calculator, 
  History, 
  Settings, 
  LogOut,
  TrendingUp 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "My Roadmaps", href: "/roadmaps", icon: Target },
  { name: "Trade Journal", href: "/journal", icon: BookOpen },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Risk Calculator", href: "/calculator", icon: Calculator },
  { name: "Trade History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-terminal-surface border-r border-terminal-border shrink-0">
      <div className="p-6 border-b border-terminal-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-profit-muted border border-profit-border flex items-center justify-center text-profit shadow-sm">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-sm tracking-wide">TradePulse</h1>
          <p className="text-[10px] text-gray-400">Command Terminal</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-profit-muted text-profit border border-profit-border"
                  : "text-gray-400 hover:text-white hover:bg-terminal-elevated"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-terminal-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-loss hover:bg-loss-muted transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
