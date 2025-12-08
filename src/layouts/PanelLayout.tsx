"use client";

import Sidebar from "@/components/layout/Sidebar";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Sidebar (Fixed) */}
      <Sidebar />

      {/* Main Content Area */}
      {/* Added md:ml-64 to push content to the right of fixed sidebar on desktop */}
      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-64">

        {/* Header / Top bar placeholder */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-8 flex justify-end md:justify-between items-center sticky top-0 z-30">
          <h2 className="text-lg font-semibold text-gray-800 hidden md:block">
            {/* Title could be dynamic based on pathname if needed, 
                            but usually pages render their own title blocks.
                            Leaving empty or generic for now.
                        */}
            Panel de Control
          </h2>

          <div className="flex items-center gap-4">
            {/* Placeholder for user menu or notifications */}
            <div className="text-sm text-gray-500">Hola, Usuario</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
