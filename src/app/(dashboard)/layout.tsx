import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-terminal-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
