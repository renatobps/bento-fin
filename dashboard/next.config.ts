import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite hot-reload ao acessar o dev server pelo IP da rede local
  allowedDevOrigins: ["192.168.1.9", "localhost", "127.0.0.1"],
};

export default nextConfig;
