import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function copyCookiesToResponse(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[MIDDLEWARE_CONFIG_MISSING]", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
    });
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("[MIDDLEWARE_AUTH_GET_USER]", { message: error.message });
      user = null;
    } else {
      user = data.user;
    }
  } catch (error: unknown) {
    console.error("[MIDDLEWARE_AUTH_GET_USER_FAILURE]", { error });
    user = null;
  }

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isCopilotIntakeWebhook =
    request.nextUrl.pathname === "/api/copilot-intake";
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".");

  if (!user && !isAuthPage && !isPublicAsset && !isCopilotIntakeWebhook) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url),
    );
    copyCookiesToResponse(response, redirectResponse);
    return redirectResponse;
  }

  if (user && isAuthPage) {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url),
    );
    copyCookiesToResponse(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
