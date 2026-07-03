import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "remotion",
    "@remotion/player",
    "@remotion/google-fonts",
  ],
  // These are Node.js-only native packages — never bundle them with Webpack
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "@remotion/cli",
    "@remotion/compositor-win32-x64-msvc",
    "sharp",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent server-side Webpack from trying to bundle native Remotion packages
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals ?? {}]),
        "@remotion/renderer",
        "@remotion/bundler",
        "@remotion/cli",
        "sharp",
      ];
    }
    return config;
  },
};

export default nextConfig;
