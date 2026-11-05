import "server-only";
import QRCode from "qrcode";
import { buildReturnRequest, type PostalAddress } from "./royalmail-request";

export { buildReturnRequest, type PostalAddress } from "./royalmail-request";

/*
 * Royal Mail Click & Drop, returns only. One call creates a Tracked
 * Returns label for a kit and hands back the tracking number, the QR code
 * the patient shows at a Post Office counter, and the printable label.
 *
 * The request and response shapes follow Royal Mail's published Click &
 * Drop API specification (api.parcel.royalmail.com, "Returns", reserved
 * for Online Business Account customers):
 *   GET  /returns/services  -> [{ serviceCode: "TSN", serviceName: "Tracked Returns 24" }, ...]
 *   POST /returns           -> { shipment: { trackingNumber, uniqueItemId }, qrCode, label }
 *
 * Configuration: ROYAL_MAIL_CLICK_DROP_API_KEY (the account's API key),
 * ROYAL_MAIL_RETURN_SERVICE (TSN for Tracked Returns 24, TSS for 48), and
 * the lab's address in LAB_RETURN_NAME / LAB_RETURN_ADDRESS1 / LAB_RETURN_ADDRESS2 /
 * LAB_RETURN_CITY / LAB_RETURN_POSTCODE. Without an API key the client runs
 * as a stub: the same shapes, a made-up tracking number, a real QR of it,
 * and a label that says it is not valid postage.
 */
const API_BASE = "https://api.parcel.royalmail.com/api/v1";
export const DEFAULT_RETURN_SERVICE = "TSN";

export type ReturnLabel = {
  provider: "click_and_drop" | "stub";
  trackingNumber: string;
  uniqueItemId: string | null;
  serviceCode: string;
  /** Base64 PNG of the QR code for the Post Office counter. */
  qrPng: string | null;
  /** Base64 PDF of the printable label. */
  labelPdf: string | null;
};

export function royalMailEnabled(): boolean {
  return !!process.env.ROYAL_MAIL_CLICK_DROP_API_KEY;
}

export function returnServiceCode(): string {
  return process.env.ROYAL_MAIL_RETURN_SERVICE?.trim() || DEFAULT_RETURN_SERVICE;
}

/** Where samples go. Falls back to a placeholder only when no key is set, so a live account can never post to nowhere. */
export function labReturnAddress(): PostalAddress | null {
  const line1 = process.env.LAB_RETURN_ADDRESS1?.trim();
  const city = process.env.LAB_RETURN_CITY?.trim();
  const postcode = process.env.LAB_RETURN_POSTCODE?.trim();
  if (line1 && city && postcode) {
    return {
      firstName: "Utee",
      lastName: "Laboratory",
      companyName: process.env.LAB_RETURN_NAME?.trim() || "Utee Laboratory",
      addressLine1: line1,
      addressLine2: process.env.LAB_RETURN_ADDRESS2?.trim() || undefined,
      city,
      postcode,
    };
  }
  if (royalMailEnabled()) return null;
  return { firstName: "Utee", lastName: "Laboratory", companyName: "Utee Laboratory (stub)", addressLine1: "1 Example Street", city: "Reading", postcode: "RG1 1AA" };
}

export async function createReturnLabel(input: { reference: string; sender: PostalAddress }): Promise<ReturnLabel> {
  const serviceCode = returnServiceCode();
  const lab = labReturnAddress();
  if (!lab) throw new Error("The lab's return address is not configured (LAB_RETURN_ADDRESS1, LAB_RETURN_CITY, LAB_RETURN_POSTCODE).");
  const body = buildReturnRequest({ serviceCode, reference: input.reference, sender: input.sender, lab });

  if (!royalMailEnabled()) return stubLabel(serviceCode, input, lab);

  const res = await fetch(`${API_BASE}/returns`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.ROYAL_MAIL_CLICK_DROP_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Royal Mail ${res.status}: ${text.slice(0, 300)}`);
  let data: { shipment?: { trackingNumber?: string; uniqueItemId?: string }; qrCode?: string; label?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Royal Mail returned something that was not JSON.");
  }
  const trackingNumber = data.shipment?.trackingNumber?.trim();
  if (!trackingNumber) throw new Error("Royal Mail did not return a tracking number.");
  return {
    provider: "click_and_drop",
    trackingNumber,
    uniqueItemId: data.shipment?.uniqueItemId ?? null,
    serviceCode,
    qrPng: data.qrCode || null,
    labelPdf: data.label || null,
  };
}

/** The services the account can use, for the admin page to check the key with. */
export async function listReturnServices(): Promise<{ serviceCode: string; serviceName: string }[]> {
  if (!royalMailEnabled()) return [{ serviceCode: "TSN", serviceName: "Tracked Returns 24 (stub)" }, { serviceCode: "TSS", serviceName: "Tracked Returns 48 (stub)" }];
  const res = await fetch(`${API_BASE}/returns/services`, { headers: { Authorization: `Bearer ${process.env.ROYAL_MAIL_CLICK_DROP_API_KEY}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Royal Mail ${res.status}`);
  const data = (await res.json()) as { services?: { serviceCode: string; serviceName: string }[] };
  return data.services ?? [];
}

async function stubLabel(serviceCode: string, input: { reference: string; sender: PostalAddress }, lab: PostalAddress): Promise<ReturnLabel> {
  const digits = String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  const trackingNumber = `ST${digits}GB`;
  const qr = await QRCode.toBuffer(trackingNumber, { type: "png", margin: 1, width: 360, color: { dark: "#1d003a", light: "#ffffff" } });
  const { renderReturnLabelPdf } = await import("./postage-label");
  const pdf = await renderReturnLabelPdf({ trackingNumber, serviceCode, reference: input.reference, sender: input.sender, lab, stub: true });
  return { provider: "stub", trackingNumber, uniqueItemId: null, serviceCode, qrPng: qr.toString("base64"), labelPdf: pdf.toString("base64") };
}
