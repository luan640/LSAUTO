"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buildAuthPartnerUrl } from "@/lib/shopee/auth";
import { generateState, OAUTH_STATE_COOKIE } from "@/lib/shopee/state";
import { deleteShop, getConnectedShop } from "@/lib/shopee/tokens";

export async function startShopeeAuth() {
  const state = generateState();
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  redirect(buildAuthPartnerUrl(state));
}

export async function disconnectShopee() {
  const shop = await getConnectedShop();
  if (shop) {
    await deleteShop(shop.shop_id);
  }
  revalidatePath("/integracoes");
}
