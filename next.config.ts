import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  turbopack: { root: "/root/ai_projects/claude_projects/closer_os" },
};
export default nextConfig;
