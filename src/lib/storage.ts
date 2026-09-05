/**
 * Storage abstraction for image uploads.
 * Provider is selected via Settings → Image Storage.
 *
 * Supported providers:
 *   local        – write to public/uploads/ (self-hosted only)
 *   supabase     – Supabase Storage using server-only service-role credentials
 */

import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { prisma } from "./db";

export interface UploadResult {
  url: string;
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: "singleton" },
    select: {
      storageProvider: true,
      storageBucket: true,
    },
  });

  const provider =
    (process.env.NODE_ENV as string | undefined) === "production"
      ? "supabase"
      : (settings?.storageProvider ?? "local");

  switch (provider) {
    case "supabase":
      return uploadSupabaseStorage(
        buffer,
        filename,
        contentType,
        settings?.storageBucket ?? undefined
      );

    default:
      return uploadLocal(buffer, filename);
  }
}

// ─── Local ────────────────────────────────────────────────────────────────────

async function uploadLocal(buffer: Buffer, filename: string): Promise<UploadResult> {
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/${filename}` };
}

// ─── Supabase Storage ─────────────────────────────────────────────────────────

async function uploadSupabaseStorage(
  buffer: Buffer,
  filename: string,
  contentType: string,
  configuredBucket?: string
): Promise<UploadResult> {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = configuredBucket || process.env.SUPABASE_STORAGE_BUCKET;
  if (!baseUrl || !serviceRoleKey || !bucket) {
    throw new Error("Supabase Storage is not configured");
  }

  const key = `uploads/${filename}`;
  const response = await fetch(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: buffer as unknown as BodyInit,
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${response.status}): ${detail}`);
  }

  return { url: `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${key}` };
}
