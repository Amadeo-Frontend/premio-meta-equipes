import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit', 'pdfkit-table']
};

export default nextConfig;
