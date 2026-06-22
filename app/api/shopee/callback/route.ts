import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForToken } from "@/lib/shopee/auth";
import { OAUTH_STATE_COOKIE, isValidState } from "@/lib/shopee/state";

// Atrás de um proxy/túnel (cloudflared, Vercel, etc.) o Host visto pelo
// Next.js pode ser o backend interno, não o domínio público. Os headers
// X-Forwarded-* preservam o domínio que o navegador realmente acessou.
function publicOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const shopIdParam = request.nextUrl.searchParams.get("shop_id");
  const state = request.nextUrl.searchParams.get("state");
  const origin = publicOrigin(request);

  const cookieStore = await cookies();
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!isValidState(storedState, state)) {
    return NextResponse.redirect(new URL("/integracoes?error=invalid_state", origin));
  }

  if (!code || !shopIdParam) {
    return NextResponse.redirect(new URL("/integracoes?error=missing_params", origin));
  }

  try {
    await exchangeCodeForToken({ code, shopId: Number(shopIdParam) });
  } catch {
    return NextResponse.redirect(new URL("/integracoes?error=token_exchange_failed", origin));
  }

  return NextResponse.redirect(new URL("/integracoes?connected=1", origin));
}
