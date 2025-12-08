"use client";

import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* Sidebar (Fixed) */}
      <Sidebar />

      {/* Main Content Area */}
      {/* Added md:ml-64 to push content to the right of fixed sidebar on desktop */}
      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-64">

        {/* Header / Top bar placeholder */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-8 flex justify-end md:justify-between items-center sticky top-0 z-30">
          <h2 className="text-lg font-semibold text-gray-800 hidden md:block">
            Panel de Control
          </h2>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Hola, <span className="font-semibold text-gray-700">{user?.full_name?.split(" ")[0] || "Usuario"}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
