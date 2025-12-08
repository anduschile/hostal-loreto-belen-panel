"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { menuItems } from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Infer title from path
  const currentItem = menuItems.find(item => item.path === pathname) || menuItems.find(item => pathname.startsWith(item.path) && item.path !== "/panel");
  const pageTitle = currentItem ? currentItem.name : "Panel";

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">

      {/* Responsive Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuClick={() => setIsSidebarOpen(true)}
          title={pageTitle}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
