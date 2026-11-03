import { NextResponse } from "next/server";

/**
 * Which commit the live deployment was built from. The client compares this
 * with the commit baked into its own bundle (next.config.ts `BUILD_SHA`) to
 * notice a newer deploy and offer a refresh.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
