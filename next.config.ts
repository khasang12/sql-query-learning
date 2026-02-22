import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // WASM support for PGlite
    config.experiments = {
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
    };

    // Important: return the modified config
    return config;
  },
  // Empty turbopack config to use webpack
  turbopack: {},
};

export default nextConfig;
