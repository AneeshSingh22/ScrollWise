import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and writes the rotated
 * cookies back. Without this, tokens expire while the PWA sits on the home
 * screen and the user is silently signed out.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touching getUser() is what performs the refresh. Don't remove it.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, icons, the manifest and the version ping.
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|api/version|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)",
  ],
};
