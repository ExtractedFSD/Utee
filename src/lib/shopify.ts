import crypto from "crypto";

/** Verify the X-Shopify-Hmac-Sha256 header against the raw request body. */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

const testKitSkus = () =>
  (process.env.TEST_KIT_SKUS ?? "UTEE-TEST-KIT")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** A line item is a test kit if its SKU matches, or its title mentions "test kit". */
export function isTestKitLineItem(item: { sku?: string | null; title?: string | null }): boolean {
  const sku = (item.sku ?? "").toLowerCase();
  if (sku && testKitSkus().includes(sku)) return true;
  return (item.title ?? "").toLowerCase().includes("test kit");
}
