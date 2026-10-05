"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SIGNATURES_BUCKET } from "@/lib/report/build";

const MAX_PNG_BYTES = 400 * 1024;

export type SavedSignature = {
  displayName: string;
  title: string | null;
  organisation: string | null;
  imagePath: string;
  updatedAt: string;
};

/**
 * Saves the signer's drawn signature and how they want to be named under
 * it. One per user; saving again replaces it for reports signed from now
 * on (reports already published keep the PDF they were published with).
 */
export async function saveMySignature(input: { image: string; displayName: string; title: string; organisation: string }) {
  const user = await requireRole(["clinic"]);
  const admin = createAdminClient();

  const displayName = input.displayName.trim().slice(0, 120);
  if (!displayName) return { error: "Enter the name to print under your signature." };
  const title = input.title.trim().slice(0, 160) || null;
  const organisation = input.organisation.trim().slice(0, 160) || null;

  const prefix = "data:image/png;base64,";
  if (!input.image.startsWith(prefix)) return { error: "Draw your signature first." };
  const png = Buffer.from(input.image.slice(prefix.length), "base64");
  if (png.length < 200) return { error: "Draw your signature first." };
  if (png.length > MAX_PNG_BYTES) return { error: "That signature is too large. Clear it and sign again." };
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return { error: "The signature could not be read. Try again." };

  const imagePath = `${user.id}/signature-${Date.now()}.png`;
  const { error: uploadError } = await admin.storage.from(SIGNATURES_BUCKET).upload(imagePath, png, { contentType: "image/png" });
  if (uploadError) return { error: `Could not save the signature: ${uploadError.message}` };

  const { error } = await admin.from("staff_signatures").upsert(
    { user_id: user.id, display_name: displayName, title, organisation, image_path: imagePath, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return { error: `Could not save the signature: ${error.message}` };

  revalidatePath("/clinic/signature");
  revalidatePath("/clinic/case", "layout");
  return { ok: true as const };
}

export async function getMySignature(): Promise<SavedSignature | null> {
  const user = await requireRole(["clinic"]);
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_signatures")
    .select("display_name, title, organisation, image_path, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { displayName: data.display_name, title: data.title, organisation: data.organisation, imagePath: data.image_path, updatedAt: data.updated_at };
}
