import { isRelaxedLogin } from "@/lib/auth/relaxed-login";
import { getSupabasePublicEnv } from "@/lib/supabase/public-env";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function copyCookiesToResponse(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function proxy(request: NextRequest) {
  let supabaseUrl: string;
  let supabaseAnonKey: string;

  try {
    const env = getSupabasePublicEnv();
    supabaseUrl = env.url;
    supabaseAnonKey = env.anonKey;
  } catch {
    console.error("[PROXY_CONFIG_MISSING]");
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
      console.error("[PROXY_AUTH_GET_USER]", { message: error.message });
      user = null;
    } else {
      user = data.user;
    }
  } catch (error: unknown) {
    console.error("[PROXY_AUTH_GET_USER_FAILURE]", { error });
    user = null;
  }

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth/signup");
  const isCopilotIntakeWebhook =
    request.nextUrl.pathname === "/api/copilot-intake";
  const isPublicLeadIntake =
    request.nextUrl.pathname === "/api/intake" ||
    request.nextUrl.pathname === "/api/leads/public-intake";
  const isPublicWelcomeNotification =
    request.nextUrl.pathname === "/api/notifications/welcome";
  const isPublicIntakePage = request.nextUrl.pathname.startsWith("/intake");
  const isPublicScanPage = request.nextUrl.pathname.startsWith("/scan");
  const isPublicDownloadAppPage =
    request.nextUrl.pathname.startsWith("/download-app");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".");

  if (
    !user &&
    !isAuthPage &&
    !isPublicAsset &&
    !isCopilotIntakeWebhook &&
    !isPublicLeadIntake &&
    !isPublicWelcomeNotification &&
    !isPublicIntakePage &&
    !isPublicScanPage &&
    !isPublicDownloadAppPage
  ) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url),
    );
    copyCookiesToResponse(response, redirectResponse);
    return redirectResponse;
  }

  if (user && isAuthPage && !isRelaxedLogin()) {
    const destination =
      request.nextUrl.pathname.startsWith("/auth/signup") &&
      request.nextUrl.searchParams.get("target") === "my-sanctuary"
        ? "/my-sanctuary"
        : "/dashboard";
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
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
