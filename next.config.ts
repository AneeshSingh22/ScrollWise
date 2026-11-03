import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // The commit this bundle was built from, inlined at build time. The app
    // compares it with /api/version to notice when a newer deploy (e.g. a
    // topic added by /new-topic) is live, and offers a one-tap refresh.
    BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
  },
};

export default nextConfig;
