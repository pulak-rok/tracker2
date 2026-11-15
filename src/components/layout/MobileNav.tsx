"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  BookOpen,
  BarChart3,
  Calculator,
} from "lucide-react";

const mobileNav = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Roadmaps", href: "/roadmaps", icon: Target },
  { name: "Journal", href: "/journal", icon: BookOpen },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Calculator", href: "/calculator", icon: Calculator },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-terminal-surface border-t border-terminal-border z-50 px-4 py-2 flex justify-around items-center">
      {mobileNav.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium ${
              isActive ? "text-profit" : "text-gray-400 hover:text-white"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
