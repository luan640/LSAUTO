const SANDBOX_HOST = "https://openplatform.sandbox.test-stable.shopee.sg";
const PRODUCTION_HOST = "https://partner.shopeemobile.com";

export function shopeeApiHost() {
  return process.env.SHOPEE_ENV === "production" ? PRODUCTION_HOST : SANDBOX_HOST;
}

export function shopeePartnerId() {
  return Number(process.env.SHOPEE_PARTNER_ID);
}

export function shopeePartnerKey() {
  return process.env.SHOPEE_PARTNER_KEY!;
}

export function shopeeRedirectUrl() {
  return process.env.SHOPEE_REDIRECT_URL!;
}
