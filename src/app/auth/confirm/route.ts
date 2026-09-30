import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const TYPES = new Set<string>(["email", "magiclink", "signup", "invite", "recovery", "email_change"]);

/**
 * Where to land after a successful link. `next` is a same-origin path; the
 * email template may instead pass Supabase's `redirect_to`, the full URL the
 * login page asked for (or the project's Site URL when that wasn't on the
 * allow list). Anything off this host collapses to "/", which routes by role.
 */
function destination(request: NextRequest): string {
  const params = request.nextUrl.searchParams;
  const next = params.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  const redirectTo = params.get("redirect_to");
  if (redirectTo) {
    try {
      const target = new URL(redirectTo);
      const hosts = new Set([request.headers.get("host"), request.nextUrl.host]);
      if (process.env.NEXT_PUBLIC_APP_URL) hosts.add(new URL(process.env.NEXT_PUBLIC_APP_URL).host);
      if (hosts.has(target.host)) return `${target.pathname}${target.search}`;
    } catch {
      // Not a URL: fall through.
    }
  }
  return "/";
}

/**
 * Signs a patient in from the link in the sign-in email.
 *
 * The link carries the token hash, not a PKCE code, so it works in whichever
 * browser opens it (a phone's mail app hands links to a different browser
 * than the one the code was requested from). On success the session cookies
 * are set here and the patient lands where they were headed; a used or
 * expired link goes back to the login page with a message.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const next = destination(request);

  const failed = new URL("/login", request.nextUrl.origin);
  failed.searchParams.set("error", "link");
  if (next !== "/") failed.searchParams.set("next", next);

  if (!tokenHash || !type || !TYPES.has(type)) return NextResponse.redirect(failed);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
  if (error) {
    console.warn("[auth/confirm] link rejected", error.code ?? error.message);
    return NextResponse.redirect(failed);
  }
  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
