import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // El PDF de cotizaciones lee public/logo-pagina.png con fs; en Vercel serverless los archivos de
  // public/ no van dentro de la función a menos que se incluyan explícitamente.
  outputFileTracingIncludes: {
    "/api/quotes/[id]/pdf": ["./public/logo-pagina.png"],
    "/api/quotes/[id]/send": ["./public/logo-pagina.png"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },
};

export default nextConfig;
