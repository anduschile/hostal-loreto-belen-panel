import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { ToasterProvider } from "@/components/ui/ToasterProvider";

export const metadata: Metadata = {
  title: "Panel Hostal Loreto Belén",
  description: "Sistema de gestión de reservas para Hostal Loreto Belén",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        {children}

        {/* Toaster global para toda la app */}
        <ToasterProvider />
      </body>
    </html>
  );
}
