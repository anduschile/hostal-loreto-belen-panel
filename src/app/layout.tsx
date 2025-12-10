import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { ToasterProvider } from "@/components/ui/ToasterProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { getAppBaseUrl } from "@/lib/config/appUrl";

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Panel Hostal Loreto Belén",
    template: "%s | Panel Hostal Loreto Belén",
  },
  description: "Sistema de gestión de reservas, convenios corporativos y control financiero del Hostal Loreto Belén.",
  openGraph: {
    title: "Panel Hostal Loreto Belén",
    description: "Sistema de gestión de reservas, convenios corporativos y control financiero.",
    siteName: "Hostal Loreto Belén",
    locale: "es_CL",
    type: "website",
    images: [
      {
        url: "/og-hostal-loreto-belen.png",
        width: 1200,
        height: 630,
        alt: "Hostal Loreto Belén - Panel de Administración",
      },
    ],
  },
  icons: {
    icon: "/icon.svg",
    // Si tuvieramos apple touch icon:
    // apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <AuthProvider>
          {children}
          {/* Toaster global para toda la app */}
          <ToasterProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
