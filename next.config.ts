import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: 'export',
  // Base path for GitHub Pages project site
  basePath: '/sql-query-learning',

  webpack: (config) => {
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
